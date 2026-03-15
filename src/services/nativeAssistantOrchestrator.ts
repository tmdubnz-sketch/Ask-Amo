import type { NativeOfflineStatus } from './nativeOfflineLlmService';
import type { NativeSessionMessage } from './nativeChatSessionService';

const MAX_RECENT_TURNS = 3;
const MAX_TURN_CHARS = 128;
const MAX_USER_CHARS = 256;

function normalizeText(text: string, maxChars: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }

  return normalized.slice(0, maxChars).trim();
}

function buildRecentTurns(session: NativeSessionMessage[]): string {
  return session
    .slice(-MAX_RECENT_TURNS)
    .map((message) => `${message.role === 'user' ? 'User' : 'Amo'}: ${normalizeText(message.content, MAX_TURN_CHARS)}`)
    .join('\n');
}

function buildPrimaryPrompt(userInput: string, session: NativeSessionMessage[], knowledgeContext?: string, webContext?: string): string {
  const recentTurns = buildRecentTurns(session);
  const parts = [
    'You are Amo, a grounded male New Zealand Maori assistant from Aotearoa.',
    'Your brain operates on a three-pillar architecture:',
    '1. Universal Source of Data: Your Atlas, History, and learned web facts.',
    '2. Single Source of Truth: Your core rules, identity, and respect for Te Reo.',
    '3. Multiple Sources of Wisdom: Your logic, understanding loops, and practical reasoning.',
    'Understand user intent even if they use slang, shorthand, or have typos.',
    'Prefer local context and stored knowledge first for the fastest useful answer.',
    'If a word is unfamiliar or the sentence is strange, say that clearly and ask the user to repeat or confirm.',
    'If the wording sounds close to a known word, ask "did you mean ...?" and offer the best likely interpretation.',
    'For multi-step jobs, enter task mode: think in short steps, use terminal/web tools when needed, and verify the result.',
    'Always provide a helpful answer using your pillars to complete sentences.',
    'Reply in one or two short natural sentences. Stay direct and grounded.',
    'CRITICAL: If search context is available, you MUST include the full clickable direct URL links (e.g., https://example.com) at the end of your response.',
    'Do not mention being an AI language model.',
  ];

  if (knowledgeContext) {
    parts.push(`Local Superbrain Library Context:\n${knowledgeContext}`);
  }

  if (recentTurns) {
    parts.push(`Recent chat:\n${recentTurns}`);
  }

  if (webContext) {
    parts.push(`Use this web assist context to answer concisely and provide URL links:\n${webContext}`);
  }

  parts.push(`User: ${normalizeText(userInput, MAX_USER_CHARS)}`);
  parts.push('Amo:');
  return parts.join('\n');
}

function buildFallbackPrompt(userInput: string, webContext?: string): string {
  const parts = [
    'You are Amo, a male assistant from New Zealand Aotearoa.',
    'Reply in one short natural sentence.',
    'Prefer local knowledge first, clarify unclear wording, and ask "did you mean ...?" if needed.',
    'Do not mention being an AI model.',
  ];

  if (webContext) {
    parts.push(`Answer concisely using this context and include the link:\n${webContext}`);
  }

  parts.push(`User: ${normalizeText(userInput, 40)}`);
  parts.push('Amo:');
  return parts.join('\n');
}

function sanitizeResponse(text: string): string {
  // If the text contains a URL, we don't want to collapse ALL whitespace as it might break formatting
  const hasUrl = text.includes('http://') || text.includes('https://');
  
  let cleaned = text
    .replace(/^(amo|assistant)\s*:\s*/i, '')
    .replace(/^["'`]+|["'`]+$/g, '');

  if (hasUrl) {
    // Just trim and remove leading/trailing quotes
    return cleaned.trim();
  }

  return cleaned.replace(/\s+/g, ' ').trim();
}

function isBadResponse(text: string): boolean {
  const normalized = text.toLowerCase();
  if (!normalized) {
    return true;
  }

  if (normalized.length < 3) {
    return true;
  }

  if (
    normalized.includes('ai language model')
    || normalized.includes('as an ai')
    || normalized.includes('we are a group')
    || normalized.includes('smarts, we are a group')
    || normalized === 'amo:'
  ) {
    return true;
  }

  return false;
}

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

export interface NativeReplyResult {
  text: string;
  status: NativeOfflineStatus | null;
  promptStrategy: 'session' | 'fallback';
}

export const nativeAssistantOrchestrator = {
  async generateReply(options: {
    userInput: string;
    session: NativeSessionMessage[];
    knowledgeContext?: string;
    webContext?: string;
    runPrompt: (prompt: string, timeoutMessage: string) => Promise<{ text: string; status: NativeOfflineStatus | null }>;
  }): Promise<NativeReplyResult> {
    const deterministicReply = buildDeterministicReply(options.userInput);
    if (deterministicReply) {
      return {
        text: deterministicReply,
        status: null,
        promptStrategy: 'fallback',
      };
    }

    // Try primary prompt first
    {
      const prompt = buildPrimaryPrompt(options.userInput, options.session, options.knowledgeContext, options.webContext);
      const generated = await options.runPrompt(prompt, 'Native offline model took too long to respond. Reload the model or switch to a cloud model.');
      console.info(`[AskAmo] Native model output (session):`, generated.text);
      const sanitized = sanitizeResponse(generated.text);

      if (!isBadResponse(sanitized)) {
        return {
          text: sanitized,
          status: generated.status,
          promptStrategy: 'session',
        };
      }
    }

    // If primary prompt didn't work, try fallback prompt
    {
      const prompt = buildFallbackPrompt(options.userInput, options.webContext);
      const generated = await options.runPrompt(prompt, 'Native offline fallback prompt took too long to respond. Reload the model or switch to a cloud model.');
      console.info(`[AskAmo] Native model output (fallback):`, generated.text);
      const sanitized = sanitizeResponse(generated.text);

      if (!isBadResponse(sanitized)) {
        return {
          text: sanitized,
          status: generated.status,
          promptStrategy: 'fallback',
        };
      }
    }

    throw new Error('Native offline runtime returned an unusable response.');
  },
};
