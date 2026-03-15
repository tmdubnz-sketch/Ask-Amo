export type AppView = 'chat' | 'webview' | 'terminal' | 'editor';

export interface ParsedCommand {
  type: 'attention' | 'navigate' | 'action' | 'search' | 'url' | 'none';
  view?: AppView;
  url?: string;
  action?: string;
  searchQuery?: string;
  reply: string;
  instant: boolean;
}

const ATTENTION_PATTERNS = [
  /^amo[.!?]*$/i,
  /^hey amo[.!?]*$/i,
  /^amo[,\s]+(are you there|you there|listen|ready)[.!?]*$/i,
  /^(yo|kia ora|oi)[,\s]+amo[.!?]*$/i,
];

interface NavTarget {
  view: AppView;
  reply: string;
  url?: string;
}

const VIEW_ALIASES: Record<AppView, string[]> = {
  chat: [
    'chat', 'conversation', 'messages', 'home', 'main', 'back',
    'go back', 'return', 'chat view', 'message view',
  ],
  webview: [
    'webview', 'web view', 'browser', 'web browser', 'internet',
    'web', 'browse', 'android webview', 'website', 'online',
  ],
  terminal: [
    'terminal', 'console', 'shell', 'command line', 'cmd',
    'bash', 'command prompt', 'cli', 'run commands',
  ],
  editor: [
    'editor', 'code editor', 'code', 'coding', 'text editor',
    'ide', 'edit code', 'write code', 'code view',
  ],
};

const VIEW_REPLIES: Record<AppView, string> = {
  chat:     'Back in chat. What do you need?',
  webview:  'Opening the browser now.',
  terminal: 'Terminal is open. Ready to run commands.',
  editor:   'Code editor is open.',
};

const NAV_VERB_PATTERN = /^(go to|switch to|switch back to|navigate to|take me to|open|show|launch|load|bring up|move to|jump to|get to)\s+/i;

interface ActionTarget {
  patterns: RegExp[];
  reply: string;
  action: string;
}

const ACTION_TARGETS: ActionTarget[] = [
  {
    patterns: [
      /\b(workspace|files?|file browser|file manager|folder|documents?|imports?)\b/i,
    ],
    reply: 'Opening your workspace files.',
    action: 'open_workspace',
  },
  {
    patterns: [
      /\b(settings?|preferences?|config|configure|setup)\b/i,
    ],
    reply: 'Opening settings.',
    action: 'open_settings',
  },
  {
    patterns: [
      /\b(new chat|new conversation|fresh chat|start over|start fresh)\b/i,
    ],
    reply: 'Starting a new conversation.',
    action: 'new_chat',
  },
  {
    patterns: [
      /\b(clear( chat| conversation| messages)?|wipe chat|reset chat)\b/i,
    ],
    reply: 'Clearing the conversation.',
    action: 'clear_chat',
  },
  {
    patterns: [
      /\b(knowledge|brain|import knowledge|open knowledge)\b/i,
    ],
    reply: 'Opening the knowledge settings.',
    action: 'open_knowledge',
  },
  {
    patterns: [
      /\b(stop|cancel|never mind|forget it|abort)\b/i,
    ],
    reply: 'Stopped.',
    action: 'cancel',
  },
];

const SEARCH_VERB_PATTERN = /^(search( for| up)?|look up|find|google|browse for)\s+(.+)$/i;

const URL_PATTERN = /https?:\/\/\S+|www\.\S+\.\S+/i;

export function parseCommand(input: string): ParsedCommand {
  const raw = input.trim();
  const normalized = raw.toLowerCase().replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return { type: 'none', reply: '', instant: false };
  }

  if (ATTENTION_PATTERNS.some(p => p.test(normalized))) {
    return {
      type: 'attention',
      reply: 'Yeah, I am here. What do you need?',
      instant: true,
    };
  }

  const urlMatch = raw.match(URL_PATTERN);
  if (urlMatch) {
    const url = urlMatch[0].startsWith('http') ? urlMatch[0] : `https://${urlMatch[0]}`;
    return {
      type: 'url',
      view: 'webview',
      url,
      reply: `Opening ${url}.`,
      instant: true,
    };
  }

  const navMatch = normalized.match(NAV_VERB_PATTERN);
  if (navMatch) {
    const remainder = normalized.slice(navMatch[0].length).trim();

    for (const [view, aliases] of Object.entries(VIEW_ALIASES) as [AppView, string[]][]) {
      if (aliases.some(alias => remainder === alias || remainder.startsWith(alias))) {
        return {
          type: 'navigate',
          view,
          reply: VIEW_REPLIES[view],
          instant: true,
        };
      }
    }

    for (const target of ACTION_TARGETS) {
      if (target.patterns.some(p => p.test(remainder))) {
        return {
          type: 'action',
          action: target.action,
          reply: target.reply,
          instant: true,
        };
      }
    }
  }

  for (const [view, aliases] of Object.entries(VIEW_ALIASES) as [AppView, string[]][]) {
    if (aliases.includes(normalized)) {
      return {
        type: 'navigate',
        view,
        reply: VIEW_REPLIES[view],
        instant: true,
      };
    }
  }

  for (const target of ACTION_TARGETS) {
    if (target.patterns.some(p => p.test(normalized))) {
      return {
        type: 'action',
        action: target.action,
        reply: target.reply,
        instant: true,
      };
    }
  }

  const searchMatch = normalized.match(SEARCH_VERB_PATTERN);
  if (searchMatch) {
    const query = searchMatch[2].trim();
    return {
      type: 'search',
      view: 'webview',
      searchQuery: query,
      url: `amo://search?q=${encodeURIComponent(query)}`,
      reply: `Searching for ${query}.`,
      instant: true,
    };
  }

  return { type: 'none', reply: '', instant: false };
}

const VOICE_SUBSTITUTIONS: [RegExp, string][] = [
  [/\bkia\s*ora\b/gi,       'kia ora'],
  [/\bhaere\s*mai\b/gi,     'haere mai'],
  [/\bko\s*rua\b/gi,        'korua'],
  [/\btena\s*koe\b/gi,      'tena koe'],
  [/\bswitch\s+back\b/gi,   'switch back to'],
  [/\bgoto\b/gi,             'go to'],
  [/\bopen\s+up\b/gi,        'open'],
  [/\bpull\s+up\b/gi,        'open'],
  [/\bbring\s+up\b/gi,       'open'],
  [/\bshow\s+me\b/gi,        'open'],
  [/\btake\s+me\s+to\b/gi,   'go to'],
  [/\bnavigate\s+to\b/gi,    'go to'],
  [/[,;]+\s*/g,              ' '],
  [/\s{2,}/g,                ' '],
];

export function normalizeVoiceInput(raw: string): string {
  let result = raw.trim();
  for (const [pattern, replacement] of VOICE_SUBSTITUTIONS) {
    result = result.replace(pattern, replacement);
  }
  return result.trim();
}
