import { terminalBridgeService } from './terminalBridgeService';
import { webViewBridgeService } from './webViewBridgeService';
import { workspaceWriteService } from './workspaceWriteService';
import { webAssistService } from './webAssistService';
import type { ExtractedSlots } from './slotExtractorService';

export type ToolUsed = 'terminal' | 'webview' | 'workspace' | 'websearch' | 'none';

export interface CoordinatorResult {
  contextBlock: string;
  instantReply: string;
  toolsUsed: ToolUsed[];
  viewSwitch?: 'chat' | 'webview' | 'terminal' | 'editor';
  webViewUrl?: string;
}

function routeToTools(slots: ExtractedSlots): ToolUsed[] {
  const tools: ToolUsed[] = [];
  const { action, target } = slots;

  if (
    action === 'execute' ||
    (action === 'create' && target === 'editor') ||
    (action === 'read' && target === 'editor') ||
    target === 'terminal'
  ) {
    tools.push('terminal');
  }

  if (
    target === 'webview' ||
    action === 'search' ||
    slots.url !== null ||
    (action === 'retrieve' && !target)
  ) {
    tools.push('webview');
  }

  if (
    action === 'execute' ||
    action === 'search' ||
    slots.url !== null ||
    (action === 'retrieve' && !target)
  ) {
    tools.push('webview');
  }

  if (
    action === 'search' ||
    (slots.qualifier === 'latest' || slots.qualifier === 'live') ||
    (slots.topic !== null && target === 'websearch')
  ) {
    tools.push('websearch');
  }

  // Terminal routing - must come after other tool checks
  if (
    action === 'execute' ||
    target === 'terminal'
  ) {
    tools.push('terminal');
  }

  if (
    action === 'store' ||
    (action === 'create' && !target) ||
    target === 'knowledge' ||
    (action === 'read' && target === 'knowledge')
  ) {
    tools.push('workspace');
  }

  return tools.length > 0 ? tools : ['none'];
}

function extractCommand(userPrompt: string, slots: ExtractedSlots): string | null {
  const normalized = userPrompt.toLowerCase().trim();

  const directPatterns = [
    /run\s+`([^`]+)`/i,
    /execute\s+`([^`]+)`/i,
    /run\s+"([^"]+)"/i,
    /run\s+the\s+command\s+(.+)$/i,
    /^run\s+(.+)$/i,
  ];

  for (const pattern of directPatterns) {
    const match = userPrompt.match(pattern);
    if (match) return match[1].trim();
  }

  if (/\b(build|npm run build|build the app)\b/i.test(normalized)) return 'npm run build';
  if (/\b(lint|npm run lint|check types)\b/i.test(normalized)) return 'npm run lint';
  if (/\b(install|npm install|install deps|install dependencies)\b/i.test(normalized)) return 'npm install';
  if (/\b(list files|ls|show files|what files)\b/i.test(normalized)) return 'ls -la';
  if (/\b(current directory|where am i|pwd)\b/i.test(normalized)) return 'pwd';
  if (/\b(git status|check git|what changed)\b/i.test(normalized)) return 'git status';
  if (/\b(git log|recent commits|last commits)\b/i.test(normalized)) return 'git log --oneline -10';
  if (/\b(disk space|how much space|storage)\b/i.test(normalized)) return 'df -h';
  if (/\b(memory usage|ram usage|free memory)\b/i.test(normalized)) return 'free -h';
  if (/\b(running processes|what is running|ps)\b/i.test(normalized)) return 'ps aux | head -20';

  if (slots.fileRef && slots.action === 'read') {
    return `cat "${slots.fileRef}"`;
  }

  return null;
}

export const amoToolCoordinator = {

  async handle(
    slots: ExtractedSlots,
    userPrompt: string,
    chatId: string,
    options: {
      isOnline: boolean;
      isWebSearchEnabled: boolean;
      currentWebViewUrl: string;
    },
  ): Promise<CoordinatorResult> {
    const result: CoordinatorResult = {
      contextBlock: '',
      instantReply: '',
      toolsUsed: [],
      viewSwitch: undefined,
      webViewUrl: undefined,
    };

    const contextParts: string[] = [];
    const tools = routeToTools(slots);

    if (tools.includes('terminal') || slots.target === 'terminal') {
      result.viewSwitch = 'terminal';

      const command = extractCommand(userPrompt, slots);
      if (command) {
        const termResult = await terminalBridgeService.run(command, chatId);
        result.toolsUsed.push('terminal');

        contextParts.push(`[Terminal result]\n${termResult.formatted}`);

        if (
          termResult.success &&
          termResult.output.trim().length < 400 &&
          ['ls', 'pwd', 'git status', 'free -h', 'df -h'].some(c => command.startsWith(c))
        ) {
          result.instantReply = `Here is what I got:\n\n${termResult.output.trim()}`;
        }
      } else {
        contextParts.push(
          `[Terminal opened]\nCurrent directory: ${terminalBridgeService.getCwd(chatId) || 'unknown'}`
        );
      }
    }

    if (tools.includes('webview') || tools.includes('websearch')) {
      if (slots.url) {
        result.viewSwitch = 'webview';
        result.webViewUrl = slots.url;
        result.toolsUsed.push('webview');
        result.instantReply = `Opening ${slots.url} now.`;
        webViewBridgeService.onNavigate(slots.url);
      } else if (slots.topic && options.isOnline && options.isWebSearchEnabled) {
        result.viewSwitch = 'webview';
        const searchUrl = `amo://search?q=${encodeURIComponent(slots.topic)}`;
        result.webViewUrl = searchUrl;
        result.toolsUsed.push('websearch');

        const webContent = await webAssistService.resolve(slots.topic);
        if (webContent) {
          contextParts.push(`[Web search results for: ${slots.topic}]\n${webContent}`);
        }
      }

      if (
        /\b(this page|current page|what does it say|read this|summarize this|what is on)\b/i.test(userPrompt) &&
        options.currentWebViewUrl &&
        !options.currentWebViewUrl.startsWith('amo://')
      ) {
        const snapshot = await webViewBridgeService.readCurrentPage(2500);
        if (snapshot) {
          result.toolsUsed.push('webview');
          contextParts.push(
            `[Current page content]\n${webViewBridgeService.formatForContext(snapshot)}`
          );
        }
      }
    }

    if (tools.includes('workspace')) {
      if (/\b(save|write|store|export|create a file|make a (file|doc|note))\b/i.test(userPrompt)) {
        result.toolsUsed.push('workspace');
        contextParts.push(
          `[Workspace instruction]\nAfter generating your reply, save the content to a file in the workspace using workspaceWriteService.writeAndImport(). Confirm the filename and path to the user.`
        );
      }

      if (/\b(list files|show files|what files|workspace files|my files)\b/i.test(userPrompt)) {
        const files = await workspaceWriteService.listFiles(chatId);
        result.toolsUsed.push('workspace');

        if (files.length === 0) {
          result.instantReply = 'Your workspace is empty. I can create files here when you ask me to save something.';
        } else {
          const fileList = files.map(f => `- ${f.name} (${f.size} bytes)`).join('\n');
          result.instantReply = `Your workspace files:\n\n${fileList}`;
        }
      }

      if (/\b(save (this|the) page|import (this|the) page|add (this|the) page to knowledge|remember this page)\b/i.test(userPrompt)) {
        const importMsg = await webViewBridgeService.importCurrentPageToKnowledge();
        result.toolsUsed.push('workspace');
        result.instantReply = importMsg;
      }
    }

    result.contextBlock = contextParts.filter(Boolean).join('\n\n');
    return result;
  },

  async saveReplyAsFile(
    reply: string,
    chatId: string,
    filenameHint?: string,
  ): Promise<string> {
    return workspaceWriteService.writeAndImport(reply, chatId, filenameHint);
  },

  async runCommand(command: string, chatId: string): Promise<string> {
    const result = await terminalBridgeService.run(command, chatId);
    return result.formatted;
  },
};
