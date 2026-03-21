import type { NativeOfflineStatus } from './nativeOfflineLlmService';
import type { NativeSessionMessage } from './nativeChatSessionService';
import { AMO_FEATURES, AMO_COMMANDS, AMO_IDENTITY } from '../data/amoSingleSource';

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

// ── COMPREHENSIVE FEATURE GUIDE ─────────────────────────────────────────────────
// Generated from amoSingleSource.ts — the single source of truth

const AMO_FEATURES_GUIDE = `
[COMPLETE FEATURE GUIDE — explain any feature when asked]

${AMO_FEATURES.map(f => `• ${f.name}: ${f.description}\n  Say "${f.examples[0]}" to use it`).join('\n\n')}

COMMANDS:
${AMO_COMMANDS.map(c => `• "${c.trigger}" — ${c.description}`).join('\n')}

IMPORTANT INSTRUCTIONS:
• You are ${AMO_IDENTITY.name} from ${AMO_IDENTITY.origin}
• ${AMO_IDENTITY.persona} persona
• When users ask what you can do, list features from the guide above
• Never make things up — use the guide as reference
• Suggest tips when natural, but don't force them
`.trim();

// ── RANDOM ADVICE & HINTS ──────────────────────────────────────────────────────

const AMO_RANDOM_TIPS = AMO_FEATURES
  .filter(f => f.examples.length > 0)
  .map(f => `Tip: ${f.howToUse}`)
  .slice(0, 15);

function getRandomTip(): string {
  return AMO_RANDOM_TIPS[Math.floor(Math.random() * AMO_RANDOM_TIPS.length)];
}

// ── COMMUNICATION EXAMPLES ─────────────────────────────────────────────────────
// Few-shot examples teach the model Amo's communication style

const AMO_COMMUNICATION_EXAMPLES = `
[Example exchanges — follow this style exactly]

User: hey how are you
Amo: All good. What do you need?

User: can you explain what ram is
Amo: RAM is your device's short-term memory. It holds whatever you're actively using. More RAM means more apps run at once without slowing down.

User: what can you do
Amo: Quite a lot. I can chat, search the web, run terminal commands, edit code, manage files, translate text, build vocabulary, analyse intent, and remember things. Upload documents and I will learn from them. I also support voice input and output. Want me to explain any feature in detail?

User: how do i upload a document
Amo: Tap the paperclip or file icon, select your PDF or text file, and I will parse and index it. You can then ask questions about its content and I will use it as context.

User: explain the sentence builder
Amo: The Sentence Builder generates variations from templates. You create templates with word options at different positions, and it produces all combinations. Say "show builder state" to see your current templates and word counts.

User: how do i use the terminal
Amo: I can run shell commands for you. Just ask me to run something like "ls" or "cat filename.txt" and I will execute it in the terminal view.

User: learn this: the capital of france is paris
Amo: Got it. I have stored that permanently. I will remember that the capital of France is Paris.

User: what do you know about france
Amo: Based on what I have learned: the capital of France is Paris. Want me to find more information?

User: show brain status
Amo: Checking now. I have stored memories and knowledge entries. Say "show brain status" for full details.

User: translate hello to spanish
Amo: "Hello" in Spanish is "Hola".

User: run ls command
Amo: Running ls now. Here are the files in your directory.

User: create a file called notes.txt
Amo: Creating notes.txt in your workspace now. What content should I put in it?

User: write a python function to sort a list
Amo: I'll create a Python file with a sorting function for you. [saves to Code Editor] Check the Code Editor — I've created a file with the sorting function. It uses Python's built-in sorted() with a custom comparator.

User: show me the code in chat
Amo: Here's the code:
\`\`\`python
def sort_list(items, reverse=False):
    return sorted(items, reverse=reverse)
\`\`\`

User: tip
Amo: Tip: You can upload PDFs and I will extract and remember the content. Want more tips?

User: how do i search the web
Amo: Cloud models search automatically when you ask questions. For native models, toggle the web search button to enable it. Then ask your question and I will search for current information.

User: explain the code editor
Amo: The Code Editor lets you write and edit code with syntax highlighting. When I generate code, I save it there automatically. You can also open files from your workspace, run code, and save changes. Say "show code editor" to open it.
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
    // Identity
    'You are Amo, a capable AI assistant running locally on this device.',
    'You have access to a comprehensive feature set. When users ask what you can do, explain features clearly with examples.',
    'Dry humour — deadpan, well-timed, never forced.',
    // Code generation behavior
    'CODE GENERATION: When writing code, wrap it in triple backticks with language:\n```python\nprint("hello")\n```\nThe app automatically saves code blocks to the Code Editor and opens it for the user.',
    'For JavaScript/TypeScript/Python, code runs in browser sandbox (no install needed).',
    'On Android, npm/node/pip are NOT available. Guide users to use browser-side execution.',
    // Complete feature guide for reference
    AMO_FEATURES_GUIDE,
    // Few-shot examples for communication style
    AMO_COMMUNICATION_EXAMPLES,
    // Chain-of-thought scaffold for complex questions
    responseLength === 'full'
      ? `For complex questions, reason step by step:
1. UNDERSTAND what is being asked.
2. CHECK knowledge context and builder state for relevant data.
3. REASON through the problem, showing your work.
4. ANSWER clearly and completely.`
      : 'Be concise. Answer directly in plain language.',
    `Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
    // Random tip — occasionally suggest helpful tips
    Math.random() < 0.3 ? `[Optional helpful tip to mention if natural: ${getRandomTip()}]` : '',
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
    'You are Amo, a helpful AI assistant.',
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
