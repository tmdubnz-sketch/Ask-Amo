export interface ParsedIntent {
  action: string | null;
  subject: string | null;
  preposition: string | null;
  target: string | null;
  raw: string;
  confidence: 'high' | 'medium' | 'low';
  category: IntentCategory;
}

export type IntentCategory =
  | 'capability_query'
  | 'feature_query'
  | 'action_request'
  | 'content_request'
  | 'search_request'
  | 'file_request'
  | 'web_request'
  | 'unknown';

const ACTION_VERBS = {
  execute:   ['run', 'execute', 'launch', 'start', 'boot', 'invoke', 'trigger'],
  create:    ['write', 'create', 'make', 'build', 'generate', 'produce', 'draft', 'code', 'compose'],
  retrieve:  ['search', 'find', 'fetch', 'get', 'look up', 'scan', 'query', 'pull', 'grab', 'locate'],
  display:   ['show', 'open', 'display', 'render', 'load', 'view', 'list'],
  explain:   ['explain', 'describe', 'tell', 'summarize', 'define', 'clarify', 'break down'],
  read:      ['read', 'parse', 'analyze', 'analyse', 'review', 'check', 'inspect', 'examine'],
  modify:    ['edit', 'update', 'change', 'fix', 'debug', 'improve', 'refactor', 'patch'],
  remove:    ['close', 'exit', 'delete', 'clear', 'remove', 'stop', 'cancel', 'kill'],
  provide:   ['provide', 'give', 'send', 'return', 'output', 'print', 'export'],
  install:   ['install', 'download', 'import', 'add', 'setup', 'configure'],
} as const;

export type ActionGroup = keyof typeof ACTION_VERBS;

const ALL_ACTIONS = Object.values(ACTION_VERBS).flat();

const FEATURE_TARGETS: Record<string, string> = {
  webview: 'webview', browser: 'webview', 'web browser': 'webview',
  web: 'webview', website: 'webview', url: 'webview', link: 'webview',
  page: 'webview', site: 'webview', internet: 'webview',
  terminal: 'terminal', shell: 'terminal', command: 'terminal',
  bash: 'terminal', console: 'terminal', cmd: 'terminal',
  script: 'terminal', cli: 'terminal',
  editor: 'editor', 'code editor': 'editor', code: 'editor',
  coding: 'editor', file: 'editor', files: 'editor', snippet: 'editor',
  voice: 'voice', microphone: 'voice', mic: 'voice',
  speak: 'voice', speech: 'voice', talk: 'voice', audio: 'voice',
  listen: 'voice', dictate: 'voice', tts: 'voice',
  knowledge: 'knowledge', brain: 'knowledge', document: 'knowledge',
  doc: 'knowledge', pdf: 'knowledge', dataset: 'knowledge',
  database: 'knowledge', memory: 'knowledge', skill: 'knowledge',
  import: 'knowledge', upload: 'knowledge',
  search: 'websearch', 'web search': 'websearch', 'search engine': 'websearch',
  'look up': 'websearch', google: 'websearch', find: 'websearch',
  online: 'websearch', live: 'websearch',
  model: 'models', 'ai model': 'models', offline: 'models',
  gguf: 'models', groq: 'models', gemini: 'models',
  openai: 'models', openrouter: 'models', webllm: 'models',
  chat: 'chat', conversation: 'chat', message: 'chat', reply: 'chat',
  settings: 'settings', configure: 'settings', setup: 'settings',
};

const PREPOSITIONS = ['in', 'with', 'to', 'about', 'for', 'on', 'from', 'at', 'using', 'via', 'through', 'into'];

const CAPABILITY_OPENERS = [
  /^(can|could|would|will|does|do)\s+(you|amo)\b/i,
  /^(what|how)\s+(can|could|do|does|would|should)\s+(you|we|i|amo)\b/i,
  /^what\s+(are|is)\s+(you|your|amo'?s?)\b/i,
  /^(are you able|are you capable|do you (have the ability|support|handle))\b/i,
  /^(show|tell)\s+(me)?\s*(what|how|your|all)\b/i,
];

export function parseUserIntent(input: string): ParsedIntent {
  const normalized = input.trim().toLowerCase();
  const words = normalized.split(/\s+/);

  let action: string | null = null;
  let actionGroup: ActionGroup | null = null;
  for (const [group, verbs] of Object.entries(ACTION_VERBS)) {
    for (const verb of verbs) {
      if (normalized.includes(verb)) {
        action = verb;
        actionGroup = group as ActionGroup;
        break;
      }
    }
    if (action) break;
  }

  const subjectMatch = normalized.match(/\b(you|amo|we|i)\b/);
  const subject = subjectMatch?.[1] || null;

  let preposition: string | null = null;
  for (const prep of PREPOSITIONS) {
    if (normalized.includes(` ${prep} `)) {
      preposition = prep;
      break;
    }
  }

  let target: string | null = null;
  for (const [phrase, feature] of Object.entries(FEATURE_TARGETS)) {
    if (normalized.includes(phrase)) {
      target = feature;
      break;
    }
  }

  let category: IntentCategory = 'unknown';
  const isCapabilityQuery = CAPABILITY_OPENERS.some(p => p.test(normalized));

  if (isCapabilityQuery && !target && !action) {
    category = 'capability_query';
  } else if (isCapabilityQuery && (target || action)) {
    category = 'feature_query';
  } else if (actionGroup === 'retrieve' || actionGroup === 'read') {
    category = normalized.match(/\b(url|http|website|page|site)\b/) ? 'web_request' : 'search_request';
  } else if (actionGroup === 'execute' || actionGroup === 'display' || actionGroup === 'remove') {
    category = 'action_request';
  } else if (actionGroup === 'create' || actionGroup === 'modify' || actionGroup === 'provide') {
    category = 'content_request';
  } else if (actionGroup === 'explain') {
    category = 'feature_query';
  } else if (target === 'websearch' || normalized.match(/\b(search|find|look up|fetch|scan)\b/)) {
    category = 'search_request';
  } else if (target) {
    category = 'feature_query';
  }

  const confidence = (action && target)
    ? 'high'
    : (action || target || isCapabilityQuery)
    ? 'medium'
    : 'low';

  return { action, subject, preposition, target, raw: input, confidence, category };
}

export function buildKnowledgeQuery(intent: ParsedIntent): string {
  const parts: string[] = [intent.raw];

  if (intent.target) {
    const featureAliases: Record<string, string[]> = {
      webview:    ['webview', 'browser', 'web', 'browse'],
      terminal:   ['terminal', 'command', 'shell', 'run', 'execute'],
      editor:     ['code editor', 'editor', 'code', 'write code'],
      voice:      ['voice', 'microphone', 'speech', 'tts'],
      knowledge:  ['knowledge', 'brain', 'import', 'document', 'memory'],
      websearch:  ['web search', 'search', 'internet', 'live'],
      models:     ['model', 'offline', 'gguf', 'groq', 'gemini'],
      chat:       ['chat', 'conversation', 'message'],
      settings:   ['settings', 'configure', 'api key'],
    };
    const aliases = featureAliases[intent.target] || [intent.target];
    parts.push(...aliases);
  }

  if (intent.action) parts.push(intent.action);
  if (intent.category !== 'unknown') parts.push(intent.category.replace('_', ' '));

  return [...new Set(parts)].join(' ');
}

export function shouldForceRetrieval(intent: ParsedIntent): boolean {
  return (
    intent.category === 'capability_query' ||
    intent.category === 'feature_query' ||
    intent.confidence === 'high' ||
    intent.target !== null
  );
}

export function shouldTriggerWebSearch(intent: ParsedIntent, input: string): boolean {
  if (intent.category === 'web_request') return true;
  if (intent.category === 'search_request') return true;
  if (intent.action && ['search', 'find', 'fetch', 'look up', 'scan'].includes(intent.action)) return true;
  if (/\b(current|latest|today|now|live|recent|real.?time|news|price|weather)\b/i.test(input)) return true;
  if (/https?:\/\//i.test(input)) return true;
  return false;
}
