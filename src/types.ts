export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  size: string;
  family: 'gemma' | 'qwen' | 'groq' | 'openrouter' | 'openai' | 'gemini' | 'native';
  isCloud?: boolean;
  isVision?: boolean;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: "llama-3.3-70b-versatile",
    name: "Amo Groq",
    description: "Fast cloud model via Groq.",
    size: "Cloud",
    family: 'groq',
    isCloud: true
  },
  {
    id: "openrouter/free",
    name: "Amo OpenRouter Free",
    description: "Free cloud routing via OpenRouter.",
    size: "Cloud",
    family: 'openrouter',
    isCloud: true
  },
  {
    id: "anthropic/claude-sonnet-4.5",
    name: "Amo Claude",
    description: "Claude via OpenRouter using your OpenRouter credits.",
    size: "Cloud",
    family: 'openrouter',
    isCloud: true
  },
  {
    id: "gpt-4.1-mini",
    name: "Amo OpenAI",
    description: "Direct OpenAI cloud chat.",
    size: "Cloud",
    family: 'openai',
    isCloud: true
  },
  {
    id: "gemini-2.5-flash",
    name: "Amo Gemini",
    description: "Direct Gemini cloud chat.",
    size: "Cloud",
    family: 'gemini',
    isCloud: true
  },
  {
    id: "amo-native-offline",
    name: "Native offline",
    description: "Phi-3.5 Mini 3.8B Q4_K_M — best fit for Snapdragon 865. Strong reasoning, instruction following, and code. Runs fully offline with no internet needed.",
    size: "2.4GB",
    family: 'native',
    isCloud: false
  }
];
