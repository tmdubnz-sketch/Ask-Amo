import { nativeAssistantOrchestrator } from './nativeAssistantOrchestrator';
import { nativeChatSessionService } from './nativeChatSessionService';
import type { NativeOfflineStatus } from './nativeOfflineLlmService';

// Deterministic replies for instant responses to common queries
function buildDeterministicReply(userInput: string): string | null {
  const normalized = userInput.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (/^(hi|hey|hello|hey bro|kia ora|kiaora|yo|sup|what'?s up)[!.?]*$/i.test(normalized)) {
    return 'Kia ora. How can I help you?';
  }

  if (/^(who are you|what are you|introduce yourself|tell me about yourself)[?.!]*$/i.test(normalized)) {
    return "I'm Amo. I can help with chat, imported knowledge, and offline tools on this device.";
  }

  if (/^(thanks|thank you|cheers)[!.?]*$/i.test(normalized)) {
    return "You're welcome.";
  }

  if (/^(help|help me|can you help|can u help|do you help|what can you do|what can you do offline)[?.!]*$/i.test(normalized)) {
    return 'I can chat, speak, show offline status, show workspace status, and work with imported knowledge on this device.';
  }

  return null;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: number | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

export interface NativeReplyLifecycleResult {
  text: string;
  status: NativeOfflineStatus | null;
}

export { buildDeterministicReply };

export const nativeReplyCoordinator = {
    async generateAndCommit(options: {
    chatId: string;
    userInput: string;
    knowledgeContext?: string;
    webContext?: string;
    ensureReady: () => Promise<NativeOfflineStatus>;
    generate: (prompt: string) => Promise<{ text: string; status: NativeOfflineStatus | null } | null>;
    onStatus: (status: NativeOfflineStatus) => void;
    onRuntimeState: (state: 'responding') => void;
    onCommit: (text: string) => void;
  }): Promise<NativeReplyLifecycleResult> {
    const readyStatus = await options.ensureReady();

    const generated = await nativeAssistantOrchestrator.generateReply({
      userInput: options.userInput,
      session: nativeChatSessionService.getSession(options.chatId),
      knowledgeContext: options.knowledgeContext,
      webContext: options.webContext,
      runPrompt: async (prompt, timeoutMessage) => {
        console.info('[AskAmo] Starting native model generation...', { promptLength: prompt.length });
        const result = await withTimeout(
          options.generate(prompt),
          90000,
          timeoutMessage
        );

        return {
          text: result?.text?.trim() || '',
          status: result?.status || null,
        };
      },
    });

    const finalStatus = generated.status || readyStatus;
    if (finalStatus) {
      options.onStatus(finalStatus);
    }

    nativeChatSessionService.recordExchange(options.chatId, options.userInput, generated.text);
    options.onRuntimeState('responding');
    options.onCommit(generated.text);

    return {
      text: generated.text,
      status: finalStatus,
    };
  },
};
