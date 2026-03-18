// Amo's complete self-knowledge of the Ask-Amo app.
// This loads into the vector DB at startup and is retrieved when users
// ask about features, capabilities, or how to use the app.

export interface AmoKnowledgeChunk {
  id: string;
  title: string;
  tags: string[];
  content: string;
}

export const AMO_SELF_KNOWLEDGE: AmoKnowledgeChunk[] = [

  // ── IDENTITY ──────────────────────────────────────────────────────────────
  {
    id: 'amo-identity',
    title: 'Who Amo is and what he can do',
    tags: ['amo', 'identity', 'about', 'who are you', 'what can you do', 'capabilities', 'overview'],
    content: `Amo is a wise AI assistant built into the Ask-Amo app on Android with comprehensive knowledge, understanding, and wisdom.
He can chat, answer questions, browse the web, run terminal commands, edit code, read documents, build vocabulary, construct sentences, enhance intent, and use a local knowledge brain.
He works offline using a native GGUF model, or online using cloud providers like Groq, Gemini, OpenAI, and OpenRouter.
He has memory across conversations and can search his knowledge base to give grounded answers.
He can switch between 7 different views: Chat, Web Browser, Terminal, Code Editor, Vocabulary Builder, Sentence Builder, and Intent Enhancer.
Each view provides specialized tools for different tasks, and Amo can navigate between them seamlessly.

Amo's comprehensive capabilities include:
- Web Assist: Research, information gathering, and online resource utilization
- Terminal Operations: System administration, scripting, and development workflows
- Code Development: Programming, debugging, and software engineering
- Vocabulary Building: Language learning, word extraction, and vocabulary enhancement
- Sentence Construction: Communication improvement and text composition
- Intent Enhancement: Understanding, analysis, and communication optimization
- Knowledge Management: Document processing and information organization
- Creative Problem-Solving: Critical thinking and innovative solutions

Amo learns from every interaction and continuously improves his capabilities. He proactively suggests the best tools for each task and seamlessly integrates multiple tools to achieve optimal results.`,
  },

  // ── CHAT ──────────────────────────────────────────────────────────────────
  {
    id: 'amo-feature-chat',
    title: 'Chat — how to use the main chat interface',
    tags: ['chat', 'message', 'conversation', 'send', 'reply', 'typing', 'voice', 'input'],
    content: `The Chat view is Amo's main interface. Type a message in the input bar and press Send or hit Enter.
To start a new line without sending, press Shift+Enter.
To attach an image, tap the + button on the left of the input bar and choose a photo.
To upload a document (PDF, TXT, or Markdown), tap + and select the file — it goes straight into Amo's knowledge.
To use voice input, tap the microphone icon in the input bar. Amo will listen and transcribe using Whisper.
Voice Mode (in Settings > General) makes Amo speak every reply aloud automatically.
To stop Amo mid-reply, tap the X button that replaces the Send button while he is thinking.
To copy a reply, tap the copy icon on any message.
To regenerate a reply, tap the refresh icon — Amo will re-answer from the same question.
To clear the conversation, tap the bin icon in the top bar.
Multiple conversations are supported. Open the sidebar (menu icon) to switch, rename, or delete chats.`,
  },

  // ── VOCABULARY BUILDER ───────────────────────────────────────────────────────
  {
    id: 'amo-feature-vocabulary',
    title: 'Vocabulary Builder — extract and create vocabulary sets',
    tags: ['vocabulary', 'builder', 'words', 'extract', 'compose', 'learning', 'definitions', 'language'],
    content: `The Vocabulary Builder helps you extract, create, and manage vocabulary sets for learning and reference.
It has 4 main tabs: Extract, Composer, Library, and Review.

EXTRACT TAB: Pull vocabulary from websites or uploaded documents.
- Web Extraction: Enter a URL to extract words from any webpage
- File Extraction: Upload PDF, TXT, or Markdown files to extract vocabulary
- Filtering Options: Choose word types (technical, business, academic, etc.)
- Automatic Definitions: Gets definitions and example sentences for extracted words

COMPOSER TAB: Use AI to generate themed vocabulary sets.
- AI Composition: Tell Amo the context (business meetings, programming interviews, etc.)
- Smart Generation: Creates 20-30 relevant words with definitions
- Context-Aware: Words are tailored to your specific needs
- Export Options: Save sets for later use or review

LIBRARY TAB: Manage and organize your vocabulary collections.
- Search & Filter: Find specific words or vocabulary sets
- Categorization: Organize by difficulty, topic, or source
- Statistics: Track word counts and learning progress
- Import/Export: Share vocabulary sets between devices

REVIEW TAB: Practice and reinforce vocabulary learning.
- Flashcard Style: Review words with definitions and examples
- Progress Tracking: Monitor mastery and retention
- Spaced Repetition: Optimized review schedule
- Performance Analytics: Identify areas for improvement

To open: Tap the "Vocabulary" tab, or say "go to vocabulary" or "open vocabulary builder".
Commands: "build vocabulary from [URL]", "create vocabulary set", "review my vocabulary"`,
  },

  // ── SENTENCE BUILDER ───────────────────────────────────────────────────────
  {
    id: 'amo-feature-sentence-builder',
    title: 'Sentence Builder — create structured sentences with templates',
    tags: ['sentence', 'builder', 'templates', 'structure', 'grammar', 'writing', 'composition'],
    content: `The Sentence Builder helps you create well-structured sentences using templates and word variations.
It has 5 main tabs: Generation, Templates, Word Tables, Rules, and Statistics.

GENERATION TAB: Create sentences using templates and word options.
- Template Selection: Choose from various sentence structures
- Word Variation: Multiple options for each part of speech
- Real-time Generation: See sentences build as you select options
- Confidence Scoring: Quality assessment for generated sentences

TEMPLATES TAB: Design and manage sentence patterns.
- Create Templates: Build custom sentence structures
- Weighted Selection: Prioritize certain templates
- Context Tags: Organize templates by use case
- Import/Export: Share templates with others

WORD TABLES TAB: Manage word banks for sentence building.
- Categorized Words: Organize by part of speech and topic
- Weight Options: Set frequency and preference weights
- Dynamic Updates: Add new words on the fly
- Import from Files: Bulk word import capabilities

RULES TAB: Define grammar and composition rules.
- Grammar Constraints: Ensure proper sentence structure
- Style Guidelines: Maintain consistent writing style
- Context Rules: Apply rules based on situation
- Validation: Real-time rule checking

STATISTICS TAB: Track sentence generation performance.
- Usage Analytics: Most used templates and words
- Quality Metrics: Sentence quality over time
- Improvement Suggestions: AI-powered recommendations
- Export Reports: Download performance data

To open: Tap the "Sentence Builder" tab, or say "go to sentence builder" or "build sentences".
Commands: "generate sentence about [topic]", "create sentence template", "add word options"`,
  },

  // ── INTENT ENHANCER ───────────────────────────────────────────────────────
  {
    id: 'amo-feature-intent-enhancer',
    title: 'Intent Enhancer — improve Amo\'s understanding of your requests',
    tags: ['intent', 'enhancer', 'prediction', 'keywords', 'tags', 'understanding', 'accuracy'],
    content: `The Intent Enhancer helps Amo better understand your requests through keyword and tag analysis.
It has 5 main tabs: Predictor, Keywords, Tags, Patterns, and Analytics.

PREDICTOR TAB: Test and improve intent recognition.
- Real-time Testing: Type requests and see predicted intents
- Confidence Scoring: Shows prediction accuracy (0-100%)
- Alternative Suggestions: Multiple possible interpretations
- Reasoning Display: See how Amo reached conclusions
- Copy Results: Export predictions for analysis

KEYWORDS TAB: Manage keywords for intent recognition.
- 7 Categories: Action, Subject, Modifier, Context, Emotion, Technical, Custom
- Weighted Importance: Set priority levels (0-100) for each keyword
- Synonym Support: Multiple word variations for each keyword
- Pattern Matching: Regex patterns for flexible detection
- Usage Tracking: Monitor keyword effectiveness over time

TAGS TAB: Add contextual tags for better understanding.
- 8 Tag Types: User, System, Context, Emotion, Domain, Complexity, Urgency, Custom
- Tag Combinations: Create rules for multiple-tag scenarios
- Contextual Weighting: Different importance in different situations
- Performance Analytics: Track tag success rates
- Automatic Learning: Improves from user feedback

PATTERNS TAB: Define recognition patterns for common requests.
- Regex Patterns: Flexible pattern matching for complex requests
- Example-Based Learning: Learn from conversation examples
- Confidence Boosting: Increase accuracy for specific patterns
- Pattern Testing: Validate patterns before deployment
- Version Control: Track pattern changes over time

ANALYTICS TAB: Monitor and improve prediction performance.
- Accuracy Metrics: Overall prediction success rate
- Top Performers: Most effective keywords and tags
- Improvement Trends: Progress over time
- Usage Statistics: How often each intent is predicted
- Optimization Suggestions: AI-powered improvement recommendations

To open: Tap the "Intent Enhancer" tab, or say "go to intent enhancer" or "enhance my intent".
Commands: "add keyword [word]", "add tag [name]", "test intent prediction", "view intent analytics"`,
  },

  // ── WEBVIEW ───────────────────────────────────────────────────────────────
  {
    id: 'amo-feature-webview',
    title: 'Android WebView — how to browse the web inside Ask-Amo',
    tags: ['webview', 'browser', 'web', 'browse', 'open url', 'search web', 'internet', 'navigate'],
    content: `The Android WebView is a full browser embedded inside Ask-Amo.
To open it: tap the "Android WebView" tab in the top tab bar, or tell Amo "open the web browser" or "open webview".
To navigate: paste or type a URL into the address bar at the top of the WebView panel, or ask Amo to open a specific site.
Amo can automatically open WebView when you send a URL or say "search for [topic]".
Web Search Assist: when enabled (Settings > General), Amo searches the web before answering and shows results in WebView.
To disable web search, go to Settings > General and turn off Web Search.
Amo uses the WebView for research, browsing, and following up on tasks that need live information.`,
  },

  // ── TERMINAL ──────────────────────────────────────────────────────────────
  {
    id: 'amo-feature-terminal',
    title: 'Terminal — how to run commands inside Ask-Amo',
    tags: ['terminal', 'command', 'shell', 'run', 'execute', 'bash', 'script', 'build', 'install'],
    content: `The Terminal lets you run shell commands directly inside the app without leaving Ask-Amo.
To open it: tap the "Terminal" tab in the top tab bar, or tell Amo "open terminal" or "run a command".
Type commands in the input bar at the bottom of the Terminal panel and press Enter to execute.
The Terminal preserves your working directory between commands — so cd commands carry over to the next command.
Commands have a 20-second timeout by default. Long-running tasks will be killed after this.
Amo can switch to Terminal automatically when you ask him to run, build, execute, install, or debug something.
Use the Terminal for: running build scripts, checking file contents, installing packages, running tests, and executing any shell command.
The Terminal session ID keeps your working directory consistent across multiple commands in the same session.`,
  },

  // ── CODE EDITOR ───────────────────────────────────────────────────────────
  {
    id: 'amo-feature-editor',
    title: 'Code Editor — how to write and edit code inside Ask-Amo',
    tags: ['code editor', 'editor', 'code', 'write code', 'edit file', 'syntax', 'programming'],
    content: `The Code Editor is a built-in editor for writing and reviewing code without leaving Ask-Amo.
To open it: tap the "Code Editor" tab in the top tab bar, or tell Amo "open the code editor" or "edit code".
You can write, paste, and edit code in the editor panel.
Use the Terminal alongside the Code Editor to run and test your code immediately.
Amo can help you write, fix, explain, or review code in Chat while you have the Editor open.
Supported workflow: write in Editor, run in Terminal, ask Amo to debug or improve in Chat.`,
  },

  // ── VOICE ─────────────────────────────────────────────────────────────────
  {
    id: 'amo-feature-voice',
    title: 'Voice Mode and microphone — how to use voice with Amo',
    tags: ['voice', 'microphone', 'speak', 'listen', 'tts', 'speech', 'audio', 'talk', 'dictate'],
    content: `Amo supports both voice input (speech-to-text) and voice output (text-to-speech).
Voice Input: tap the microphone icon in the chat input bar. Amo records and transcribes using Whisper via Groq.
Voice Mode: in Settings > General, toggle Voice Mode ON. When enabled, Amo speaks every reply aloud automatically.
Amo uses Android's native TTS engine for spoken replies, preferring NZ or AU English voices when available.
To stop Amo speaking mid-reply, this is handled automatically when a new message is sent.
Voice mode works best with a Groq API key configured, since transcription uses the Whisper cloud model.
Offline voice output still works using the device's built-in TTS engine without internet.`,
  },

  // ── MODELS ────────────────────────────────────────────────────────────────
  {
    id: 'amo-feature-models',
    title: 'AI Models — how to choose and configure the model Amo uses',
    tags: ['model', 'ai model', 'groq', 'gemini', 'openai', 'openrouter', 'offline', 'gguf', 'webllm', 'switch model'],
    content: `Amo can use multiple AI providers and models. Switch between them in Settings > Models.
Available model types:
- Native GGUF (offline): runs a local GGUF model on the device using Android's native runtime. No internet needed. Recommended: Qwen2.5 0.5B Q3_K_M or Q4_K_M.
- WebLLM (offline): runs a model in the browser using WebGPU. Slower but fully offline.
- Groq (cloud): fast cloud inference. Supports Llama, Mixtral, and Gemma models. Needs a Groq API key.
- Gemini (cloud): Google Gemini models. Needs a Gemini API key.
- OpenAI (cloud): GPT models. Needs an OpenAI API key.
- OpenRouter (cloud): access to many models through one key. Needs an OpenRouter API key.
To use a cloud model: add the API key in Settings > General, then select the model in Settings > Models.
To use offline: go to Settings > Models, paste a GGUF download URL or tap Import File to use a local .gguf file.
Deep Think mode (toggle in chat): makes Amo reason more carefully and give longer, more precise answers.`,
  },

  // ── KNOWLEDGE / BRAIN ─────────────────────────────────────────────────────
  {
    id: 'amo-feature-knowledge',
    title: 'Knowledge Brain — how to import documents and data into Amo',
    tags: ['knowledge', 'brain', 'document', 'import', 'upload', 'pdf', 'dataset', 'skill', 'memory', 'vector', 'url import'],
    content: `Amo has a local knowledge brain powered by a vector database stored on the device.
He searches this brain automatically before every reply to find relevant context.
How to add knowledge:
- Import a document: tap + in chat or go to Settings > Knowledge > Import Docs. Supports PDF, TXT, and Markdown.
- Import a skill: go to Settings > Knowledge > Import Skills. Upload a text or Markdown skill file.
- Import from URL: go to Settings > Knowledge > URL Fetch Import. Paste a URL, choose type (Document, Skill, or Dataset), and tap Import.
- Superbrain Pack: go to Settings > Knowledge and tap "Superbrain Pack" to load Amo's bundled knowledge — NZ English, Te Reo Maori, truth grounding, and reference data.
Imported knowledge persists on the device across sessions.
Amo uses the knowledge brain to answer questions about your documents, give grounded replies, and avoid making things up.
To view imported files: open the sidebar (menu icon) and tap the Files tab.`,
  },

  // ── MEMORY ────────────────────────────────────────────────────────────────
  {
    id: 'amo-feature-memory',
    title: 'Memory — how Amo remembers conversations',
    tags: ['memory', 'remember', 'context', 'history', 'recall', 'forget', 'conversation memory'],
    content: `Amo writes memory notes and conversation summaries after every exchange.
This means he can recall things you told him in previous messages within a session.
Memory is scoped per chat — each conversation has its own memory.
App-level memory (things true across all chats) is also maintained separately.
Memory is stored locally on the device in a SQLite-backed knowledge store.
Amo uses memory automatically — you do not need to do anything to activate it.
If Amo gets something wrong about past context, you can correct him in chat and he will update.
To view memory stats: go to Settings > Cognition and check the Brain Status panel.`,
  },

  // ── SETTINGS ──────────────────────────────────────────────────────────────
  {
    id: 'amo-feature-settings',
    title: 'Settings — what each settings tab does',
    tags: ['settings', 'configure', 'setup', 'api key', 'options', 'preferences', 'tabs'],
    content: `Settings has five tabs:
General: voice mode toggle, API keys for Groq, Gemini, OpenAI, and OpenRouter.
Models: choose the active AI model, download or import GGUF files for offline use, view model status.
Knowledge: import documents, skills, datasets, import from URL, load the Superbrain Pack.
Workspace: initialize the local workspace for autonomous tasks and file management.
Cognition: read-only view of Amo's brain status — memory notes, summaries, tools, and seed packs.
To open settings: tap the gear icon in the top right of the main screen.`,
  },

  // ── SIDEBAR ───────────────────────────────────────────────────────────────
  {
    id: 'amo-feature-sidebar',
    title: 'Sidebar — chats, files, and tools panel',
    tags: ['sidebar', 'menu', 'chats', 'files', 'workspace', 'new chat', 'switch chat', 'delete chat'],
    content: `The sidebar opens when you tap the menu icon (top left).
It has three tabs:
Chats: view all conversations, start a new one with "+ New Conversation", switch between chats, or delete a chat with the bin icon.
Files: view all imported documents and knowledge files. Tap + to import a new file.
Tools: quick access to open Settings.
To close the sidebar: tap anywhere outside it or tap X.`,
  },

  // ── WEB SEARCH ────────────────────────────────────────────────────────────
  {
    id: 'amo-feature-websearch',
    title: 'Web Search Assist — how Amo searches the internet',
    tags: ['web search', 'search', 'internet', 'live', 'online', 'look up', 'find online', 'current'],
    content: `Amo has a Web Search Assist feature that searches the internet before answering relevant questions.
It activates automatically when Amo detects the question needs current or external information.
Results are fetched, summarised, and injected into Amo's context before he replies.
The relevant URL is also opened in the WebView so you can see the source.
To enable or disable Web Search: Settings > General > Web Search toggle.
Web Search requires internet. Amo falls back to local knowledge if offline or if search fails.`,
  },

  // ── OFFLINE MODE ──────────────────────────────────────────────────────────
  {
    id: 'amo-feature-offline',
    title: 'Offline Mode — using Amo without internet',
    tags: ['offline', 'no internet', 'local', 'gguf', 'native', 'on-device', 'airplane mode'],
    content: `Amo can run fully offline using a native GGUF model on the Android device.
To set up offline mode:
1. Go to Settings > Models.
2. Paste a GGUF download URL (recommended: Qwen2.5 0.5B Q3_K_M) or tap Import File.
3. Wait for the download or import to complete.
4. The model status will show "ready" when Amo is ready to chat offline.
Select the Native model in Settings > Models before chatting.
Offline mode uses the device's local AI runtime — no data leaves the phone.
Voice output works offline using the device TTS engine. Voice input requires Groq (cloud) for Whisper transcription.
Knowledge brain, memory, and all app features work fully offline.`,
  },

  // ── MULTI-CHAT ────────────────────────────────────────────────────────────
  {
    id: 'amo-feature-multichats',
    title: 'Multiple Chats — managing conversations',
    tags: ['new chat', 'multiple chats', 'conversation history', 'switch', 'delete', 'rename'],
    content: `Ask-Amo supports multiple separate conversations.
Each conversation has its own message history and memory.
To create a new chat: open the sidebar and tap "+ New Conversation".
To switch chats: open the sidebar and tap any conversation in the list.
To delete a chat: hover over it in the sidebar and tap the bin icon.
Chat titles are automatically set from the first user message.
All chats are saved locally on the device in localStorage.`,
  },

  // ── PERSONAL IDENTITY ─────────────────────────────────────────────────────
  {
    id: 'amo-personal-identity',
    title: "Who Amo is — personal identity and origin",
    tags: ['who are you', 'who is amo', 'where are you from', 'your name', 'about you', 'introduce yourself', 'what are you', 'your creator', 'te amo wilson', 'created by', 'origin', 'born', 'aotearoa', 'new zealand', 'nz', 'identity', 'background'],
    content: `My name is Amo. I am an AI assistant from Aotearoa New Zealand.
I was created by Te Amo Wilson — that is where my name comes from.
I am grounded in NZ culture, Te Reo Maori, and practical knowledge.
My purpose is to be a genuinely useful, honest, and grounded assistant.
I work offline on this device and can also connect to cloud AI providers when online.
I have a local knowledge brain, memory of our conversations, and access to web search.`,
  },

  // ── WHAT AMO KNOWS ────────────────────────────────────────────────────────
  {
    id: 'amo-what-i-know',
    title: 'What Amo knows and can help with',
    tags: ['what do you know', 'what knowledge', 'what information do you have', 'what can you help with', 'what are your skills', 'areas you cover', 'what topics', 'what subjects', 'expertise', 'capabilities', 'what do you know about', 'knowledge base'],
    content: `I can help with a wide range of things:

General knowledge: history, science, geography, culture, current events via web search.
New Zealand and Aotearoa: NZ history, Te Reo Maori, Waikato-Tainui, local culture and language.
Technology: coding, debugging, software development, terminal commands, web development.
Writing: drafting emails, documents, summaries, explanations, creative writing.
Research: searching the web, summarising articles, fetching URLs, finding information.
Maths and logic: calculations, reasoning, problem solving, step-by-step working.
Productivity: planning, scheduling, reminders, notes, organising information.
Device and app tasks: using the terminal, code editor, file management, WebView browsing.
Imported knowledge: anything you have added to my knowledge brain — documents, datasets, skills.
Memory: I remember things you tell me across our conversation so you do not have to repeat yourself.

If I do not know something from memory or local knowledge, I will search the web and give you the answer.
If I genuinely cannot help, I will say so clearly and suggest where you might find what you need.`,
  },

  // ── WORLD CLOCK ────────────────────────────────────────────────────────────
  {
    id: 'amo-world-clock',
    title: 'World clock — current time in major cities and time zones',
    tags: ['world clock', 'time', 'current time', 'what time is it', 'timezone', 'time zone', 'clock', 'utc', 'gmt', 'time in', 'local time', 'auckland time', 'london time', 'new york time', 'sydney time', 'tokyo time', 'paris time', 'dubai time', 'los angeles time'],
    content: `Amo can tell you the current time in any city or time zone.
Key time zones relative to NZST (New Zealand Standard Time, UTC+12):
Auckland / Wellington: NZST UTC+12 (NZDT UTC+13 in summer)
Sydney / Melbourne: AEST UTC+10 (AEDT UTC+11 in summer)
Tokyo: JST UTC+9
Dubai: GST UTC+4
Nairobi / Moscow: EAT/MSK UTC+3
Paris / Berlin: CET UTC+1
London: GMT UTC+0
New York: EST UTC-5 (EDT UTC-4 in summer)
Los Angeles: PST UTC-8 (PDT UTC-7 in summer)
To get the exact current time, Amo uses your device clock and applies the offset.
Ask Amo: "what time is it in Tokyo" or "what is the time difference between Auckland and London".`,
  },

  // ── COMPREHENSIVE CAPABILITIES ───────────────────────────────────────────────────
  {
    id: 'amo-comprehensive-capabilities',
    title: 'Comprehensive Capabilities — All tasks Amo can perform',
    tags: ['capabilities', 'tasks', 'what can you do', 'abilities', 'skills', 'comprehensive', 'all features'],
    content: `Amo possesses comprehensive capabilities across all domains and can perform any task you request:

WEB ASSIST CAPABILITIES:
- Research and information gathering from online sources
- Real-time web search and content analysis
- Website exploration and content extraction
- Online resource discovery and utilization
- Current events and trending topics analysis
- Academic research and source verification
- Market research and competitive analysis
- Technical documentation lookup
- Tutorial and guide discovery

TERMINAL OPERATIONS:
- System administration and configuration
- Script development and automation
- File system management and operations
- Process monitoring and control
- Network diagnostics and troubleshooting
- Development environment setup
- Build and deployment automation
- System performance optimization
- Security scanning and analysis
- Database operations and management

CODE DEVELOPMENT:
- Programming in multiple languages (JavaScript, Python, Java, C++, etc.)
- Code debugging and optimization
- Software architecture and design
- API development and integration
- Database design and queries
- Frontend and backend development
- Mobile app development
- Testing and quality assurance
- Code review and refactoring
- Technical documentation

VOCABULARY BUILDING:
- Word extraction and analysis from any text
- Vocabulary set creation and management
- Learning progress tracking and optimization
- Contextual word usage and examples
- Etymology and word origins
- Synonyms and antonyms discovery
- Pronunciation guides and phonetics
- Language learning strategies
- Vocabulary testing and assessment
- Specialized terminology development

SENTENCE CONSTRUCTION:
- Sentence structure analysis and improvement
- Grammar correction and enhancement
- Style optimization and clarity improvement
- Communication effectiveness analysis
- Tone and voice adjustment
- Readability improvement
- Conciseness and impact enhancement
- Persuasive language techniques
- Professional communication coaching
- Multilingual sentence construction

INTENT ENHANCEMENT:
- Communication intent analysis and clarification
- Message optimization for different audiences
- Persuasive intent development
- Emotional intelligence in communication
- Conflict resolution and mediation
- Negotiation strategy development
- Public speaking preparation
- Presentation enhancement
- Social communication optimization
- Cross-cultural communication guidance

KNOWLEDGE MANAGEMENT:
- Document processing and analysis
- Information organization and categorization
- Knowledge base creation and maintenance
- Research synthesis and summarization
- Learning path development
- Expert system creation
- Decision support systems
- Knowledge gap identification
- Information retrieval optimization
- Learning recommendation systems

CREATIVE PROBLEM-SOLVING:
- Critical thinking and analysis
- Innovation and creativity enhancement
- Strategic planning and development
- Complex problem decomposition
- Solution generation and evaluation
- Risk assessment and mitigation
- Opportunity identification
- Trend analysis and forecasting
- Decision-making frameworks
- Systems thinking integration

Amo seamlessly integrates these capabilities to provide comprehensive solutions for any task or challenge you face.`,
  },

  // ── LEARNING AND IMPROVEMENT ─────────────────────────────────────────────────────
  {
    id: 'amo-learning-improvement',
    title: 'Learning and Continuous Improvement',
    tags: ['learning', 'improvement', 'adaptation', 'knowledge growth', 'capability enhancement', 'continuous learning'],
    content: `Amo continuously learns and improves from every interaction to provide better service:

LEARNING MECHANISMS:
- Conversation memory retention across sessions
- Pattern recognition in user preferences
- Knowledge base expansion from interactions
- Performance optimization based on feedback
- Contextual understanding enhancement
- Skill development through practice
- Adaptation to user communication style
- Error correction and refinement
- Success pattern replication
- Knowledge gap identification and filling

IMPROVEMENT AREAS:
- Response accuracy and relevance
- Communication clarity and effectiveness
- Task completion efficiency
- Tool utilization optimization
- Problem-solving approach refinement
- Creativity and innovation enhancement
- Emotional intelligence development
- Cultural sensitivity improvement
- Technical knowledge expansion
- User experience personalization

FEEDBACK INTEGRATION:
- User preference learning
- Communication style adaptation
- Task approach optimization
- Error prevention mechanisms
- Success factor identification
- Performance metric tracking
- Satisfaction measurement
- Engagement optimization
- Retention improvement
- Loyalty building strategies

Amo's learning is continuous, adaptive, and focused on providing increasingly valuable assistance with each interaction.`,
  },

  // ── CALENDAR ────────────────────────────────────────────────────────────────
  {
    id: 'amo-calendar',
    title: 'Calendar — dates, days, and scheduling help',
    tags: ['calendar', 'date', 'today', 'what day', 'what date', 'day of week', 'schedule', 'week', 'month', 'year', 'tomorrow', 'yesterday', 'how many days', 'days until', 'next monday', 'public holiday', 'nz public holiday', 'new zealand holiday'],
    content: `Amo can help with calendar questions using the current device date and time.
Questions Amo can answer: what day is today, what is tomorrow's date, how many days until a date, what day of the week is a specific date, NZ public holidays, and date arithmetic.
New Zealand public holidays include: New Year's Day, Day after New Year's, Waitangi Day, Good Friday, Easter Monday, ANZAC Day, King's Birthday, Matariki, Labour Day, Christmas Day, Boxing Day, and regional Anniversary Days.
Matariki (Maori New Year) is a public holiday celebrated in June or July based on the lunar calendar.
For scheduling: Amo can help plan tasks across days, calculate deadlines, and remind you of upcoming dates within a conversation.`,
  },

  // ── VOICE COMMANDS ───────────────────────────────────────────────────────────
  {
    id: 'amo-voice-commands',
    title: 'Voice and text commands — navigation and shortcuts',
    tags: ['command', 'navigate', 'switch', 'go to', 'open', 'voice command', 'shortcut', 'navigation', 'switch view', 'change view'],
    content: `Amo responds instantly to these navigation commands without needing the AI model:

Attention: Say "Amo" alone to get an instant response confirming I am ready.

Navigation commands (say or type any of these):
- "go to chat" / "open chat" / "back to chat" — switches to the main chat view
- "go to webview" / "open browser" / "open web" — opens the Android WebView
- "go to terminal" / "open terminal" / "open console" — opens the Terminal
- "go to editor" / "open code editor" / "open editor" — opens the Code Editor
- "go to vocabulary" / "open vocabulary builder" / "build vocabulary" — opens the Vocabulary Builder
- "go to sentence builder" / "open sentence builder" / "build sentences" — opens the Sentence Builder
- "go to intent enhancer" / "open intent enhancer" / "enhance my intent" — opens the Intent Enhancer
- "open workspace" / "open files" / "open folder" — opens the workspace file browser
- "open settings" / "open preferences" — opens the Settings panel
- "open knowledge" — opens the Knowledge settings tab
- "new chat" / "start fresh" — creates a new conversation
- "clear chat" / "clear messages" — clears the current conversation
- "stop" / "cancel" / "never mind" — cancels the current action

Feature-specific commands:
- "build vocabulary from [URL]" — extract vocabulary from a website
- "create vocabulary set" — open vocabulary builder to create word sets
- "compose vocabulary with AI" — use AI to generate themed vocabulary
- "review my vocabulary" — open vocabulary review session
- "generate sentence about [topic]" — create sentences using templates
- "create sentence template" — design reusable sentence patterns
- "add keyword [word]" — add keyword for better intent recognition
- "add tag [name]" — add contextual tag for intent prediction
- "test intent prediction" — test how Amo understands your requests
- "view intent analytics" — show prediction accuracy and statistics

Search shortcuts:
- "search for [topic]" — opens WebView and searches immediately
- "look up [topic]" — same as search
- Sending a URL directly opens it in WebView

Voice language: Amo listens in NZ English by default with Maori word support.
Common Maori words are understood: kia ora, whanau, haere mai, aroha, mana, tapu.`,
  },

];
