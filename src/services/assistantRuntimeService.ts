import { amoBrainService } from './amoBrainService';
import { vectorDbService } from './vectorDbService';

interface RuntimeMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AssistantContextBundle {
  memoryContext: string;
  knowledgeContext: string;
  webContext: string;
  combinedContext: string;
  intent: string;
  recentTurns: string;
}

function trimText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text.trim();
  }

  return text.slice(text.length - maxChars).trim();
}

function detectIntent(userInput: string, messages: RuntimeMessage[]): string {
  const normalized = userInput.trim().toLowerCase();
  const lastAssistantTurn = [...messages].reverse().find((message) => message.role === 'assistant')?.content.toLowerCase() || '';
  const actionKeywords = [
    'run', 'open', 'search', 'edit', 'find', 'scan', 'code', 'listen', 'watch', 'build', 'fix', 'install',
    'create', 'write', 'read', 'use', 'show', 'check', 'debug', 'browse', 'execute', 'launch', 'import',
  ];
  const questionStarters = ['can you', 'do you', 'is there', 'how to', 'how do', 'what is', 'where is', 'why does'];

  if (questionStarters.some((starter) => normalized.startsWith(starter))) {
    return 'instruction';
  }

  if (actionKeywords.some((keyword) => normalized.includes(keyword))) {
    return 'task';
  }

  if (/^(what|why|how|when|where|who|which)\b/.test(normalized) || normalized.endsWith('?')) {
    return 'question';
  }

  if (/^(can you|please|show|tell|write|make|give|help|explain|summarize)\b/.test(normalized)) {
    return 'instruction';
  }

  if (/^(yes|no|nah|yep|yup|okay|ok|sure|true|false)\b/.test(normalized) || normalized.length < 18) {
    return lastAssistantTurn ? 'follow_up' : 'short_reply';
  }

  if (normalized.includes('idea') || normalized.includes('suggest') || normalized.includes('should we')) {
    return 'idea';
  }

  return 'conversation';
}

function buildRecentTurns(messages: RuntimeMessage[], limit = 4): string {
  const turns = messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-limit)
    .map((message) => `${message.role === 'user' ? 'User' : 'Amo'}: ${trimText(message.content.replace(/\s+/g, ' '), 48)}`);

  return turns.join('\n');
}

function buildOperationalGuidance(intent: string): string {
  const lines = [
    'Amo operating rules:',
    '- Prefer local memory, imported knowledge, and device tools before using live web.',
    '- Give an immediate direct answer first whenever possible so the user does not wait.',
    '- If a word is unfamiliar or the sentence structure is strange, say so plainly and ask for clarification.',
    '- Use phrases like "that did not make sense", "sorry can you repeat that?", or "did you mean ...?" when needed.',
    '- If the user likely meant a nearby known word, offer the closest clear suggestion.',
    '- If the request becomes a multi-step job, switch into task mode and prefer terminal and webview tools.',
    '- Use live web assist only when the answer is missing locally, unclear, or needs fresh external information.',
  ];

  if (intent === 'instruction' || intent === 'idea' || intent === 'task') {
    lines.push('- Task mode: break work into short steps, use terminal for execution, and verify results before moving on.');
    lines.push('- Look for action verbs and direct objects in the user request so you understand what to operate on.');
    lines.push('- Common intent phrases include can you, do you, is there, how to, run, open, search, edit, find, scan, code, listen, and watch.');
  }

  return lines.join('\n');
}

export const assistantRuntimeService = {
  async buildNativeContextBundle(options: {
    scope: string;
    userInput: string;
    messages: RuntimeMessage[];
    webContext?: string;
  }): Promise<AssistantContextBundle> {
    const memoryContext = await amoBrainService.buildFastContext(options.scope, options.userInput);
    const compactTurns = options.messages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .slice(-6)
      .map((message) => `${message.role === 'user' ? 'User' : 'Amo'}: ${trimText(message.content.replace(/\s+/g, ' '), 120)}`)
      .join('\n');

    const truncatedWebContext = options.webContext ? options.webContext.slice(0, 800).trim() : '';

    // Search core knowledge for the native offline model
    const knowledgeResults = await vectorDbService.search(options.userInput, 4);
    const knowledgeContext = knowledgeResults.length > 0
      ? knowledgeResults.map((result) => result.content).join('\n\n')
      : '';
    const combinedContext = [buildOperationalGuidance(detectIntent(options.userInput, options.messages)), memoryContext, knowledgeContext, truncatedWebContext]
      .filter(Boolean)
      .join('\n\n');

    return {
      memoryContext,
      knowledgeContext,
      webContext: truncatedWebContext,
      combinedContext,
      intent: detectIntent(options.userInput, options.messages),
      recentTurns: compactTurns,
    };
  },

  async buildContextBundle(options: {
    scope: string;
    userInput: string;
    messages: RuntimeMessage[];
    includeKnowledge: boolean;
    webContext?: string;
  }): Promise<AssistantContextBundle> {
    const [memoryContext, knowledgeResults] = await Promise.all([
      amoBrainService.buildFastContext(options.scope, options.userInput),
      options.includeKnowledge ? vectorDbService.search(options.userInput) : Promise.resolve([]),
    ]);

    const knowledgeContext = knowledgeResults.length > 0
      ? knowledgeResults.map((result) => result.content).join('\n\n')
      : '';
    const intent = detectIntent(options.userInput, options.messages);
    const combinedContext = [buildOperationalGuidance(intent), memoryContext, knowledgeContext, options.webContext || '']
      .filter(Boolean)
      .join('\n\n')
      .trim();

    return {
      memoryContext,
      knowledgeContext,
      webContext: options.webContext || '',
      combinedContext,
      intent,
      recentTurns: buildRecentTurns(options.messages),
    };
  },

  buildNativePrompt(options: {
    userInput: string;
    contextBundle: AssistantContextBundle;
  }): string {
    const compactUser = trimText(options.userInput.replace(/\s+/g, ' ').trim(), 400);
    const compactTurns = trimText(options.contextBundle.recentTurns.replace(/\s+/g, ' ').trim(), 80);
    const promptParts = [
      'You are Amo.',
      'Reply naturally in one short sentence.',
    ];

    if (compactTurns) {
      promptParts.push(`Recent: ${compactTurns}`);
    }

    promptParts.push(`User: ${compactUser}`);
    promptParts.push('Amo:');
    return promptParts.join('\n');
  },
};
