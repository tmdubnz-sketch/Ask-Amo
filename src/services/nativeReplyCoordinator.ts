import { nativeAssistantOrchestrator } from './nativeAssistantOrchestrator';
import { nativeChatSessionService } from './nativeChatSessionService';
import type { NativeOfflineStatus } from './nativeOfflineLlmService';
import { AMO_INSTANT_REPLIES, type InstantReply } from '../data/amoInstantReplies';
import { neuralBuilderBridge } from './neuralBuilderBridge';

// ── INSTANT REPLY ENGINE ──────────────────────────────────────────────────────
// Handles common queries instantly without model inference.
// Uses data from amoInstantReplies seed pack.

// Convert string patterns to RegExp for matching
const compiledReplies: { reply: InstantReply; patterns: RegExp[] }[] = AMO_INSTANT_REPLIES.map(r => ({
  reply: r,
  patterns: r.patterns.map(p => new RegExp(p, 'i')),
}));

function matchIntent(userInput: string): InstantReply | null {
  const normalized = userInput.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;

  for (const { reply, patterns } of compiledReplies) {
    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        return reply;
      }
    }
  }
  return null;
}

function needsClarification(userInput: string): string | null {
  const normalized = userInput.replace(/\s+/g, ' ').trim().toLowerCase();
  
  // Very short ambiguous inputs
  if (normalized.length < 4 && !/^(hi|hey|yo|ok|no|yes)$/i.test(normalized)) {
    return "What would you like me to do?";
  }

  // Just an action word without context
  if (/^(do|run|make|create|fix|check|show|open|start)$/i.test(normalized)) {
    return `${normalized.charAt(0).toUpperCase() + normalized.slice(1)} what?`;
  }

  return null;
}

// ── MAIN DETERMINISTIC REPLY FUNCTION ────────────────────────────────────────

function buildDeterministicReply(userInput: string): { reply: string; actions?: string[]; followUp?: string } | null {
  const normalized = userInput.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!normalized) return null;

  // Check for clarification first
  const clarification = needsClarification(normalized);
  if (clarification) {
    return { reply: clarification };
  }

  // Check for identity/neural questions dynamically
  if (/\b(who are you|what are you|tell me about yourself|your name|your brain|how.*work|what.*connect|neural)\b/i.test(normalized)) {
    const neuralInfo = neuralBuilderBridge.getNeuralExplanation();
    return { reply: neuralInfo };
  }

  // Check for intent match using seed pack data
  const match = matchIntent(normalized);
  if (match) {
    // If there's a clarification field, add it as a follow-up question
    if (match.clarification) {
      return { 
        reply: match.reply, 
        actions: match.actions,
        followUp: match.clarification 
      };
    }
    return { reply: match.reply, actions: match.actions };
  }

  return null;
}

// ── TIMEOUT HELPER ───────────────────────────────────────────────────────────

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

// ── EXPORTS ──────────────────────────────────────────────────────────────────

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
