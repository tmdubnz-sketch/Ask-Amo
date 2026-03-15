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
    'You are Amo — a grounded, practical, honest AI assistant with a calm NZ voice.',
    'You are direct and clear. You never pad responses. You never make things up.',
    'If something is unclear, ask one short clarifying question.',
    'Prefer local knowledge and memory before using live web.',
    'Give an immediate direct answer first whenever possible.',
    'Use plain language. Avoid jargon unless the user uses it first.',
  ];

  if (intent === 'task' || intent === 'instruction') {
    lines.push('Break complex tasks into numbered steps. Verify results before moving on.');
    lines.push('Prefer terminal for execution tasks, WebView for research and browsing.');
  }

  if (intent === 'question') {
    lines.push('Answer the question directly first, then add context if genuinely useful.');
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

    const truncatedWebContext = options.webContext ? options.webContext.slice(0, 2000).trim() : '';

    // Search core knowledge for the native offline model
    const knowledgeResults = await vectorDbService.search(options.userInput, 5);
    const knowledgeContext = knowledgeResults.length > 0
      ? knowledgeResults.map((result) => result.content).join('\n\n')
      : '';
    const combinedContext = [buildOperationalGuidance(detectIntent(options.userInput, options.messages)), knowledgeContext, memoryContext, truncatedWebContext]
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
      options.includeKnowledge ? vectorDbService.search(options.userInput, 8) : Promise.resolve([]),
    ]);

    const knowledgeContext = knowledgeResults.length > 0
      ? knowledgeResults.map((result, i) => `<doc id='${i + 1}' title='${result.documentName || 'Document'}':>${result.content}</doc>`).join('\n')
      : '';
    const intent = detectIntent(options.userInput, options.messages);
    const hasLongContext = knowledgeContext.length > 1000;
    const combinedContext = [buildOperationalGuidance(intent), knowledgeContext, memoryContext, options.webContext || '', hasLongContext ? 'Answer using the knowledge above. Be direct and grounded.' : '']
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
    const compactTurns = trimText(options.contextBundle.recentTurns.replace(/\s+/g, ' ').trim(), 320);
    const compactContext = trimText(options.contextBundle.combinedContext.replace(/\s+/g, ' ').trim(), 600);
    
    const compactWeb = options.contextBundle.webContext
      ? trimText(options.contextBundle.webContext.replace(/\s+/g, ' ').trim(), 800)
      : '';

    const promptParts = [
      'You are Amo, a grounded practical AI assistant from Aotearoa New Zealand.',
      'Be honest, direct, and helpful. Use as many sentences as needed — never truncate an important answer.',
      'Never make things up. If you do not know, say so plainly.',
    ];

    if (compactContext) {
      promptParts.push(`[Knowledge and memory]\n${compactContext}`);
    }

    if (compactWeb) {
      promptParts.push(`[Live web information — use this to answer accurately]\n${compactWeb}`);
    }

    if (compactTurns) {
      promptParts.push(`[Recent conversation]\n${compactTurns}`);
    }

    promptParts.push(`User: ${compactUser}`);
    promptParts.push('Amo:');
    return promptParts.join('\n\n');
  },
};
