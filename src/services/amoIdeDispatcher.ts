import { terminalBridgeService } from './terminalBridgeService';
import { workspaceWriteService } from './workspaceWriteService';
import { webAssistService } from './webAssistService';
import { webViewBridgeService } from './webViewBridgeService';
import { sentenceBuilderService } from './sentenceBuilderService';
import { vocabularyService } from './vocabularyService';
import { intentEnhancementService } from './intentEnhancementService';
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
  editorCode?: string;
  autoRun?: boolean;
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
        viewSwitch: writeResult.success ? 'editor' : undefined,
        previewPath: writeResult.success ? call.path : undefined,
        editorCode: writeResult.success ? call.content : undefined,
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

    case 'install': {
      const { manager, packages } = call;
      const pkgList = packages.join(' ');

      // Check if we're on Android (terminal tools not available)
      const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.();
      
      if (isNative) {
        return {
          toolCall: call,
          result: `Package installation via ${manager} is not available on Android.\n\nSupported on Android:\n• JavaScript/TypeScript — runs in browser sandbox (QuickJS)\n• Python — runs in browser sandbox (Pyodide)\n\nTo use ${manager}, deploy the app on a web server or use a development machine.`,
          success: false,
        };
      }

      let command: string;

      switch (manager) {
        case 'npm':
          command = `npm install ${pkgList}`;
          break;
        case 'pip':
          command = `pip install ${pkgList}`;
          break;
        case 'apt':
          command = `apt-get install -y ${pkgList}`;
          break;
        case 'yarn':
          command = `yarn add ${pkgList}`;
          break;
        case 'pnpm':
          command = `pnpm add ${pkgList}`;
          break;
        default:
          return {
            toolCall: call,
            result: `Unknown package manager: ${manager}. Supported: npm, pip, apt, yarn, pnpm`,
            success: false,
          };
      }

      const result = await terminalBridgeService.run(command, chatId, { timeoutMs: 120000 });
      return {
        toolCall: call,
        result: result.success
          ? `Installed ${pkgList} via ${manager}:\n${result.output}`
          : `Failed to install ${pkgList} via ${manager}:\n${result.output}`,
        success: result.success,
        viewSwitch: 'terminal',
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

    case 'sentence_builder': {
      try {
        const generated = await sentenceBuilderService.generateSentence({
          intent: call.input,
          style: (call.style as any) || 'neutral',
          context: call.context,
        });
        return {
          toolCall: call,
          result: `Sentence enhanced:\nOriginal: ${call.input}\nEnhanced: ${generated.text}\nConfidence: ${generated.confidence}`,
          success: true,
          viewSwitch: 'editor',
        };
      } catch (e) {
        return {
          toolCall: call,
          result: `Sentence builder error: ${e instanceof Error ? e.message : 'Unknown error'}`,
          success: false,
        };
      }
    }

    case 'vocabulary_builder': {
      try {
        const stats = await vocabularyService.getVocabularyStats();
        return {
          toolCall: call,
          result: `Vocabulary stats:\nTotal words: ${stats.totalWords}\nMastered: ${stats.masteredWords}\nLearning: ${stats.learningWords}\nNew: ${stats.newWords}`,
          success: true,
          viewSwitch: 'editor',
        };
      } catch (e) {
        return {
          toolCall: call,
          result: `Vocabulary builder error: ${e instanceof Error ? e.message : 'Unknown error'}`,
          success: false,
        };
      }
    }

    case 'intent_enhancer': {
      try {
        const prediction = await intentEnhancementService.predictIntent({
          userInput: call.text,
          context: call.action || 'general',
        });
        return {
          toolCall: call,
          result: `Intent analysis:\nPredicted intent: ${prediction.intent}\nConfidence: ${prediction.confidence}\nReasoning: ${prediction.reasoning}`,
          success: true,
        };
      } catch (e) {
        return {
          toolCall: call,
          result: `Intent enhancer error: ${e instanceof Error ? e.message : 'Unknown error'}`,
          success: false,
        };
      }
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
