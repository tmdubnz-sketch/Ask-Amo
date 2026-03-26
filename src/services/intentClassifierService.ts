export type IntentType = 
  | 'chat'           // General conversation
  | 'code'           // Code generation/analysis
  | 'task'           // Multi-step task
  | 'search'         // Web/knowledge search
  | 'help'           // Help request
  | 'file'           // File operations
  | 'terminal'       // Command execution
  | 'knowledge'      // Knowledge retrieval
  | 'memory'         // Memory operations
  | 'settings'       // App settings
  | 'voice'          // Voice operations
  | 'unknown';

export interface IntentResult {
  type: IntentType;
  confidence: number;
  subIntent: string | null;
  requiresWeb: boolean;
  requiresTools: boolean;
  suggestedPrompt: string | null;
}

const INTENT_PATTERNS: Array<{
  type: IntentType;
  patterns: RegExp[];
  subPatterns?: Record<string, RegExp[]>;
  requiresWeb?: boolean;
  requiresTools?: boolean;
}> = [
  {
    type: 'code',
    patterns: [
      /\b(write|create|generate|build|make|code)\b.*\b(code|program|script|function|class|app|app|web|api)\b/i,
      /\b(debug|fix|error|bug|issue)\b/i,
      /\b(python|javascript|typescript|html|css|react|node|sql)\b/i,
      /\b(refactor|optimize|improve)\b/i,
      /\b(explain|how.*work)\b.*\b(code|function|algorithm)\b/i,
    ],
    requiresTools: true,
  },
  {
    type: 'terminal',
    patterns: [
      /\b(run|execute|install|build|compile|test)\b.*\b(command|shell|terminal|npm|git|docker)\b/i,
      /\b(npm|pnpm|yarn|git|python|java|docker)\b.*\b(run|install|build|start|test)\b/i,
      /^(ls|cd|git|npm|pnpm|docker|make|cargo)/i,
    ],
    requiresTools: true,
  },
  {
    type: 'file',
    patterns: [
      /\b(save|write|read|delete|create|open|import|export)\b.*\b(file|document|folder|directory)\b/i,
      /\b(list|show|find|search)\b.*\b(files|documents|folder)\b/i,
    ],
    requiresTools: true,
  },
  {
    type: 'search',
    patterns: [
      /\b(search|find|look up|fetch|browse)\b/i,
      /\b(latest|newest|recent|current)\b.*\b(news|information|update)\b/i,
      /\b(what is|who is|when did|where is|how to)\b/i,
    ],
    requiresWeb: true,
  },
  {
    type: 'knowledge',
    patterns: [
      /\b(remember|tell me about|what do you know|learn|from memory)\b/i,
      /\b(my|your).*\b(files|documents|brain|knowledge|memory)\b/i,
    ],
  },
  {
    type: 'memory',
    patterns: [
      /\b(remember|forget|remind|note|keep in mind)\b/i,
      /\b(did i say|what did i say|earlier|before|last time)\b/i,
    ],
  },
  {
    type: 'task',
    patterns: [
      /\b(create|make|build)\b.*\b(that|which|to)\b/i,
      /\b(can you|please|would you)\b.*\b(and|then|also)\b/i,
      /\b(step by step|plan|workflow)\b/i,
    ],
    requiresTools: true,
  },
  {
    type: 'voice',
    patterns: [
      /\b(speak|talk|voice|speech|tell me|read aloud)\b/i,
      /\b(microphone|mic|listen|hear)\b/i,
    ],
  },
  {
    type: 'settings',
    patterns: [
      /\b(settings|preferences|configure|setup|change)\b/i,
      /\b(api key|model|temperature|theme)\b/i,
    ],
  },
  {
    type: 'help',
    patterns: [
      /\b(help|what can you do|commands|how does)\b/i,
      /\b(what's new|features|capabilities)\b/i,
    ],
  },
  {
    type: 'chat',
    patterns: [
      /\b(hi|hello|hey|how are|what's up)\b/i,
      /\b(thank|thanks|please|okay|ok)\b/i,
      /\b(i think|i feel|i want|i need|i like)\b/i,
    ],
  },
];

const SUB_INTENT_PATTERNS: Record<IntentType, Array<{ pattern: RegExp; value: string }>> = {
  chat: [
    { pattern: /\b(greeting|hello|hi|hey)\b/i, value: 'greeting' },
    { pattern: /\b(thank|thanks)\b/i, value: 'gratitude' },
    { pattern: /\b(bye|goodbye|see you)\b/i, value: 'farewell' },
  ],
  code: [
    { pattern: /\b(write|create|generate|build)\b/i, value: 'generation' },
    { pattern: /\b(fix|debug|error|bug)\b/i, value: 'debugging' },
    { pattern: /\b(explain|how.*work)\b/i, value: 'explanation' },
    { pattern: /\b(refactor|optimize)\b/i, value: 'optimization' },
  ],
  task: [
    { pattern: /\b(simple|quick|fast)\b/i, value: 'quick' },
    { pattern: /\b(complex|detailed|thorough)\b/i, value: 'complex' },
  ],
  search: [
    { pattern: /\b(web|internet|online)\b/i, value: 'web' },
    { pattern: /\b(knowledge|brain|memory)\b/i, value: 'local' },
  ],
  help: [
    { pattern: /\b(commands|list)\b/i, value: 'commands' },
    { pattern: /\b(features|capabilities)\b/i, value: 'features' },
  ],
  file: [
    { pattern: /\b(save|write|create)\b/i, value: 'write' },
    { pattern: /\b(read|show|open)\b/i, value: 'read' },
    { pattern: /\b(delete|remove)\b/i, value: 'delete' },
  ],
  terminal: [
    { pattern: /\b(install)\b/i, value: 'install' },
    { pattern: /\b(build|compile)\b/i, value: 'build' },
    { pattern: /\b(run|execute)\b/i, value: 'run' },
  ],
  knowledge: [
    { pattern: /\b(search|find)\b/i, value: 'search' },
    { pattern: /\b(import|add)\b/i, value: 'import' },
  ],
  memory: [
    { pattern: /\b(remember|store)\b/i, value: 'store' },
    { pattern: /\b(forget|clear)\b/i, value: 'clear' },
  ],
  settings: [
    { pattern: /\b(api key|key)\b/i, value: 'api-key' },
    { pattern: /\b(model|ai)\b/i, value: 'model' },
    { pattern: /\b(theme|display)\b/i, value: 'display' },
  ],
  voice: [
    { pattern: /\b(speak|talk|tell)\b/i, value: 'speak' },
    { pattern: /\b(listen|hear|mic)\b/i, value: 'listen' },
  ],
  unknown: [],
};

export function classifyIntent(userInput: string): IntentResult {
  const lowerInput = userInput.toLowerCase();
  let bestMatch: IntentType = 'unknown';
  let highestScore = 0;
  let requiresWeb = false;
  let requiresTools = false;

  for (const intent of INTENT_PATTERNS) {
    let score = 0;
    
    for (const pattern of intent.patterns) {
      if (pattern.test(userInput)) {
        score += 1;
      }
    }
    
    if (score > 0) {
      score = score / intent.patterns.length;
    }
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = intent.type;
      requiresWeb = intent.requiresWeb || false;
      requiresTools = intent.requiresTools || false;
    }
  }

  // Determine sub-intent
  let subIntent: string | null = null;
  const subPatterns = SUB_INTENT_PATTERNS[bestMatch];
  if (subPatterns) {
    for (const { pattern, value } of subPatterns) {
      if (pattern.test(userInput)) {
        subIntent = value;
        break;
      }
    }
  }

  // Adjust confidence based on input length and specificity
  const confidence = Math.min(highestScore * (userInput.length > 10 ? 1 : 0.7), 1);

  return {
    type: bestMatch,
    confidence,
    subIntent,
    requiresWeb,
    requiresTools,
    suggestedPrompt: null,
  };
}

export function getOptimizedPrompt(userInput: string, intent: IntentResult, basePrompt: string): string {
  // For simple chat, use shorter prompt
  if (intent.type === 'chat' && intent.confidence > 0.5) {
    return basePrompt.slice(0, 500);
  }
  
  // For code tasks, add relevant context
  if (intent.type === 'code') {
    return basePrompt + '\n\nFocus on providing clean, working code with brief explanations.';
  }
  
  // For search tasks
  if (intent.type === 'search') {
    return basePrompt + '\n\nProvide concise, factual answers. Cite sources when available.';
  }
  
  return basePrompt;
}
