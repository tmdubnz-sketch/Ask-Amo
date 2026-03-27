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
  family: 'gemma' | 'qwen' | 'groq' | 'openrouter' | 'openai' | 'gemini' | 'mistral' | 'native' | 'inworld';
  isCloud?: boolean;
  isVision?: boolean;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: "llama-3.1-70b-versatile",
    name: "Groq (70B)",
    description: "Fast powerful model via Groq.",
    size: "Cloud",
    family: 'groq',
    isCloud: true
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Groq (8B Fast)",
    description: "Ultra-fast small model via Groq.",
    size: "Cloud",
    family: 'groq',
    isCloud: true
  },
  {
    id: "openrouter/free",
    name: "OpenRouter Free",
    description: "Free cloud routing via OpenRouter.",
    size: "Cloud",
    family: 'openrouter',
    isCloud: true
  },
  {
    id: "gemini/gemini-pro",
    name: "Gemini Pro",
    description: "Google's Gemini Pro model.",
    size: "Cloud",
    family: 'gemini',
    isCloud: true,
    isVision: true
  },
  {
    id: "open-mixtral-8x7b",
    name: "Mistral 8x7B",
    description: "Mixtral 8x7B via Mistral API.",
    size: "Cloud",
    family: 'mistral',
    isCloud: true
  },
  {
    id: "auto",
    name: "Inworld (Auto)",
    description: "Auto-select best model via Inworld Router.",
    size: "Cloud",
    family: 'inworld',
    isCloud: true
  },
  {
    id: "openai/gpt-4o-mini",
    name: "Inworld GPT-4o Mini",
    description: "GPT-4o Mini via Inworld Router.",
    size: "Cloud",
    family: 'inworld',
    isCloud: true
  }
];
