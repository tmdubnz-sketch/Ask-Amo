// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ASK-AMO USER MANUAL
// Complete guide to all features and capabilities
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ManualSection {
  id: string;
  title: string;
  icon: string;
  sections: ManualTopic[];
}

export interface ManualTopic {
  title: string;
  content: string;
  tips?: string[];
  examples?: string[];
}

export const USER_MANUAL: ManualSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: 'rocket',
    sections: [
      {
        title: 'What is Amo?',
        content: 'Amo is your AI assistant that runs on your device. You can chat, write code, search the web, manage files, build vocabulary, and remember things. Amo works with both cloud models (requires internet and API keys) and local models (works offline).',
        tips: [
          'Start by typing a message in the chat input',
          'Amo can understand natural language - just ask normally',
          'Use voice mode by tapping the microphone button',
        ],
      },
      {
        title: 'Choosing a Model',
        content: 'Open Settings > Models to choose your AI model. Cloud models (Groq, Gemini, OpenAI) are more capable but require API keys. Local models (Phi-3.5 Mini) work offline but are less powerful.',
        tips: [
          'Cloud models search the web automatically',
          'Local models need the web search toggle ON to search',
          'Phi-3.5 Mini runs on your device with no internet needed',
        ],
      },
      {
        title: 'Setting Up API Keys',
        content: 'To use cloud models, enter your API key in Settings > Models. Groq offers free keys. OpenAI, Gemini, and others have free tiers. Your keys are stored securely on your device.',
        tips: [
          'Get a free Groq key at console.groq.com',
          'Keys are encrypted and never shared',
          'Multiple providers can be configured at once',
        ],
      },
    ],
  },
  {
    id: 'chat',
    title: 'Chat & Communication',
    icon: 'message-circle',
    sections: [
      {
        title: 'Basic Chat',
        content: 'Type your message and press Enter or tap Send. Amo will respond using the selected model. Messages are saved in your chat history.',
        examples: [
          'What is the capital of France?',
          'Explain how photosynthesis works',
          'Help me write an email to my boss',
        ],
      },
      {
        title: 'Voice Mode',
        content: 'Tap the microphone to speak your message. Enable voice mode to hear Amo speak responses aloud. Voice mode uses text-to-speech with natural voices.',
        tips: [
          'Say "voice on" to enable spoken responses',
          'Say "voice off" to disable',
          'Amo strips markdown symbols for natural speech',
          'Speech starts immediately during streaming',
        ],
      },
      {
        title: 'Translation',
        content: 'Ask Amo to translate text between languages. Works with any language supported by the model.',
        examples: [
          'Translate "hello" to Spanish',
          'How do you say "thank you" in Japanese?',
          'Translate this paragraph to French: ...',
        ],
      },
      {
        title: 'Deep Think Mode',
        content: 'Enable Deep Think for complex questions that need careful reasoning. The model will take more time and show its reasoning steps.',
        tips: [
          'Toggle in Settings > Behaviour',
          'Best for math, logic, and analysis',
          'Uses more tokens but gives better answers',
        ],
      },
    ],
  },
  {
    id: 'code-editor',
    title: 'Code Editor',
    icon: 'code',
    sections: [
      {
        title: 'Writing Code',
        content: 'Ask Amo to write code and it appears in the Code Editor automatically. Click the Code Editor tab or say "open editor" to switch views.',
        examples: [
          'Write a Python hello world script',
          'Create a function to sort a list',
          'Write an HTML page with a contact form',
        ],
        tips: [
          'Code blocks in chat are auto-saved to the editor',
          'Say "show me the code in chat" to see code inline',
          'Use the file tree button (folder icon) to browse files',
        ],
      },
      {
        title: 'Running Code',
        content: 'Click the Run button to execute code. JavaScript and Python run directly in the browser. Other languages use the terminal.',
        tips: [
          'JavaScript/TypeScript runs via QuickJS (browser sandbox)',
          'Python runs via Pyodide (browser sandbox)',
          'Shell scripts run via the terminal',
          'Output appears in the Output panel',
        ],
      },
      {
        title: 'Generating Code with AI',
        content: 'Use the "Generate Code" input at the bottom of the editor to ask Amo to write or modify code. Amo will update the editor with the result.',
        tips: [
          'Describe what you want in plain language',
          'Amo can modify existing code in the editor',
          'Ask for "add error handling" or "optimize this"',
        ],
      },
      {
        title: 'File Management',
        content: 'Click the folder icon to open the file tree. Browse your workspace files and click to open them in the editor. Amo writes files to your workspace when it creates code.',
        tips: [
          'Files are stored in your workspace folder',
          'Android: /storage/emulated/0/Documents/AskAmo',
          'Browser: Downloaded as files',
        ],
      },
    ],
  },
  {
    id: 'terminal',
    title: 'Terminal',
    icon: 'terminal',
    sections: [
      {
        title: 'Using the Terminal',
        content: 'The terminal lets you run shell commands directly. Say "open terminal" or tap the Terminal tab. Type commands and press Enter to execute.',
        examples: [
          'ls -la',
          'pwd',
          'cat filename.txt',
          'npm install',
          'git status',
        ],
      },
      {
        title: 'Amo-Executed Commands',
        content: 'Amo can run terminal commands for you automatically. Just ask and Amo will execute the command and show you the output.',
        examples: [
          'Run npm run build',
          'List my files',
          'Check git status',
          'Install dependencies',
        ],
      },
      {
        title: 'Supported Commands',
        content: 'On Android, the terminal supports basic shell commands. Common tools like npm, git, and python may not be available unless installed separately.',
        tips: [
          'ls, cat, pwd, echo, mkdir, touch, cp, mv',
          'grep, find, head, tail, wc',
          'ping, curl, wget (if available)',
        ],
      },
    ],
  },
  {
    id: 'web-browser',
    title: 'Web Browser',
    icon: 'globe',
    sections: [
      {
        title: 'Browsing the Web',
        content: 'Ask Amo to open a website and it will open in your browser. Say "open [URL]" or "search for [topic]" to browse.',
        examples: [
          'Open github.com',
          'Search for latest AI news',
          'Look up npm package docs',
        ],
      },
      {
        title: 'Web Search',
        content: 'Cloud models search the web automatically. Just ask a question about current events, news, or facts. The web search toggle is only needed for local models.',
        tips: [
          'Cloud models: Web search is automatic',
          'Native models: Toggle web search ON',
          'Results include source URLs for verification',
        ],
      },
      {
        title: 'Importing Web Content',
        content: 'Amo can read web pages and save them to your knowledge brain. Ask "read this page" or "save this page" to import content.',
        tips: [
          'Web content is indexed for search',
          'Ask questions about imported pages later',
          'Combine web content with uploaded documents',
        ],
      },
    ],
  },
  {
    id: 'knowledge-brain',
    title: 'Knowledge Brain',
    icon: 'brain',
    sections: [
      {
        title: 'What is the Brain?',
        content: 'The knowledge brain stores facts, memories, and information from your conversations. Amo learns from interactions and can recall information later.',
        tips: [
          'Say "show brain status" to see what Amo remembers',
          'Conversations are automatically stored',
          'Import documents to build your knowledge base',
        ],
      },
      {
        title: 'Teaching Amo',
        content: 'Use "learn this:" to store permanent facts. Amo will remember and recall them in future conversations.',
        examples: [
          'Learn this: my name is John',
          'Learn this: I work at Acme Corp',
          'Learn this: the project deadline is March 15',
        ],
      },
      {
        title: 'Forgetting Information',
        content: 'Use "forget about" to remove specific information from the brain.',
        examples: [
          'Forget about my old job',
          'Forget about the previous project',
        ],
      },
      {
        title: 'Querying Knowledge',
        content: 'Ask "what do you know about" to search the brain for information.',
        examples: [
          'What do you know about my work?',
          'What do you know about Python?',
          'What do you know about my preferences?',
        ],
      },
      {
        title: 'Uploading Documents',
        content: 'Upload PDFs, text files, or images to build your knowledge base. Amo will parse and index them for search.',
        tips: [
          'Tap the + button to upload files',
          'PDFs are parsed automatically',
          'Text files are indexed for search',
          'Images are analyzed by vision models',
        ],
      },
    ],
  },
  {
    id: 'builders',
    title: 'Builder Tools',
    icon: 'wrench',
    sections: [
      {
        title: 'Vocabulary Builder',
        content: 'Extract, learn, and manage vocabulary from text. Create vocabulary sets, track mastery, and improve your language skills.',
        examples: [
          'Extract words from: [paste text]',
          'Open vocabulary',
          'Build vocabulary for programming',
        ],
      },
      {
        title: 'Sentence Builder',
        content: 'Generate sentence variations using weighted word tables. Create templates and produce multiple versions.',
        examples: [
          'Generate variations of: I want to learn programming',
          'Open sentence builder',
          'Create sentence templates for business emails',
        ],
      },
      {
        title: 'Intent Enhancer',
        content: 'Analyze and optimize your communication intent. Add keywords and tags to improve how Amo understands your requests.',
        examples: [
          'Analyze intent: how do I improve my skills',
          'Open intent enhancer',
          'Enhance my message about [topic]',
        ],
      },
    ],
  },
  {
    id: 'shortcuts',
    title: 'Quick Reference',
    icon: 'zap',
    sections: [
      {
        title: 'Instant Commands',
        content: 'These commands work immediately without AI processing:',
        examples: [
          'terminal / editor / browser / settings → Open that view',
          'help → Show available commands',
          'hello / hi / hey → Greeting response',
          'thanks → Acknowledgement',
          'clear chat → Clear conversation',
          'voice on / voice off → Toggle speech',
          'brain status → Show memory stats',
          'files / workspace → List workspace files',
        ],
      },
      {
        title: 'Tips for Best Results',
        content: 'Get the best results from Amo by following these tips:',
        tips: [
          'Be specific in your requests',
          'Use "write a Python function" instead of "code"',
          'Upload documents to build your knowledge base',
          'Use cloud models for complex reasoning',
          'Use native models for offline/private conversations',
          'Toggle Deep Think for complex questions',
          'Use voice mode for hands-free operation',
        ],
      },
      {
        title: 'Troubleshooting',
        content: 'Common issues and solutions:',
        tips: [
          'No response? Check if model is loaded (Settings > Models)',
          'API error? Check your API key in Settings',
          'Code not running? Try JavaScript or Python (browser sandbox)',
          'Terminal commands failing? Some tools not available on Android',
          'Speech not working? Check voice mode toggle',
          'App slow? Try clearing chat or restarting',
        ],
      },
    ],
  },
];

export default USER_MANUAL;
