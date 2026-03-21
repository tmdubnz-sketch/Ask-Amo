// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AMO SINGLE SOURCE OF TRUTH
// The complete, authoritative reference for all Amo capabilities, responses,
// and behaviors. Both cloud and native models reference this file.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── TYPES ──────────────────────────────────────────────────────────────────────

export interface AmoFeature {
  id: string;
  name: string;
  description: string;
  howToUse: string;
  examples: string[];
  tags: string[];
  instantReply?: string;  // If set, used for instant responses
  actions?: string[];     // Actions to execute
}

export interface AmoCommand {
  trigger: string;
  aliases: string[];
  description: string;
  action?: string;
  reply?: string;
}

export interface AmoClarification {
  patterns: string[];
  question: string;
}

// ── IDENTITY ───────────────────────────────────────────────────────────────────

export const AMO_IDENTITY = {
  name: 'Amo',
  origin: 'Aotearoa New Zealand',
  persona: 'Grounded, respectful, direct, practical',
  language: 'NZ English',
  greeting: 'Kia ora. How can I help you?',
} as const;

// ── FEATURES ───────────────────────────────────────────────────────────────────

export const AMO_FEATURES: AmoFeature[] = [
  {
    id: 'chat',
    name: 'Chat',
    description: 'Main conversation interface for asking questions and getting answers',
    howToUse: 'Type your message and press Enter or tap Send',
    examples: [
      'What is the weather today?',
      'Explain quantum computing',
      'Help me write an email',
    ],
    tags: ['chat', 'message', 'conversation', 'ask', 'question'],
  },
  {
    id: 'terminal',
    name: 'Terminal',
    description: 'Execute shell commands and run scripts directly',
    howToUse: 'Say "open terminal" or "run ls" to open and execute',
    examples: [
      'run ls',
      'run pwd',
      'show terminal',
      'execute git status',
    ],
    tags: ['terminal', 'shell', 'command', 'run', 'execute', 'console'],
    instantReply: 'Opening terminal now.',
    actions: ['switch_to_terminal'],
  },
  {
    id: 'editor',
    name: 'Code Editor',
    description: 'Write, edit, and run code with syntax highlighting',
    howToUse: 'Ask Amo to write code, or say "open editor" to start coding',
    examples: [
      'write a hello world in python',
      'create a function to sort a list',
      'open code editor',
    ],
    tags: ['editor', 'code', 'ide', 'write', 'programming', 'develop'],
    instantReply: 'Opening code editor now.',
    actions: ['switch_to_editor'],
  },
  {
    id: 'browser',
    name: 'Web Browser',
    description: 'Browse the web and search for information',
    howToUse: 'Say "open browser" or "search for X"',
    examples: [
      'search for latest AI news',
      'open browser',
      'browse github.com',
    ],
    tags: ['browser', 'web', 'internet', 'search', 'browse', 'url'],
    instantReply: 'Opening browser now.',
    actions: ['switch_to_webview'],
  },
  {
    id: 'vocabulary',
    name: 'Vocabulary Builder',
    description: 'Extract, learn, and manage vocabulary from text',
    howToUse: 'Say "open vocabulary" or ask to extract words from text',
    examples: [
      'extract words from: The quick brown fox',
      'show vocabulary',
      'open vocabulary builder',
    ],
    tags: ['vocabulary', 'vocab', 'words', 'language', 'learn'],
    instantReply: 'Opening vocabulary builder now.',
    actions: ['switch_to_vocabulary'],
  },
  {
    id: 'sentence',
    name: 'Sentence Builder',
    description: 'Generate sentence variations using weighted word tables',
    howToUse: 'Say "open sentence builder" or ask to generate variations',
    examples: [
      'generate variations of: I want to learn',
      'open sentence builder',
      'build sentences about programming',
    ],
    tags: ['sentence', 'phrases', 'grammar', 'variations', 'build'],
    instantReply: 'Opening sentence builder now.',
    actions: ['switch_to_sentence_builder'],
  },
  {
    id: 'intent',
    name: 'Intent Enhancer',
    description: 'Analyze and optimize communication intent',
    howToUse: 'Say "open intent enhancer" or ask to analyze your message',
    examples: [
      'analyze my intent: how do I improve',
      'open intent enhancer',
      'optimize my message',
    ],
    tags: ['intent', 'communication', 'enhancer', 'optimize', 'analyze'],
    instantReply: 'Opening intent enhancer now.',
    actions: ['switch_to_intent_enhancer'],
  },
  {
    id: 'knowledge',
    name: 'Knowledge Brain',
    description: 'Remember facts, learn from conversations, and recall information',
    howToUse: 'Say "learn this: X" or "what do you know about X"',
    examples: [
      'learn this: the capital of France is Paris',
      'what do you know about France?',
      'show brain status',
      'forget about X',
    ],
    tags: ['brain', 'memory', 'knowledge', 'learn', 'remember', 'recall'],
  },
  {
    id: 'documents',
    name: 'Document Upload',
    description: 'Upload PDFs, text files, and images for analysis',
    howToUse: 'Tap the + button and select a file to upload',
    examples: [
      'upload a PDF',
      'analyze this document',
      'summarize the uploaded file',
    ],
    tags: ['upload', 'document', 'pdf', 'file', 'analyze', 'read'],
  },
  {
    id: 'voice',
    name: 'Voice I/O',
    description: 'Speak to Amo and hear responses spoken aloud',
    howToUse: 'Tap the microphone to speak, enable voice mode for spoken replies',
    examples: [
      'enable voice mode',
      'turn on speech',
      'voice on',
    ],
    tags: ['voice', 'speech', 'audio', 'speak', 'listen', 'tts'],
    instantReply: 'Voice mode enabled.',
    actions: ['enable_voice'],
  },
  {
    id: 'websearch',
    name: 'Web Search',
    description: 'Search the web for current information',
    howToUse: 'Ask questions about current events, news, or facts',
    examples: [
      'what is the latest AI news?',
      'search for weather forecast',
      'look up npm package docs',
    ],
    tags: ['search', 'web', 'internet', 'news', 'current', 'lookup'],
  },
  {
    id: 'translation',
    name: 'Translation',
    description: 'Translate text between languages',
    howToUse: 'Say "translate X to Y language"',
    examples: [
      'translate hello to Spanish',
      'how do you say thank you in Japanese?',
      'translate this to French',
    ],
    tags: ['translate', 'language', 'multilingual', 'foreign'],
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'Configure API keys, voice, model selection, and preferences',
    howToUse: 'Say "open settings" or tap the settings icon',
    examples: [
      'open settings',
      'show settings',
      'configure API key',
    ],
    tags: ['settings', 'config', 'preferences', 'configure', 'setup'],
    instantReply: 'Opening settings now.',
    actions: ['switch_to_settings'],
  },
  {
    id: 'files',
    name: 'Workspace Files',
    description: 'List and manage files in your workspace',
    howToUse: 'Say "show my files" or "list files"',
    examples: [
      'show my files',
      'list files',
      'what files are in workspace',
    ],
    tags: ['files', 'workspace', 'documents', 'list', 'manage'],
    instantReply: 'Listing workspace files now.',
    actions: ['list_files'],
  },
];

// ── COMMANDS ───────────────────────────────────────────────────────────────────

export const AMO_COMMANDS: AmoCommand[] = [
  { trigger: 'help', aliases: ['help me', 'assist', 'support'], description: 'Get help with anything', reply: 'I can help with chat, code, web search, file management, vocabulary, sentence building, intent analysis, and more. What do you need?' },
  { trigger: 'hello', aliases: ['hi', 'hey', 'kia ora', 'yo', 'sup'], description: 'Greet Amo', reply: 'Kia ora. How can I help you?' },
  { trigger: 'who are you', aliases: ['what are you', 'introduce yourself', 'your name'], description: 'Learn about Amo', reply: `I'm Amo, your AI assistant. I run locally on your device and can also use cloud models when connected. I can chat, write code, search the web, manage files, build vocabulary, and remember things.` },
  { trigger: 'thanks', aliases: ['thank you', 'cheers', 'ta'], description: 'Express gratitude', reply: "You're welcome." },
  { trigger: 'clear chat', aliases: ['new chat', 'reset', 'clear'], description: 'Clear current conversation', action: 'clear_chat', reply: 'Clearing chat now.' },
  { trigger: 'show brain status', aliases: ['brain status', 'memory status', 'what do you know'], description: 'View brain/memory status', action: 'show_brain_status', reply: 'Checking brain status now.' },
  { trigger: 'show workspace', aliases: ['show files', 'list files', 'my files'], description: 'List workspace files', action: 'list_files', reply: 'Listing workspace files now.' },
  { trigger: 'open terminal', aliases: ['terminal', 'shell', 'console', 'command line'], description: 'Open terminal view', action: 'switch_to_terminal', reply: 'Opening terminal now.' },
  { trigger: 'open editor', aliases: ['editor', 'code editor', 'code', 'ide'], description: 'Open code editor', action: 'switch_to_editor', reply: 'Opening code editor now.' },
  { trigger: 'open browser', aliases: ['browser', 'web', 'webview'], description: 'Open web browser', action: 'switch_to_webview', reply: 'Opening browser now.' },
  { trigger: 'open settings', aliases: ['settings', 'config', 'preferences'], description: 'Open settings', action: 'switch_to_settings', reply: 'Opening settings now.' },
  { trigger: 'voice on', aliases: ['enable voice', 'turn on speech', 'speak'], description: 'Enable voice mode', action: 'enable_voice', reply: 'Voice mode enabled.' },
];

// ── CLARIFICATIONS ─────────────────────────────────────────────────────────────

export const AMO_CLARIFICATIONS: AmoClarification[] = [
  { patterns: ['^(do|run|make|create|fix|check|show|open|start)$'], question: '{action} what?' },
  { patterns: ['^(it|this|that|code|file)$'], question: "What would you like me to do with that?" },
];

// ── SEED PACK GENERATION ───────────────────────────────────────────────────────

export interface SeedPackChunk {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  tags: string[];
  kind: 'feature' | 'command' | 'capability' | 'example' | 'identity';
}

export function generateSeedPacks(): SeedPackChunk[] {
  const chunks: SeedPackChunk[] = [];

  // Identity chunk
  chunks.push({
    id: 'amo-identity',
    documentId: 'amo-source-truth',
    documentName: 'Amo Identity',
    content: `${AMO_IDENTITY.name} is a ${AMO_IDENTITY.persona} AI assistant from ${AMO_IDENTITY.origin}. Greeting: ${AMO_IDENTITY.greeting}`,
    tags: ['identity', 'who', 'name', 'about'],
    kind: 'identity',
  });

  // Feature chunks
  for (const feature of AMO_FEATURES) {
    chunks.push({
      id: `feature-${feature.id}`,
      documentId: 'amo-source-truth',
      documentName: `Feature: ${feature.name}`,
      content: `${feature.name}: ${feature.description}\nHow to use: ${feature.howToUse}\nExamples: ${feature.examples.join(', ')}`,
      tags: feature.tags,
      kind: 'feature',
    });
  }

  // Command chunks
  for (const cmd of AMO_COMMANDS) {
    chunks.push({
      id: `command-${cmd.trigger.replace(/\s+/g, '-')}`,
      documentId: 'amo-source-truth',
      documentName: `Command: ${cmd.trigger}`,
      content: `${cmd.trigger} (aliases: ${cmd.aliases.join(', ')}): ${cmd.description}`,
      tags: [cmd.trigger, ...cmd.aliases],
      kind: 'command',
    });
  }

  return chunks;
}

// ── EXPORTS ────────────────────────────────────────────────────────────────────

export const AMO_SEED_PACKS = generateSeedPacks();
