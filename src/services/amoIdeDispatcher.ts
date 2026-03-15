import { terminalBridgeService } from './terminalBridgeService';
import { workspaceWriteService } from './workspaceWriteService';
import { webAssistService } from './webAssistService';
import { webViewBridgeService } from './webViewBridgeService';
import {
  extractToolCalls,
  stripToolCalls,
  formatToolResult,
  type IdeToolCall,
} from './amoIdePrompt';

export interface DispatchResult {
  toolCall: IdeToolCall;
  result: string;
  success: boolean;
  viewSwitch?: 'terminal' | 'editor' | 'webview';
  webViewUrl?: string;
  previewPath?: string;
}

export interface DispatchBatch {
  results: DispatchResult[];
  contextBlock: string;
  viewSwitch?: string;
  webViewUrl?: string;
  previewPath?: string;
  hasErrors: boolean;
}

async function executeTool(
  call: IdeToolCall,
  chatId: string,
): Promise<DispatchResult> {
  switch (call.tool) {
    case 'run': {
      const result = await terminalBridgeService.run(call.command, chatId, {
        timeoutMs: 30000,
      });
      return {
        toolCall: call,
        result: result.formatted,
        success: result.success,
        viewSwitch: 'terminal',
      };
    }

    case 'write': {
      const dir = call.path.split('/').slice(0, -1).join('/');
      if (dir) {
        await terminalBridgeService.run(`mkdir -p "${dir}"`, chatId);
      }

      const writeResult = await workspaceWriteService.writeFile(
        call.path.split('/').pop() || 'file.txt',
        call.content,
      );

      if (writeResult.success) {
        await workspaceWriteService.importToKnowledge(
          call.path.split('/').pop() || 'file.txt',
        );
      }

      return {
        toolCall: call,
        result: writeResult.success
          ? `File written: ${call.path} (${call.content.length} chars)`
          : `Write failed: ${writeResult.error}`,
        success: writeResult.success,
      };
    }

    case 'read': {
      const readResult = await terminalBridgeService.run(
        `cat "${call.path}"`,
        chatId,
      );
      return {
        toolCall: call,
        result: readResult.success
          ? `Contents of ${call.path}:\n${readResult.output}`
          : `Could not read ${call.path}: ${readResult.output}`,
        success: readResult.success,
      };
    }

    case 'list': {
      const listPath = call.path || 'amo-workspace/';
      const listResult = await terminalBridgeService.run(
        `ls -la "${listPath}" 2>/dev/null || echo "Directory is empty or does not exist"`,
        chatId,
      );
      return {
        toolCall: call,
        result: `Directory listing for ${listPath}:\n${listResult.output}`,
        success: listResult.success,
      };
    }

    case 'preview': {
      const readResult = await terminalBridgeService.run(
        `cat "${call.path}"`,
        chatId,
      );
      return {
        toolCall: call,
        result: readResult.success
          ? `Opened ${call.path} in editor`
          : `Could not open ${call.path}: ${readResult.output}`,
        success: readResult.success,
        viewSwitch: 'editor',
        previewPath: call.path,
      };
    }

    case 'search': {
      const searchResult = await webAssistService.resolve(call.query);
      return {
        toolCall: call,
        result: searchResult
          ? `Web search results for "${call.query}":\n${searchResult}`
          : `No results found for "${call.query}"`,
        success: !!searchResult,
        webViewUrl: `amo://search?q=${encodeURIComponent(call.query)}`,
      };
    }

    case 'open_url': {
      webViewBridgeService.onNavigate(call.url);
      return {
        toolCall: call,
        result: `Opened ${call.url} in browser`,
        success: true,
        viewSwitch: 'webview',
        webViewUrl: call.url,
      };
    }

    default: {
      return {
        toolCall: call as IdeToolCall,
        result: `Unknown tool: ${(call as any).tool}`,
        success: false,
      };
    }
  }
}

export const amoIdeDispatcher = {

  async dispatch(
    rawResponse: string,
    chatId: string,
  ): Promise<DispatchBatch> {
    const calls = extractToolCalls(rawResponse);

    if (calls.length === 0) {
      return {
        results: [],
        contextBlock: '',
        hasErrors: false,
      };
    }

    const results: DispatchResult[] = [];
    let lastViewSwitch: string | undefined;
    let lastWebViewUrl: string | undefined;
    let lastPreviewPath: string | undefined;

    for (const call of calls) {
      console.info(`[AmoIDE] Executing tool: ${call.tool}`, call);
      const result = await executeTool(call, chatId);
      results.push(result);

      if (result.viewSwitch)  lastViewSwitch  = result.viewSwitch;
      if (result.webViewUrl)  lastWebViewUrl  = result.webViewUrl;
      if (result.previewPath) lastPreviewPath = result.previewPath;

      if (!result.success && call.tool === 'run' &&
          result.result.includes('command not found')) {
        break;
      }
    }

    const contextLines = results.map(r =>
      formatToolResult(r.toolCall, r.result, r.success)
    );

    return {
      results,
      contextBlock: contextLines.join('\n\n'),
      viewSwitch: lastViewSwitch,
      webViewUrl: lastWebViewUrl,
      previewPath: lastPreviewPath,
      hasErrors: results.some(r => !r.success),
    };
  },

  hasToolCalls(text: string): boolean {
    return text.includes('<<<TOOL>>>');
  },

  extractDisplayText(text: string): string {
    return stripToolCalls(text);
  },
};
