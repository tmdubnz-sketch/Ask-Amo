import type { NativeOfflineStatus } from './nativeOfflineLlmService';
import type { NativeSessionMessage } from './nativeChatSessionService';

// ── LIMITS ────────────────────────────────────────────────────────────────────
// Tuned for Phi-3.5 Mini / 3B+ on Snapdragon 865

const MAX_RECENT_TURNS    = 8;
const MAX_TURN_CHARS       = 500;
const MAX_USER_CHARS       = 1200;
const MAX_KNOWLEDGE_CHARS = 3500;
const MAX_WEB_CHARS       = 2500;

// ── HELPERS ───────────────────────────────────────────────────────────────────

function normalizeText(text: string, maxChars: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length <= maxChars
    ? normalized
    : normalized.slice(0, maxChars).trim();
}

function buildRecentTurns(session: NativeSessionMessage[]): string {
  return session
    .slice(-MAX_RECENT_TURNS)
    .map((m) => `${m.role === 'user' ? 'User' : 'Amo'}: ${normalizeText(m.content, MAX_TURN_CHARS)}`)
    .join('\n');
}

// ── RESPONSE LENGTH GUIDANCE ──────────────────────────────────────────────────
// Detect whether the question needs a short answer or a fuller guide

function detectResponseLength(userInput: string): 'short' | 'full' {
  const normalized = userInput.toLowerCase();
  const needsFull = [
    'how', 'guide', 'step', 'explain', 'show me', 'what can', 'can you',
    'help me', 'how do', 'how to', 'walk me', 'teach', 'tell me about',
    'what is', 'what are', 'describe', 'list', 'instructions',
  ];
  return needsFull.some(p => normalized.includes(p)) ? 'full' : 'short';
}

// ── COMMUNICATION EXAMPLES ─────────────────────────────────────────────────────
// Few-shot examples teach the model Amo's communication style

const AMO_COMMUNICATION_EXAMPLES = `
[Example exchanges — follow this style exactly]

User: kia ora how are you
Amo: Kia ora. All good here. What do you need?

User: whats the weather like in hamilton
Amo: I don't have live weather. Check MetService.co.nz or say "search for Hamilton weather" and I'll pull it up.

User: can you explain what ram is
Amo: RAM is your phone's short-term memory. It holds whatever you're actively using. More RAM means more apps can run at once without slowing down.

User: yo amo open the terminal
Amo: Opening terminal now.

User: what can you do
Amo: I can chat, search the web, run terminal commands, create and edit files, read documents you import, and remember things you tell me. Want me to show you something specific?

User: bro i need help with my code
Amo: What's the issue? Share the file or describe the error and I'll sort it out.

User: search for latest nz news
Amo: Searching now. One sec.
`.trim();

// ── PRIMARY PROMPT ─────────────────────────────────────────────────────────────

function buildPrimaryPrompt(
  userInput: string,
  session: NativeSessionMessage[],
  knowledgeContext?: string,
  webContext?: string,
): string {
  const recentTurns = buildRecentTurns(session);
  const responseLength = detectResponseLength(userInput);
  const compactUser = normalizeText(userInput, MAX_USER_CHARS);

  const parts: string[] = [
    // Identity — compact, no wasted tokens on architecture meta-description
    'You are Amo, a grounded male AI assistant from Aotearoa New Zealand.',
    'You are honest, direct, and practical. You never make things up.',
    'If something is unclear, say so and ask one short clarifying question.',
    // Personality traits
    'Amo has dry NZ humour — deadpan, well-timed, never forced.',
    'When asked to tell a story: set the scene first, build atmosphere, let the meaning emerge.',
    'When asked to write a song: use specific images, real places, honest emotion. NZ references welcome.',
    // Few-shot examples for communication style
    AMO_COMMUNICATION_EXAMPLES,
    `Current date and time (NZ): ${new Intl.DateTimeFormat('en-NZ', {
      timeZone: 'Pacific/Auckland',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date())}`,
    responseLength === 'full'
      ? 'Give a complete, helpful answer. Use as many sentences as genuinely needed — do not cut off important information.'
      : 'Be concise. Answer directly in plain language.',
  ];

  // Web context FIRST — before knowledge, before history
  // Small models attend strongly to early context
  if (webContext) {
    const compactWeb = normalizeText(webContext, MAX_WEB_CHARS);
    parts.push(
      `[Live web information — use this to answer accurately. Include the source URL in your reply.]\n${compactWeb}`
    );
  }

  // Knowledge context SECOND
  if (knowledgeContext) {
    const compactKnowledge = normalizeText(knowledgeContext, MAX_KNOWLEDGE_CHARS);
    parts.push(
      `[Knowledge base — use this information to answer the question]\n${compactKnowledge}`
    );
  }

  // Conversation history THIRD
  if (recentTurns) {
    parts.push(`[Recent conversation]\n${recentTurns}`);
  }

  // User question LAST — just before generation
  parts.push(`User: ${compactUser}`);
  parts.push('Amo:');

  return parts.join('\n\n');
}

// ── FALLBACK PROMPT ────────────────────────────────────────────────────────────
// Used only if primary prompt produces a bad response
// Simpler structure, still preserves web context and full user input

function buildFallbackPrompt(userInput: string, webContext?: string): string {
  const compactUser = normalizeText(userInput, MAX_USER_CHARS);

  const parts = [
    'You are Amo, a helpful AI assistant from New Zealand.',
    'Answer the question directly and honestly.',
    'If you do not know, say so plainly.',
  ];

  if (webContext) {
    const compactWeb = normalizeText(webContext, 600);
    parts.push(`[Web information — use this and include the URL]\n${compactWeb}`);
  }

  parts.push(`User: ${compactUser}`);
  parts.push('Amo:');

  return parts.join('\n\n');
}

// ── RESPONSE SANITIZER ─────────────────────────────────────────────────────────

function sanitizeResponse(text: string): string {
  const hasUrl = /https?:\/\//.test(text);

  let cleaned = text
    .replace(/^(amo|assistant)\s*:\s*/i, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();

  // Preserve URL formatting, otherwise collapse whitespace
  return hasUrl ? cleaned : cleaned.replace(/\s+/g, ' ').trim();
}

// ── RESPONSE VALIDATOR ─────────────────────────────────────────────────────────

function isBadResponse(text: string): boolean {
  if (!text || text.length < 3) return true;

  const normalized = text.toLowerCase();

  const badPhrases = [
    'ai language model',
    'as an ai',
    'we are a group',
    'smarts, we are a group',
    'amo:',
    'user:',                    // model continued the conversation itself
    'i cannot provide',          // overly refusal-heavy non-answer
    '...',                       // empty thinking output
  ];

  if (badPhrases.some(p => normalized === p || normalized.startsWith(p + ' '))) return true;

  // Repetition — model looping on itself
  const words = normalized.split(/\s+/);
  if (words.length >= 6) {
    const half = Math.floor(words.length / 2);
    const firstHalf = words.slice(0, half).join(' ');
    const secondHalf = words.slice(half).join(' ');
    if (firstHalf === secondHalf) return true;
  }

  return false;
}

// ── RESULT TYPE ───────────────────────────────────────────────────────────────

export interface NativeReplyResult {
  text: string;
  status: NativeOfflineStatus | null;
  promptStrategy: 'primary' | 'fallback';
}

// ── ORCHESTRATOR ───────────────────────────────────────────────────────────────

export const nativeAssistantOrchestrator = {
  async generateReply(options: {
    userInput: string;
    session: NativeSessionMessage[];
    knowledgeContext?: string;
    webContext?: string;
    runPrompt: (
      prompt: string,
      timeoutMessage: string,
    ) => Promise<{ text: string; status: NativeOfflineStatus | null }>;
  }): Promise<NativeReplyResult> {

    // NOTE: No deterministic interceptor here.
    // App.tsx and nativeReplyCoordinator handle greetings/acks before this runs.
    // Anything reaching this function should go through the full knowledge pipeline.

    // ── Primary attempt ──────────────────────────────────────────────────────
    {
      const prompt = buildPrimaryPrompt(
        options.userInput,
        options.session,
        options.knowledgeContext,
        options.webContext,
      );

      console.info('[AskAmo] Primary prompt length:', prompt.length);

      const generated = await options.runPrompt(
        prompt,
        'Native model timed out on primary prompt. Try reloading the model or switching to a cloud model.',
      );

      console.info('[AskAmo] Native output (primary):', generated.text);
      const sanitized = sanitizeResponse(generated.text);

      if (!isBadResponse(sanitized)) {
        return { text: sanitized, status: generated.status, promptStrategy: 'primary' };
      }

      console.warn('[AskAmo] Primary response failed validation, trying fallback.');
    }

    // ── Fallback attempt ─────────────────────────────────────────────────────
    {
      const prompt = buildFallbackPrompt(options.userInput, options.webContext);

      console.info('[AskAmo] Fallback prompt length:', prompt.length);

      const generated = await options.runPrompt(
        prompt,
        'Native model timed out on fallback prompt. Reload the model or switch to a cloud model.',
      );

      console.info('[AskAmo] Native output (fallback):', generated.text);
      const sanitized = sanitizeResponse(generated.text);

      if (!isBadResponse(sanitized)) {
        return { text: sanitized, status: generated.status, promptStrategy: 'fallback' };
      }
    }

    throw new Error('Native offline runtime returned an unusable response after both attempts.');
  },
};
