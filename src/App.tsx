import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { ErrorBoundary, DefaultFallback } from './components/ErrorBoundary';
import { performanceMonitoringService, usePerformanceMonitoring } from './services/performanceMonitoringService';
import { 
  Send, 
  Download, 
  Settings, 
  Cpu, 
  MessageSquare, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ChevronDown,
  Zap,
  Menu,
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  RefreshCw,
  DownloadCloud,
  ImagePlus,
  Eye,
  EyeOff,
  Plus,
  ChevronRight,
  FolderOpen,
  LayoutDashboard,
  FileText,
  History,
  Info,
  Maximize2,
  Minimize2,
  FileCode,
  Brain,
  HardDrive,
} from 'lucide-react';
import { WebView } from './components/WebView';
import { Terminal } from './components/Terminal';
import { CodeEditor } from './components/CodeEditor';
import { motion, AnimatePresence } from 'motion/react';
import { groqService } from './services/groqService';
import { openrouterService } from './services/openrouterService';
import { openaiService } from './services/openaiService';
import { geminiService } from './services/geminiService';
import { webLlmService } from './services/webLlmService';
import { documentService } from './services/documentService';
import { vectorDbService } from './services/vectorDbService';
import { webSearchService, shouldUseWebSearch } from './services/webSearchService';
import { assistantRuntimeService } from './services/assistantRuntimeService';
import { knowledgeBootstrapService } from './services/knowledgeBootstrapService';
import { knowledgeStoreService } from './services/knowledgeStoreService';
import { normalizeTranscriptText, routeUserIntent } from './services/intentRouterService';
import { nativeChatSessionService } from './services/nativeChatSessionService';
import { nativeReplyCoordinator, buildDeterministicReply } from './services/nativeReplyCoordinator';
import {
  nativeOfflineLlmService,
  type NativeOfflineDownloadAuthStatus,
  type NativeOfflineModelInfo,
  type NativeOfflineStatus,
} from './services/nativeOfflineLlmService';
import { nativePiperVoiceService, type NativePiperVoiceStatus } from './services/nativePiperVoiceService';
import { nativeTtsService, type NativeTtsStatus, type NativeTtsVoiceInfo } from './services/nativeTtsService';
import { speechT5Service } from './services/speechT5Service';
import { useMessages } from './hooks/useMessages';
import { audioCaptureService } from './services/audioCaptureService';
import { MessageList } from './components/MessageList';
import { AmoAvatar } from './components/AmoAvatar';
import { Sidebar, type SidebarTab } from './components/Sidebar';
import { AMO_STARTER_PACKS } from './data/amoStarterPacks';
import { AVAILABLE_MODELS, type ModelConfig, type ChatSession } from './types';
import { apiKeyStorage } from './services/apiKeyStorage';
import { amoBrainService } from './services/amoBrainService';
import type { ConversationMemoryRow, MemorySummaryRow, SeedPackRow, ToolRegistryRow } from './services/knowledgeStoreService';
import { cn } from './lib/utils';

type SettingsSection = 'general' | 'models' | 'knowledge' | 'workspace' | 'cognition';
type ImportSourceKind = 'document' | 'skill' | 'dataset';

interface ImportedAsset {
  id: string;
  name: string;
  kind: ImportedAssetKind;
  source?: 'user' | 'starter-pack';
  category?: string;
}

type ImportedAssetKind = 'document' | 'skill' | 'dataset';
type AmoRuntimeState = 'waiting' | 'listening' | 'thinking' | 'responding';
type VoiceBackendPreference = 'auto' | 'native-tts' | 'browser-tts';
type ResolvedVoiceBackend = Exclude<VoiceBackendPreference, 'auto'>;
type ModelAvailability = {
  available: boolean;
  reason: string | null;
  ready: boolean;
};
type LocalBackendKind = 'native-gguf' | 'webllm' | 'none';
type LocalBackendCapability = 'ready' | 'configured' | 'scaffold' | 'failed' | 'unavailable';
type LocalRuntimeState = {
  backend: LocalBackendKind;
  backendLabel: string;
  capability: LocalBackendCapability;
  selectedModelId: string | null;
  activeNativeModelPath: string | null;
  loadedModelId: string | null;
  activeBackendModelId: string | null;
  reason: string | null;
};
type ActiveView = 'chat' | 'webview' | 'terminal' | 'editor';
type LocalBackendDescriptor = {
  kind: LocalBackendKind;
  label: string;
  available: boolean;
  capability: LocalBackendCapability;
  activeModelId: string | null;
  reason: string | null;
};

function areMessagesEquivalent(
  left: Array<{ id: string; role: string; content: string; timestamp: number; image?: string }>,
  right: Array<{ id: string; role: string; content: string; timestamp: number; image?: string }>
): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (
      a.id !== b.id
      || a.role !== b.role
      || a.content !== b.content
      || a.timestamp !== b.timestamp
      || a.image !== b.image
    ) {
      return false;
    }
  }
  return true;
}

const PREFERRED_NATIVE_MODEL_PATTERNS = [
  'qwen2.5-0.5b-instruct-q3_k_m',
  'qwen2.5-0.5b-instruct-q3_k_l',
  'qwen2.5-0.5b-instruct-q4_k_m',
  'qwen2.5-0.5b-instruct-q4_0',
];

const RECOMMENDED_NATIVE_DOWNLOADS = [
  {
    label: 'Phi-3.5 Mini 3.8B Q4_K_M',
    description: 'Best for Snapdragon 865',
    url: 'https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf?download=true',
  },
  {
    label: 'Llama 3.2 3B Q4_K_M',
    description: 'Meta Llama - alternative',
    url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf?download=true',
  },
] as const;

function createDefaultChat(): ChatSession {
  return {
    id: `chat-${Date.now()}`,
    title: 'New Chat',
    messages: [],
    updatedAt: Date.now(),
  };
}

function readStoredChats(): ChatSession[] {
  const fallback = [createDefaultChat()];

  try {
    const saved = localStorage.getItem('amo_chats');
    if (!saved) return fallback;

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback;

    const validChats = parsed.filter((chat): chat is ChatSession => {
      if (!chat || typeof chat !== 'object') return false;

      const candidate = chat as Partial<ChatSession> & { messages?: unknown };
      return typeof candidate.id === 'string'
        && typeof candidate.title === 'string'
        && typeof candidate.updatedAt === 'number'
        && Array.isArray(candidate.messages);
    });

    return validChats.length > 0 ? validChats : fallback;
  } catch (error) {
    console.error('[AskAmo] Failed to restore saved chats', error);
    localStorage.removeItem('amo_chats');
    return fallback;
  }
}

function getDefaultModelSelection(): ModelConfig {
  // Prefer native offline model as default to avoid manual input after every build
  const nativeModel = AVAILABLE_MODELS.find((model) => model.family === 'native');
  return nativeModel || AVAILABLE_MODELS.find((model) => model.isCloud) || AVAILABLE_MODELS[0];
}

const NATIVE_ANDROID_MODEL_DOC_HINT = [
  'Qwen2.5 0.5B instruct GGUF in Q3_K_M',
  'Qwen2.5 0.5B instruct GGUF in Q4_K_M as a manual fallback',
].join(' • ');

function normalizeModelToken(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeWebUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

type AutoActionResult = {
  view: ActiveView;
  reply: string;
  webUrl?: string;
};

function detectAutoAction(userInput: string): AutoActionResult | null {
  const normalized = userInput.trim().toLowerCase();
  if (!normalized) return null;

  const urlMatch = userInput.match(/https?:\/\/\S+|www\.\S+/i);
  if (urlMatch) {
    return {
      view: 'webview',
      webUrl: normalizeWebUrl(urlMatch[0]),
      reply: `Opening ${normalizeWebUrl(urlMatch[0])} in Android WebView.`,
    };
  }

  if (/(open|use|show|switch to).*(terminal)|\bterminal\b.*(open|use|show)/i.test(normalized)) {
    return {
      view: 'terminal',
      reply: 'Opening Terminal now. I can run task commands there.',
    };
  }

  if (/(open|use|show|switch to).*(webview|browser|web)|\b(webview|browser)\b.*(open|use|show)/i.test(normalized)) {
    return {
      view: 'webview',
      webUrl: 'amo://dashboard',
      reply: 'Opening Android WebView now.',
    };
  }

  const searchMatch = normalized.match(/^(search|look up|find|browse)\b(.+)$/i);
  if (searchMatch) {
    const query = searchMatch[2].trim().replace(/^[\s:,-]+/, '');
    if (query) {
      return {
        view: 'webview',
        webUrl: `amo://search?q=${encodeURIComponent(query)}`,
        reply: `Opening WebView search for ${query}.`,
      };
    }
  }

  if (/(run|execute|build|debug|scan|edit|fix|install|code|check)\b/i.test(normalized)) {
    return {
      view: 'terminal',
      reply: 'This sounds like a task job. Opening Terminal so I can work through it step by step.',
    };
  }

  return null;
}

interface ImportedAssetMetadata {
  assetKind?: ImportedAssetKind;
  source?: 'user' | 'starter-pack';
  sourceUrl?: string;
  starterPackKey?: string;
  starterPackVersion?: string;
  starterPackCategory?: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('Missing VITE_GROQ_API_KEY')) return 'Cloud chat is not configured. Add VITE_GROQ_API_KEY to use Amo cloud replies and transcription.';
  if (message.includes('Missing OpenRouter API key')) return 'OpenRouter is not configured. Paste your OpenRouter API key in Settings to use OpenRouter cloud replies.';
  if (message.includes('Unsupported file type')) return 'That file type is not supported. Use PDF, TXT, or Markdown files.';
  if (message.includes('Setting up fake worker failed') || message.includes('Failed to fetch dynamically imported module') || message.includes('Loading chunk') || message.includes('Failed to load PDF')) return 'Could not open that PDF in this environment. Try again, or import a text or Markdown version instead.';
  return message || fallback;
}

function hasCloudProviderKey(
  family: ModelConfig['family'],
  options: {
    hasGroqApiKey: boolean;
    hasGeminiApiKey: boolean;
    hasOpenAiApiKey: boolean;
    hasOpenRouterApiKey: boolean;
  }
): boolean {
  switch (family) {
    case 'groq':
      return options.hasGroqApiKey;
    case 'gemini':
      return options.hasGeminiApiKey;
    case 'openai':
      return options.hasOpenAiApiKey;
    case 'openrouter':
      return options.hasOpenRouterApiKey;
    default:
      return false;
  }
}

function trimForNativePrompt(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(text.length - maxChars).trim();
}

function buildQuickReplyInstruction(isDeepThinkEnabled: boolean): string {
  return isDeepThinkEnabled
    ? 'Think carefully before answering. Be precise, practical, and complete, but keep the final answer clean and natural.'
    : 'Answer fast and directly. Prefer a short practical reply over a long explanation.';
}

function buildConversationSummary(userContent: string, assistantContent: string): string {
  const compactUser = trimForNativePrompt(userContent.replace(/\s+/g, ' ').trim(), 180);
  const compactAssistant = trimForNativePrompt(assistantContent.replace(/\s+/g, ' ').trim(), 220);
  return `User asked: ${compactUser} Amo replied: ${compactAssistant}`;
}

const PREFERRED_NATIVE_VOICE_NAMES = [
  'en-us-x-iom-local', 'en-us-x-iob-local', 'en-us-x-tpd-local', 'en-us-x-sfg-local', 'en-us-x-iog-local', 'en-us-x-tpc-local', 'en-au-x-aub-local',
];

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

function scoreVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  let score = 0;
  if (lang.includes('en-nz')) score += 56;
  else if (lang.includes('en-au')) score += 46;
  else if (lang.includes('en-us')) score += 20;
  else if (lang.includes('en-gb')) score -= 48;
  if (name.includes('google')) score += 12;
  if (voice.default) score += 8;
  if (name.includes('daniel')) score += 36;
  if (name.includes('lee')) score += 28;
  if (name.includes('gordon')) score += 24;
  if (name.includes('male') || name.includes('man') || name.includes('guy')) score += 20;
  if (name.includes('natural') || name.includes('neural') || name.includes('studio')) score += 18;
  if (name.includes('deep') || name.includes('bass')) score += 8;
  if (name.includes('robot')) score -= 12;
  if (name.includes('gbd') || name.includes('male_1') || name.includes('male_2')) score += 24;
  if (name.includes('female') || name.includes('woman') || name.includes('girl')) score -= 42;
  if (name.includes('child')) score -= 24;
  return score;
}

function getPreferredVoice(voices: SpeechSynthesisVoice[], selectedVoiceURI: string): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  if (selectedVoiceURI) return voices.find((voice) => voice.voiceURI === selectedVoiceURI) || null;
  return [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] || null;
}

function isPreferredNativeTtsLocale(locale: string): boolean {
  return locale.toLowerCase().startsWith('en');
}

function scoreNativeTtsVoice(voice: NativeTtsVoiceInfo): number {
  const name = voice.name.toLowerCase();
  const locale = voice.locale.toLowerCase();
  let score = 0;
  const preferredIndex = PREFERRED_NATIVE_VOICE_NAMES.indexOf(name);
  if (preferredIndex >= 0) score += 220 - preferredIndex * 18;
  if (locale.startsWith('en-nz')) score += 80;
  else if (locale.startsWith('en-us')) score += 46;
  else if (locale.startsWith('en-au')) score += 24;
  else score -= 120;
  if (name.includes('male') || name.includes('man') || name.includes('guy')) score += 30;
  if (name.includes('daniel')) score += 34;
  if (name.includes('lee')) score += 24;
  if (name.includes('gordon')) score += 24;
  if (name.includes('male_1') || name.includes('male_2') || name.includes('gbd')) score += 32;
  if (name.includes('natural') || name.includes('neural') || name.includes('studio')) score += 16;
  if (name.includes('deep') || name.includes('bass')) score += 8;
  if (name.includes('robot') || name.includes('wave')) score -= 14;
  if (name.includes('female') || name.includes('woman') || name.includes('girl')) score -= 40;
  if (voice.quality >= 500) score += 14;
  if (!voice.networkConnectionRequired) score += 6;
  return score;
}

function scoreNativeOfflineModel(model: NativeOfflineModelInfo): number {
  const name = `${model.displayName} ${model.relativePath}`.toLowerCase();
  for (let index = 0; index < PREFERRED_NATIVE_MODEL_PATTERNS.length; index += 1) {
    if (name.includes(PREFERRED_NATIVE_MODEL_PATTERNS[index])) return 200 - index * 24;
  }
  if (name.includes('tiny-moe') || name.includes('tinymoe')) return -240;
  if (name.includes('.f16')) return -180;
  if (name.includes('q5')) return -90;
  return typeof model.sizeBytes === 'number' ? -Math.round(model.sizeBytes / (1024 * 1024)) : 0;
}

function getPreferredNativeOfflineModel(status: NativeOfflineStatus | null): NativeOfflineModelInfo | null {
  const models = status?.availableModels || [];
  if (models.length === 0) return null;
  const compatibleModels = models.filter((model) => {
    const name = `${model.displayName} ${model.relativePath}`.toLowerCase();
    return name.includes('qwen2.5-0.5b-instruct-q3_k_m') || name.includes('qwen2.5-0.5b-instruct-q3_k_l') || name.includes('qwen2.5-0.5b-instruct-q4_k_m');
  });
  const source = compatibleModels.length > 0 ? compatibleModels : models;
  return [...source].sort((left, right) => scoreNativeOfflineModel(right) - scoreNativeOfflineModel(left))[0] || null;
}

function getSelectableNativeTtsVoices(status: NativeTtsStatus | null) {
  const voices = status?.availableVoices || [];
  const filtered = voices.filter((voice) => isPreferredNativeTtsLocale(voice.locale));
  const source = filtered.length > 0 ? filtered : voices;
  return [...source].sort((left, right) => scoreNativeTtsVoice(right) - scoreNativeTtsVoice(left));
}

function resolveLocalRuntimeState(options: any): LocalRuntimeState {
  const status = options.nativeOfflineStatus;
  const ready = !!(options.isNativeOfflineAvailable && status?.runtimeReady && status?.modelLoaded);
  const scaffold = !!(options.isNativeOfflineAvailable && status?.runtimeMode === 'scaffold');
  const activeNativeModelPath = status?.activeModel?.relativePath || null;
  
  return {
    backend: 'native-gguf',
    backendLabel: 'Native GGUF',
    capability: ready ? 'ready' : (activeNativeModelPath ? (scaffold ? 'scaffold' : 'configured') : 'unavailable'),
    selectedModelId: options.selectedModelId,
    activeNativeModelPath,
    loadedModelId: options.loadedModelId,
    activeBackendModelId: ready ? 'amo-native-offline' : null,
    reason: null,
  };
}

export default function App() {
  const { metrics, startMeasure, measure } = usePerformanceMonitoring();
  const [chats, setChats] = useState<ChatSession[]>(() => readStoredChats());

  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('chats');
  const [currentChatId, setCurrentChatId] = useState<string>(chats[0]?.id || '');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('general');
  const [amoRuntimeState, setAmoRuntimeState] = useState<AmoRuntimeState>('waiting');
  
  const [uploadedDocs, setUploadedDocs] = useState<ImportedAsset[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isImportingStarterPacks, setIsImportingStarterPacks] = useState(false);
  const [areStarterPacksImported, setAreStarterPacksImported] = useState(() => localStorage.getItem('amo_starter_packs_imported') === 'true');
  
  const [groqApiKey, setGroqApiKey] = useState(() => apiKeyStorage.get('groq'));
  const [openRouterApiKey, setOpenRouterApiKey] = useState(() => apiKeyStorage.get('openrouter'));
  const [openAiApiKey, setOpenAiApiKey] = useState(() => apiKeyStorage.get('openai'));
  const [geminiApiKey, setGeminiApiKey] = useState(() => apiKeyStorage.get('gemini'));
  const [areApiKeysHydrated, setAreApiKeysHydrated] = useState(() => apiKeyStorage.isHydrated());
  const [visibleApiKeys, setVisibleApiKeys] = useState<Record<'groq' | 'openrouter' | 'openai' | 'gemini', boolean>>({
    groq: false,
    openrouter: false,
    openai: false,
    gemini: false,
  });
  
  const [isVoiceMode, setIsVoiceMode] = useState(() => localStorage.getItem('amo_voice_mode') === 'true');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isDeepThinkEnabled, setIsDeepThinkEnabled] = useState(() => localStorage.getItem('amo_deep_think_enabled') === 'true');
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(() => localStorage.getItem('amo_web_search_enabled') !== 'false');
  const [urlImportValue, setUrlImportValue] = useState('');
  const [urlImportKind, setUrlImportKind] = useState<ImportSourceKind>('dataset');
  const [nativeDownloadUrl, setNativeDownloadUrl] = useState<string>(RECOMMENDED_NATIVE_DOWNLOADS[0].url);
  const [nativeDownloadAuthStatus, setNativeDownloadAuthStatus] = useState<NativeOfflineDownloadAuthStatus | null>(null);
  const [isDownloadingNativeModel, setIsDownloadingNativeModel] = useState(false);
  
  const [nativeOfflineStatus, setNativeOfflineStatus] = useState<NativeOfflineStatus | null>(null);
  const [nativeTtsStatus, setNativeTtsStatus] = useState<NativeTtsStatus | null>(null);
  const [nativePiperStatus, setNativePiperStatus] = useState<NativePiperVoiceStatus | null>(null);
  const [loadedModelId, setLoadedModelId] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState('');
   const [error, setError] = useState<string | null>(null);
   const [isLoading, setIsLoading] = useState(false);
   const [input, setInput] = useState('');
   const [selectedImage, setSelectedImage] = useState<string | null>(null);
   const [activeView, setActiveView] = useState<ActiveView>('chat');
   const [webViewUrl, setWebViewUrl] = useState('amo://dashboard');
   const [isWebAssistActive, setIsWebAssistActive] = useState(false);
  
  const [brainMemoryRows, setBrainMemoryRows] = useState<ConversationMemoryRow[]>([]);
  const [brainSummaryRows, setBrainSummaryRows] = useState<MemorySummaryRow[]>([]);
  const [toolRegistryRows, setToolRegistryRows] = useState<ToolRegistryRow[]>([]);
  const [seedPackRows, setSeedPackRows] = useState<SeedPackRow[]>([]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const skillInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef(input);
  const isVoiceModeRef = useRef(isVoiceMode);
  const activeRequestIdRef = useRef(0);
  const canceledRequestIdsRef = useRef(new Set<number>());
  const activeAssistantMessageIdRef = useRef<string | null>(null);

  useEffect(() => { inputRef.current = input; }, [input]);
  useEffect(() => { isVoiceModeRef.current = isVoiceMode; }, [isVoiceMode]);

  useEffect(() => {
    let cancelled = false;
    apiKeyStorage.init().then(() => {
      if (cancelled) return;
      const keys = apiKeyStorage.getAll();
      setGroqApiKey(keys.groq);
      setOpenRouterApiKey(keys.openrouter);
      setOpenAiApiKey(keys.openai);
      setGeminiApiKey(keys.gemini);
      setAreApiKeysHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { if (areApiKeysHydrated) apiKeyStorage.set('groq', groqApiKey); }, [areApiKeysHydrated, groqApiKey]);
  useEffect(() => { if (areApiKeysHydrated) apiKeyStorage.set('openrouter', openRouterApiKey); }, [areApiKeysHydrated, openRouterApiKey]);
  useEffect(() => { if (areApiKeysHydrated) apiKeyStorage.set('openai', openAiApiKey); }, [areApiKeysHydrated, openAiApiKey]);
  useEffect(() => { if (areApiKeysHydrated) apiKeyStorage.set('gemini', geminiApiKey); }, [areApiKeysHydrated, geminiApiKey]);

  useEffect(() => {
    const hasBootstrapped = localStorage.getItem('amo_brain_bootstrapped_v3');
    if (!hasBootstrapped) {
      void (async () => {
        try {
          await knowledgeStoreService.init();
          await knowledgeBootstrapService.bootstrapAmoBrain();
          localStorage.setItem('amo_brain_bootstrapped_v3', 'true');
          await syncUploadedDocsFromStorage();
          await refreshBrainState();
          console.info('[AskAmo] Brain bootstrap complete.');
        } catch (e) {
          console.error('[AskAmo] Brain bootstrap failed:', e);
        }
      })();
    }
  }, []);

  const refreshNativeOfflineStatus = async () => {
    if (nativeOfflineLlmService.isAvailable()) {
      setNativeOfflineStatus(await nativeOfflineLlmService.getStatus());
    }
  };

  const refreshNativeDownloadAuthStatus = async () => {
    if (!nativeOfflineLlmService.isAvailable()) return;
    setNativeDownloadAuthStatus(await nativeOfflineLlmService.getDownloadAuthStatus());
  };

   const ensureNativeOfflineReady = async (): Promise<NativeOfflineStatus> => {
     // Prepare the runtime if needed
     const prepareStatus = await nativeOfflineLlmService.prepareRuntime();
     if (prepareStatus) setDownloadStatus(prepareStatus.message);
     
     // Get current status after preparation
     let currentStatus = await nativeOfflineLlmService.getStatus();
     if (!currentStatus) {
       throw new Error('Failed to get status after preparing runtime.');
     }
     
     // If runtime is not ready, we cannot proceed
     if (!currentStatus.runtimeReady) {
       throw new Error('Native offline runtime is not ready after preparation.');
     }
     
     const preferred = getPreferredNativeOfflineModel(currentStatus);
     if (!preferred) throw new Error(`Import a GGUF first. Recommended: ${NATIVE_ANDROID_MODEL_DOC_HINT}`);
     
     // Set active model if needed
     if (!currentStatus?.activeModel || currentStatus.activeModel.relativePath !== preferred.relativePath) {
       await nativeOfflineLlmService.setActiveModel(preferred);
       // Refresh status after setting active model
       currentStatus = await nativeOfflineLlmService.getStatus();
       if (!currentStatus) {
         throw new Error('Failed to get status after setting active model.');
       }
       
       // Verify runtime is still ready
       if (!currentStatus.runtimeReady) {
         throw new Error('Native offline runtime is not ready after setting active model.');
       }
     }
     
     // Load model if needed
     if (!currentStatus?.modelLoaded) {
       const loadResult = await withTimeout(nativeOfflineLlmService.loadModel(preferred), 45000, 'Loading timed out.');
       if (loadResult?.status) {
         currentStatus = loadResult.status;
       } else {
         // Refresh status to get latest state
         currentStatus = await nativeOfflineLlmService.getStatus();
         if (!currentStatus) {
           throw new Error('Failed to get status after loading model.');
         }
       }
       
       // Verify we have a valid status and model is loaded
       if (!currentStatus) {
         throw new Error('Failed to get status after loading model.');
       }
       
       if (!currentStatus.modelLoaded) {
         throw new Error('Failed to load native offline model.');
       }
     }
     
     // Ensure we have a valid status before returning
     if (!currentStatus) {
       throw new Error('Failed to initialize native offline model. Status is null.');
     }
     
     setNativeOfflineStatus(currentStatus);
     setLoadedModelId('amo-native-offline');
     return currentStatus;
   };

  const handlePrepareNativeRuntime = async () => {
    setIsLoading(true);
    try {
      await nativeOfflineLlmService.prepareRuntime();
      await refreshNativeOfflineStatus();
    } finally {
      setIsLoading(false);
    }
  };

   const handleImportNativeModel = async () => {
     const picked = await nativeOfflineLlmService.pickModelFile();
     if (picked?.valid) {
       const status = await nativeOfflineLlmService.importModel({
         sourceUri: picked.sourceUri,
         displayName: picked.displayName,
         activate: true
       });
       if (status) {
         setNativeOfflineStatus(status.status);
         const nativeModel = AVAILABLE_MODELS.find(m => m.family === 'native');
         if (nativeModel) {
           setSelectedModel(nativeModel);
           localStorage.setItem('amo_selected_model_id', nativeModel.id);
         }
       }
     }
   };

  const handleDownloadNativeModel = async (sourceUrl = nativeDownloadUrl) => {
    const normalizedUrl = normalizeWebUrl(sourceUrl);
    if (!normalizedUrl) return;

    setIsDownloadingNativeModel(true);
    setError(null);

    try {
      await nativeOfflineLlmService.prepareRuntime();
      const response = await nativeOfflineLlmService.downloadModel({
        sourceUrl: normalizedUrl,
        displayName: normalizedUrl.split('/').pop()?.split('?')[0] || 'native-model.gguf',
        activate: true,
      });

      if (!response) throw new Error('Native model download is unavailable on this device.');

      setNativeOfflineStatus(response.status);
      setLoadedModelId('amo-native-offline');
      setDownloadStatus(response.message || `${response.importedModel.displayName} imported.`);
    } catch (downloadError) {
      setError(getErrorMessage(downloadError, 'Failed to download native model.'));
    } finally {
      setIsDownloadingNativeModel(false);
      await refreshNativeDownloadAuthStatus();
      await refreshNativeOfflineStatus();
    }
  };

  const handleDownloadAndLoad = async () => {
    setIsLoading(true);
    try {
      if (selectedModel.family === 'native') {
        await ensureNativeOfflineReady();
      } else {
        await webLlmService.prepareModel(selectedModel.id, (p) => setDownloadStatus(`Loading: ${Math.round(p * 100)}%`));
        setLoadedModelId(selectedModel.id);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkspaceSetup = async () => {
    try {
      setIsImportingStarterPacks(true);
      setDownloadStatus('Initializing workspace...');
      await knowledgeBootstrapService.bootstrapAmoBrain();
      setAreStarterPacksImported(true);
      localStorage.setItem('amo_starter_packs_imported', 'true');
      await syncUploadedDocsFromStorage();
      await refreshBrainState();
      setDownloadStatus('Workspace ready.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsImportingStarterPacks(false);
    }
  };

  const handleClearMemory = async () => {
    try {
      await amoBrainService.clearMemoryNotes(`chat:${currentChatId}`);
      await amoBrainService.clearSummaries(`chat:${currentChatId}`);
      await refreshBrainState();
      setDownloadStatus('Memory cleared.');
    } catch (e: any) {
      setError('Failed to clear memory.');
    }
  };

  const handleExportHistory = () => {
    const data = JSON.stringify(chats, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amo-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefreshNews = async () => {
    if (!navigator.onLine) {
      setError('No internet connection — cannot refresh news.');
      return;
    }
    try {
      const { webAssistService } = await import('./services/webAssistService');
      await webAssistService.fetchNews(['New Zealand news today', 'Aotearoa news', 'world news today', 'technology news today']);
      setDownloadStatus('News refreshed.');
    } catch {
      setError('Failed to refresh news.');
    }
  };

  const handleClearCache = async () => {
    const { webAssistService } = await import('./services/webAssistService');
    webAssistService.clearSessionCache();
    setDownloadStatus('Web cache cleared.');
  };

  const handleSaveCurrentPage = async () => {
    const { webViewBridgeService } = await import('./services/webViewBridgeService');
    const msg = await webViewBridgeService.importCurrentPageToKnowledge();
    setDownloadStatus(msg);
    await syncUploadedDocsFromStorage();
  };

  const handleRunQuickCommand = async (cmd: string) => {
    setActiveView('terminal');
    setInput(cmd);
    inputRef.current = cmd;
    await handleSend();
  };

  const refreshBrainState = async () => {
    try {
      const scope = `chat:${currentChatId}`;
      const [memoryRows, summaryRows, tools, packs] = await Promise.all([
        amoBrainService.getConversationMemory(scope),
        amoBrainService.getMemorySummaries(scope),
        amoBrainService.getToolRegistry(),
        amoBrainService.getSeedPacks(),
      ]);

      setBrainMemoryRows(memoryRows);
      setBrainSummaryRows(summaryRows);
      setToolRegistryRows(tools);
      setSeedPackRows(packs);
      if (packs.length > 0) {
        setAreStarterPacksImported(true);
      }
    } catch (brainError) {
      console.error('[AskAmo] Failed to refresh brain state', brainError);
    }
  };

  const handleRunOfflineSelfTest = async () => {
    setIsLoading(true);
    try {
      await ensureNativeOfflineReady();
      const res = await nativeOfflineLlmService.generate({ prompt: 'Hi bro.' });
      if (res?.text) await speak(res.text);
    } finally {
      setIsLoading(false);
    }
  };

  const currentChat = chats.find((c) => c.id === currentChatId) || chats[0];
  const { messages, setMessages, addMessage, updateMessage, addStreamingMessage, finalizeMessage, clearMessages } = useMessages(currentChat?.messages || []);

  const isNativeOfflineAvailable = nativeOfflineLlmService.isAvailable();
  const localRuntimeState = resolveLocalRuntimeState({ nativeOfflineStatus, isNativeOfflineAvailable, loadedModelId });
  const hasGroqApiKey = Boolean(groqApiKey || import.meta.env.VITE_GROQ_API_KEY);
  const hasGeminiApiKey = Boolean(geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY);
  const hasOpenAiApiKey = Boolean(openAiApiKey || import.meta.env.VITE_OPENAI_API_KEY);
  const hasOpenRouterApiKey = Boolean(openRouterApiKey || import.meta.env.VITE_OPENROUTER_API_KEY);

  const [selectedModel, setSelectedModel] = useState<ModelConfig>(() => {
    const savedModelId = localStorage.getItem('amo_selected_model_id');
    if (savedModelId) {
      const savedModel = AVAILABLE_MODELS.find((model) => model.id === savedModelId);
      if (savedModel && savedModel.family !== 'native') return savedModel;
    }

    return getDefaultModelSelection();
  });

  const isSelectedModelReady = selectedModel.isCloud 
    ? hasCloudProviderKey(selectedModel.family, { hasGroqApiKey, hasGeminiApiKey, hasOpenAiApiKey, hasOpenRouterApiKey })
    : localRuntimeState.capability === 'ready';
  const amoStatusMeta: any = {
    waiting: { label: 'Waiting', dotClassName: 'bg-white/45', chipClassName: 'status-chip status-chip-waiting' },
    listening: { label: 'Listening', dotClassName: 'bg-sky-400', chipClassName: 'status-chip status-chip-listening' },
    thinking: { label: 'Thinking', dotClassName: 'bg-amber-400', chipClassName: 'status-chip status-chip-thinking' },
    responding: { label: 'Responding', dotClassName: 'bg-emerald-400', chipClassName: 'status-chip status-chip-responding' },
  };
  const currentAmoStatus = amoStatusMeta[amoRuntimeState] || amoStatusMeta.waiting;

  const isWebOrCloudActive = selectedModel.isCloud || isWebAssistActive;
  const nativeActivityLabel = nativeOfflineStatus?.activeModel?.displayName || 'no GGUF model imported';
  const nativeStatusLine = localRuntimeState.capability === 'ready'
    ? `Ready • ${nativeActivityLabel}`
    : `${localRuntimeState.capability} • ${nativeActivityLabel}`;

  useEffect(() => {
    localStorage.setItem('amo_chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem('amo_selected_model_id', selectedModel.id);
  }, [selectedModel]);

  useEffect(() => {
    if (!currentChat) return;

    setMessages(
      currentChat.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        image: message.image,
        isStreaming: false,
      }))
    );
    nativeChatSessionService.hydrateFromMessages(currentChat.id, currentChat.messages);
  }, [currentChatId]);

  useEffect(() => {
    if (!currentChatId) return;

    setChats((currentChats) => {
      let changed = false;
      const nextChats = currentChats.map((chat) => {
        if (chat.id !== currentChatId) return chat;

        const persistedMessages = messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          image: message.image,
          timestamp: message.timestamp,
        }));

        const nextTitle = persistedMessages.find((message) => message.role === 'user')?.content.slice(0, 40) || chat.title;
        const nextUpdatedAt = persistedMessages[persistedMessages.length - 1]?.timestamp || chat.updatedAt;

        if (
          areMessagesEquivalent(chat.messages, persistedMessages)
          && chat.title === nextTitle
          && chat.updatedAt === nextUpdatedAt
        ) {
          return chat;
        }

        changed = true;
        return {
          ...chat,
          title: nextTitle,
          updatedAt: nextUpdatedAt,
          messages: persistedMessages,
        };
      });

      return changed ? nextChats : currentChats;
    });
  }, [messages, currentChatId]);

  useEffect(() => {
    void syncUploadedDocsFromStorage();
    void refreshBrainState();
    void refreshNativeOfflineStatus();
  }, [currentChatId]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    void refreshNativeDownloadAuthStatus();
  }, [isSettingsOpen]);

  const persistExchangeToBrain = async (userContent: string, assistantContent: string): Promise<void> => {
    const scope = `chat:${currentChatId}`;
    const appScope = 'app:ask-amo';
    const title = trimForNativePrompt(userContent.replace(/\s+/g, ' ').trim(), 72) || 'Chat exchange';
    const summary = buildConversationSummary(userContent, assistantContent);

    try {
      await Promise.all([
        amoBrainService.remember(scope, title, summary, ['chat', 'exchange', 'local-first'], 1),
        amoBrainService.remember(appScope, title, summary, ['app', 'exchange', 'ask-amo'], 1),
        amoBrainService.summarize(scope, 'conversation', currentChatId, summary, ['chat', 'amo', 'exchange']),
        amoBrainService.summarize(appScope, 'conversation', currentChatId, summary, ['app', 'amo', 'exchange']),
      ]);

      await refreshBrainState();
    } catch (brainError) {
      console.error('[AskAmo] Failed to persist exchange to brain:', brainError);
      setDownloadStatus(`Brain write failed: ${brainError instanceof Error ? brainError.message : 'unknown error'}`);
    }
  };

  const resolveOfflineCommandReply = (command: string): string | null => {
    switch (command) {
      case 'show workspace status': {
        const docsCount = uploadedDocs.length;
        const packsReady = areStarterPacksImported ? 'ready' : 'not ready';
        const runtimeState = localRuntimeState.capability;
        return `Workspace is ${packsReady}. Imported files: ${docsCount}. Native runtime is ${runtimeState}. Active view is ${activeView}.`;
      }
      case 'show imported knowledge': {
        if (uploadedDocs.length === 0) {
          return 'You have no imported knowledge files yet. Open Settings or Workspace to import docs, datasets, or starter packs.';
        }
        const names = uploadedDocs.slice(0, 5).map((doc) => doc.name).join(', ');
        return `Imported knowledge is available. I can see ${uploadedDocs.length} item${uploadedDocs.length === 1 ? '' : 's'} including ${names}.`;
      }
      case 'show offline models': {
        const activeModel = nativeOfflineStatus?.activeModel?.displayName || 'none selected';
        const loaded = nativeOfflineStatus?.modelLoaded ? 'loaded' : 'not loaded';
        return `Offline model status: ${activeModel}, ${loaded}, runtime ${localRuntimeState.capability}.`;
      }
      case 'offline status': {
        return `Offline runtime is ${localRuntimeState.capability}. Backend is ${localRuntimeState.backendLabel}.`;
      }
      case 'show brain status': {
        return `Brain bootstrap v3 complete. Memory and knowledge layers are seeded.`;
      }
      default:
        return null;
    }
  };

  const handleCancelThinking = async () => {
    if (!isLoading) return;
    const requestId = activeRequestIdRef.current;
    canceledRequestIdsRef.current.add(requestId);
    setIsLoading(false);
    setAmoRuntimeState('waiting');
    setIsWebAssistActive(false);

    try {
      await nativeTtsService.stop();
    } catch (error) {
      console.warn('[AskAmo] Failed to stop voice output during cancel', error);
    }

    const assistantId = activeAssistantMessageIdRef.current;
    if (assistantId) {
      updateMessage(assistantId, 'Stopped. You can type again now.', false);
      finalizeMessage(assistantId);
    }
  };

  const resolveWebAssistContext = async (userPrompt: string): Promise<string | undefined> => {
    const shouldSearch = navigator.onLine && isWebSearchEnabled && shouldUseWebSearch(userPrompt);
    if (!shouldSearch) {
      setIsWebAssistActive(false);
      return undefined;
    }

    setIsWebAssistActive(true);
    try {
      const results = await withTimeout(
        webSearchService.search(userPrompt, 3),
        8000,
        'Web assist timed out.'
      );

      if (!results.length) {
        return undefined;
      }

      if (shouldUseWebSearch(userPrompt)) {
        setWebViewUrl(`amo://search?q=${encodeURIComponent(userPrompt)}`);
      }

      return webSearchService.formatResults(results);
    } catch (webError) {
      console.warn('[AskAmo] Web assist failed, continuing locally.', webError);
      return undefined;
    } finally {
      setIsWebAssistActive(false);
    }
  };

  const isRequestCanceled = (requestId: number): boolean => {
    return canceledRequestIdsRef.current.has(requestId) || activeRequestIdRef.current !== requestId;
  };

   const handleSend = async () => {
     if (!inputRef.current.trim() || isLoading) return;
     const routedIntent = routeUserIntent(inputRef.current);
     const userPrompt = routedIntent.canonicalInput || inputRef.current;
     const pendingImage = selectedImage;
     const requestId = activeRequestIdRef.current + 1;
     activeRequestIdRef.current = requestId;
     canceledRequestIdsRef.current.delete(requestId);

      setInput('');
      setSelectedImage(null);
      setIsLoading(true);
      setAmoRuntimeState('thinking');
      setIsWebAssistActive(false);

     if (routedIntent.instantReply) {
       addMessage('user', userPrompt, pendingImage || undefined);
       const assistantId = addStreamingMessage('assistant');
       activeAssistantMessageIdRef.current = assistantId;
       updateMessage(assistantId, routedIntent.instantReply, false);
        finalizeMessage(assistantId);
        await persistExchangeToBrain(userPrompt, routedIntent.instantReply);
        if (isVoiceModeRef.current) speak(routedIntent.instantReply);
       setIsLoading(false);
       setAmoRuntimeState('waiting');
       return;
     }

     if (routedIntent.offlineCommand) {
       const offlineReply = resolveOfflineCommandReply(routedIntent.offlineCommand);
       if (offlineReply) {
         addMessage('user', userPrompt, pendingImage || undefined);
         const assistantId = addStreamingMessage('assistant');
         activeAssistantMessageIdRef.current = assistantId;
          updateMessage(assistantId, offlineReply, false);
          finalizeMessage(assistantId);
          await persistExchangeToBrain(userPrompt, offlineReply);
          setIsLoading(false);
         setAmoRuntimeState('waiting');
         return;
       }
     }

     const autoAction = detectAutoAction(userPrompt);
     if (autoAction) {
       addMessage('user', userPrompt, pendingImage || undefined);
       const assistantId = addStreamingMessage('assistant');
       activeAssistantMessageIdRef.current = assistantId;
        setActiveView(autoAction.view);
        if (autoAction.webUrl) {
          setWebViewUrl(autoAction.webUrl);
       }
        updateMessage(assistantId, autoAction.reply, false);
        finalizeMessage(assistantId);
        await persistExchangeToBrain(userPrompt, autoAction.reply);
        if (isVoiceModeRef.current) speak(autoAction.reply);
        setIsLoading(false);
        setAmoRuntimeState('waiting');
        return;
      }
       
      // Check for deterministic replies first to avoid unnecessary processing
      const deterministicReply = buildDeterministicReply(userPrompt);
      if (deterministicReply !== null) {
       addMessage('user', userPrompt, pendingImage || undefined);
       const assistantId = addStreamingMessage('assistant');
       activeAssistantMessageIdRef.current = assistantId;
        updateMessage(assistantId, deterministicReply, false);
         finalizeMessage(assistantId);
         await persistExchangeToBrain(userPrompt, deterministicReply);
         if (isVoiceModeRef.current) speak(deterministicReply);
        setIsLoading(false);
        setAmoRuntimeState('waiting');
       return;
     }
     
      addMessage('user', userPrompt, pendingImage || undefined);
      const assistantId = addStreamingMessage('assistant');
      activeAssistantMessageIdRef.current = assistantId;
     
     // Measure the total response generation time
     try {
        await measure('Total Response Generation', async () => {
         const history = messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
          const webSearchContext = await resolveWebAssistContext(userPrompt);
          if (isRequestCanceled(requestId)) {
            return;
          }

         const bundle = selectedModel.family === 'native'
           ? await assistantRuntimeService.buildNativeContextBundle({ scope: `chat:${currentChatId}`, userInput: userPrompt, messages: history, webContext: webSearchContext })
           : await assistantRuntimeService.buildContextBundle({ scope: `chat:${currentChatId}`, userInput: userPrompt, messages: history, includeKnowledge: true, webContext: webSearchContext });

         const nativeSelected = selectedModel.family === 'native';
         if (nativeSelected && localRuntimeState.capability !== 'ready') {
           try {
             await ensureNativeOfflineReady();
           } catch (nativeError: any) {
             setError(getErrorMessage(nativeError, 'Select or download a GGUF before using the native runtime.'));
             return;
           }
         }

         if (!nativeSelected && !isSelectedModelReady) {
           setError('The configured cloud model is not ready. Add an API key or select a different model.');
           return;
         }

         const runtimeModel = selectedModel;

         let reply = '';
          if (runtimeModel.isCloud) {
            const cloudMessages = [...history, { role: 'user' as const, content: userPrompt }];
            const handleCloudUpdate = (text: string) => {
              if (isRequestCanceled(requestId)) return;
              updateMessage(assistantId, text, true);
            };

           switch (runtimeModel.family) {
             case 'groq':
               reply = await groqService.generate(runtimeModel.id, cloudMessages, 'Amo', handleCloudUpdate, bundle.combinedContext, {
                 deepThink: isDeepThinkEnabled,
                 webContext: webSearchContext,
               });
               break;
             case 'openrouter':
               reply = await openrouterService.generate(runtimeModel.id, cloudMessages, 'Amo', handleCloudUpdate, bundle.combinedContext, {
                 deepThink: isDeepThinkEnabled,
                 webContext: webSearchContext,
               });
               break;
             case 'openai':
               reply = await openaiService.generate(runtimeModel.id, cloudMessages, 'Amo', handleCloudUpdate, bundle.combinedContext, {
                 deepThink: isDeepThinkEnabled,
                 webContext: webSearchContext,
               });
               break;
             case 'gemini':
               reply = await geminiService.generate(runtimeModel.id, cloudMessages, 'Amo', handleCloudUpdate, bundle.combinedContext, {
                 deepThink: isDeepThinkEnabled,
                 webContext: webSearchContext,
               });
               break;
             default:
               throw new Error(`Unsupported cloud model family: ${runtimeModel.family}`);
           }
         } else {
            const result = await nativeReplyCoordinator.generateAndCommit({
             chatId: currentChatId,
             userInput: userPrompt,
             knowledgeContext: bundle.knowledgeContext,
             webContext: webSearchContext,
             ensureReady: ensureNativeOfflineReady,
             generate: p => nativeOfflineLlmService.generate({ prompt: p }),
             onStatus: setNativeOfflineStatus,
             onRuntimeState: setAmoRuntimeState,
              onCommit: t => {
                if (isRequestCanceled(requestId)) return;
                updateMessage(assistantId, t, false);
                finalizeMessage(assistantId);
              }
            });
            reply = result.text;
           }

           if (isRequestCanceled(requestId)) {
             return;
           }

            updateMessage(assistantId, reply, false);
            finalizeMessage(assistantId);
           await persistExchangeToBrain(userPrompt, reply);
           if (isVoiceModeRef.current) speak(reply);
        });
      } catch (e: any) {
        setError(getErrorMessage(e, 'Failed.'));
      } finally {
        setIsLoading(false);
        setAmoRuntimeState('waiting');
        activeAssistantMessageIdRef.current = null;
      }
    };

  const speak = async (text: string) => {
    await nativeTtsService.speak({ text, language: 'en-NZ' });
  };

  const syncUploadedDocsFromStorage = async () => {
    await vectorDbService.loadFromStorage();
    const docs = vectorDbService.getDocuments();
    const unique = Array.from(new Set(docs.map(d => d.documentId))).map(id => {
      const d = docs.find(x => x.documentId === id);
      return { id, name: d?.documentName || 'File', kind: (d?.metadata?.assetKind || 'document') as ImportedAssetKind };
    });
    setUploadedDocs(unique);
  };

  const clearChat = () => { clearMessages(); nativeChatSessionService.resetChat(currentChatId); };
  const createNewChat = () => {
    const chat = createDefaultChat();
    setChats((current) => [chat, ...current]);
    setCurrentChatId(chat.id);
    setIsSidebarOpen(false);
  };
   const deleteChat = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
     e.stopPropagation();

     setChats((prevChats) => {
       const nextChats = prevChats.filter((chat) => chat.id !== id);
       const hasChats = nextChats.length > 0;
       const updatedChats = hasChats ? nextChats : [createDefaultChat()];
       
       // Update current chat if needed
       if (currentChatId === id) {
         setCurrentChatId(hasChats ? nextChats[0].id : updatedChats[0].id);
       }
       
       return updatedChats;
     });
   };
  
  const handleInput = (e: any) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleDocUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const parsed = await documentService.parseFile(file);
      const id = crypto.randomUUID();
      await vectorDbService.addDocument({ id, documentId: id, documentName: file.name, content: parsed.content, metadata: { assetKind: 'document' } });
      setUploadedDocs([...uploadedDocs, { id, name: file.name, kind: 'document' }]);
    }
  };

  const handleSkillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const id = crypto.randomUUID();
      const content = await file.text();
      await vectorDbService.addDocument({
        id,
        documentId: id,
        documentName: file.name,
        content,
        metadata: { assetKind: 'skill' },
      });
      setUploadedDocs((current) => [...current, { id, name: file.name, kind: 'skill' }]);
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, 'Failed to import skill file.'));
    } finally {
      e.target.value = '';
    }
  };

  const toggleApiKeyVisibility = (provider: 'groq' | 'openrouter' | 'openai' | 'gemini') => {
    setVisibleApiKeys((current) => ({
      ...current,
      [provider]: !current[provider],
    }));
  };

  const handleUrlImport = async () => {
    if (!urlImportValue.trim()) return;

    setIsUploadingDoc(true);
    setError(null);

    try {
      const snapshot = await webSearchService.readPage(urlImportValue, 12000);
      const id = crypto.randomUUID();

      await vectorDbService.addDocument({
        id,
        documentId: id,
        documentName: snapshot.title,
        content: snapshot.text,
        metadata: {
          assetKind: urlImportKind,
          source: 'user',
          sourceUrl: snapshot.url,
        },
      });

      setUploadedDocs((current) => [
        { id, name: snapshot.title, kind: urlImportKind, source: 'user' },
        ...current,
      ]);
      setUrlImportValue('');
      setDownloadStatus(`${snapshot.title} imported into Amo knowledge.`);
    } catch (importError) {
      setError(getErrorMessage(importError, 'Failed to import from URL.'));
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const settingsTabs: Array<{ id: SettingsSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'models', label: 'Models', icon: Cpu },
    { id: 'knowledge', label: 'Knowledge', icon: FileText },
    { id: 'workspace', label: 'Workspace', icon: HardDrive },
    { id: 'cognition', label: 'Cognition', icon: Brain },
  ];

  const toggleListening = async () => {
    if (isListening) {
      audioCaptureService.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      await audioCaptureService.start();
    }
  };

  useEffect(() => {
    if (isListening) {
      audioCaptureService.setCallbacks(
        (text: string, isFinal: boolean) => {
          if (!isFinal) {
            console.log('[Voice] Interim:', text);
            return;
          }
          console.log('[Voice] Final:', text);
          if (!text.trim()) {
            setIsListening(false);
            return;
          }
          inputRef.current = text;
          setInput(text);
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              void handleSend();
            });
          });
          setIsListening(false);
        },
        (error: string) => {
          console.error('[Voice] Error:', error);
          setError(error);
          setIsListening(false);
        }
      );
    } else {
      audioCaptureService.setCallbacks(() => {}, () => {});
    }
    return () => {
      audioCaptureService.setCallbacks(() => {}, () => {});
    };
  }, [isListening]);

  const handleCopy = (text: string) => navigator.clipboard.writeText(text);

  const handleRegenerate = (id: string) => {
    const assistantIndex = messages.findIndex((message) => message.id === id && message.role === 'assistant');
    if (assistantIndex <= 0) return;

    const priorUserMessage = [...messages.slice(0, assistantIndex)].reverse().find((message) => message.role === 'user');
    if (!priorUserMessage) return;

    setInput(priorUserMessage.content);
    inputRef.current = priorUserMessage.content;
    textareaRef.current?.focus();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.type.startsWith('image/')) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
          reader.onerror = () => reject(reader.error || new Error('Failed to read image file.'));
          reader.readAsDataURL(file);
        });

        setSelectedImage(dataUrl);
        setInput((current) => current || `Describe this image: ${file.name}`);
        inputRef.current = inputRef.current || `Describe this image: ${file.name}`;
        textareaRef.current?.focus();
        return;
      }

      if (
        file.type === 'application/pdf'
        || file.type === 'text/plain'
        || file.type === 'text/markdown'
        || file.type.startsWith('audio/')
      ) {
        await handleDocUpload({ target: { files: [file] } });
        return;
      }

      setError('That upload type is not supported yet. Use image, PDF, TXT, Markdown, or audio files.');
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, 'Failed to process uploaded file.'));
    } finally {
      e.target.value = '';
    }
  };

  const WorkspaceFileTree = () => (
    <div className="p-4 space-y-2">
       <div className="flex justify-between items-center mb-4">
         <span className="text-[10px] uppercase tracking-widest text-white/40">Files</span>
         <button onClick={() => docInputRef.current?.click()} className="text-[#ff4e00]"><Plus className="w-4 h-4" /></button>
       </div>
       {uploadedDocs.map(doc => (
         <div key={doc.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl text-xs text-white/60">
           <FileText className="w-4 h-4" /> {doc.name}
         </div>
       ))}
     </div>
    );

  return (
    <ErrorBoundary fallback={DefaultFallback}>
      <div className="flex flex-col h-screen bg-black text-[#E0E0E0] font-sans selection:bg-[#ff4e00]/30 relative overflow-hidden">
          <div className="atmosphere" />
          
          <header className="h-18 border-b border-white/10 flex items-center justify-between px-4 sm:px-6 glass-panel z-30 shrink-0">
           <div className="flex items-center gap-3 min-w-0">
             <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-white/40 hover:text-white/80 transition-colors" aria-label="Open sidebar">
               <Menu className="w-5 h-5" />
             </button>
             <div className="w-14 h-14 rounded-[1.35rem] glass-panel border border-[#ff4e00]/25 flex items-center justify-center shrink-0">
               <AmoAvatar className="w-12 h-12" interactionMode={isWebOrCloudActive ? 'web-active' : 'default'} />
             </div>
             <div>
               <h1 className="font-serif italic font-semibold text-xl tracking-[0.16em] text-white leading-none">AMO</h1>
               <div className="flex items-center gap-2 mt-1.5">
                 <div className={cn('w-1.5 h-1.5 rounded-full transition-colors duration-300', currentAmoStatus.dotClassName, isLoading && 'animate-pulse')} />
                 <div className={cn(currentAmoStatus.chipClassName, !isSelectedModelReady && 'opacity-80')}>
                   <span className="text-[10px] font-bold uppercase tracking-wider">{currentAmoStatus.label}</span>
                   <span className="status-dots" aria-hidden="true">
                     <span />
                     <span />
                     <span />
                   </span>
                 </div>
               </div>
             </div>
           </div>
        
         <div className="flex items-center gap-2">
           <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-white/50">
             <Zap className="w-3.5 h-3.5 text-[#ff4e00]/70" aria-hidden="true" />
             <span className="micro-label !text-inherit">{isVoiceMode ? 'Voice Active' : 'Text First'}</span>
           </div>
           <button onClick={clearChat} className="p-2 text-white/40 hover:text-white/80 transition-colors" title="Clear conversation" aria-label="Clear conversation"><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
            <button onClick={() => setIsSidebarOpen(true)} className={cn("p-2 rounded-full transition-colors", isSidebarOpen ? "bg-[#ff4e00]/20 text-[#ff4e00]" : "text-white/40 hover:text-white/80")} title="Amo Hub" aria-label="Open sidebar"><Settings className="w-4 h-4" aria-hidden="true" /></button>
         </div>
       </header>

        <AnimatePresence>
          {isSidebarOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-md z-40" aria-hidden="true" />}
        </AnimatePresence>

        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          chats={chats}
          currentChatId={currentChatId}
          onSelectChat={(id) => { setCurrentChatId(id); }}
          onNewChat={createNewChat}
          onDeleteChat={deleteChat}
          uploadedDocs={uploadedDocs}
          isUploadingDoc={isUploadingDoc}
          onImportDoc={() => docInputRef.current?.click()}
          onImportUrl={() => { setIsSettingsOpen(true); setSettingsSection('knowledge'); }}
          onWorkspaceSetup={handleWorkspaceSetup}
          areStarterPacksImported={areStarterPacksImported}
          isImportingStarterPacks={isImportingStarterPacks}
          brainMemoryRows={brainMemoryRows}
          brainSummaryRows={brainSummaryRows}
          seedPackRows={seedPackRows}
          onRefreshNews={handleRefreshNews}
          onClearCache={handleClearCache}
          onSwitchView={setActiveView}
          onRunCommand={handleRunQuickCommand}
          onSaveCurrentPage={handleSaveCurrentPage}
          selectedModelId={selectedModel.id}
          availableModels={AVAILABLE_MODELS}
          onSelectModel={(id) => { const model = AVAILABLE_MODELS.find(m => m.id === id); if (model) setSelectedModel(model); }}
          nativeModelStatus={localRuntimeState.capability}
          nativeModelName={nativeOfflineStatus?.activeModel?.displayName || 'No model loaded'}
          hasGroqKey={hasGroqApiKey}
          hasGeminiKey={hasGeminiApiKey}
          hasOpenAiKey={hasOpenAiApiKey}
          hasOpenRouterKey={hasOpenRouterApiKey}
          groqApiKey={groqApiKey}
          geminiApiKey={geminiApiKey}
          openAiApiKey={openAiApiKey}
          openRouterApiKey={openRouterApiKey}
          onSetGroqKey={setGroqApiKey}
          onSetGeminiKey={setGeminiApiKey}
          onSetOpenAiKey={setOpenAiApiKey}
          onSetOpenRouterKey={setOpenRouterApiKey}
          onDownloadModel={handleDownloadAndLoad}
          onImportModel={handleImportNativeModel}
          isDownloadingModel={isDownloadingNativeModel}
          onSendPrompt={(text) => { setInput(text); inputRef.current = text; textareaRef.current?.focus(); }}
          isVoiceMode={isVoiceMode}
          onToggleVoiceMode={() => setIsVoiceMode(!isVoiceMode)}
          isWebSearchEnabled={isWebSearchEnabled}
          onToggleWebSearch={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
          isDeepThinkEnabled={isDeepThinkEnabled}
          onToggleDeepThink={() => setIsDeepThinkEnabled(!isDeepThinkEnabled)}
          onClearMemory={handleClearMemory}
          onExportHistory={handleExportHistory}
          appVersion="1.0.0"
        />

        <main className="flex-1 flex flex-col relative overflow-hidden">
         <div className="border-b border-white/10 px-4 sm:px-6 py-3">
           <div className="flex items-center gap-2 max-w-4xl mx-auto">
<button onClick={() => setActiveView('chat')} className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all", activeView === 'chat' ? "bg-[#ff4e00]/20 text-[#ff4e00] border border-[#ff4e00]/30" : "text-white/50 border border-white/10 hover:text-white/80 hover:border-white/20")}>Chat</button>
               <button onClick={() => setActiveView('webview')} className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all", activeView === 'webview' ? "bg-[#ff4e00]/20 text-[#ff4e00] border border-[#ff4e00]/30" : "text-white/50 border border-white/10 hover:text-white/80 hover:border-white/20")}>Android WebView</button>
              <button onClick={() => setActiveView('terminal')} className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all", activeView === 'terminal' ? "bg-[#ff4e00]/20 text-[#ff4e00] border border-[#ff4e00]/30" : "text-white/50 border border-white/10 hover:text-white/80 hover:border-white/20")}>Terminal</button>
              <button onClick={() => setActiveView('editor')} className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all", activeView === 'editor' ? "bg-[#ff4e00]/20 text-[#ff4e00] border border-[#ff4e00]/30" : "text-white/50 border border-white/10 hover:text-white/80 hover:border-white/20")}>Code Editor</button>
           </div>
         </div>

         <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
           {activeView === 'chat' && (
             <div className="h-full flex flex-col">
               {(error || downloadStatus) && (
                 <div className="max-w-4xl mx-auto w-full space-y-3 mb-6">
                   {error && (
                     <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-100">
                       <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                       <span>{error}</span>
                     </div>
                   )}
                   {downloadStatus && !error && (
                     <div className="flex items-start gap-3 rounded-2xl border border-[#ff4e00]/20 bg-[#ff4e00]/8 px-4 py-3 text-sm text-white/80">
                       <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#ff8a5c]" />
                       <span>{downloadStatus}</span>
                     </div>
                   )}
                 </div>
               )}

               <div className="flex-1 max-w-4xl mx-auto w-full">
                 {messages.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                     <div className="w-24 h-24 rounded-[2rem] glass-panel border border-[#ff4e00]/20 flex items-center justify-center animate-float">
                       <AmoAvatar className="w-16 h-16" />
                     </div>
                     <p className="text-white/20 font-serif italic text-lg tracking-widest uppercase">Kia Ora. How can I help?</p>
                   </div>
                 ) : (
                   <MessageList messages={messages} assistantName="Amo" onCopy={handleCopy} onRegenerate={handleRegenerate} />
                 )}
                 <div ref={messagesEndRef} />
               </div>
             </div>
           )}

            {activeView === 'webview' && (
              <div className="h-full max-w-4xl mx-auto w-full min-h-[420px]">
                <WebView url={webViewUrl} onNavigate={(url) => console.log('[WebView] Navigated to:', url)} />
              </div>
            )}

{activeView === 'terminal' && (
              <div className="h-full max-w-4xl mx-auto w-full glass-panel border border-white/10 rounded-[1.75rem] overflow-hidden min-h-[420px] p-2">
                <Terminal />
              </div>
            )}

            {activeView === 'editor' && (
              <div className="h-full max-w-6xl mx-auto w-full min-h-[420px]">
                <CodeEditor />
              </div>
            )}
          </div>

         {activeView === 'chat' && (
           <div className="p-4 sm:p-8 relative z-10">
             <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent pointer-events-none" />
             <div className="max-w-4xl mx-auto relative space-y-3">
               {selectedImage && (
                 <div className="glass-panel rounded-[1.5rem] border border-white/8 p-3 flex items-center gap-3 shadow-xl">
                   <img src={selectedImage} alt="Selected upload" className="h-14 w-14 rounded-2xl object-cover border border-white/10" />
                   <div className="min-w-0 flex-1">
                     <div className="micro-label mb-1">Image attached</div>
                     <p className="truncate text-xs text-white/45">Amo will keep the image with your next message.</p>
                   </div>
                   <button onClick={() => setSelectedImage(null)} className="rounded-full p-2 text-white/30 hover:text-white/80 hover:bg-white/5 transition-all" title="Remove image">
                     <X className="h-4 w-4" />
                   </button>
                 </div>
               )}
              <div className="flex items-stretch gap-3 relative">
                <button onClick={() => fileInputRef.current?.click()} className="h-[60px] w-14 shrink-0 rounded-2xl glass-panel border border-white/5 flex items-center justify-center text-white/40 hover:border-[#ff4e00]/30 transition-all active:scale-95 shadow-xl"><Plus className="w-5 h-5" /></button>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*,video/*,audio/*,.pdf,.txt,.md" className="hidden" />
                <div className="relative flex-1 flex items-stretch">
                  <textarea ref={textareaRef} value={input} onChange={handleInput} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} placeholder="Chat with Amo..." className="w-full glass-panel border border-white/5 rounded-[1.75rem] px-6 py-[18px] pr-28 text-[15px] focus:outline-none focus:border-[#ff4e00]/50 resize-none min-h-[60px] h-[60px] shadow-2xl transition-all" rows={1} />
                   <div className="absolute right-14 top-1/2 -translate-y-1/2">
                     <button onClick={toggleListening} className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-all", isListening ? "bg-red-500/20 text-red-500" : "text-white/20 hover:text-white/80")}>
                       {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                     </button>
                   </div>
                    <button onClick={isLoading ? handleCancelThinking : handleSend} disabled={!isLoading && !input.trim()} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-gradient-to-br from-orange-500 to-[#ff4e00] text-white flex items-center justify-center hover:opacity-90 disabled:opacity-30 transition-all shadow-lg">{isLoading ? <X className="w-5 h-5" /> : <Send className="w-4 h-4 ml-0.5" />}</button>
                 </div>
               </div>
             </div>
           </div>
         )}
       </main>

      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="fixed inset-0 z-[100] flex items-stretch justify-center bg-black/85 backdrop-blur-xl sm:p-6">
            <div className="flex h-full w-full flex-col overflow-hidden border border-white/10 bg-[#050505] shadow-2xl sm:max-h-[92vh] sm:max-w-5xl sm:rounded-[2.5rem]">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-5 py-4 sm:px-8 sm:py-6">
                <div>
                  <h2 className="font-serif italic text-xl text-white sm:text-2xl">Amo Settings</h2>
                  <p className="mt-1 text-[11px] text-white/55 sm:text-xs">Configure your grounded AI experience.</p>
                </div>
                 <button onClick={() => setIsSettingsOpen(false)} className="rounded-full border border-white/10 bg-white/[0.03] p-3 transition-all hover:bg-white/10" title="Close settings" aria-label="Close settings"><X className="h-5 w-5 text-white/80 sm:h-6 sm:w-6" aria-hidden="true" /></button>
              </div>
              
              <div className="border-b border-white/10 bg-black/30 px-4 py-3 sm:px-8">
                <div className="mx-auto max-w-4xl">
               <div className="grid grid-cols-5 gap-2">
                 {settingsTabs.map((tab) => (
                   <button
                     key={tab.id}
                     onClick={() => setSettingsSection(tab.id)}
                     className={cn(
                       "flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-[1.35rem] border px-1 py-2 text-center transition-all sm:min-h-[64px] sm:gap-1.5 sm:px-2",
                       settingsSection === tab.id
                         ? "border-[#ff4e00]/45 bg-gradient-to-b from-[#ff4e00]/22 to-[#ff4e00]/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                         : "border-white/10 bg-white/[0.03] text-white/72 hover:border-white/18 hover:bg-white/[0.05]",
                     )}
                     role="tab"
                     aria-selected={settingsSection === tab.id}
                     aria-controls={`settings-panel-${tab.id}`}
                   >
                     <tab.icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
                     <span className="text-[9px] font-semibold leading-tight tracking-[0.04em] sm:text-[11px]">{tab.label}</span>
                   </button>
                 ))}
               </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-black/20 px-4 py-5 custom-scrollbar sm:p-8 md:p-10">
                <div className="mx-auto max-w-3xl space-y-6">

                  {settingsSection === 'general' && (
                    <div className="space-y-4">
                      <div>
                        <div className="micro-label mb-2">General</div>
                        <p className="text-sm text-white/58">Core voice and API settings that affect everyday chat behavior.</p>
                      </div>
                      <div className="settings-card space-y-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="micro-label mb-1">Voice Mode</div>
                            <p className="text-xs text-white/60">Speak responses automatically</p>
                          </div>
                          <button onClick={() => setIsVoiceMode(!isVoiceMode)} className={cn("rounded-full border px-5 py-2 text-[11px] font-bold tracking-[0.18em] transition-all", isVoiceMode ? "border-transparent bg-[#ff4e00] text-white" : "border-white/15 bg-white/[0.03] text-white/80")}>{isVoiceMode ? 'ON' : 'OFF'}</button>
                        </div>
                        <div className="grid gap-4">
                          {[
                            {
                              id: 'gemini' as const,
                              label: 'Gemini API Key',
                              value: geminiApiKey,
                              setValue: setGeminiApiKey,
                              placeholder: 'AIza...',
                            },
                            {
                              id: 'groq' as const,
                              label: 'Groq API Key',
                              value: groqApiKey,
                              setValue: setGroqApiKey,
                              placeholder: 'gsk_...',
                            },
                            {
                              id: 'openrouter' as const,
                              label: 'OpenRouter API Key',
                              value: openRouterApiKey,
                              setValue: setOpenRouterApiKey,
                              placeholder: 'sk-or-...',
                            },
                            {
                              id: 'openai' as const,
                              label: 'OpenAI API Key',
                              value: openAiApiKey,
                              setValue: setOpenAiApiKey,
                              placeholder: 'sk-...',
                            },
                          ].map((provider) => (
                            <div key={provider.id} className="space-y-3 rounded-[1.75rem] border border-white/10 bg-black/25 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="micro-label">{provider.label}</div>
                                  <p className="mt-1 text-[11px] text-white/48">Stored in-app. Tap expose to verify or edit.</p>
                                </div>
                                <button
                                  onClick={() => toggleApiKeyVisibility(provider.id)}
                                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/75 transition-all hover:border-white/20 hover:bg-white/[0.06]"
                                  title={visibleApiKeys[provider.id] ? 'Hide secret key' : 'Expose secret key'}
                                >
                                  {visibleApiKeys[provider.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                  {visibleApiKeys[provider.id] ? 'Hide' : 'Expose'}
                                </button>
                              </div>
                              <input
                                type={visibleApiKeys[provider.id] ? 'text' : 'password'}
                                value={provider.value}
                                onChange={(e) => provider.setValue(e.target.value)}
                                placeholder={provider.placeholder}
                                className="w-full rounded-2xl border border-white/14 bg-black/45 px-4 py-4 text-sm text-white placeholder:text-white/28 focus:border-[#ff4e00]/55 focus:bg-black/55 outline-none transition-all"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsSection === 'models' && (
                    <div className="space-y-4">
                      <div>
                        <div className="micro-label mb-2">Models</div>
                        <p className="text-sm text-white/58">Choose the active chat runtime. Native offline now supports direct GGUF download by URI as well as local file import.</p>
                      </div>
                      <div className="settings-card space-y-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="micro-label mb-2">Native GGUF Runtime</div>
                            <p className="text-xs leading-relaxed text-white/58">Use a direct GGUF download URI or import a local `.gguf` file. Recommended model links are live Hugging Face direct download URLs.</p>
                          </div>
                          <div className={cn(
                            'rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em]',
                            localRuntimeState.capability === 'ready'
                              ? 'border-emerald-400/30 bg-emerald-500/12 text-emerald-200'
                              : 'border-white/12 bg-white/[0.03] text-white/70',
                          )}>
                            {localRuntimeState.capability}
                          </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                          <div className="micro-label mb-2">Direct GGUF URI</div>
                          <input
                            type="url"
                            value={nativeDownloadUrl}
                            onChange={(e) => setNativeDownloadUrl(e.target.value)}
                            placeholder={RECOMMENDED_NATIVE_DOWNLOADS[0].url}
                            className="w-full rounded-2xl border border-white/14 bg-black/45 px-4 py-4 text-sm text-white placeholder:text-white/28 focus:border-[#ff4e00]/55 focus:bg-black/55 outline-none transition-all"
                          />
                          <div className="mt-3 flex gap-3">
                            <button
                              onClick={() => void handleDownloadNativeModel()}
                              disabled={isDownloadingNativeModel || !nativeDownloadUrl.trim()}
                              className="inline-flex flex-1 items-center justify-center gap-3 rounded-[1.35rem] border border-[#ff4e00]/30 bg-[#ff4e00]/12 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-all hover:bg-[#ff4e00]/18 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isDownloadingNativeModel ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
                              Download by URI
                            </button>
                            <button
                              onClick={handleImportNativeModel}
                              className="inline-flex items-center justify-center gap-3 rounded-[1.35rem] border border-white/12 bg-white/[0.03] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/78 transition-all hover:border-white/18 hover:bg-white/[0.05]"
                            >
                              <FolderOpen className="h-4 w-4" />
                              Import File
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-3">
                          {RECOMMENDED_NATIVE_DOWNLOADS.map((download) => (
                            <div key={download.url} className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-white">{download.label}</div>
                                  <p className="mt-1 text-xs text-white/55">{download.description}</p>
                                </div>
                                <button
                                  onClick={() => handleCopy(download.url)}
                                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/75 transition-all hover:border-white/20 hover:bg-white/[0.06]"
                                  title="Copy direct URI"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                  Copy URI
                                </button>
                              </div>
                              <button
                                onClick={() => setNativeDownloadUrl(download.url)}
                                className="mt-3 block w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-left text-[11px] text-white/68 transition-all hover:border-[#ff4e00]/35 hover:text-white"
                                title="Use this direct URI"
                              >
                                {download.url}
                              </button>
                            </div>
                          ))}
                        </div>

                        {nativeDownloadAuthStatus && (
                          <div className="rounded-[1.5rem] border border-white/10 bg-black/25 px-4 py-3 text-xs text-white/58">
                            {nativeDownloadAuthStatus.message}
                          </div>
                        )}

                        <div className="rounded-[1.5rem] border border-white/10 bg-black/25 px-4 py-3 text-xs text-white/58">
                          Active model: {nativeOfflineStatus?.activeModel?.displayName || 'none selected'}
                        </div>
                      </div>
                      <div className="grid gap-3">
                        {AVAILABLE_MODELS.map(m => (
                          <div key={m.id} onClick={() => setSelectedModel(m)} className={cn("cursor-pointer rounded-[2rem] border p-5 transition-all sm:p-6", selectedModel.id === m.id ? "border-[#ff4e00]/40 bg-[#ff4e00]/10 text-white shadow-xl" : "border-white/10 bg-white/[0.04] text-white/72 hover:border-white/20")}>
                            <div className="mb-2 flex items-center justify-between gap-3"><span className="font-bold text-sm tracking-wider uppercase">{m.name}</span><span className="text-[10px] font-mono opacity-60">{m.size}</span></div>
                            <p className="text-xs leading-relaxed text-white/62">{m.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {settingsSection === 'knowledge' && (
                    <div className="space-y-4">
                      <div>
                        <div className="micro-label mb-2">Knowledge</div>
                        <p className="text-sm text-white/58">Bring in the bundled Superbrain pack, your own documents, and direct URL imports that Amo can use as local context immediately.</p>
                      </div>
                      <button onClick={handleWorkspaceSetup} disabled={isImportingStarterPacks} className="w-full rounded-[2rem] border border-[#ff4e00]/24 bg-[#ff4e00]/8 p-5 text-left transition-all hover:bg-[#ff4e00]/12 disabled:opacity-60 sm:p-6">
                        <div className="mb-2 flex items-center justify-between gap-4">
                          <div>
                            <div className="micro-label">Superbrain Pack</div>
                            <p className="mt-1 text-xs text-white/62">Load Amo&apos;s bundled truth, data, wisdom, NZ English, and Te Reo Maori grounding into local knowledge.</p>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff4e00]">
                            {areStarterPacksImported ? 'Synced' : 'Sync now'}
                          </span>
                        </div>
                        <div className="text-[11px] text-white/52">
                          {AMO_STARTER_PACKS.length} bundled packs across truth, data, and wisdom.
                        </div>
                      </button>
                      <div className="settings-card space-y-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="micro-label mb-2">URL Fetch Import</div>
                            <p className="text-xs leading-relaxed text-white/58">Fetch a compatible page or hosted file URL and add it straight into Amo knowledge as a dataset, skill, or document.</p>
                          </div>
                          <DownloadCloud className="h-5 w-5 shrink-0 text-[#ff4e00]" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {([
                            { id: 'dataset', label: 'Dataset' },
                            { id: 'skill', label: 'Skill' },
                            { id: 'document', label: 'Document' },
                          ] as Array<{ id: ImportSourceKind; label: string }>).map((kind) => (
                            <button
                              key={kind.id}
                              onClick={() => setUrlImportKind(kind.id)}
                              className={cn(
                                'rounded-2xl border px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] transition-all sm:text-[11px]',
                                urlImportKind === kind.id
                                  ? 'border-[#ff4e00]/45 bg-[#ff4e00]/14 text-white'
                                  : 'border-white/10 bg-black/25 text-white/65 hover:border-white/20 hover:bg-white/[0.04]',
                              )}
                            >
                              {kind.label}
                            </button>
                          ))}
                        </div>
                        <div className="space-y-3">
                          <input
                            type="url"
                            value={urlImportValue}
                            onChange={(e) => setUrlImportValue(e.target.value)}
                            placeholder="https://example.com/dataset-or-skill"
                            className="w-full rounded-2xl border border-white/14 bg-black/45 px-4 py-4 text-sm text-white placeholder:text-white/28 focus:border-[#ff4e00]/55 focus:bg-black/55 outline-none transition-all"
                          />
                          <button
                            onClick={handleUrlImport}
                            disabled={isUploadingDoc || !urlImportValue.trim()}
                            className="inline-flex w-full items-center justify-center gap-3 rounded-[1.5rem] border border-[#ff4e00]/28 bg-[#ff4e00]/12 px-4 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-all hover:bg-[#ff4e00]/18 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isUploadingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
                            Import from URL
                          </button>
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <button onClick={() => docInputRef.current?.click()} className="flex flex-col items-center gap-4 rounded-[2rem] border border-dashed border-white/14 bg-white/[0.03] py-8 text-[11px] font-bold uppercase tracking-widest text-white/72 transition-all hover:border-[#ff4e00]/50 hover:text-white"><DownloadCloud className="w-6 h-6 text-[#ff4e00]" /> Import Docs</button>
                        <button onClick={() => skillInputRef.current?.click()} className="flex flex-col items-center gap-4 rounded-[2rem] border border-dashed border-white/14 bg-white/[0.03] py-8 text-[11px] font-bold uppercase tracking-widest text-white/72 transition-all hover:border-[#ff4e00]/50 hover:text-white"><Zap className="w-6 h-6 text-amber-400" /> Import Skills</button>
                      </div>
                      <input type="file" ref={docInputRef} onChange={handleDocUpload} className="hidden" />
                      <input type="file" ref={skillInputRef} onChange={handleSkillUpload} className="hidden" />
                    </div>
                  )}

                  {settingsSection === 'workspace' && (
                    <div className="space-y-4">
                      <div>
                        <div className="micro-label mb-2">Workspace</div>
                        <p className="text-sm text-white/58">Device setup and workspace bootstrap actions that affect local capability.</p>
                      </div>
                      <button onClick={handleWorkspaceSetup} className="group w-full rounded-[2rem] border border-[#ff4e00]/24 bg-[#ff4e00]/8 p-6 text-left transition-all hover:bg-[#ff4e00]/12 sm:p-8">
                        <div className="flex items-center gap-4 mb-2">
                          <HardDrive className="w-6 h-6 text-[#ff4e00]" />
                          <span className="font-bold text-sm tracking-widest uppercase text-white/80">Setup Workspace</span>
                        </div>
                        <p className="text-xs leading-relaxed text-white/62 transition-colors group-hover:text-white/78">Initialize your local device workspace for autonomous updates and modifications.</p>
                      </button>
                    </div>
                  )}

                  {settingsSection === 'cognition' && (
                    <div className="space-y-4">
                      <div>
                        <div className="micro-label mb-2">Cognition</div>
                        <p className="text-sm text-white/58">Read-only status for how Amo's memory, tool registry, and seed packs are wired.</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="settings-card rounded-[2rem] border border-white/12 bg-white/[0.04] p-5">
                          <div className="micro-label mb-2">Universal Source of Data</div>
                          <p className="text-xs leading-relaxed text-white/62">Atlas, history, reference, documents, and live search context.</p>
                        </div>
                        <div className="settings-card rounded-[2rem] border border-white/12 bg-white/[0.04] p-5">
                          <div className="micro-label mb-2">Single Source of Truth</div>
                          <p className="text-xs leading-relaxed text-white/62">Identity, core rules, grounded tone, and response boundaries.</p>
                        </div>
                        <div className="settings-card rounded-[2rem] border border-white/12 bg-white/[0.04] p-5">
                          <div className="micro-label mb-2">Multiple Sources of Wisdom</div>
                          <p className="text-xs leading-relaxed text-white/62">Reasoning, empathy, synthesis, and practical decision support.</p>
                        </div>
                      </div>
                      <div className="settings-card rounded-[2rem] border border-indigo-400/16 bg-indigo-500/8 p-6 sm:rounded-[2.5rem] sm:p-8">
                        <div className="flex items-center gap-4 mb-4">
                          <Brain className="w-6 h-6 text-indigo-400" />
                          <span className="font-bold text-sm tracking-widest uppercase text-white/80">Brain Status</span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs font-mono"><span className="text-white/48">Memory Notes</span><span className="text-indigo-300">{brainMemoryRows.length}</span></div>
                          <div className="flex justify-between text-xs font-mono"><span className="text-white/48">Summaries</span><span className="text-emerald-300">{brainSummaryRows.length}</span></div>
                          <div className="flex justify-between text-xs font-mono"><span className="text-white/48">Tools</span><span className="text-sky-300">{toolRegistryRows.length}</span></div>
                          <div className="flex justify-between text-xs font-mono"><span className="text-white/48">Seed Packs</span><span className="text-amber-300">{seedPackRows.length}</span></div>
                        </div>
                        <div className="mt-6 grid gap-3 lg:grid-cols-2">
                          <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                            <div className="micro-label mb-2">Operating Instructions</div>
                            <div className="space-y-2 text-xs leading-relaxed text-white/68">
                              <p>Amo reads chat history, imported knowledge, memory notes, summaries, and active tools before acting.</p>
                              <p>Amo writes by replying in chat, updating memory, using imported data, opening web pages, and running terminal tasks when needed.</p>
                              <p>Amo should prefer local knowledge first, then tools, then live web only when the answer is not already grounded.</p>
                            </div>
                          </div>
                          <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                            <div className="micro-label mb-2">Task Execution Flow</div>
                            <div className="space-y-2 text-xs leading-relaxed text-white/68">
                              <p>1. Read the request and identify whether it is chat, workspace, web, or terminal work.</p>
                              <p>2. Search local memory and imported knowledge for the fastest grounded answer.</p>
                              <p>3. Use terminal for file, command, build, or workflow tasks when execution is required.</p>
                              <p>4. Use Android WebView for browsing, research, and task follow-through inside the app.</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 rounded-[1.5rem] border border-[#ff4e00]/15 bg-[#ff4e00]/6 p-4">
                          <div className="micro-label mb-2">Terminal + Tool Authority</div>
                          <div className="space-y-2 text-xs leading-relaxed text-white/70">
                            <p>Amo has permission to use built-in features to complete tasks: chat, workspace, imported knowledge, Android WebView, and terminal execution.</p>
                            <p>Terminal sessions preserve working directory, so Amo can inspect, run commands, and continue multi-step workflows in the same environment.</p>
                            <p>Recommended behavior: explain intent briefly, run the task, verify output, then continue to the next step.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
           </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
    );
}
