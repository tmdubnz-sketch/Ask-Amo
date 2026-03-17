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
  family: 'gemma' | 'qwen' | 'groq' | 'openrouter' | 'openai' | 'gemini' | 'mistral' | 'native' | 'webllm';
  isCloud?: boolean;
  isVision?: boolean;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: "llama-3.1-70b-versatile",
    name: "Amo Groq",
    description: "Fast cloud model via Groq.",
    size: "Cloud",
    family: 'groq',
    isCloud: true
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Amo Groq Fast",
    description: "Ultra-fast small model via Groq.",
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
    description: "Direct Gemini cloud chat with vision support.",
    size: "Cloud",
    family: 'gemini',
    isCloud: true,
    isVision: true
  },
  {
    id: "mistral-large-latest",
    name: "Amo Mistral Large",
    description: "Mistral Large 3 - flagship multimodal model.",
    size: "Cloud",
    family: 'mistral',
    isCloud: true,
    isVision: true
  },
  {
    id: "mistral-small-latest",
    name: "Amo Mistral Small",
    description: "Mistral Small 3.2 - fast open-weight model with vision.",
    size: "Cloud",
    family: 'mistral',
    isCloud: true,
    isVision: true
  },
  {
    id: "ministral-3b-latest",
    name: "Amo Ministral 3B",
    description: "Ministral 3B - efficient edge model for low latency.",
    size: "Cloud",
    family: 'mistral',
    isCloud: true
  },
  {
    id: "ministral-8b-latest",
    name: "Amo Ministral 8B",
    description: "Ministral 8B - higher performance edge model.",
    size: "Cloud",
    family: 'mistral',
    isCloud: true
  },
  {
    id: "amo-native-vision",
    name: "Native Vision",
    description: "Qwen2-VL 2B - local vision model. Requires mmproj file. Processes images offline.",
    size: "2.5GB",
    family: 'native',
    isCloud: false,
    isVision: true
  },
  {
    id: "amo-native-offline",
    name: "Native offline",
    description: "Phi-3.5 Mini 3.8B Q4_K_M — best fit for Snapdragon 865. Strong reasoning, instruction following, and code. Runs fully offline with no internet needed.",
    size: "2.4GB",
    family: 'native',
    isCloud: false
  },
  {
    id: "Llama-3.2-3B-Instruct-webllm",
    name: "WebLLM (Phi-3.5)",
    description: "Phi-3.5 Mini - runs in browser via WebGPU. Smaller and faster.",
    size: "~1GB",
    family: 'webllm',
    isCloud: false,
    isVision: false
  }
];
