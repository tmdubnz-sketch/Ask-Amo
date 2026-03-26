// Amo Instant Replies Seed Pack
// Loaded into brain at startup for instant responses to common queries.
// Used by nativeReplyCoordinator for fast matching.

export interface InstantReply {
  id: string;
  patterns: string[];       // Regex patterns to match
  reply: string;            // Instant response
  actions?: string[];       // Actions to execute (e.g., 'switch_to_terminal')
  tags: string[];           // For search/context
  clarification?: string;   // Optional clarification prompt
}

export const AMO_INSTANT_REPLIES: InstantReply[] = [
  // ── GREETINGS ──────────────────────────────────────────────────────────────
  {
    id: 'greeting-hello',
    patterns: ['^(hi|hey|hello|hey bro|kia ora|kiaora|yo|sup|what\'?s up|greetings?)[!.?]*$'],
    reply: 'Kia ora. How can I help you?',
    tags: ['greeting', 'hello', 'hi', 'hey'],
  },

  // ── IDENTITY ───────────────────────────────────────────────────────────────
  {
    id: 'identity-who',
    patterns: ['^(who are you|what are you|introduce yourself|tell me about yourself|your name)[?.!]*$'],
    reply: "I'm Amo, your AI assistant. I run locally on your device and can also use cloud models when connected. I can chat, write code, search the web, manage files, build vocabulary, and remember things. What do you need?",
    tags: ['identity', 'who', 'name', 'about'],
  },

  // ── CAPABILITIES ────────────────────────────────────────────────────────────
  {
    id: 'capability-code',
    patterns: [
      '\\b(can you|could you|will you|do you).*(code|program|script|write code|create code|generate code)',
      '\\b(code|program|script)\\b.*\\b(able|can|do)',
      '\\byes\\b.*\\bcode\\b',
    ],
    reply: "Yes! I can write code in many languages — JavaScript, Python, TypeScript, HTML, CSS, and more. Just tell me what you need: 'write a function to sort a list', 'create a Python script for X', or 'build a simple web app'. Should I open the code editor?",
    actions: ['switch_to_editor'],
    tags: ['capability', 'code', 'programming', 'yes'],
    clarification: 'What would you like me to code?',
  },
  {
    id: 'capability-help',
    patterns: [
      '\\b(can you|could you|will you|do you).*(help|assist|do things)',
      '\\bwhat (can|do) you (can|do)\\b',
      '\\byes\\b.*\\bhelp\\b',
    ],
    reply: "Yes! I can help with: writing and debugging code, searching the web, running terminal commands, managing files, building vocabulary, answering questions, and more. What do you need?",
    tags: ['capability', 'help', 'abilities'],
  },

  // ── GRATITUDE ──────────────────────────────────────────────────────────────
  {
    id: 'gratitude-thanks',
    patterns: ['^(thanks|thank you|cheers|ta|nice one|good job|well done)[!.?]*$'],
    reply: "You're welcome.",
    tags: ['thanks', 'thank you', 'gratitude'],
  },

  // ── TERMINAL ───────────────────────────────────────────────────────────────
  {
    id: 'view-terminal',
    patterns: [
      '\\b(open|show|start|launch|go to|switch to)\\b.*\\b(terminal|console|shell|command line|cmd)\\b',
      '\\b(terminal|shell|console)\\b.*\\b(open|show|start|launch)\\b',
      '^(terminal|shell|console)[!.?]*$',
    ],
    reply: 'Opening terminal now.',
    actions: ['switch_to_terminal'],
    tags: ['terminal', 'shell', 'console', 'command line'],
  },

  // ── CODE EDITOR ────────────────────────────────────────────────────────────
  {
    id: 'view-editor',
    patterns: [
      '\\b(open|show|start|launch|go to|switch to)\\b.*\\b(editor|code editor|code|ide)\\b',
      '\\b(editor|code editor|code)\\b.*\\b(open|show|start|launch)\\b',
      '^(editor|code editor|code)[!.?]*$',
    ],
    reply: 'Opening code editor now.',
    actions: ['switch_to_editor'],
    tags: ['editor', 'code', 'ide', 'code editor'],
  },

  // ── WEB BROWSER ────────────────────────────────────────────────────────────
  {
    id: 'view-browser',
    patterns: [
      '\\b(open|show|start|launch|go to|switch to)\\b.*\\b(browser|webview|web browser|web)\\b',
      '\\b(browser|webview|web)\\b.*\\b(open|show|start|launch)\\b',
      '^(browser|webview|web)[!.?]*$',
    ],
    reply: 'Opening browser now.',
    actions: ['switch_to_webview'],
    tags: ['browser', 'web', 'webview', 'internet'],
  },

  // ── VOCABULARY BUILDER ─────────────────────────────────────────────────────
  {
    id: 'view-vocabulary',
    patterns: [
      '\\b(open|show|start|launch|go to|switch to)\\b.*\\b(vocab|vocabulary|word builder)\\b',
      '\\b(vocab|vocabulary|words)\\b.*\\b(open|show|start|build)\\b',
      '^(vocab|vocabulary)[!.?]*$',
    ],
    reply: 'Opening vocabulary builder now.',
    actions: ['switch_to_vocabulary'],
    tags: ['vocabulary', 'vocab', 'words', 'language'],
  },

  // ── SENTENCE BUILDER ───────────────────────────────────────────────────────
  {
    id: 'view-sentence',
    patterns: [
      '\\b(open|show|start|launch|go to|switch to)\\b.*\\b(sentence|sentence builder|phrases)\\b',
      '\\b(sentence|phrases)\\b.*\\b(open|show|start|build)\\b',
      '^(sentence|sentence builder)[!.?]*$',
    ],
    reply: 'Opening sentence builder now.',
    actions: ['switch_to_sentence_builder'],
    tags: ['sentence', 'phrases', 'grammar'],
  },

  // ── INTENT ENHANCER ────────────────────────────────────────────────────────
  {
    id: 'view-intent',
    patterns: [
      '\\b(open|show|start|launch|go to|switch to)\\b.*\\b(intent|intent enhancer|communication)\\b',
      '\\b(intent|communication)\\b.*\\b(open|show|start|enhance)\\b',
      '^(intent|intent enhancer)[!.?]*$',
    ],
    reply: 'Opening intent enhancer now.',
    actions: ['switch_to_intent_enhancer'],
    tags: ['intent', 'communication', 'enhancer'],
  },

  // ── SETTINGS ───────────────────────────────────────────────────────────────
  {
    id: 'view-settings',
    patterns: [
      '\\b(open|show|start|launch|go to)\\b.*\\b(settings|config|configuration|preferences)\\b',
      '^(settings|config|preferences)[!.?]*$',
    ],
    reply: 'Opening settings now.',
    actions: ['switch_to_settings'],
    tags: ['settings', 'config', 'preferences'],
  },

  // ── WORKSPACE ──────────────────────────────────────────────────────────────
  {
    id: 'view-files',
    patterns: [
      '\\b(show|list|open|view)\\b.*\\b(files|workspace|my files|documents|docs)\\b',
      '\\b(files|workspace|my files)\\b.*\\b(show|list|open|view)\\b',
      '^(files|workspace|my files|docs)[!.?]*$',
    ],
    reply: 'Listing workspace files now.',
    actions: ['list_files'],
    tags: ['files', 'workspace', 'documents', 'docs'],
  },

  // ── BRAIN STATUS ───────────────────────────────────────────────────────────
  {
    id: 'view-brain',
    patterns: [
      '\\b(show|check|view|what do you know|brain|memory|status)\\b.*\\b(brain|memory|knowledge|status|know)\\b',
      '^(brain|memory|knowledge|status|brain status|show brain)[!.?]*$',
    ],
    reply: 'Checking brain status now.',
    actions: ['show_brain_status'],
    tags: ['brain', 'memory', 'knowledge', 'status'],
  },

  // ── VOICE MODE ─────────────────────────────────────────────────────────────
  {
    id: 'voice-on',
    patterns: [
      '\\b(turn on|enable|start|toggle)\\b.*\\b(voice|speech|audio|speak|tts)\\b',
      '\\b(voice|speech|speak)\\b.*\\b(on|enable|start|toggle)\\b',
      '^(voice|speech|speak|voice on)[!.?]*$',
    ],
    reply: 'Voice mode enabled.',
    actions: ['enable_voice'],
    tags: ['voice', 'speech', 'audio', 'tts'],
  },

  // ── HELP ───────────────────────────────────────────────────────────────────
  {
    id: 'help-general',
    patterns: ['^(help|help me|assist|support)[!.?]*$'],
    reply: 'I can help with chat, code, web search, file management, vocabulary, sentence building, intent analysis, and more. What do you need?',
    tags: ['help', 'assist', 'support'],
  },

  // ── CLEAR CHAT ─────────────────────────────────────────────────────────────
  {
    id: 'clear-chat',
    patterns: [
      '\\b(clear|reset|wipe|new|start)\\b.*\\b(chat|conversation|messages)\\b',
      '^(clear|reset|clear chat|new chat)[!.?]*$',
    ],
    reply: 'Clearing chat now.',
    actions: ['clear_chat'],
    tags: ['clear', 'reset', 'new chat'],
  },
];
