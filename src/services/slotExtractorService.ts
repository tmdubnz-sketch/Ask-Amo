export interface ExtractedSlots {
  action: string | null;
  subject: string | null;
  target: string | null;
  qualifier: string | null;
  topic: string | null;
  location: string | null;
  timeRef: string | null;
  fileRef: string | null;
  url: string | null;
  rawIntent: string;
  confidence: number;
}

const SLOT_PATTERNS = {
  action: [
    { pattern: /\b(search(?:\s+for)?|look\s+up|find|fetch|scan|browse)\b/i, value: 'search' },
    { pattern: /\b(open|launch|start|show|go\s+to|switch\s+to|navigate\s+to|take\s+me\s+to)\b/i, value: 'navigate' },
    { pattern: /\b(write|create|generate|make|build|code|draft|compose)\b/i, value: 'create' },
    { pattern: /\b(run|execute|install|build|compile|test|debug)\b/i, value: 'execute' },
    { pattern: /\b(read|analyze|analyse|review|check|inspect|examine|parse)\b/i, value: 'read' },
    { pattern: /\b(explain|describe|tell\s+me\s+about|summarize|define|clarify)\b/i, value: 'explain' },
    { pattern: /\b(edit|update|fix|change|modify|refactor|improve|rewrite)\b/i, value: 'modify' },
    { pattern: /\b(delete|remove|clear|close|stop|cancel|exit|quit)\b/i, value: 'remove' },
    { pattern: /\b(download|import|upload|add|install|get)\b/i, value: 'acquire' },
    { pattern: /\b(remember|save|store|keep)\b/i, value: 'store' },
    { pattern: /\b(show\s+me|display|list|view)\b/i, value: 'display' },
    { pattern: /\b(help|assist|support)\b/i, value: 'help' },
    { pattern: /\b(translate|convert)\b/i, value: 'transform' },
    { pattern: /\b(play|start|resume|pause)\b/i, value: 'media' },
  ],

  subject: [
    { pattern: /\b(can|could|will|would|do)\s+you\b/i, value: 'amo' },
    { pattern: /\b(can|could|will|would|do)\s+we\b/i, value: 'together' },
    { pattern: /\b(can|could|will|do)\s+i\b/i, value: 'user' },
    { pattern: /\bamo\b/i, value: 'amo' },
  ],

  target: [
    { pattern: /\b(webview|web\s*view|browser|android\s+browser)\b/i, value: 'webview' },
    { pattern: /\b(terminal|console|shell|command\s+line|bash)\b/i, value: 'terminal' },
    { pattern: /\b(code\s+editor|editor|ide|coding\s+view)\b/i, value: 'editor' },
    { pattern: /\b(chat|conversation|messages?|home|main\s+view)\b/i, value: 'chat' },
    { pattern: /\b(settings?|preferences?|config)\b/i, value: 'settings' },
    { pattern: /\b(knowledge|brain|documents?|files?|workspace|folder)\b/i, value: 'knowledge' },
    { pattern: /\b(voice|microphone|mic|speech)\b/i, value: 'voice' },
    { pattern: /\b(model|ai\s+model|offline\s+model|gguf)\b/i, value: 'models' },
    { pattern: /\b(memory|history|past|previous)\b/i, value: 'memory' },
    { pattern: /\b(sidebar|menu|panel)\b/i, value: 'sidebar' },
  ],

  qualifier: [
    { pattern: /\b(latest|newest|most\s+recent|current|today'?s?)\b/i, value: 'latest' },
    { pattern: /\b(best|top|highest|most\s+popular)\b/i, value: 'best' },
    { pattern: /\b(all|every|full|complete|entire)\b/i, value: 'all' },
    { pattern: /\b(quick|fast|brief|short|simple)\b/i, value: 'brief' },
    { pattern: /\b(detailed|full|in\s+depth|comprehensive|step\s+by\s+step)\b/i, value: 'detailed' },
    { pattern: /\b(offline|local|on\s*device)\b/i, value: 'offline' },
    { pattern: /\b(online|live|real.?time|cloud)\b/i, value: 'live' },
  ],

  timeRef: [
    { pattern: /\b(today|right now|now|currently|at the moment)\b/i, value: 'now' },
    { pattern: /\b(tomorrow|next day)\b/i, value: 'tomorrow' },
    { pattern: /\b(yesterday|last night|the other day)\b/i, value: 'yesterday' },
    { pattern: /\b(this week|this month|this year)\b/i, value: 'this_period' },
    { pattern: /\b(next week|next month|next year)\b/i, value: 'next_period' },
    { pattern: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, value: 'named_day' },
    { pattern: /\b(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\b/i, value: 'date' },
    { pattern: /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i, value: 'time' },
  ],

  fileRef: [
    { pattern: /\b\w+\.(pdf|txt|md|js|ts|py|json|csv|html|css|docx|xlsx)\b/i, value: 'filename' },
    { pattern: /\b(this file|that file|the file|my file|the document)\b/i, value: 'contextual_file' },
    { pattern: /["']([^"']+\.(?:pdf|txt|md|js|ts|py|json|csv))["']/i, value: 'quoted_filename' },
  ],

  url: [
    { pattern: /https?:\/\/[^\s]+/i, value: 'full_url' },
    { pattern: /www\.[^\s]+\.[a-z]{2,}/i, value: 'www_url' },
    { pattern: /[a-z0-9-]+\.(com|nz|co\.nz|org|net|io|gov)[^\s]*/i, value: 'domain' },
  ],
};

const NAV_PREFIX = /^(go\s+to|switch\s+(back\s+)?to|navigate\s+to|take\s+me\s+to|open\s+up|pull\s+up|bring\s+up|show\s+me)\s+/i;
const SUBJECT_PREFIX = /^(can|could|will|would|do|does|did)\s+(you|we|i|amo)\s+/i;

function extractTopic(input: string): string | null {
  let working = input.toLowerCase();

  const stripPatterns = [
    NAV_PREFIX,
    SUBJECT_PREFIX,
    /\b(can|could|will|would|do|does|did|please|hey|amo)\b/gi,
    /\b(you|we|i|me|us|your|my)\b/gi,
  ];

  for (const p of stripPatterns) {
    working = working.replace(p, ' ');
  }

  for (const { pattern } of SLOT_PATTERNS.action) {
    working = working.replace(pattern, ' ');
  }

  for (const { pattern } of SLOT_PATTERNS.target) {
    working = working.replace(pattern, ' ');
  }

  working = working.replace(/\b(in|on|at|to|for|about|with|from|by|of|the|a|an)\b/gi, ' ');

  const cleaned = working.replace(/\s+/g, ' ').trim();
  return cleaned.length > 2 ? cleaned : null;
}

const LOCATION_PATTERNS = [
  /\bin\s+([A-Z][a-zA-Z\s]+?)(?:\s+(?:now|today|currently|please|for|about)|\?|$)/i,
  /\bfor\s+([A-Z][a-zA-Z\s]+?)(?:\s+(?:now|today|currently|please)|\?|$)/i,
  /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?),?\s+(?:New Zealand|NZ|Australia|USA|UK)\b/i,
  /\b(Auckland|Wellington|Christchurch|Hamilton|Tauranga|Dunedin|Napier|Palmerston North|Nelson|Rotorua|Whangarei|Invercargill|Whanganui|Gisborne|Hastings)\b/i,
];

function extractLocation(input: string): string | null {
  for (const pattern of LOCATION_PATTERNS) {
    const match = input.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

export function extractSlots(input: string): ExtractedSlots {
  const slots: ExtractedSlots = {
    action: null,
    subject: null,
    target: null,
    qualifier: null,
    topic: null,
    location: null,
    timeRef: null,
    fileRef: null,
    url: null,
    rawIntent: input,
    confidence: 0,
  };

  for (const [slotName, patterns] of Object.entries(SLOT_PATTERNS)) {
    for (const { pattern, value } of patterns as { pattern: RegExp; value: string }[]) {
      if (pattern.test(input)) {
        (slots as any)[slotName] = value;

        if (slotName === 'url') {
          const match = input.match(pattern);
          if (match) slots.url = match[0];
        }
        if (slotName === 'fileRef') {
          const match = input.match(pattern);
          if (match) slots.fileRef = match[1] || match[0];
        }

        break;
      }
    }
  }

  slots.topic = extractTopic(input);
  slots.location = extractLocation(input);

  const filledSlots = Object.values(slots)
    .filter(v => v !== null && v !== input && typeof v === 'string').length;
  slots.confidence = Math.min(filledSlots / 4, 1);

  return slots;
}

export function slotsToKnowledgeQuery(slots: ExtractedSlots): string {
  const parts: string[] = [];

  parts.push(slots.rawIntent);

  if (slots.action)    parts.push(slots.action);
  if (slots.target)    parts.push(slots.target);
  if (slots.topic)     parts.push(slots.topic);
  if (slots.qualifier) parts.push(slots.qualifier);
  if (slots.location)  parts.push(slots.location);

  const targetExpansions: Record<string, string[]> = {
    webview:   ['browser', 'web', 'browse', 'internet'],
    terminal:  ['shell', 'command', 'run', 'execute', 'bash'],
    editor:    ['code', 'write code', 'coding', 'programming'],
    knowledge: ['brain', 'import', 'document', 'memory', 'database'],
    voice:     ['speech', 'microphone', 'tts', 'speak', 'listen'],
    settings:  ['configure', 'setup', 'api key', 'preferences'],
  };

  if (slots.target && targetExpansions[slots.target]) {
    parts.push(...targetExpansions[slots.target]);
  }

  return [...new Set(parts)].join(' ');
}

export function slotsToPromptHint(slots: ExtractedSlots): string {
  const lines: string[] = [];

  if (slots.action)    lines.push(`Requested action: ${slots.action}`);
  if (slots.target)    lines.push(`Target feature: ${slots.target}`);
  if (slots.topic)     lines.push(`Topic: ${slots.topic}`);
  if (slots.qualifier) lines.push(`Qualifier: ${slots.qualifier}`);
  if (slots.location)  lines.push(`Location: ${slots.location}`);
  if (slots.timeRef)   lines.push(`Time reference: ${slots.timeRef}`);
  if (slots.fileRef)   lines.push(`File reference: ${slots.fileRef}`);
  if (slots.url)       lines.push(`URL: ${slots.url}`);

  if (lines.length === 0) return '';
  return `[Parsed intent]\n${lines.join('\n')}`;
}
