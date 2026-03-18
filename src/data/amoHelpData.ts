// src/data/amoHelpData.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for all commands and prompt templates.
// Used by:
//   1. The HelpPanel component (in-app interactive reference)
//   2. knowledgeBootstrapService — loaded into the vector DB so Amo can
//      answer "what commands do you support" and "give me a prompt template"

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
  { text: 'cancel', description: 'Same as stop', category: 'voice', section: 'Attention' },

  // Navigation
  { text: 'go to chat', description: 'Switch to main chat view', category: 'nav', section: 'Navigation' },
  { text: 'go to terminal', description: 'Open the terminal panel', category: 'nav', section: 'Navigation' },
  { text: 'go to webview', description: 'Open the browser panel', category: 'nav', section: 'Navigation' },
  { text: 'go to editor', description: 'Open the code editor', category: 'nav', section: 'Navigation' },
  { text: 'go to vocabulary', description: 'Open the vocabulary builder', category: 'nav', section: 'Navigation' },
  { text: 'go to sentence builder', description: 'Open the sentence builder', category: 'nav', section: 'Navigation' },
  { text: 'go to intent enhancer', description: 'Open the intent enhancer', category: 'nav', section: 'Navigation' },
  { text: 'open workspace', description: 'Show your files in the sidebar', category: 'nav', section: 'Navigation' },
  { text: 'open settings', description: 'Open the settings panel', category: 'nav', section: 'Navigation' },
  { text: 'open knowledge', description: 'Go straight to Knowledge settings', category: 'nav', section: 'Navigation' },
  { text: 'switch to terminal', description: 'Voice navigation to terminal', category: 'nav', section: 'Navigation' },
  { text: 'switch back to chat', description: 'Return to chat from any view', category: 'nav', section: 'Navigation' },
  { text: 'new chat', description: 'Start a fresh conversation', category: 'nav', section: 'Chat management' },
  { text: 'clear chat', description: 'Wipe messages from this conversation', category: 'nav', section: 'Chat management' },

  // Web
  { text: 'search for [topic]', description: 'Search the web and show results in browser', category: 'web', section: 'Web & search' },
  { text: 'look up [topic]', description: 'Same as search for', category: 'web', section: 'Web & search' },
  { text: 'what is the latest news', description: 'Fetch and summarise today\'s news', category: 'web', section: 'Web & search' },
  { text: 'what time is it in [city]', description: 'World clock lookup for any city', category: 'web', section: 'Web & search' },
  { text: 'open [URL]', description: 'Open any website in the browser', category: 'web', section: 'Web & search' },
  { text: 'read this page', description: 'Summarise the current browser page', category: 'web', section: 'Web & search' },
  { text: 'save this page', description: 'Import current page into knowledge brain', category: 'knowledge', section: 'Web & search' },
  { text: 'research [topic]', description: 'Comprehensive web research on any topic', category: 'web', section: 'Web & search' },
  { text: 'analyze [website/url]', description: 'Deep analysis of web content', category: 'web', section: 'Web & search' },
  { text: 'find information about [topic]', description: 'Information gathering and synthesis', category: 'web', section: 'Web & search' },
  { text: 'explore [subject]', description: 'Comprehensive subject exploration', category: 'web', section: 'Web & search' },
  { text: 'investigate [topic]', description: 'In-depth investigation and reporting', category: 'web', section: 'Web & search' },

  // Knowledge
  { text: 'what do you know about [topic]', description: 'Search Amo\'s knowledge brain', category: 'knowledge', section: 'Knowledge brain' },
  { text: 'show my imported files', description: 'List all documents in the brain', category: 'knowledge', section: 'Knowledge brain' },
  { text: 'what files do I have', description: 'Same as show my imported files', category: 'knowledge', section: 'Knowledge brain' },
  { text: 'remember that [fact]', description: 'Store a permanent fact Amo will always recall', category: 'knowledge', section: 'Knowledge brain' },
  { text: 'organize knowledge about [topic]', description: 'Knowledge organization and structuring', category: 'knowledge', section: 'Knowledge brain' },
  { text: 'summarize [subject]', description: 'Comprehensive summarization', category: 'knowledge', section: 'Knowledge brain' },
  { text: 'analyze information: [content]', description: 'Information analysis and synthesis', category: 'knowledge', section: 'Knowledge brain' },
  { text: 'create overview: [topic]', description: 'Topic overview creation', category: 'knowledge', section: 'Knowledge brain' },
  { text: 'structure knowledge: [subject]', description: 'Knowledge structuring and organization', category: 'knowledge', section: 'Knowledge brain' },

  // Vocabulary Builder
  { text: 'build vocabulary from [URL]', description: 'Extract vocabulary words from a website', category: 'knowledge', section: 'Vocabulary Builder' },
  { text: 'create vocabulary set', description: 'Open vocabulary builder to create word sets', category: 'knowledge', section: 'Vocabulary Builder' },
  { text: 'extract vocabulary from file', description: 'Extract words from uploaded documents', category: 'knowledge', section: 'Vocabulary Builder' },
  { text: 'compose vocabulary with AI', description: 'Use AI to generate themed vocabulary', category: 'knowledge', section: 'Vocabulary Builder' },
  { text: 'review my vocabulary', description: 'Open vocabulary review session', category: 'knowledge', section: 'Vocabulary Builder' },
  { text: 'extract vocabulary from [text]', description: 'Extract words and create vocabulary sets', category: 'knowledge', section: 'Vocabulary Builder' },
  { text: 'build vocabulary for [topic]', description: 'Create topic-specific vocabulary', category: 'knowledge', section: 'Vocabulary Builder' },
  { text: 'analyze words in [text]', description: 'Word analysis and definitions', category: 'knowledge', section: 'Vocabulary Builder' },
  { text: 'create word list from [subject]', description: 'Generate comprehensive word lists', category: 'knowledge', section: 'Vocabulary Builder' },
  { text: 'learn vocabulary about [topic]', description: 'Structured vocabulary learning', category: 'knowledge', section: 'Vocabulary Builder' },

  // Sentence Builder
  { text: 'build sentences', description: 'Open sentence builder to create structured sentences', category: 'knowledge', section: 'Sentence Builder' },
  { text: 'generate sentence about [topic]', description: 'Create sentences using templates', category: 'knowledge', section: 'Sentence Builder' },
  { text: 'create sentence template', description: 'Design reusable sentence patterns', category: 'knowledge', section: 'Sentence Builder' },
  { text: 'add word options', description: 'Add word variations to sentence builder', category: 'knowledge', section: 'Sentence Builder' },
  { text: 'improve sentence: [text]', description: 'Enhance sentence structure and clarity', category: 'knowledge', section: 'Sentence Builder' },
  { text: 'construct sentences about [topic]', description: 'Build well-structured sentences', category: 'knowledge', section: 'Sentence Builder' },
  { text: 'optimize text: [content]', description: 'Text optimization and improvement', category: 'knowledge', section: 'Sentence Builder' },
  { text: 'rewrite: [text]', description: 'Professional text rewriting', category: 'knowledge', section: 'Sentence Builder' },
  { text: 'enhance writing: [content]', description: 'Writing enhancement and polishing', category: 'knowledge', section: 'Sentence Builder' },

  // Intent Enhancer
  { text: 'enhance my intent', description: 'Open intent enhancer to improve prediction', category: 'knowledge', section: 'Intent Enhancer' },
  { text: 'add keyword [word]', description: 'Add keyword for better intent recognition', category: 'knowledge', section: 'Intent Enhancer' },
  { text: 'add tag [name]', description: 'Add contextual tag for intent prediction', category: 'knowledge', section: 'Intent Enhancer' },
  { text: 'test intent prediction', description: 'Test how Amo understands your requests', category: 'knowledge', section: 'Intent Enhancer' },
  { text: 'view intent analytics', description: 'Show prediction accuracy and statistics', category: 'knowledge', section: 'Intent Enhancer' },
  { text: 'enhance intent: [message]', description: 'Analyze and enhance communication intent', category: 'knowledge', section: 'Intent Enhancer' },
  { text: 'clarify meaning: [text]', description: 'Clarify and improve message meaning', category: 'knowledge', section: 'Intent Enhancer' },
  { text: 'optimize communication: [message]', description: 'Communication optimization', category: 'knowledge', section: 'Intent Enhancer' },
  { text: 'improve clarity: [text]', description: 'Enhance message clarity and impact', category: 'knowledge', section: 'Intent Enhancer' },
  { text: 'strengthen message: [content]', description: 'Strengthen communication effectiveness', category: 'knowledge', section: 'Intent Enhancer' },

  // Terminal
  { text: 'run npm run build', description: 'Execute the build script', category: 'ide', section: 'Terminal & code' },
  { text: 'check git status', description: 'Show current git state', category: 'ide', section: 'Terminal & code' },
  { text: 'list my files', description: 'Show files in the workspace folder', category: 'ide', section: 'Terminal & code' },
  { text: 'what is in [filename]', description: 'Read and explain a file', category: 'ide', section: 'Terminal & code' },
  { text: 'install dependencies', description: 'Run npm install', category: 'ide', section: 'Terminal & code' },
  { text: 'run [command]', description: 'Execute any shell command via Amo', category: 'ide', section: 'Terminal & code' },
  { text: 'execute [script]', description: 'Run scripts and programs', category: 'ide', section: 'Terminal & code' },
  { text: 'system check', description: 'System diagnostics and status', category: 'ide', section: 'Terminal & code' },
  { text: 'file operations', description: 'File system management', category: 'ide', section: 'Terminal & code' },
  { text: 'process monitor', description: 'Process monitoring and control', category: 'ide', section: 'Terminal & code' },

  // IDE
  { text: 'create a hello world in JavaScript', description: 'Amo writes, runs, and opens the file', category: 'ide', section: 'IDE & workspace' },
  { text: 'create a hello world in Python', description: 'Amo writes, runs, and opens the file', category: 'ide', section: 'IDE & workspace' },
  { text: 'create a hello world HTML page', description: 'Amo builds and previews the page', category: 'ide', section: 'IDE & workspace' },
  { text: 'show my workspace files', description: 'List everything in amo-workspace/', category: 'ide', section: 'IDE & workspace' },
  { text: 'save this as a file', description: 'Write Amo\'s last reply to a file', category: 'ide', section: 'IDE & workspace' },
  { text: 'open [filename] in the editor', description: 'Preview any file in the code editor', category: 'ide', section: 'IDE & workspace' },
  { text: 'fix the build error', description: 'Run build, read error, fix and retry', category: 'ide', section: 'IDE & workspace' },
  { text: 'debug this code', description: 'Amo analyses and fixes problems', category: 'ide', section: 'IDE & workspace' },
  { text: 'create [app/project]', description: 'Create applications and projects', category: 'ide', section: 'IDE & workspace' },
  { text: 'debug [code/issue]', description: 'Debug code and fix issues', category: 'ide', section: 'IDE & workspace' },
  { text: 'optimize [code]', description: 'Code optimization and improvement', category: 'ide', section: 'IDE & workspace' },
  { text: 'refactor [code]', description: 'Code refactoring and restructuring', category: 'ide', section: 'IDE & workspace' },
  { text: 'test [code]', description: 'Code testing and validation', category: 'ide', section: 'IDE & workspace' },
  { text: 'solve problem: [description]', description: 'Comprehensive problem-solving', category: 'ide', section: 'IDE & workspace' },
  { text: 'analyze challenge: [issue]', description: 'Challenge analysis and solutions', category: 'ide', section: 'IDE & workspace' },
  { text: 'generate solutions: [problem]', description: 'Solution generation and evaluation', category: 'ide', section: 'IDE & workspace' },
  { text: 'optimize approach: [method]', description: 'Approach optimization and improvement', category: 'ide', section: 'IDE & workspace' },
  { text: 'innovate: [concept]', description: 'Innovation and creative solutions', category: 'ide', section: 'IDE & workspace' },
];

// ── PROMPT TEMPLATES ──────────────────────────────────────────────────────────

export const AMO_PROMPT_TEMPLATES: AmoPromptTemplate[] = [
  {
    id: 'ide-create-project',
    title: 'Create a project from scratch',
    category: 'IDE',
    prompt: 'Create a [Node.js / Python / HTML] project called [name]. Set up the folder structure, write the main file, install any needed dependencies, and show me what you created.',
    why: 'Tells Amo exactly what stack, name, and scope — prevents guessing',
    tags: ['create', 'project', 'scaffold', 'setup', 'new'],
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
    tags: ['fix', 'build', 'error', 'debug', 'npm'],
  },
  {
    id: 'ide-explain-file',
    title: 'Explain a file',
    category: 'IDE',
    prompt: 'Read [filename] and explain: what it does, how it works, what the key functions are, and whether there is anything I should improve.',
    why: 'Four specific questions get four specific answers instead of a vague summary',
    tags: ['explain', 'read', 'understand', 'file', 'code'],
  },
  {
    id: 'ide-add-feature',
    title: 'Add a feature to existing code',
    category: 'IDE',
    prompt: 'Read [filename] first. Then add a function that [does X]. Make sure it fits the existing style, does not break anything, and run the file to confirm it works.',
    why: 'Read-first prevents Amo from rewriting code he has not seen',
    tags: ['add', 'feature', 'extend', 'modify', 'update'],
  },
  {
    id: 'terminal-run-explain',
    title: 'Run and explain a command',
    category: 'Terminal',
    prompt: 'Run [command] and explain what the output means. If there are any warnings or errors, tell me which ones I should care about and which I can ignore.',
    why: 'Asking for interpretation of output is more valuable than just seeing raw text',
    tags: ['run', 'terminal', 'command', 'explain', 'output'],
  },
  {
    id: 'terminal-workflow',
    title: 'Multi-step terminal workflow',
    category: 'Terminal',
    prompt: 'I need to [goal — e.g. set up a new project / deploy / run tests]. Do it step by step using the terminal. After each step, confirm it worked before moving to the next one.',
    why: 'Step-by-step confirmation prevents cascading failures from one bad step',
    tags: ['terminal', 'workflow', 'steps', 'sequence', 'automate'],
  },
  {
    id: 'terminal-env-check',
    title: 'Check the environment',
    category: 'Terminal',
    prompt: 'Check what is installed on this device: node version, npm version, python version, git version. Tell me what is missing and how to get it.',
    why: 'Environment audit before starting prevents "command not found" errors mid-task',
    tags: ['environment', 'installed', 'check', 'node', 'python', 'git'],
  },
  {
    id: 'web-research-save',
    title: 'Research a topic and save it',
    category: 'Web',
    prompt: 'Research [topic] using web search. Find at least three good sources, summarise the key points, then save the summary as a file in my workspace.',
    why: 'Explicit source count and save instruction gives a concrete deliverable',
    tags: ['research', 'search', 'save', 'summary', 'web'],
  },
  {
    id: 'vocabulary-extract-web',
    title: 'Extract vocabulary from website',
    category: 'Knowledge',
    prompt: 'Go to the vocabulary builder and extract vocabulary words from [URL]. Focus on [type of words - e.g. technical terms / business vocabulary / academic words]. Create a vocabulary set with definitions and example sentences.',
    why: 'Specifying word type helps Amo focus on the most relevant vocabulary for your needs',
    tags: ['vocabulary', 'extract', 'web', 'definitions', 'learning'],
  },
  {
    id: 'vocabulary-compose-ai',
    title: 'AI-powered vocabulary composition',
    category: 'Knowledge',
    prompt: 'Open the vocabulary builder and use AI composition to create a vocabulary set for [topic/context - e.g. programming interviews / business meetings / academic writing]. Include 20-30 relevant words with definitions and usage examples.',
    why: 'Context-specific vocabulary ensures the words are immediately useful for your situation',
    tags: ['vocabulary', 'compose', 'ai', 'generate', 'context'],
  },
  {
    id: 'sentence-builder-create',
    title: 'Generate structured sentences',
    category: 'Knowledge',
    prompt: 'Open the sentence builder and create sentences about [topic]. Use different templates and structures to show variety. Generate at least 10 sentences with varying complexity.',
    why: 'Multiple sentence structures demonstrate language flexibility and improve communication skills',
    tags: ['sentence', 'builder', 'generate', 'structure', 'variety'],
  },
  {
    id: 'sentence-template-design',
    title: 'Design sentence templates',
    category: 'Knowledge',
    prompt: 'Create sentence templates for [purpose - e.g. business emails / academic papers / creative writing]. Include placeholder word options and explain when each template should be used.',
    why: 'Purpose-driven templates ensure practical applicability in specific contexts',
    tags: ['sentence', 'template', 'design', 'purpose', 'writing'],
  },
  {
    id: 'intent-enhancer-setup',
    title: 'Enhance intent recognition',
    category: 'Knowledge',
    prompt: 'Open the intent enhancer and add keywords and tags to improve how I understand [type of requests - e.g. technical questions / creative tasks / research requests]. Test the prediction with sample inputs.',
    why: 'Specific request categories help Amo provide more accurate and relevant responses',
    tags: ['intent', 'enhancer', 'keywords', 'tags', 'prediction'],
  },
  {
    id: 'intent-analytics-review',
    title: 'Review intent prediction performance',
    category: 'Knowledge',
    prompt: 'Open the intent enhancer analytics and show me my prediction accuracy, top keywords, and areas for improvement. Suggest specific actions to improve intent recognition.',
    why: 'Analytics-driven insights help systematically improve communication effectiveness',
    tags: ['intent', 'analytics', 'performance', 'improvement', 'accuracy'],
  },
  {
    id: 'web-compare',
    title: 'Compare two things',
    category: 'Web',
    prompt: 'Compare [option A] and [option B]. Search the web for current information on both. Give me: key differences, pros and cons of each, and a recommendation for [my use case].',
    why: 'Structured output request means you get a usable comparison not a wall of text',
    tags: ['compare', 'versus', 'difference', 'pros', 'cons'],
  },
  {
    id: 'web-news',
    title: 'Get current news on a topic',
    category: 'Web',
    prompt: 'Search for the latest news on [topic]. Summarise the top three stories, include the source names, and tell me the most important thing I should know right now.',
    why: 'Asking for source names helps you verify. The "most important" request forces prioritisation',
    tags: ['news', 'latest', 'current', 'today', 'search'],
  },
  {
    id: 'know-from-imports',
    title: 'Ask about something you imported',
    category: 'Knowledge',
    prompt: 'Based on the documents I have imported, what does [document or topic] say about [specific question]? Quote the relevant part if you can find it.',
    why: 'Anchoring to imported documents prevents Amo from guessing when the answer should be in your files',
    tags: ['imported', 'document', 'knowledge', 'brain', 'find'],
  },
  {
    id: 'know-store-fact',
    title: 'Store a fact permanently',
    category: 'Knowledge',
    prompt: 'Remember this permanently: [fact]. Confirm you have stored it.',
    why: 'Explicit confirmation check ensures the fact was actually saved not just acknowledged',
    tags: ['remember', 'store', 'permanent', 'fact', 'memory'],
  },
  {
    id: 'know-brain-summary',
    title: 'Summarise everything Amo knows about a topic',
    category: 'Knowledge',
    prompt: 'Search your knowledge brain and tell me everything you know about [topic]. Include: what I have imported, what you know from training, and whether anything needs a web check.',
    why: 'Three-layer request surfaces local, training, and live knowledge simultaneously',
    tags: ['knowledge', 'brain', 'know', 'training', 'imported'],
  },
  {
    id: 'voice-setup',
    title: 'Set up voice mode',
    category: 'Voice',
    prompt: 'I am going to use voice. Keep your replies short and spoken-friendly — no bullet points, no markdown, no long lists. Confirm you understand.',
    why: 'Sets voice mode expectations so every reply works when spoken aloud',
    tags: ['voice', 'spoken', 'short', 'audio', 'tts'],
  },
  {
    id: 'chat-structured',
    title: 'Get a structured answer',
    category: 'Chat',
    prompt: 'Explain [topic] in this format: 1) What it is in one sentence. 2) How it works in three bullet points. 3) A real-world example. 4) One thing most people get wrong.',
    why: 'Numbered format with explicit sections prevents vague or wandering answers',
    tags: ['explain', 'structured', 'format', 'understand', 'learn'],
  },
  {
    id: 'chat-expert',
    title: 'Roleplay as a domain expert',
    category: 'Chat',
    prompt: 'Act as an experienced [role — e.g. senior developer, NZ lawyer, doctor, mechanic]. I will ask you questions. Answer as that expert would — practical, direct, no unnecessary caveats.',
    why: 'Role assignment shifts Amo into a focused answer mode without hedging',
    tags: ['expert', 'role', 'professional', 'domain', 'advice'],
  },
  {
    id: 'chat-improve',
    title: 'Critique and improve something',
    category: 'Chat',
    prompt: 'Here is a [draft / piece of code / plan]: [paste it]. Tell me three specific things that are wrong or could be better. Then rewrite it with those improvements applied.',
    why: 'Asking for critique before rewrite means you understand the changes not just accept them',
    tags: ['improve', 'critique', 'review', 'rewrite', 'better'],
  },
  {
    id: 'chat-teach',
    title: 'Teach me step by step',
    category: 'Chat',
    prompt: 'Teach me [topic] from scratch. Assume I know nothing. Go one concept at a time and ask me if I understand before moving to the next step.',
    why: 'Paced teaching prevents information overload — Amo checks in before continuing',
    tags: ['teach', 'learn', 'explain', 'beginner', 'step by step'],
  },
];

// ── KNOWLEDGE SEED EXPORT ─────────────────────────────────────────────────────
// Formatted for loading into the vector DB via knowledgeBootstrapService

export function buildHelpKnowledgeChunks() {
  const commandsText = AMO_COMMANDS.map(c =>
    `Command: "${c.text}" — ${c.description} (${c.section})`
  ).join('\n');

  const templatesText = AMO_PROMPT_TEMPLATES.map(t =>
    `Template: "${t.title}" (${t.category})\nPrompt: ${t.prompt}\nWhy it works: ${t.why}`
  ).join('\n\n');

  return [
    {
      id: 'amo-commands-reference',
      title: 'Every command Amo understands',
      tags: ['commands', 'what can you do', 'how do I', 'list commands', 'help', 'navigation', 'voice commands'],
      content: `Amo understands these commands. Say or type any of them:\n\n${commandsText}`,
    },
    {
      id: 'amo-prompt-templates',
      title: 'Prompt templates — how to get the best results from Amo',
      tags: ['prompt', 'template', 'how to ask', 'best results', 'example', 'guide'],
      content: `Use these prompt templates to get the best results from Amo:\n\n${templatesText}`,
    },
  ];
}
