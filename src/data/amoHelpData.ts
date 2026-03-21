// src/data/amoHelpData.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for all commands and prompt templates.

export interface AmoCommand {
  text: string;
  description: string;
  category: 'nav' | 'voice' | 'ide' | 'knowledge' | 'web' | 'chat';
  section: string;
}

export interface AmoPromptTemplate {
  id: string;
  title: string;
  category: 'IDE' | 'Web' | 'Knowledge' | 'Voice' | 'Chat' | 'Terminal';
  prompt: string;
  why: string;
  tags: string[];
}

// ── COMMANDS ──────────────────────────────────────────────────────────────────

export const AMO_COMMANDS: AmoCommand[] = [
  // Attention
  { text: 'Amo', description: 'Instant attention — Amo responds immediately', category: 'voice', section: 'Attention' },
  { text: 'hey Amo', description: 'Same as saying Amo alone', category: 'voice', section: 'Attention' },
  { text: 'stop', description: 'Cancel what Amo is doing right now', category: 'voice', section: 'Attention' },

  // Navigation
  { text: 'terminal', description: 'Open the terminal panel', category: 'nav', section: 'Navigation' },
  { text: 'editor', description: 'Open the code editor', category: 'nav', section: 'Navigation' },
  { text: 'browser', description: 'Open the web browser', category: 'nav', section: 'Navigation' },
  { text: 'settings', description: 'Open the settings panel', category: 'nav', section: 'Navigation' },
  { text: 'vocabulary', description: 'Open the vocabulary builder', category: 'nav', section: 'Navigation' },
  { text: 'sentence builder', description: 'Open the sentence builder', category: 'nav', section: 'Navigation' },
  { text: 'intent enhancer', description: 'Open the intent enhancer', category: 'nav', section: 'Navigation' },
  { text: 'go to chat', description: 'Switch to main chat view', category: 'nav', section: 'Navigation' },
  { text: 'switch back to chat', description: 'Return to chat from any view', category: 'nav', section: 'Navigation' },

  // Chat management
  { text: 'new chat', description: 'Start a fresh conversation', category: 'nav', section: 'Chat' },
  { text: 'clear chat', description: 'Wipe messages from this conversation', category: 'nav', section: 'Chat' },
  { text: 'help', description: 'Show available commands and features', category: 'nav', section: 'Chat' },
  { text: 'what can you do', description: 'List all of Amo capabilities', category: 'nav', section: 'Chat' },

  // Voice
  { text: 'voice on', description: 'Enable spoken responses', category: 'voice', section: 'Voice' },
  { text: 'voice off', description: 'Disable spoken responses', category: 'voice', section: 'Voice' },
  { text: 'speak', description: 'Enable voice mode', category: 'voice', section: 'Voice' },

  // Web & Search
  { text: 'search for [topic]', description: 'Search the web', category: 'web', section: 'Web' },
  { text: 'look up [topic]', description: 'Same as search', category: 'web', section: 'Web' },
  { text: 'open [URL]', description: 'Open a website in the browser', category: 'web', section: 'Web' },
  { text: 'read this page', description: 'Summarise the current browser page', category: 'web', section: 'Web' },
  { text: 'latest news about [topic]', description: 'Fetch current news', category: 'web', section: 'Web' },
  { text: 'translate [text] to [language]', description: 'Translate text between languages', category: 'web', section: 'Web' },

  // Knowledge
  { text: 'what do you know about [topic]', description: 'Search Amo knowledge brain', category: 'knowledge', section: 'Knowledge' },
  { text: 'show brain status', description: 'Show memory and knowledge stats', category: 'knowledge', section: 'Knowledge' },
  { text: 'learn this: [fact]', description: 'Store a permanent fact', category: 'knowledge', section: 'Knowledge' },
  { text: 'forget about [topic]', description: 'Remove knowledge about a topic', category: 'knowledge', section: 'Knowledge' },
  { text: 'remember that [fact]', description: 'Store a permanent fact', category: 'knowledge', section: 'Knowledge' },
  { text: 'show my files', description: 'List uploaded documents', category: 'knowledge', section: 'Knowledge' },

  // Vocabulary Builder
  { text: 'open vocabulary', description: 'Open vocabulary builder', category: 'knowledge', section: 'Vocabulary' },
  { text: 'extract words from [text]', description: 'Extract vocabulary from text', category: 'knowledge', section: 'Vocabulary' },
  { text: 'build vocabulary for [topic]', description: 'Create topic-specific vocabulary', category: 'knowledge', section: 'Vocabulary' },

  // Sentence Builder
  { text: 'open sentence builder', description: 'Open sentence builder', category: 'knowledge', section: 'Sentences' },
  { text: 'generate sentences about [topic]', description: 'Create sentences using templates', category: 'knowledge', section: 'Sentences' },
  { text: 'improve sentence: [text]', description: 'Enhance sentence structure', category: 'knowledge', section: 'Sentences' },

  // Intent Enhancer
  { text: 'open intent enhancer', description: 'Open intent enhancer', category: 'knowledge', section: 'Intent' },
  { text: 'analyze intent: [text]', description: 'Analyze communication intent', category: 'knowledge', section: 'Intent' },

  // Terminal & Code
  { text: 'run [command]', description: 'Execute a shell command', category: 'ide', section: 'Terminal' },
  { text: 'list files', description: 'Show workspace files', category: 'ide', section: 'Terminal' },
  { text: 'check git status', description: 'Show git state', category: 'ide', section: 'Terminal' },
  { text: 'install dependencies', description: 'Run npm install', category: 'ide', section: 'Terminal' },
  { text: 'run npm run build', description: 'Execute the build script', category: 'ide', section: 'Terminal' },
  { text: 'npm test', description: 'Run tests', category: 'ide', section: 'Terminal' },

  // IDE & Code
  { text: 'create a hello world in [language]', description: 'Write, run, and open a file', category: 'ide', section: 'Code' },
  { text: 'write a [language] function', description: 'Write and test a function', category: 'ide', section: 'Code' },
  { text: 'create a [app/project]', description: 'Create an application', category: 'ide', section: 'Code' },
  { text: 'fix the build error', description: 'Run build, read error, fix and retry', category: 'ide', section: 'Code' },
  { text: 'debug this code', description: 'Analyze and fix problems', category: 'ide', section: 'Code' },
  { text: 'show me the code in chat', description: 'Show code inline instead of editor', category: 'ide', section: 'Code' },
  { text: 'preview [file]', description: 'Open file in code editor with preview', category: 'ide', section: 'Code' },
];

// ── PROMPT TEMPLATES ──────────────────────────────────────────────────────────

export const AMO_PROMPT_TEMPLATES: AmoPromptTemplate[] = [
  {
    id: 'ide-create-project',
    title: 'Create a project from scratch',
    category: 'IDE',
    prompt: 'Create a [Node.js / Python / HTML] project called [name]. Set up the folder structure, write the main file, install any needed dependencies, and show me what you created.',
    why: 'Tells Amo exactly what stack, name, and scope — prevents guessing',
    tags: ['create', 'project', 'scaffold', 'setup'],
  },
  {
    id: 'ide-write-function',
    title: 'Write a specific function',
    category: 'IDE',
    prompt: 'Write a [JavaScript / Python] function called [name] that takes [input] and returns [output]. Add a comment explaining how it works, then run a quick test to confirm it works.',
    why: 'Specifying inputs and outputs gives Amo everything needed to write correct code first time',
    tags: ['function', 'code', 'write', 'javascript', 'python'],
  },
  {
    id: 'ide-fix-build',
    title: 'Fix a broken build',
    category: 'IDE',
    prompt: 'My build is failing. Run npm run build, read the full error output, identify the root cause, fix the file, and run it again to confirm it passes.',
    why: 'Gives Amo a complete instruction cycle — run, read, fix, verify',
    tags: ['fix', 'build', 'error', 'debug'],
  },
  {
    id: 'ide-explain-file',
    title: 'Explain a file',
    category: 'IDE',
    prompt: 'Read [filename] and explain: what it does, how it works, what the key functions are, and whether there is anything I should improve.',
    why: 'Four specific questions get four specific answers instead of a vague summary',
    tags: ['explain', 'read', 'understand', 'file'],
  },
  {
    id: 'ide-add-feature',
    title: 'Add a feature to existing code',
    category: 'IDE',
    prompt: 'Read [filename] first. Then add a function that [does X]. Make sure it fits the existing style, does not break anything, and run the file to confirm it works.',
    why: 'Read-first prevents Amo from rewriting code he has not seen',
    tags: ['add', 'feature', 'extend', 'modify'],
  },
  {
    id: 'ide-debug-code',
    title: 'Debug code with errors',
    category: 'IDE',
    prompt: 'I have this error: [paste error]. Here is my code: [paste code]. Read both, find the bug, fix it, and run it to confirm the fix works.',
    why: 'Providing both error and code lets Amo diagnose and fix in one step',
    tags: ['debug', 'error', 'fix', 'code'],
  },
  {
    id: 'terminal-run-explain',
    title: 'Run and explain a command',
    category: 'Terminal',
    prompt: 'Run [command] and explain what the output means. If there are any warnings or errors, tell me which ones I should care about and which I can ignore.',
    why: 'Asking for interpretation of output is more valuable than just seeing raw text',
    tags: ['run', 'terminal', 'command', 'explain'],
  },
  {
    id: 'terminal-workflow',
    title: 'Multi-step terminal workflow',
    category: 'Terminal',
    prompt: 'I need to [goal — e.g. set up a new project / deploy / run tests]. Do it step by step using the terminal. After each step, confirm it worked before moving to the next one.',
    why: 'Step-by-step confirmation prevents cascading failures from one bad step',
    tags: ['terminal', 'workflow', 'steps', 'sequence'],
  },
  {
    id: 'terminal-env-check',
    title: 'Check what is installed',
    category: 'Terminal',
    prompt: 'Check what is installed on this device: node version, npm version, python version, git version. Tell me what is missing and how to get it.',
    why: 'Environment audit before starting prevents "command not found" errors mid-task',
    tags: ['environment', 'installed', 'check', 'node'],
  },
  {
    id: 'web-research',
    title: 'Research a topic',
    category: 'Web',
    prompt: 'Research [topic] using web search. Find at least three good sources, summarise the key points, and save the summary as a file in my workspace.',
    why: 'Explicit source count and save instruction gives a concrete deliverable',
    tags: ['research', 'search', 'save', 'summary'],
  },
  {
    id: 'web-compare',
    title: 'Compare two things',
    category: 'Web',
    prompt: 'Compare [option A] and [option B]. Search the web for current information. Give me: key differences, pros and cons of each, and a recommendation.',
    why: 'Structured output request means you get a usable comparison not a wall of text',
    tags: ['compare', 'versus', 'difference', 'pros'],
  },
  {
    id: 'web-news',
    title: 'Get current news',
    category: 'Web',
    prompt: 'Search for the latest news on [topic]. Summarise the top three stories, include the source names, and tell me the most important thing I should know.',
    why: 'Asking for source names helps you verify. The "most important" request forces prioritisation',
    tags: ['news', 'latest', 'current', 'search'],
  },
  {
    id: 'vocabulary-extract',
    title: 'Extract vocabulary from text',
    category: 'Knowledge',
    prompt: 'Extract vocabulary words from [URL / text]. Focus on [technical terms / business vocabulary / academic words]. Create a vocabulary set with definitions and examples.',
    why: 'Specifying word type helps Amo focus on the most relevant vocabulary',
    tags: ['vocabulary', 'extract', 'definitions', 'learning'],
  },
  {
    id: 'sentence-builder',
    title: 'Generate structured sentences',
    category: 'Knowledge',
    prompt: 'Create sentences about [topic] using the sentence builder. Use different templates and structures. Generate at least 10 sentences with varying complexity.',
    why: 'Multiple sentence structures demonstrate language flexibility',
    tags: ['sentence', 'builder', 'generate', 'structure'],
  },
  {
    id: 'intent-enhance',
    title: 'Enhance intent recognition',
    category: 'Knowledge',
    prompt: 'Open the intent enhancer and add keywords and tags to improve how I understand [type of requests]. Test the prediction with sample inputs.',
    why: 'Specific request categories help Amo provide more accurate responses',
    tags: ['intent', 'enhancer', 'keywords', 'prediction'],
  },
  {
    id: 'know-from-imports',
    title: 'Ask about something you imported',
    category: 'Knowledge',
    prompt: 'Based on the documents I have imported, what does [document or topic] say about [specific question]? Quote the relevant part if you can find it.',
    why: 'Anchoring to imported documents prevents Amo from guessing',
    tags: ['imported', 'document', 'knowledge', 'brain'],
  },
  {
    id: 'know-store-fact',
    title: 'Store a fact permanently',
    category: 'Knowledge',
    prompt: 'Remember this permanently: [fact]. Confirm you have stored it.',
    why: 'Explicit confirmation check ensures the fact was actually saved',
    tags: ['remember', 'store', 'permanent', 'fact'],
  },
  {
    id: 'know-brain-summary',
    title: 'Everything Amo knows about a topic',
    category: 'Knowledge',
    prompt: 'Search your knowledge brain and tell me everything you know about [topic]. Include: what I have imported, what you know from training, and whether anything needs a web check.',
    why: 'Three-layer request surfaces local, training, and live knowledge simultaneously',
    tags: ['knowledge', 'brain', 'know', 'training'],
  },
  {
    id: 'voice-setup',
    title: 'Set up voice mode',
    category: 'Voice',
    prompt: 'I am going to use voice. Keep your replies short and spoken-friendly — no bullet points, no markdown, no long lists. Confirm you understand.',
    why: 'Sets voice mode expectations so every reply works when spoken aloud',
    tags: ['voice', 'spoken', 'short', 'audio'],
  },
  {
    id: 'chat-structured',
    title: 'Get a structured answer',
    category: 'Chat',
    prompt: 'Explain [topic] in this format: 1) What it is in one sentence. 2) How it works in three bullet points. 3) A real-world example. 4) One thing most people get wrong.',
    why: 'Numbered format with explicit sections prevents vague answers',
    tags: ['explain', 'structured', 'format', 'learn'],
  },
  {
    id: 'chat-expert',
    title: 'Roleplay as a domain expert',
    category: 'Chat',
    prompt: 'Act as an experienced [role — e.g. senior developer, mechanic, doctor]. I will ask you questions. Answer as that expert would — practical, direct, no unnecessary caveats.',
    why: 'Role assignment shifts Amo into a focused answer mode',
    tags: ['expert', 'role', 'professional', 'advice'],
  },
  {
    id: 'chat-teach',
    title: 'Teach me step by step',
    category: 'Chat',
    prompt: 'Teach me [topic] from scratch. Assume I know nothing. Go one concept at a time and ask me if I understand before moving to the next step.',
    why: 'Paced teaching prevents information overload',
    tags: ['teach', 'learn', 'explain', 'beginner'],
  },
  {
    id: 'chat-critique',
    title: 'Critique and improve something',
    category: 'Chat',
    prompt: 'Here is a [draft / piece of code / plan]: [paste it]. Tell me three specific things that are wrong or could be better. Then rewrite it with those improvements applied.',
    why: 'Asking for critique before rewrite means you understand the changes',
    tags: ['improve', 'critique', 'review', 'rewrite'],
  },
];

// ── KNOWLEDGE SEED EXPORT ─────────────────────────────────────────────────────

export function buildHelpKnowledgeChunks() {
  const commandsText = AMO_COMMANDS.map(c =>
    `Command: "${c.text}" — ${c.description} (${c.section})`
  ).join('\n');

  const templatesText = AMO_PROMPT_TEMPLATES.map(t =>
    `Template: "${t.title}" (${t.category})\nPrompt: ${t.prompt}\nWhy: ${t.why}`
  ).join('\n\n');

  return [
    {
      id: 'amo-commands-reference',
      title: 'Every command Amo understands',
      tags: ['commands', 'what can you do', 'how do I', 'help', 'navigation'],
      content: `Amo understands these commands:\n\n${commandsText}`,
    },
    {
      id: 'amo-prompt-templates',
      title: 'Prompt templates for best results',
      tags: ['prompt', 'template', 'how to ask', 'best results'],
      content: `Use these templates to get the best results from Amo:\n\n${templatesText}`,
    },
  ];
}
