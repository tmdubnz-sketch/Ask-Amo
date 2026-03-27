import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { Browser } from '@capacitor/browser';
import { ErrorBoundary, DefaultFallback } from './components/ErrorBoundary';
import { performanceMonitoringService, usePerformanceMonitoring } from './services/performanceMonitoringService';
import { ToastContainer, Toast } from './components/Toast';
import { toastService } from './services/toastService';
import { toastGuideService } from './services/toastGuideService';
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
import { WebBrowser } from './components/WebBrowser';
import { WelcomeGuide } from './components/WelcomeGuide';
import { Terminal } from './components/Terminal';
import { CodeEditor } from './components/CodeEditor';
import { VocabularyBuilder } from './components/VocabularyBuilder';
import { SentenceBuilder } from './components/SentenceBuilder';
import { IntentEnhancer } from './components/IntentEnhancer';
import { motion, AnimatePresence } from 'motion/react';
import { groqService } from './services/groqService';
import { openrouterService } from './services/openrouterService';
import { openaiService } from './services/openaiService';
import { geminiService } from './services/geminiService';
import { mistralService } from './services/mistralService';
import { assistantRuntimeService } from './services/assistantRuntimeService';
import { documentService } from './services/documentService';
import { knowledgeStoreService, knowledgeBootstrapService, nativeOfflineLlmService, speechT5Service, webBrowserService, voiceWebAssistService } from './services/index';
import { nativeSpeechRecognitionService } from './services/nativeSpeechRecognitionService';
import { workspaceService } from './services/workspaceService';
import { injectFileContext } from './services/fileContextService';
import { vectorDbService } from './services/vectorDbService';
import { webSearchService, shouldUseWebSearch } from './services/webSearchService';
import { apiKeyStorage } from './services/apiKeyStorage';
import { normalizeTranscriptText, routeUserIntent } from './services/intentRouterService';
import { nativeChatSessionService } from './services/nativeChatSessionService';
import { nativeAssistantOrchestrator } from './services/nativeAssistantOrchestrator';
import { buildDeterministicReply } from './services/nativeReplyCoordinator';
import { sentenceBuilderService } from './services/sentenceBuilderService';
import {
  type NativeOfflineDownloadAuthStatus,
  type NativeOfflineModelInfo,
  type NativeOfflineStatus,
} from './services/nativeOfflineLlmService';
import { nativeTtsService, type NativeTtsStatus, type NativeTtsVoiceInfo } from './services/nativeTtsService';
import { useMessages } from './hooks/useMessages';
import { useModelSettingsStore } from './stores/modelSettingsStore';
import { MessageList } from './components/MessageList';
import { AmoAvatar } from './components/AmoAvatar';
import { Sidebar, type SidebarTab } from './components/Sidebar';
import { CodePreview } from './components/CodePreview';
import { FileTree } from './components/FileTree';
import { AMO_STARTER_PACKS } from './data/amoStarterPacks';
import { amoToolCoordinator } from './services/amoToolCoordinator';
import { isIdeIntent } from './services/amoIdePrompt';
import { runIdeLoop, matchTaskTemplate } from './services/amoIdeLoop';
import { extractSlots, slotsToKnowledgeQuery, slotsToPromptHint } from './services/slotExtractorService';
import { AVAILABLE_MODELS, type ModelConfig, type ChatSession } from './types';
import { amoBrainService } from './services/amoBrainService';
import { brainLearningService } from './services/brainLearningService';
import type { ConversationMemoryRow, MemorySummaryRow, SeedPackRow, ToolRegistryRow } from './services/knowledgeStoreService';
import type { Workspace } from './services/workspaceService';
import { cn } from './lib/utils';
import { voicePersonaService } from './services/voicePersonaService';
import { useResponseCacheStore } from './stores/responseCacheStore';
import { classifyIntent } from './services/intentClassifierService';
import { inworldService } from './services/inworldService';
import { autoLearningService } from './services/autoLearningService';

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
type LocalBackendKind = 'native-gguf' | 'none';
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
type AmoView = 'chat' | 'preview' | 'ide' | 'learn' | 'web' | 'settings';
type IdeTab = 'editor' | 'terminal' | 'files' | 'debug' | 'run';
type LearnTab = 'vocabulary' | 'sentences' | 'intent' | 'brain' | 'practice';
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
    description: 'Best for Snapdragon 865 - text only',
    url: 'https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf?download=true',
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
  if (message.includes('Missing Mistral API key')) return 'Mistral is not configured. Paste your Mistral API key in Settings to use Mistral cloud replies.';
  if (message.includes('Missing Gemini API key')) return 'Gemini is not configured. Paste your Gemini API key in Settings to use Gemini cloud replies.';
  if ( message.includes('401') || message.includes('authentication')) return 'API key is invalid or expired. Check your API key in Settings.';
  if (message.includes('Unsupported file type')) return 'That file type is not supported. Use PDF, TXT, or Markdown files.';
  if (message.includes('Setting up fake worker failed') || message.includes('Failed to fetch dynamically imported module') || message.includes('Loading chunk') || message.includes('Failed to load PDF')) return 'Could not open that PDF in this environment. Try again, or import a text or Markdown version instead.';
  if (message.includes('timed out') || message.includes('timeout')) return 'Request timed out. Please check your connection and try again.';
  if (message.includes('Network error') || message.includes('fetch')) return 'Network connection failed. Please check your internet connection and try again.';
  if (message.includes('Terminal permission denied')) return 'Terminal access denied. Please check app permissions.';
  if (message.includes('Native terminal error')) return message;
  if (message.includes('Page not found') || message.includes('404')) return 'Web page not found. The URL may be incorrect or the page may have been removed.';
  if (message.includes('Access denied') || message.includes('403')) return 'Access denied to web page. The site may block automated access.';
  if (message.includes('Website server error') || message.includes('500')) return 'Website is experiencing server errors. Please try again later.';
  return message || fallback;
}

function hasCloudProviderKey(
  family: ModelConfig['family'],
  options: {
    hasGroqApiKey: boolean;
    hasGeminiApiKey: boolean;
    hasOpenAiApiKey: boolean;
    hasOpenRouterApiKey: boolean;
    hasMistralApiKey: boolean;
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
    case 'mistral':
      return options.hasMistralApiKey;
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
  // Dynamic voice scoring based on active persona
  const persona = voicePersonaService.getActivePersona();
  const preferredNames = persona.voicePreferenceNames || [];
  
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  let score = 0;
  
  // Locale scoring based on persona preference
  if (lang.includes(persona.localePreference)) score += 56;
  else if (lang.includes('en-au')) score += 46;
  else if (lang.includes('en-us')) score += 20;
  else if (lang.includes('en-gb')) score -= 48;
  
  if (name.includes('google')) score += 12;
  if (voice.default) score += 8;
  
  // Check preferred voice names from persona
  for (const preferred of preferredNames) {
    if (name.includes(preferred)) {
      score += 36;
      break;
    }
  }
  
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
  const persona = voicePersonaService.getActivePersona();
  const preferredNames = persona.voicePreferenceNames || [];
  
  const name = voice.name.toLowerCase();
  const locale = voice.locale.toLowerCase();
  let score = 0;
  
  // Check preferred voice names from persona
  for (let i = 0; i < preferredNames.length; i++) {
    if (name.includes(preferredNames[i])) {
      score += 220 - i * 18;
      break;
    }
  }
  
  // Locale scoring based on persona preference
  if (locale.startsWith(persona.localePreference)) score += 80;
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
  const selectedModel = options.selectedModel || {};
  
  // Native GGUF model path
  if (selectedModel.family === 'native') {
    const nativeReady = status?.modelLoaded && status?.activeModel;
    return {
      backend: 'native-gguf',
      backendLabel: 'Native GGUF',
      capability: nativeReady ? 'ready' : status?.runtimeReady ? 'configured' : 'scaffold',
      selectedModelId: selectedModel.id,
      activeNativeModelPath: status?.activeModel?.relativePath || null,
      loadedModelId: options.loadedModelId,
      activeBackendModelId: nativeReady ? selectedModel.id : null,
      reason: nativeReady ? null : status?.message || 'Native model not loaded',
    };
  }

  // No local backend - cloud models
  return {
    backend: 'none',
    backendLabel: 'Cloud Only',
    capability: 'ready',
    selectedModelId: selectedModel.id,
    activeNativeModelPath: null,
    loadedModelId: null,
    activeBackendModelId: null,
    reason: null,
  };
}

type AppProps = {
  ready?: boolean;
};

export default function App({ ready = true }: AppProps) {
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
  const [mistralApiKey, setMistralApiKey] = useState(() => apiKeyStorage.get('mistral'));
  const [inworldApiKey, setInworldApiKey] = useState(() => apiKeyStorage.get('inworld'));
  const [areApiKeysHydrated, setAreApiKeysHydrated] = useState(() => apiKeyStorage.isHydrated());
  const [visibleApiKeys, setVisibleApiKeys] = useState<Record<'groq' | 'openrouter' | 'openai' | 'gemini' | 'mistral' | 'inworld', boolean>>({
    groq: false,
    openrouter: false,
    openai: false,
    gemini: false,
    mistral: false,
    inworld: false,
  });
  
  const [isVoiceMode, setIsVoiceMode] = useState(() => {
    const stored = localStorage.getItem('amo_voice_mode');
    return stored === null ? true : stored === 'true';
  });
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);
  const [voiceContinuous, setVoiceContinuous] = useState(() => {
    const stored = localStorage.getItem('amo_voice_continuous');
    return stored === null ? false : stored === 'true';
  });
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isDeepThinkEnabled, setIsDeepThinkEnabled] = useState(() => localStorage.getItem('amo_deep_think_enabled') === 'true');
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(() => localStorage.getItem('amo_web_search_enabled') !== 'false');
  const [urlImportValue, setUrlImportValue] = useState('');
  const [urlImportKind, setUrlImportKind] = useState<ImportSourceKind>('dataset');
  const [nativeDownloadUrl, setNativeDownloadUrl] = useState<string>(RECOMMENDED_NATIVE_DOWNLOADS[0].url);
  const [nativeDownloadAuthStatus, setNativeDownloadAuthStatus] = useState<NativeOfflineDownloadAuthStatus | null>(null);
  const [isDownloadingNativeModel, setIsDownloadingNativeModel] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ percent: number; status: string } | null>(null);
  
  const [nativeOfflineStatus, setNativeOfflineStatus] = useState<NativeOfflineStatus | null>(null);
  const [nativeTtsStatus, setNativeTtsStatus] = useState<NativeTtsStatus | null>(null);
  const [loadedModelId, setLoadedModelId] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState('');
   const [error, setError] = useState<string | null>(null);
   const [isLoading, setIsLoading] = useState(false);
   const [isInitializing, setIsInitializing] = useState(true);
   const [input, setInput] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<AmoView>('chat');
    const [activeIdeTab, setActiveIdeTab] = useState<IdeTab>('editor');
    const [activeLearnTab, setActiveLearnTab] = useState<LearnTab>('vocabulary');
    const [previewContent, setPreviewContent] = useState<{ code: string; language: string } | null>(null);
    const [webViewUrl, setWebViewUrl] = useState('amo://dashboard');
   const [isWebAssistActive, setIsWebAssistActive] = useState(false);
   const [toasts, setToasts] = useState<Toast[]>([]);
    const [pendingEditorCode, setPendingEditorCode] = useState<{ code: string; filename: string; autoRun?: boolean; autoPreview?: boolean; token: string } | null>(null);
    const [fileRefreshKey, setFileRefreshKey] = useState(0);
   const [amoTerminalOutput, setAmoTerminalOutput] = useState<string>('');
   
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
   const voiceContinuousRef = useRef(voiceContinuous);
   const isWebSearchEnabledRef = useRef(isWebSearchEnabled);
   const isLoadingRef = useRef(isLoading);
   const activeRequestIdRef = useRef(0);
   const canceledRequestIdsRef = useRef(new Set<number>());
   const activeAssistantMessageIdRef = useRef<string | null>(null);
   const voiceRestartTimerRef = useRef<NodeJS.Timeout | null>(null);
   const isVoiceProcessingRef = useRef(false);
   const isSpeakingRef = useRef(false);
   const handleSendRef = useRef<(() => Promise<void>) | null>(null);
   const handleVoiceWebSearchRef = useRef<((query: string) => Promise<boolean>) | null>(null);

  useEffect(() => { inputRef.current = input; }, [input]);
  useEffect(() => { isVoiceModeRef.current = isVoiceMode; }, [isVoiceMode]);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { voiceContinuousRef.current = voiceContinuous; }, [voiceContinuous]);
  useEffect(() => { isWebSearchEnabledRef.current = isWebSearchEnabled; }, [isWebSearchEnabled]);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

  useEffect(() => {
    let cancelled = false;
    // Hydrate API keys with timeout — don't block app init if secret store hangs
    Promise.race([
      apiKeyStorage.init(),
      new Promise(resolve => setTimeout(resolve, 5000)), // 5 second timeout
    ]).then(() => {
      if (cancelled) return;
      const keys = apiKeyStorage.getAll();
      setGroqApiKey(keys.groq);
      setOpenRouterApiKey(keys.openrouter);
      setOpenAiApiKey(keys.openai);
      setGeminiApiKey(keys.gemini);
      setMistralApiKey(keys.mistral);
      setAreApiKeysHydrated(true);
    }).catch(() => {
      // Secret store failed — continue without API keys
      if (!cancelled) setAreApiKeysHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { if (areApiKeysHydrated) apiKeyStorage.set('groq', groqApiKey); }, [areApiKeysHydrated, groqApiKey]);
  useEffect(() => { if (areApiKeysHydrated) apiKeyStorage.set('openrouter', openRouterApiKey); }, [areApiKeysHydrated, openRouterApiKey]);
  useEffect(() => { if (areApiKeysHydrated) apiKeyStorage.set('openai', openAiApiKey); }, [areApiKeysHydrated, openAiApiKey]);
  useEffect(() => { if (areApiKeysHydrated) apiKeyStorage.set('gemini', geminiApiKey); }, [areApiKeysHydrated, geminiApiKey]);
  useEffect(() => { if (areApiKeysHydrated) apiKeyStorage.set('mistral', mistralApiKey); }, [areApiKeysHydrated, mistralApiKey]);
  useEffect(() => { if (areApiKeysHydrated) apiKeyStorage.set('inworld', inworldApiKey); }, [areApiKeysHydrated, inworldApiKey]);

  useEffect(() => {
    if (!ready) return;
    
    console.log('[AskAmo] Starting initialization process...');
    setDownloadStatus('Initializing app...');
    
    void (async () => {
      const startTime = Date.now();
      const MIN_INIT_TIME = 3000; // 3 seconds minimum to show loading screen
      let errorCount = 0;
      
      try {
        console.log('[AskAmo] Step 1: Initializing knowledge store...');
        setDownloadStatus('Initializing knowledge store...');
        try {
          await knowledgeStoreService.init();
          console.log('[AskAmo] ✓ Knowledge store initialized');
        } catch (stepError) {
          errorCount++;
          console.error('[AskAmo] ✗ Knowledge store init failed:', stepError);
          setDownloadStatus(`Error ${errorCount}: Knowledge store failed`);
          throw new Error(`Knowledge store initialization failed: ${stepError instanceof Error ? stepError.message : 'Unknown error'}`);
        }
        
        console.log('[AskAmo] Step 2: Initializing workspace service...');
        setDownloadStatus('Initializing workspace...');
        try {
          await workspaceService.init();
          setCurrentWorkspace(workspaceService.getCurrentWorkspace());
          console.log('[AskAmo] ✓ Workspace service initialized');
        } catch (stepError) {
          errorCount++;
          console.error('[AskAmo] ✗ Workspace service init failed:', stepError);
          setDownloadStatus(`Error ${errorCount}: Workspace service failed`);
          throw new Error(`Workspace service initialization failed: ${stepError instanceof Error ? stepError.message : 'Unknown error'}`);
        }
        
        console.log('[AskAmo] Step 3: Bootstrapping brain...');
        setDownloadStatus('Bootstrapping brain knowledge...');
        try {
          await knowledgeBootstrapService.bootstrapAmoBrain();
          console.log('[AskAmo] ✓ Brain bootstrap completed');
        } catch (stepError) {
          errorCount++;
          console.error('[AskAmo] ✗ Brain bootstrap failed:', stepError);
          setDownloadStatus(`Error ${errorCount}: Brain bootstrap failed`);
          throw new Error(`Brain bootstrap failed: ${stepError instanceof Error ? stepError.message : 'Unknown error'}`);
        }
        
        console.log('[AskAmo] Step 4: Syncing uploaded documents...');
        setDownloadStatus('Syncing documents...');
        try {
          await syncUploadedDocsFromStorage();
          console.log('[AskAmo] ✓ Documents synced');
        } catch (stepError) {
          errorCount++;
          console.error('[AskAmo] ✗ Document sync failed:', stepError);
          console.warn('[AskAmo] Continuing without document sync...');
          setDownloadStatus(`Warning ${errorCount}: Document sync failed, continuing...`);
        }
        
        console.log('[AskAmo] Step 5: Refreshing brain state...');
        setDownloadStatus('Refreshing brain state...');
        try {
          await refreshBrainState();
          console.log('[AskAmo] ✓ Brain state refreshed');
        } catch (stepError) {
          errorCount++;
          console.error('[AskAmo] ✗ Brain state refresh failed:', stepError);
          setDownloadStatus(`Error ${errorCount}: Brain state refresh failed`);
          throw new Error(`Brain state refresh failed: ${stepError instanceof Error ? stepError.message : 'Unknown error'}`);
        }
        
         console.log('[AskAmo] Step 6: Initializing native TTS...');
         setDownloadStatus('Initializing voice synthesis...');
         try {
           await refreshNativeTtsStatus();
           console.log('[AskAmo] ✓ Native TTS initialized');
         } catch (stepError) {
           errorCount++;
           console.error('[AskAmo] ✗ Native TTS init failed:', stepError);
           console.warn('[AskAmo] Continuing without native TTS...');
           setDownloadStatus(`Warning ${errorCount}: Native voice synthesis unavailable, continuing...`);
         }
         
         // Initialize web-based SpeechT5 for browsers
         console.log('[AskAmo] Step 6b: Initializing web SpeechT5...');
         try {
           await speechT5Service.init();
           console.log('[AskAmo] ✓ Web SpeechT5 initialized');
         } catch (stepError) {
           console.warn('[AskAmo] Web SpeechT5 not available, TTS will be unavailable on browser:', stepError);
         }
        
        // Check if brain is still empty and force reinitialize
        const stats = await knowledgeStoreService.getBrainStats();
        console.info('[AskAmo] Brain stats after bootstrap:', stats);
        
        if (stats.documents === 0 && stats.chunks === 0 && stats.memoryNotes === 0) {
          console.warn('[AskAmo] Brain is still empty after bootstrap - forcing reinitialization');
          setDownloadStatus('Brain empty, reinitializing...');
          try {
            // Force clear and reinitialize
            await knowledgeBootstrapService.bootstrapAmoBrain();
            await refreshBrainState();
            console.info('[AskAmo] ✓ Brain rebootstrap complete');
            setDownloadStatus('Brain reinitialized successfully!');
          } catch (reinitError) {
            console.error('[AskAmo] Brain rebootstrap failed:', reinitError);
            setError('Brain initialization failed. Please restart the app.');
            setDownloadStatus('Brain initialization failed!');
          }
        } else {
          setDownloadStatus('Ready! Brain loaded with knowledge.');
        }
        
        console.log('[AskAmo] ✓ Initialization complete!');
      } catch (e) {
        console.error('[AskAmo] Initialization failed:', e);
        setError(`Initialization failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
        setDownloadStatus('Initialization failed!');
      } finally {
        // Ensure minimum initialization time for better UX
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_INIT_TIME - elapsed);
        
        if (remainingTime > 0) {
          console.log(`[AskAmo] Waiting ${remainingTime}ms to complete minimum init time...`);
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
        
        console.log('[AskAmo] Setting initializing to false...');
        setIsInitializing(false);
      }
    })();
  }, [ready]);

  // Toast service subscription and guide initialization
  useEffect(() => {
    const unsubscribe = toastService.subscribe((toasts) => {
      setToasts(toasts);
    });

    // Initialize toast guides after a short delay
    const initTimer = setTimeout(() => {
      // Show welcome guide for new users
      toastGuideService.showWelcomeGuide();
      
      // Show navigation tips
      setTimeout(() => {
        toastGuideService.showNavigationTips();
      }, 3000);
    }, 2000);

    return () => {
      unsubscribe();
      clearTimeout(initTimer);
    };
  }, []);

  // Track view changes for contextual guides
  useEffect(() => {
    toastGuideService.trackViewNavigation(activeView);
  }, [activeView]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    const handleAppStateChange = async (state: { isActive: boolean }) => {
      if (!state.isActive) {
        console.log('[AppState] App going to background');
      } else {
        console.log('[AppState] App resumed - quick refresh');
        await refreshBrainState();
      }
    };

    CapacitorApp.addListener('appStateChange', handleAppStateChange).catch(console.error);

    return () => {
      CapacitorApp.removeAllListeners().catch(console.error);
    };
  }, []);

  const refreshNativeOfflineStatus = async () => {
    try {
      if (nativeOfflineLlmService.isAvailable()) {
        const status = await nativeOfflineLlmService.getStatus();
        console.log('[App] Native status refreshed:', JSON.stringify({
          runtimeReady: status?.runtimeReady,
          modelLoaded: status?.modelLoaded,
          activeModel: status?.activeModel?.relativePath || null,
          availableModels: status?.availableModels?.map(m => m.relativePath) || [],
        }));
        setNativeOfflineStatus(status);
      }
    } catch (e) {
      console.error('[App] refreshNativeOfflineStatus failed:', e);
    }
  };

   const refreshNativeDownloadAuthStatus = async () => {
     if (!nativeOfflineLlmService.isAvailable()) return;
     setNativeDownloadAuthStatus(await nativeOfflineLlmService.getDownloadAuthStatus());
   };

   const refreshNativeTtsStatus = async () => {
     try {
       if (nativeTtsService.isAvailable()) {
         const status = await nativeTtsService.getStatus();
         console.log('[App] Native TTS status refreshed:', JSON.stringify({
           ready: status?.ready,
           language: status?.language,
           voiceName: status?.voiceName,
           availableVoices: status?.availableVoices?.length || 0,
           message: status?.message,
         }));
         setNativeTtsStatus(status);
       }
     } catch (e) {
       console.error('[App] refreshNativeTtsStatus failed:', e);
     }
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
        setDownloadStatus('Native model selected.');
      } else {
        // Cloud models - just switch (no download needed for API-based)
        setDownloadStatus('Cloud model selected.');
      }
    } catch (e: any) {
      setError(getErrorMessage(e, 'Failed to prepare model'));
      setDownloadStatus('');
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

  const handleResetBrain = async () => {
    try {
      setDownloadStatus('Resetting brain...');
      console.log('[ResetBrain] Starting brain reset...');
      
      // Force rebootstrap
      await knowledgeBootstrapService.bootstrapAmoBrain();
      await refreshBrainState();
      
      setDownloadStatus('Brain reset complete!');
      console.log('[ResetBrain] Brain reset completed');
    } catch (e: any) {
      console.error('[ResetBrain] Brain reset failed:', e);
      setError(`Brain reset failed: ${e.message}`);
      setDownloadStatus('Brain reset failed.');
    }
  };

  const handleOpenInChrome = async () => {
    try {
      // Build the URL based on current platform
      let url: string;
      
      if (Capacitor.getPlatform() === 'android') {
        // On Android, try to get the actual device hostname from window.location if available
        // If running on Capacitor, the app is served locally
        // Attempt to open current location or localhost:8080 as fallback
        const currentHost = window.location.hostname;
        const currentPort = window.location.port || '8080';
        
        // If we have a valid host, use it
        if (currentHost && currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
          url = `http://${currentHost}:${currentPort}${window.location.pathname}`;
        } else {
          // Fallback to localhost:8080 for Capacitor's web asset serving
          url = 'http://localhost:8080';
        }
      } else {
        // On web, use the current URL
        url = window.location.href;
      }
      
      console.log('[App] Opening in Chrome:', url);
      await Browser.open({ url, windowName: '_blank' });
    } catch (error) {
      console.error('Failed to open in Chrome:', error);
      setError('Failed to open in Chrome browser.');
    }
  };

  const handleExportHistory = () => {
    const data = JSON.stringify(chats, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amo-chat-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Toast handlers
  const handleToastClose = (id: string) => {
    toastService.remove(id);
  };

  const handleToastSpeechToggle = (id: string, enabled: boolean) => {
    toastService.toggleSpeech(id, enabled);
  };

  const handleExportBrain = async () => {
    try {
      setDownloadStatus('Exporting brain data...');
      const backup = await knowledgeStoreService.exportBrain();
      const filename = `amo-brain-backup-${new Date().toISOString().split('T')[0]}.json`;
      const content = JSON.stringify(backup, null, 2);
      
      if (Capacitor.isNativePlatform() && currentWorkspace) {
        // Save to workspace directory
        const fullPath = await workspaceService.saveToWorkspace(filename, content);
        setDownloadStatus(`Brain exported to: ${fullPath}`);
      } else {
        // Browser fallback - download
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setDownloadStatus('Brain exported successfully!');
      }
    } catch (error) {
      console.error('Failed to export brain:', error);
      setDownloadStatus('Failed to export brain data.');
    }
  };

  const handleImportBrain = async (file: File) => {
    try {
      setDownloadStatus('Importing brain data...');
      const text = await file.text();
      const backup = JSON.parse(text);
      
      // Validate backup format
      if (!backup.version || !backup.data) {
        throw new Error('Invalid backup format');
      }
      
      await knowledgeStoreService.importBrain(backup, 'merge');
      await refreshBrainState();
      setDownloadStatus('Brain imported successfully!');
    } catch (error) {
      console.error('Failed to import brain:', error);
      setDownloadStatus('Failed to import brain data.');
    }
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isSavingBeforeReset, setIsSavingBeforeReset] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  const handleRestoreDefaultBrain = async () => {
    setShowResetConfirm(true);
  };

  const handleConfirmReset = async (saveFirst: boolean) => {
    setShowResetConfirm(false);
    
    try {
      if (saveFirst) {
        setIsSavingBeforeReset(true);
        setDownloadStatus('Saving brain before reset...');
        await handleExportBrain();
        setIsSavingBeforeReset(false);
      }
      
      setDownloadStatus('Resetting brain...');
      console.log('[ResetBrain] Starting...');
      
      const appScope = 'app:ask-amo';
      
      // Clear all brain data first
      console.log('[ResetBrain] Clearing existing data...');
      await amoBrainService.clearMemoryNotes(appScope);
      await amoBrainService.clearSummaries(appScope);
      
      // Load and use the default backup
      const { getDefaultBrainBackup } = await import('./data/brain-backups');
      const defaultBackup = getDefaultBrainBackup();
      
      console.log('[ResetBrain] Adding memory entries...');
      // Add all memory from backup using remember method
      for (const memory of defaultBackup.data.conversationMemory) {
        await amoBrainService.remember(
          appScope,
          'Memory',
          memory.content,
          [],
          5
        );
      }
      
      console.log('[ResetBrain] Adding summaries...');
      // Add all summaries from backup using summarize method
      for (const summary of defaultBackup.data.memorySummaries) {
        await amoBrainService.summarize(
          appScope,
          'brain-reset',
          summary.id,
          summary.summary,
          []
        );
      }
      
      console.log('[ResetBrain] Refreshing brain state...');
      await refreshBrainState();
      
      // Check final counts
      const finalMemory = await amoBrainService.getConversationMemory(appScope);
      const finalSummaries = await amoBrainService.getMemorySummaries(appScope);
      const finalPacks = await amoBrainService.getSeedPacks();
      
      console.log('[ResetBrain] Final counts:', {
        memory: finalMemory.length,
        summaries: finalSummaries.length,
        packs: finalPacks.length
      });
      
      setDownloadStatus('Brain reset successfully!');
      setAreStarterPacksImported(true);
      localStorage.setItem('amo_starter_packs_imported', 'true');
    } catch (error) {
      console.error('Failed to reset brain:', error);
      setDownloadStatus('Failed to reset brain.');
    }
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
    if (webViewUrl && !webViewUrl.startsWith('amo://')) {
      const { webBrowserService } = await import('./services/webBrowserService');
      const success = await webBrowserService.saveToKnowledge(webViewUrl);
      setDownloadStatus(success ? 'Page saved to your knowledge brain.' : 'Failed to save the page.');
      await syncUploadedDocsFromStorage();
    } else {
      setDownloadStatus('No web page is currently loaded to save.');
    }
  };

  const handleRunQuickCommand = async (cmd: string, switchToTerminal = true) => {
    if (switchToTerminal) {
      setActiveView('ide');
      setActiveIdeTab('terminal');
    }
    setInput(cmd);
    inputRef.current = cmd;
    // Add a small delay to ensure the input is set before sending
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  const refreshBrainState = async () => {
    try {
      const chatScope = `chat:${currentChatId}`;
      const appScope = 'app:ask-amo';

      console.info('[BrainState] Refreshing for scopes:', chatScope, appScope);

      const [
        chatMemoryRows,
        appMemoryRows,
        chatSummaryRows,
        appSummaryRows,
        tools,
        packs,
      ] = await Promise.all([
        amoBrainService.getConversationMemory(chatScope),
        amoBrainService.getConversationMemory(appScope),
        amoBrainService.getMemorySummaries(chatScope),
        amoBrainService.getMemorySummaries(appScope),
        amoBrainService.getToolRegistry(),
        amoBrainService.getSeedPacks(),
      ]);

      console.info('[BrainState] Chat memory:', chatMemoryRows.length, 'App memory:', appMemoryRows.length);

      const allMemory = [...chatMemoryRows, ...appMemoryRows]
        .filter((row, idx, arr) => arr.findIndex(r => r.id === row.id) === idx);

      const allSummaries = [...chatSummaryRows, ...appSummaryRows]
        .filter((row, idx, arr) => arr.findIndex(r => r.id === row.id) === idx);

      console.info('[BrainState] Total memory rows:', allMemory.length);

      setBrainMemoryRows(allMemory);
      setBrainSummaryRows(allSummaries);
      setToolRegistryRows(tools);
      setSeedPackRows(packs);
      if (packs.length > 0) {
        setAreStarterPacksImported(true);
      } else if (allMemory.length === 0 && allSummaries.length === 0) {
        // Brain is completely empty, reset the flag
        setAreStarterPacksImported(false);
        localStorage.removeItem('amo_starter_packs_imported');
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

  const hasGroqApiKey = Boolean(groqApiKey || import.meta.env.VITE_GROQ_API_KEY);
  const hasGeminiApiKey = Boolean(geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY);
  const hasOpenAiApiKey = Boolean(openAiApiKey || import.meta.env.VITE_OPENAI_API_KEY);
  const hasOpenRouterApiKey = Boolean(openRouterApiKey || import.meta.env.VITE_OPENROUTER_API_KEY);
  const hasMistralApiKey = Boolean(mistralApiKey || import.meta.env.VITE_MISTRAL_API_KEY);
  const hasInworldApiKey = Boolean(inworldApiKey || import.meta.env.VITE_INWORLD_API_KEY);

  const [selectedModel, setSelectedModel] = useState<ModelConfig>(() => {
    const savedModelId = localStorage.getItem('amo_selected_model_id');
    if (savedModelId) {
      const savedModel = AVAILABLE_MODELS.find((model) => model.id === savedModelId);
      if (savedModel) return savedModel;
    }

    return getDefaultModelSelection();
  });

  const isNativeOfflineAvailable = nativeOfflineLlmService.isAvailable();
  const localRuntimeState = resolveLocalRuntimeState({
    isNativeOfflineAvailable, 
    nativeOfflineStatus,
    loadedModelId,
    selectedModel
  });

  const isSelectedModelReady = selectedModel.isCloud 
    ? hasCloudProviderKey(selectedModel.family, { hasGroqApiKey, hasGeminiApiKey, hasOpenAiApiKey, hasOpenRouterApiKey, hasMistralApiKey })
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

  // Auto-initialize native runtime when native model is selected
  useEffect(() => {
    if (selectedModel.family !== 'native') return;
    if (!nativeOfflineLlmService.isAvailable()) return;
    
    let cancelled = false;
    (async () => {
      try {
        console.log('[App] Auto-initializing native runtime for selected native model...');
        const status = await nativeOfflineLlmService.getStatus();
        if (cancelled) return;
        
        console.log('[App] Native init status:', JSON.stringify({
          runtimeReady: status?.runtimeReady,
          modelLoaded: status?.modelLoaded,
          activeModel: status?.activeModel?.relativePath || null,
          availableCount: status?.availableModels?.length || 0,
        }));
        
        setNativeOfflineStatus(status);
        
        if (!status?.runtimeReady) {
          console.log('[App] Runtime not ready, preparing...');
          await nativeOfflineLlmService.prepareRuntime();
          if (cancelled) return;
        }
        
        // Refresh status after preparation
        const freshStatus = await nativeOfflineLlmService.getStatus();
        if (cancelled) return;
        setNativeOfflineStatus(freshStatus);
        
        // If model not loaded but available, try to load it
        if (freshStatus && !freshStatus.modelLoaded && freshStatus.availableModels?.length > 0) {
          const preferred = freshStatus.activeModel || freshStatus.availableModels[0];
          console.log('[App] Loading native model:', preferred.relativePath);
          try {
            const loadResult = await nativeOfflineLlmService.loadModel({ relativePath: preferred.relativePath });
            if (cancelled) return;
            if (loadResult?.status) {
              setNativeOfflineStatus(loadResult.status);
              setLoadedModelId('amo-native-offline');
              console.log('[App] Native model loaded successfully');
            }
          } catch (loadErr) {
            console.error('[App] Failed to auto-load native model:', loadErr);
          }
        } else if (freshStatus?.modelLoaded) {
          setLoadedModelId('amo-native-offline');
          console.log('[App] Native model already loaded');
        }
      } catch (e) {
        console.error('[App] Native auto-init failed:', e);
      }
    })();
    
    return () => { cancelled = true; };
  }, [selectedModel.family]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    void refreshNativeDownloadAuthStatus();
  }, [isSettingsOpen]);

  const persistExchangeToBrain = async (userContent: string, assistantContent: string): Promise<void> => {
    const scope = `chat:${currentChatId}`;
    const appScope = 'app:ask-amo';
    const title = trimForNativePrompt(userContent.replace(/\s+/g, ' ').trim(), 72) || 'Chat exchange';
    const summary = buildConversationSummary(userContent, assistantContent);
    const isCloudModel = selectedModel.family !== 'native';

    try {
      await Promise.all([
        amoBrainService.remember(scope, title, summary, ['chat', 'exchange', isCloudModel ? 'cloud-response' : 'local-response'], 1),
        amoBrainService.remember(appScope, title, summary, ['app', 'exchange', 'ask-amo', isCloudModel ? 'cloud-response' : 'local-response'], 1),
        amoBrainService.summarize(scope, 'conversation', currentChatId, summary, ['chat', 'amo', 'exchange']),
        amoBrainService.summarize(appScope, 'conversation', currentChatId, summary, ['app', 'amo', 'exchange']),
      ]);

      void brainLearningService.analyseAndLearn(userContent, assistantContent, currentChatId);

      // Auto-learn vocabulary from chat exchange
      const combinedText = `${userContent} ${assistantContent}`;
      const newTerms = autoLearningService.getNewTermsCount(combinedText);
      if (newTerms > 0) {
        void autoLearningService.learnFromChat(combinedText, currentChatId);
      }

      // Record cloud responses for local model learning
      if (isCloudModel && assistantContent.length > 50) {
        void recordCloudResponseForLocalLearning(userContent, assistantContent);
      }

      await refreshBrainState();
    } catch (brainError) {
      console.error('[AskAmo] Failed to persist exchange to brain:', brainError);
      setDownloadStatus(`Brain write failed: ${brainError instanceof Error ? brainError.message : 'unknown error'}`);
    }
  };

  // Store successful cloud responses as reference examples for local models
  const recordCloudResponseForLocalLearning = async (question: string, answer: string): Promise<void> => {
    try {
      const questionKey = question.toLowerCase().replace(/[^\w\s]/g, ' ').trim().slice(0, 100);
      await knowledgeStoreService.upsertChunk({
        id: `cloud-ref-${Date.now()}`,
        documentId: 'cloud-reference-responses',
        documentName: 'Cloud Model Reference',
        content: `Q: ${question}\nA: ${answer}`,
        embedding: new Array(384).fill(0), // Placeholder — vectorDbService.generateEmbedding used elsewhere
        metadata: {
          assetKind: 'cloud-reference',
          questionKey,
          answerLength: answer.length,
          timestamp: Date.now(),
        },
      });
    } catch (err) {
      // Non-critical — don't block the user
      console.debug('[AskAmo] Cloud reference recording skipped:', err);
    }
  };

  const resolveOfflineCommandReply = async (command: string, userInput?: string): Promise<string | null> => {
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
        try {
          await knowledgeStoreService.init();
          const memories = await knowledgeStoreService.listConversationMemory('app:ask-amo');
          const summaries = await knowledgeStoreService.listMemorySummaries('app:ask-amo');
          const seedPacks = await knowledgeStoreService.listSeedPacks();
          return `Brain status: ${memories.length} memory entries, ${summaries.length} summaries, ${seedPacks.length} seed packs loaded.`;
        } catch (e) {
          console.error('[AskAmo] Failed to get brain status:', e);
          return `Brain bootstrap v3 complete. Memory and knowledge layers are seeded.`;
        }
      }
      case 'learn this': {
        const content = userInput?.replace(/^learn this:?\s*/i, '').trim();
        if (content) {
          await amoBrainService.learnFact(content.slice(0, 50), content, ['user-taught']);
          return `Got it. I've stored that permanently.`;
        }
        return 'What do you want me to learn? Say "learn this: [the thing]"';
      }
      case 'forget this': {
        const topic = userInput?.replace(/^forget (this|about)?:?\s*/i, '').trim();
        if (topic) {
          await amoBrainService.forgetFact(topic);
          return `Removed anything I had about "${topic}".`;
        }
        return null;
      }
      case 'what do you know about': {
        const topic = userInput?.replace(/^what do you know about:?\s*/i, '').trim();
        if (topic) {
          const memories = await amoBrainService.getConversationMemory('app:ask-amo');
          const relevant = memories.filter(m => {
            const hay = `${m.title} ${m.content}`.toLowerCase();
            return topic.toLowerCase().split(' ').some((word: string) => word.length > 3 && hay.includes(word));
          });
          if (relevant.length === 0) return `I don't have anything stored about "${topic}" yet.`;
          return `I know ${relevant.length} thing${relevant.length === 1 ? '' : 's'} about "${topic}":\n\n${relevant.map(m => `- ${m.title}: ${m.content.slice(0, 100)}`).join('\n')}`;
        }
        return null;
      }
      case 'upgrade brain': {
        const { webAssistService } = await import('./services/webAssistService');
        const weakTopics = ['NZ current events', 'latest technology news', 'Aotearoa news'];
        let learned = 0;
        for (const topic of weakTopics) {
          try {
            const content = await webAssistService.resolve(topic);
            if (content) {
              await amoBrainService.learnFact(topic, content.slice(0, 800), ['web-upgrade', 'news']);
              learned++;
            }
          } catch {}
        }
        return `Brain upgraded. Fetched and stored ${learned} topic${learned === 1 ? '' : 's'}.`;
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

      const handleUseCodeInEditor = (code: string) => {
        // Switch to IDE view and editor tab
        setActiveView('ide');
        setActiveIdeTab('editor');
        // Small delay to ensure view switch completes
        setTimeout(() => {
          // Use the existing pendingEditorCode mechanism
          setPendingEditorCode({
            code: code,
            filename: `generated_${Date.now()}.txt`,
            autoRun: false,
            token: crypto.randomUUID()
          });
        }, 300);
      };

  const resolveWebAssistContext = async (userPrompt: string): Promise<string | undefined> => {
    const isNativeModel = selectedModel.family === 'native';
    
    // Cloud models: search when query looks like it needs web info
    // Native/offline models: only search when toggle is ON and query matches
    let shouldSearch: boolean;
    if (!navigator.onLine) {
      shouldSearch = false;
    } else if (isNativeModel) {
      // Native model: requires toggle ON and matching query
      shouldSearch = isWebSearchEnabled && shouldUseWebSearch(userPrompt);
    } else {
      // Cloud model: search when query appears to need current info
      // Skip search for simple greetings, math, opinions, etc.
      shouldSearch = shouldUseWebSearch(userPrompt);
    }
    
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

  // ── CODE TO EDITOR ────────────────────────────────────────────────────────────
  // Auto-save substantial code blocks to the editor instead of cluttering chat
  
  const wantsCodeInChat = (userInput: string): boolean => {
    const normalized = userInput.toLowerCase();
    return /\b(show me the code|code in chat|code here|give me the code|write the code here|display the code|print the code|inline code)\b/.test(normalized);
  };

  const extractLanguage = (langHint: string): string => {
    const langMap: Record<string, string> = {
      'js': 'javascript', 'javascript': 'javascript',
      'ts': 'typescript', 'typescript': 'typescript',
      'py': 'python', 'python': 'python',
      'rb': 'ruby', 'ruby': 'ruby',
      'go': 'go', 'golang': 'go',
      'rs': 'rust', 'rust': 'rust',
      'java': 'java',
      'kt': 'kotlin', 'kotlin': 'kotlin',
      'cpp': 'cpp', 'c++': 'cpp', 'c': 'c',
      'cs': 'csharp', 'csharp': 'csharp',
      'php': 'php',
      'swift': 'swift',
      'dart': 'dart',
      'lua': 'lua',
      'sh': 'shell', 'bash': 'shell', 'shell': 'shell',
      'sql': 'sql',
      'html': 'html', 'htm': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown', 'markdown': 'markdown',
    };
    return langMap[langHint.toLowerCase()] || langHint || 'unknown';
  };

  const getExtensionForLanguage = (lang: string): string => {
    const extMap: Record<string, string> = {
      'javascript': '.js', 'typescript': '.ts', 'python': '.py',
      'ruby': '.rb', 'go': '.go', 'rust': '.rs', 'java': '.java',
      'kotlin': '.kt', 'cpp': '.cpp', 'c': '.c', 'csharp': '.cs',
      'php': '.php', 'swift': '.swift', 'dart': '.dart', 'lua': '.lua',
      'shell': '.sh', 'sql': '.sql', 'html': '.html', 'css': '.css',
      'json': '.json', 'markdown': '.md',
    };
    return extMap[lang] || '.txt';
  };

  const processCodeBlocks = async (response: string, userPrompt: string): Promise<{ text: string; saved: boolean }> => {
    // Match code blocks: ```language\n...code...\n``` or ```language code ``` (flexible)
    const codeBlockRegex = /```(\w*)\s*\n?([\s\S]*?)```/g;
    const matches = [...response.matchAll(codeBlockRegex)];

    if (matches.length === 0) {
      return { text: response, saved: false };
    }

    let modifiedResponse = response;
    let savedCount = 0;

    for (const match of matches) {
      const [fullMatch, langHint, code] = match;
      const trimmedCode = code.trim();
      const lines = trimmedCode.split('\n');

      // Save ALL code blocks with 2+ lines
      if (lines.length < 2) {
        continue;
      }

      const language = extractLanguage(langHint);
      const extension = getExtensionForLanguage(language);
      const filename = `amo-generated-${Date.now()}-${savedCount}${extension}`;

      try {
        await openCodeInEditor(trimmedCode, filename);
        savedCount++;

        // Always replace with a reference — user can switch to editor to see it
        const replacement = `[Code saved to \`${filename}\` — switch to Code Editor to view and edit]`;
        modifiedResponse = modifiedResponse.replace(fullMatch, replacement);
      } catch (err) {
        console.error('[AskAmo] Failed to save code to editor:', err);
      }
    }

    if (savedCount > 0) {
      modifiedResponse += `\n\nSaved ${savedCount} code block${savedCount > 1 ? 's' : ''} to Code Editor.`;
    }

    return { text: modifiedResponse, saved: savedCount > 0 };
  };

  const openCodeInEditor = useCallback(async (code: string, filename: string, autoRun = false, autoPreview = false) => {
    const normalizedFileName = filename.trim() || `amo-generated-${Date.now()}.txt`;
    const normalizedCode = code ?? '';

    try {
      await workspaceService.saveToWorkspace(normalizedFileName, normalizedCode);
      setFileRefreshKey(k => k + 1);
      
      // Auto-learn vocabulary from code file
      void autoLearningService.learnFromFileEdit(normalizedCode, normalizedFileName);
    } catch (error) {
      console.warn('[AskAmo] Failed to persist editor code to workspace:', error);
    }

    setPendingEditorCode({
      code: normalizedCode,
      filename: normalizedFileName,
      autoRun,
      autoPreview,
      token: crypto.randomUUID(),
    });
    setActiveView('ide');
    setActiveIdeTab('editor');
  }, []);

   const handleSend = async () => {
      if (!inputRef.current.trim() || isLoading) return;
      
      // Cancel any ongoing speech when user sends a new message
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      
      const routedIntent = routeUserIntent(inputRef.current);
     let userPrompt = routedIntent.canonicalInput || inputRef.current;
     
     // Inject @file and @workspace context
     if (userPrompt.includes('@file:') || userPrompt.includes('@workspace')) {
       const contextResult = await injectFileContext(userPrompt, currentChatId || 'default');
       userPrompt = contextResult.enhancedPrompt;
     }
       
        const pendingImage = selectedImage;
          
        // Auto-switch to vision model if image is attached and current model doesn't support vision
        let runtimeModel = selectedModel;
        if (pendingImage && !selectedModel.isVision) {
          // Prefer cloud vision models
          const geminiVision = AVAILABLE_MODELS.find(m => m.isVision && m.family === 'gemini');
          const cloudVision = AVAILABLE_MODELS.find(m => m.isVision && m.isCloud);
          const visionModel = geminiVision || cloudVision;
          if (visionModel) {
            runtimeModel = visionModel;
            setSelectedModel(visionModel);
          }
        }
        
         // For native vision models, embed image in prompt (llama.cpp vision format)
         let visionPromptSuffix = '';
         if (pendingImage && runtimeModel.isVision && runtimeModel.family === 'native') {
           visionPromptSuffix = `\n\n<image>${pendingImage}</image>`;
         }
     
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
      const offlineReply = await resolveOfflineCommandReply(routedIntent.offlineCommand, userPrompt);
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

       // IDE tasks — Amo actually executes, not just opens
       if (isIdeIntent(userPrompt)) {
        toastService.add('Amo Working', 'Executing your request...', { 
          type: 'info', 
          duration: 3000,
          category: 'workflow'
        });
        const slots = extractSlots(userPrompt);
        const enrichedQuery = slotsToKnowledgeQuery(slots);
        const promptHint = slotsToPromptHint(slots);

        addMessage('user', userPrompt, pendingImage || undefined);
        const assistantId = addStreamingMessage('assistant');
        activeAssistantMessageIdRef.current = assistantId;

        updateMessage(assistantId, '_Working on it..._', true);

        const toolResult = await amoToolCoordinator.handle(
          slots, userPrompt, currentChatId,
          { isOnline: navigator.onLine, isWebSearchEnabled, currentWebViewUrl: webViewUrl }
        );

        if (toolResult.viewSwitch) setActiveView(toolResult.viewSwitch as AmoView);
        if (toolResult.webViewUrl) setWebViewUrl(toolResult.webViewUrl);

        // Always run IDE loop for agentic execution — don't just give advice
        // The coordinator's instantReply is passed as context, not a substitute for action

        const history = messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
        const bundle = await assistantRuntimeService.buildContextBundle({
          scope: `chat:${currentChatId}`,
          userInput: enrichedQuery,
          messages: history,
          includeKnowledge: true,
          webContext: undefined,
        }).catch(() => ({ combinedContext: '', knowledgeContext: '', memoryContext: '', webContext: '', intent: 'task', recentTurns: '' }));

        bundle.combinedContext = [promptHint, toolResult.contextBlock, bundle.combinedContext].filter(Boolean).join('\n\n');

         const template = matchTaskTemplate(userPrompt);
        const taskInput = template ? `${userPrompt}\n\nPlan:\n${template}` : userPrompt;

         const generateFn = async (msgs: Array<{role: string; content: string}>, systemPrompt: string): Promise<string> => {
           if (selectedModel.isCloud) {
             let result = '';
             const handler = (t: string) => { result = t; };
             
              switch (selectedModel.family) {
                case 'groq':
                  result = await groqService.generate(selectedModel.id, msgs as any, 'Amo', handler, systemPrompt, { deepThink: isDeepThinkEnabled, webContext: bundle.webContext });
                  break;
                case 'openai':
                  result = await openaiService.generate(selectedModel.id, msgs as any, 'Amo', handler, systemPrompt, { deepThink: isDeepThinkEnabled, webContext: bundle.webContext });
                  break;
                case 'gemini':
                  result = await geminiService.generate(selectedModel.id, msgs as any, 'Amo', handler, systemPrompt, { deepThink: isDeepThinkEnabled, webContext: bundle.webContext });
                  break;
                case 'openrouter':
                  result = await openrouterService.generate(selectedModel.id, msgs as any, 'Amo', handler, systemPrompt, { deepThink: isDeepThinkEnabled, webContext: bundle.webContext });
                  break;
                case 'mistral':
                  result = await mistralService.generate(selectedModel.id, msgs as any, 'Amo', handler, systemPrompt, { deepThink: isDeepThinkEnabled, webContext: bundle.webContext });
                  break;
                case 'inworld':
                  result = await inworldService.generate(selectedModel.id, msgs as any, 'Amo', handler, systemPrompt, { webContext: bundle.webContext });
                  break;
                default:
                  throw new Error(`Unsupported cloud model family: ${selectedModel.family}`);
              }
             return result;
           }
           
            // Native offline model (llama.cpp via Android JNI) - now using IDE loop for tool usage
            const params = useModelSettingsStore.getState();
            
            // Use the same IDE loop as cloud models for consistent tool usage
            const loopResult = await runIdeLoop({
              chatId: currentChatId,
              userInput: taskInput,
              baseContext: bundle.combinedContext,
              isRequestCanceled: () => isRequestCanceled(requestId),
              onPartialReply: (text) => { if (!isRequestCanceled(requestId)) updateMessage(assistantId, text, false); },
              onStatus: (s) => { console.info('[IDE]', s); },
              onViewSwitch: (v) => setActiveView(v as AmoView),
              onWebViewUrl: (url) => setWebViewUrl(url),
              onPreviewFile: (path, content) => {
                const filename = path.split('/').pop() || 'file.txt';
                const isPreviewable = /\.(html?|css|js|ts|jsx|tsx)$/i.test(filename);
                void openCodeInEditor(content, filename, false, isPreviewable);
              },
              generate: generateFn,
            });
            
            if (!isRequestCanceled(requestId)) {
              updateMessage(assistantId, loopResult.finalReply, false);
              finalizeMessage(assistantId);
              await persistExchangeToBrain(userPrompt, loopResult.finalReply);
              if (isVoiceModeRef.current) void speak(loopResult.finalReply);
            }
            
            return loopResult.finalReply || '';
         };

        const loopResult = await runIdeLoop({
          chatId: currentChatId,
          userInput: taskInput,
          baseContext: bundle.combinedContext,
          isRequestCanceled: () => isRequestCanceled(requestId),
          onPartialReply: (text) => { if (!isRequestCanceled(requestId)) updateMessage(assistantId, text, false); },
          onStatus: (s) => { console.info('[IDE]', s); },
          onViewSwitch: (v) => setActiveView(v as AmoView),
          onWebViewUrl: (url) => setWebViewUrl(url),
          onPreviewFile: (path, content) => {
            void openCodeInEditor(content, path.split('/').pop() || 'file.txt');
          },
          generate: generateFn,
        });

        if (!isRequestCanceled(requestId)) {
          updateMessage(assistantId, loopResult.finalReply, false);
          finalizeMessage(assistantId);
          await persistExchangeToBrain(userPrompt, loopResult.finalReply);
          if (isVoiceModeRef.current) void speak(loopResult.finalReply);
          
          // Show completion toast
          const filesCount = loopResult.filesCreated?.length || 0;
          const commandsCount = loopResult.commandsRun?.length || 0;
          if (filesCount > 0 || commandsCount > 0) {
            toastService.add('Task Complete', 
              `Created ${filesCount} file(s), ran ${commandsCount} command(s)`, 
              { type: 'success', duration: 4000, category: 'workflow' }
            );
          }
        }
        setIsLoading(false);
        setAmoRuntimeState('waiting');
        return;
      }

        // Check for deterministic replies first to avoid unnecessary processing
      const deterministic = buildDeterministicReply(userPrompt);
      if (deterministic !== null) {
        addMessage('user', userPrompt, pendingImage || undefined);
        const assistantId = addStreamingMessage('assistant');
        activeAssistantMessageIdRef.current = assistantId;
        
        let fullReply = deterministic.reply;
        
        // Generate sentences via sentence builder if requested
        if (deterministic.useSentenceBuilder && deterministic.sentenceIntent) {
          try {
            const sentences = await sentenceBuilderService.generateSentence({
              intent: deterministic.sentenceIntent,
              style: 'casual',
              complexity: 'moderate',
            });
            const altSentences = sentences.alternatives || [];
            const allSentences = [sentences.text, ...altSentences.slice(0, 2)].filter(Boolean);
            const sentenceList = allSentences.map((s, i) => `${i + 1}. ${s}`).join('\n');
            fullReply += `\n\n${sentenceList}`;
          } catch (err) {
            console.error('[App] Sentence builder error:', err);
          }
        }
        
        // Include follow-up question if available
        if (deterministic.followUp) {
          fullReply += `\n\n${deterministic.followUp}`;
        }
        
        updateMessage(assistantId, fullReply, false);
        finalizeMessage(assistantId);
        await persistExchangeToBrain(userPrompt, fullReply);
        if (isVoiceModeRef.current) speak(fullReply);

        // Execute instant actions
        if (deterministic.actions) {
          for (const action of deterministic.actions) {
            switch (action) {
              case 'switch_to_terminal': setActiveView('ide'); setActiveIdeTab('terminal'); break;
              case 'switch_to_editor': setActiveView('ide'); setActiveIdeTab('editor'); break;
              case 'switch_to_webview': setActiveView('web'); break;
              case 'switch_to_vocabulary': setActiveView('learn'); setActiveLearnTab('vocabulary'); break;
              case 'switch_to_sentence_builder': setActiveView('learn'); setActiveLearnTab('sentences'); break;
              case 'switch_to_intent_enhancer': setActiveView('learn'); setActiveLearnTab('intent'); break;
              case 'switch_to_settings': setActiveView('settings'); break;
              case 'list_files': setActiveView('ide'); setActiveIdeTab('files'); break;
              case 'show_brain_status': handleRunQuickCommand('show brain status'); break;
              case 'enable_voice': setIsVoiceMode(true); break;
              case 'clear_chat': clearChat(); break;
            }
          }
        }

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
           ? await assistantRuntimeService.buildNativeContextBundle({ scope: `chat:${currentChatId}`, userInput: userPrompt, messages: history, webContext: webSearchContext, forceRetrieval: routedIntent.forceRetrieval })
           : await assistantRuntimeService.buildContextBundle({ scope: `chat:${currentChatId}`, userInput: userPrompt, messages: history, includeKnowledge: true, webContext: webSearchContext, forceRetrieval: routedIntent.forceRetrieval });

         const nativeSelected = selectedModel.family === 'native';
          if (nativeSelected && localRuntimeState.capability !== 'ready') {
            try {
              await ensureNativeOfflineReady();
            } catch (nativeError: any) {
              setError(getErrorMessage(nativeError, 'Select or download a GGUF before using the native runtime.'));
              return;
            }
          }

          // Check if model is ready - cloud needs API key, native needs runtime ready
          if (!nativeSelected && !isSelectedModelReady) {
            setError('The configured cloud model is not ready. Add an API key or select a different model.');
            return;
          }

          let reply = '';
           if (runtimeModel.isCloud) {
             // Build cloud messages with vision support
             const userMessage: any = { role: 'user' as const, content: userPrompt };
             if (pendingImage && runtimeModel.isVision) {
               userMessage.image = pendingImage;
             }
              const cloudMessages = [...history, userMessage];
              
              // Streaming speech: speak sentences as they complete
              let speechBuffer = '';
              let lastSpokenLength = 0;
              
              const handleCloudUpdate = (text: string) => {
                if (isRequestCanceled(requestId)) return;
                updateMessage(assistantId, text, true);
                
                // Streaming speech - speak complete sentences as they arrive
                if (isVoiceModeRef.current && text.length > lastSpokenLength) {
                  const newText = text.slice(lastSpokenLength);
                  speechBuffer += newText;
                  lastSpokenLength = text.length;
                  
                  // Clean speech buffer of code and symbols before speaking
                  const cleanedBuffer = speechBuffer
                    .replace(/```[\s\S]*?```/g, '')  // Code blocks - skip entirely
                    .replace(/`[^`]+`/g, '')  // Inline code - skip
                    .replace(/\*\*([^*]+)\*\*/g, '$1')  // Bold
                    .replace(/\*([^*]+)\*/g, '$1')  // Italic
                    .replace(/#{1,6}\s*/g, '')  // Headers
                    .replace(/^[-•*]\s*/gm, '')  // List markers
                    .replace(/^\d+\.\s*/gm, '')  // Numbered lists
                    .replace(/\|/g, ' ')  // Table pipes
                    .replace(/[{}[\]();]/g, ' ')  // Brackets and semicolons
                    .replace(/->/g, ' to ')
                    .replace(/<-/g, ' from ')
                    .replace(/!=/g, ' not equal ')
                    .replace(/==/g, ' equals ')
                    .replace(/[✓✔✗✘]/g, '')  // Check marks
                    .replace(/\s+/g, ' ')
                    .trim();
                  
                  // Check for sentence boundaries in cleaned text
                  const sentenceMatch = cleanedBuffer.match(/^(.+?[.!?]+)\s*/);
                  if (sentenceMatch) {
                    const sentence = sentenceMatch[1].trim();
                    // Only speak if meaningful content and not mostly symbols
                    if (sentence.length > 8 && !/^[\s\[\].,!?]+$/.test(sentence) && !/[~^`#]/.test(sentence)) {
                      speak(sentence);
                    }
                    speechBuffer = speechBuffer.slice(sentenceMatch[0].length);
                  }
                }
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
              case 'mistral':
                reply = await mistralService.generate(runtimeModel.id, cloudMessages, 'Amo', handleCloudUpdate, bundle.combinedContext, {
                  deepThink: isDeepThinkEnabled,
                  webContext: webSearchContext,
                });
                break;
              case 'inworld':
                reply = await inworldService.generate(runtimeModel.id, cloudMessages, 'Amo', handleCloudUpdate, bundle.combinedContext, {
                  webContext: webSearchContext,
                });
                break;
              default:
                throw new Error(`Unsupported cloud model family: ${runtimeModel.family}`);
            }

            // Process code blocks - save substantial code to editor instead of chat
            const processed = await processCodeBlocks(reply, userPrompt);
            reply = processed.text;

            updateMessage(assistantId, reply, false);
            finalizeMessage(assistantId);
            await persistExchangeToBrain(userPrompt, reply);
            
            // Speak any remaining text that wasn't spoken during streaming
            if (isVoiceModeRef.current) {
              if (speechBuffer.trim().length > 5) {
                speak(speechBuffer.trim());
              }
              // Also speak the full final response if nothing was spoken during streaming
              if (lastSpokenLength === 0) {
                speak(reply);
              }
            }
          } else {
            // Native offline model (llama.cpp via Android JNI)
            const systemPrompt = bundle.combinedContext
              ? `You are Amo, a helpful AI assistant.\n\n${bundle.combinedContext}`
              : 'You are Amo, a helpful AI assistant.';
            const historyText = history.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Amo'}: ${m.content}`).join('\n');
            const prompt = `${systemPrompt}\n\n${historyText}\nUser: ${userPrompt}${visionPromptSuffix}\nAmo:`;
            
            try {
              const params = useModelSettingsStore.getState();
              const nativeResult = await nativeOfflineLlmService.generate({
                prompt,
                temperature: params.temperature,
                top_p: params.topP,
                max_tokens: params.maxTokens,
              });
              reply = nativeResult?.text?.trim() || 'No response from native model.';
              
              // Process code blocks - save substantial code to editor instead of chat
              const processedNative = await processCodeBlocks(reply, userPrompt);
              reply = processedNative.text;
              
              updateMessage(assistantId, reply, false);
              finalizeMessage(assistantId);
              await persistExchangeToBrain(userPrompt, reply);
              if (isVoiceModeRef.current) speak(reply);
            } catch (e: any) {
              setError(`Native model error: ${e.message}. Try a different model or ensure the model is loaded.`);
            }
          }
        });
      } catch (e: any) {
        setError(getErrorMessage(e, 'Failed.'));
      } finally {
        setIsLoading(false);
        setAmoRuntimeState('waiting');
        activeAssistantMessageIdRef.current = null;
      }
    };

    handleSendRef.current = handleSend;

     const speak = async (text: string) => {
       // Chunked TTS for better responsiveness - speak as soon as we have complete sentences
       if (!text || text.trim().length === 0) {
         console.log('[Speak] Skipping empty text');
         return;
       }

       isSpeakingRef.current = true;

       if (nativeTtsService.isAvailable()) {
         await nativeTtsService.stop().catch(() => undefined);
       }

       if ('speechSynthesis' in window) {
         window.speechSynthesis.cancel();
       }

      // Echo prevention: stop microphone while Amo is speaking
      const wasListening = isListeningRef.current;
      if (wasListening) {
        console.log('[Speak] Stopping mic to prevent echo');
        nativeSpeechRecognitionService.stop();
        setIsListening(false);
      }

      // Strip markdown symbols and special characters for natural speech
      const stripSymbolsForSpeech = (input: string): string => {
        let result = input;
        
        // Replace code blocks with indication (don't speak code)
        const codeBlockMatches = result.match(/```[\s\S]*?```/g) || [];
        const hasCode = codeBlockMatches.length > 0;
        result = result
          .replace(/```[\s\S]*?```/g, hasCode ? ' Here is the code. ' : '')      // Code blocks → indication
        
        // Handle inline code
        result = result
          .replace(/`([^`]+)`/g, (match, code) => {
            // Don't speak variable names or symbols, just say "variable" or skip
            if (/^[\W]+$/.test(code)) return '';  // Just symbols
            if (/^[a-z_][a-z0-9_]*$/i.test(code)) return `the variable ${code}`;  // Variables
            return code;  // Regular text
          })
          
          // Remove speech quotes entirely - just speak the content
          .replace(/[""'']/g, '')
          
          // Clean markdown formatting
          .replace(/\*\*([^*]+)\*\*/g, '$1')                 // Bold → text
          .replace(/\*([^*]+)\*/g, '$1')                     // Italic → text
          .replace(/#{1,6}\s*/g, '')                         // Headers → text
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')          // Links → text only
          .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')        // Reference links → text
          
          // Convert symbols to words naturally
          .replace(/→/g, ' then ')
          .replace(/←/g, ' from ')
          .replace(/->/g, ' to ')
          .replace(/<-/g, ' from ')
          .replace(/>=/g, ' greater or equal ')
          .replace(/<=/g, ' less or equal ')
          .replace(/!=/g, ' not equal ')
          .replace(/===/g, ' equals ')
          .replace(/==/g, ' equals ')
          .replace(/&&/g, ' and ')
          .replace(/\|\|/g, ' or ')
          .replace(/\+\+/g, ' increment ')
          .replace(/--/g, ' decrement ')
          
          // Clean up bullets and markers
          .replace(/^[•\-*]\s*/gm, '')
          .replace(/^\d+\.\s*/gm, '')                       // Numbered lists
          .replace(/[✓✔]/g, 'done ')
          .replace(/[✗✘]/g, 'failed ')
          .replace(/•/g, '')
          
          // Remove visual tree chars and pipes
          .replace(/├──|└──|│|├|└/g, '')
          .replace(/\|(?=[^|]*\|)/g, ' ')                   // Keep table structure, clean single pipes
          .replace(/\|/g, ' ')
          
          // Clean programming symbols
          .replace(/[{}\[\]();]/g, ' ')
          .replace(/[{}]/g, ' ')
          .replace(/[;]/g, ', ')
          .replace(/[_~^]/g, ' ')
          .replace(/>\s*/g, ' greater than ')
          .replace(/\s*</g, ' less than ')
          .replace(/&/g, ' and ')
          
          // Clean up ellipsis and dashes
          .replace(/\.\.\./g, ', and then ')
          .replace(/--/g, ' ')
          .replace(/—/g, ', ')
          
          // Final cleanup
          .replace(/\s+/g, ' ')
          .replace(/\s+([.,!?])/g, '$1')
          .replace(/([.,!?])\s+/g, '$1 ')
          .trim();
        
        // If there was code, add a note
        if (hasCode) {
          result = 'Here is the code for you: ' + result;
        }
        
        return result;
      };

      const cleanText = stripSymbolsForSpeech(text);
      if (cleanText.length === 0) return;

      console.log('[Speak] Attempting to speak:', cleanText.substring(0, 50) + '...');
      console.log('[Speak] Native TTS available:', nativeTtsService.isAvailable(), 'ready:', nativeTtsStatus?.ready);
      console.log('[Speak] SpeechT5 ready:', speechT5Service.isReady());
      console.log('[Speak] speechSynthesis available:', 'speechSynthesis' in window);

      try {
        // Try native TTS first (Android)
        if (nativeTtsService.isAvailable() && nativeTtsStatus?.ready) {
          console.log('[Speak] Using native TTS');
          
          // Get the best voice based on current persona
          const bestVoices = getSelectableNativeTtsVoices(nativeTtsStatus);
          const bestVoice = bestVoices.length > 0 ? bestVoices[0] : null;

          if (!bestVoice) {
            console.warn('No suitable native voice found. Available voices:', nativeTtsStatus?.availableVoices);
          }

          const result = await nativeTtsService.speakAndWait({
            text: cleanText,
            language: bestVoice?.locale || nativeTtsStatus.language || 'en-US',
            voiceName: bestVoice?.name,
          });

          if (result) {
            return;
          }

          console.warn('[Speak] Native TTS did not complete cleanly, using fallback');
        }

        // Try web SpeechT5 if ready (offline AI model)
        if (speechT5Service.isReady()) {
          console.log('[Speak] Using web SpeechT5 TTS');
          try {
            await speechT5Service.speak(cleanText);
            return;
          } catch (speechT5Error) {
            console.error('[Speak] SpeechT5 failed:', speechT5Error);
            // Fall through to browser-native TTS
          }
        }

        // Final fallback: browser-native speechSynthesis API (most reliable)
        if ('speechSynthesis' in window) {
          console.log('[Speak] Using browser-native speechSynthesis API');
          window.speechSynthesis.cancel(); // Cancel any previous speech

          await new Promise<void>((resolve) => {
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            const preferredVoice = getPreferredVoice(window.speechSynthesis.getVoices(), '');
            if (preferredVoice) {
              utterance.voice = preferredVoice;
              utterance.lang = preferredVoice.lang;
            }

            // Timeout after 30 seconds (Chrome/Safari may not fire onend reliably)
            const timeout = setTimeout(() => {
              console.warn('[Speak] speechSynthesis timed out, resolving anyway');
              resolve();
            }, 30000);

            utterance.onstart = () => console.log('[Speak] speechSynthesis started');
            utterance.onend = () => {
              clearTimeout(timeout);
              console.log('[Speak] speechSynthesis finished');
              resolve();
            };
            utterance.onerror = (event) => {
              clearTimeout(timeout);
              console.error('[Speak] speechSynthesis error:', event.error, event);
              resolve(); // Resolve instead of reject to avoid blocking
            };

            window.speechSynthesis.speak(utterance);
          });
          return;
        }

        console.warn('[Speak] No TTS available on this platform');
      } catch (err) {
        console.error('[Speak] Error in speak function:', err);
      } finally {
        isSpeakingRef.current = false;
        // Echo prevention: restart microphone after Amo finishes speaking
        if (wasListening && voiceContinuousRef.current && !isVoiceProcessingRef.current) {
          console.log('[Speak] Restarting mic after speech');
          setTimeout(() => {
            if (!nativeSpeechRecognitionService.isActive()) {
              setIsListening(true);
              void nativeSpeechRecognitionService.start();
            }
          }, 500);
        }
      }
    };

   /**
    * Handle voice-assisted web search
    * Triggered when user speaks a query that should trigger web search
    */
   const handleVoiceWebSearch = async (query: string) => {
     console.log('[VoiceWebAssist] Processing query:', query);
     
     try {
       // Check if this query should trigger web search
       if (!shouldUseWebSearch(query)) {
         console.log('[VoiceWebAssist] Query not suitable for web search');
         return false;
       }

       // Perform voice web assist
       const response = await voiceWebAssistService.assistWithVoice(query, {
         timeout: 8000,
         maxResults: 3,
         speakResults: false, // We'll handle speaking manually for better control
         verbose: true,
       });

       console.log('[VoiceWebAssist] Response:', response);

       // Add messages to chat
       addMessage('user', query);
       addMessage('assistant', response.voiceSummary);

       // Speak the results if voice mode is enabled
       if (isVoiceModeRef.current && response.voiceSummary) {
         await speak(response.voiceSummary);
       }

       // Store results for potential follow-up queries
       sessionStorage.setItem(
         'lastVoiceWebResults',
         JSON.stringify(response)
       );

       return true;
     } catch (error) {
       console.error('[VoiceWebAssist] Error processing voice web query:', error);
       const errorMsg = 'I had trouble searching the web. Please try again.';
       addMessage('assistant', errorMsg);
       if (isVoiceModeRef.current) {
         await speak(errorMsg);
       }
       return false;
     }
    };

    handleVoiceWebSearchRef.current = handleVoiceWebSearch;

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
    if (!file) return;

    try {
      setIsUploadingDoc(true);
      const parsed = await documentService.parseFile(file);
      const id = crypto.randomUUID();

      // Use vectorDbService to generate real embeddings
      await vectorDbService.addDocument({
        id,
        documentId: id,
        documentName: parsed.title || file.name,
        content: parsed.content,
        metadata: {
          assetKind: 'document',
          format: parsed.format,
          wordCount: parsed.wordCount,
          ...parsed.metadata,
        },
      });

      setUploadedDocs(prev => [...prev, {
        id,
        name: parsed.title || file.name,
        kind: 'document',
      }]);

      // Auto-learn vocabulary from document
      void autoLearningService.learnFromDocument(parsed.content, parsed.title || file.name, id);

      setDownloadStatus(
        `Imported ${parsed.title || file.name} — ` +
        `${parsed.wordCount.toLocaleString()} words as ${parsed.format.toUpperCase()}`
      );

    } catch (uploadError) {
      setError(getErrorMessage(uploadError, 'Failed to import file.'));
    } finally {
      setIsUploadingDoc(false);
      if (e.target) e.target.value = '';
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

    // Track restart attempts to prevent infinite loops
    const voiceRestartCountRef = useRef(0);
    const maxRestartsBeforeReset = 10;

    const restartVoiceListening = useCallback((delay = 500) => {
      // Clear any pending restart timer
      if (voiceRestartTimerRef.current) {
        clearTimeout(voiceRestartTimerRef.current);
        voiceRestartTimerRef.current = null;
      }

      // Don't restart if continuous mode is disabled
      if (!voiceContinuousRef.current || isVoiceProcessingRef.current || isSpeakingRef.current) return;

      // Check if we need to reset the recognizer after too many restarts
      if (voiceRestartCountRef.current >= maxRestartsBeforeReset) {
        console.log('[Voice] Resetting recognizer after ' + maxRestartsBeforeReset + ' restarts');
        voiceRestartCountRef.current = 0;
        nativeSpeechRecognitionService.abort();
      }

      voiceRestartTimerRef.current = setTimeout(() => {
        if (voiceContinuousRef.current && !nativeSpeechRecognitionService.isActive() && !isLoadingRef.current && !isSpeakingRef.current) {
          console.log('[Voice] Restarting continuous listening (attempt ' + (voiceRestartCountRef.current + 1) + ')');
          voiceRestartCountRef.current++;
          setIsListening(true);
          nativeSpeechRecognitionService.start().catch((err) => {
            console.error('[Voice] Failed to restart:', err);
            setIsListening(false);
            // Try again after a longer delay
            if (voiceContinuousRef.current) {
              restartVoiceListening(1000);
            }
          });
        }
      }, delay);
    }, []);

    const toggleListening = async () => {
     if (isListening) {
       nativeSpeechRecognitionService.stop();
       setIsListening(false);
       // Reset restart counter when manually stopping
       voiceRestartCountRef.current = 0;
       // Clear any pending voice restart timers when stopping
       if (voiceRestartTimerRef.current) {
         clearTimeout(voiceRestartTimerRef.current);
         voiceRestartTimerRef.current = null;
       }
     } else {
        // Reset restart counter when manually starting
        voiceRestartCountRef.current = 0;

        nativeSpeechRecognitionService.setCallbacks(
          (text: string, isFinal: boolean) => {
            if (!isFinal) {
              console.log('[Voice] Interim:', text);
              return;
            }
             console.log('[Voice] Final:', text);
             if (!text.trim()) {
               // In continuous mode, restart listening if no speech was detected
               setIsListening(false);
               if (voiceContinuousRef.current) {
                 restartVoiceListening();
               }
               return;
             }
             if (isVoiceProcessingRef.current) {
               console.log('[Voice] Ignoring transcript while another request is processing');
               return;
             }
             inputRef.current = text;
             setInput(text);
             // Mark as not actively listening while processing
             setIsListening(false);
             isVoiceProcessingRef.current = true;
             requestAnimationFrame(() => {
               requestAnimationFrame(async () => {
                 try {
                    // Check if this is a web search query and handle it with voice assist
                    const isWebQuery = shouldUseWebSearch(text) && navigator.onLine && isWebSearchEnabledRef.current;
                    
                    if (isWebQuery) {
                      console.log('[Voice] Web query detected, using voice web assist');
                      const handled = await (handleVoiceWebSearchRef.current?.(text) ?? Promise.resolve(false));
                      
                      if (handled) {
                        // Web search was successful
                        if (voiceContinuousRef.current && !isSpeakingRef.current) {
                          restartVoiceListening();
                        }
                        return;
                      }
                    }
                    
                    // Not a web query or web query failed, use regular handler
                    await (handleSendRef.current?.() ?? Promise.resolve());
                  } catch (err) {
                    console.error('[Voice] Error in voice handler:', err);
                  } finally {
                    isVoiceProcessingRef.current = false;
                  }
                  // In continuous mode, restart listening after response
                  if (voiceContinuousRef.current && !isSpeakingRef.current) {
                    restartVoiceListening();
                  }
                });
              });
          },
          (error: string) => {
            console.error('[Voice] Error:', error);
            // Don't show "no speech match" errors to user - they're expected in continuous mode
            if (error !== 'No speech match' && error !== 'Speech timeout') {
              setError(error);
            }
            setIsListening(false);
            isVoiceProcessingRef.current = false;
            // In continuous mode, try to restart after error (with longer delay for real errors)
            if (voiceContinuousRef.current) {
              restartVoiceListening(error === 'No speech match' ? 250 : 1000);
            }
          }
         );
         // Start speech recognition
         setIsListening(true);
         try {
           await nativeSpeechRecognitionService.start();
         } catch (err) {
           console.error('[Voice] Failed to start:', err);
           setIsListening(false);
           setError('Failed to start voice recognition');
         }
       }
    };

    // Only handle manual toggles of continuous mode - inline restarts handle the rest
    useEffect(() => {
      // When continuous mode is enabled and we're not actively listening or processing
      if (voiceContinuous && !isListening && !isLoading && !nativeSpeechRecognitionService.isActive()) {
        // Start listening with a delay to avoid conflicts
        const timer = setTimeout(() => {
          if (voiceContinuousRef.current && !isListeningRef.current && !nativeSpeechRecognitionService.isActive() && !isSpeakingRef.current) {
            console.log('[Voice] Starting continuous mode via effect');
            voiceRestartCountRef.current = 0;
            setIsListening(true);
            nativeSpeechRecognitionService.start().catch((err) => {
              console.error('[Voice] Failed to start continuous mode:', err);
              setIsListening(false);
            });
          }
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [voiceContinuous]); // Only depend on voiceContinuous to avoid loops

    useEffect(() => () => {
      if (voiceRestartTimerRef.current) {
        clearTimeout(voiceRestartTimerRef.current);
      }
      void nativeSpeechRecognitionService.abort();
      void nativeTtsService.stop().catch(() => undefined);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }, []);

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
      // Handle images as before
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

      // Route everything else through documentService (handles all supported formats)
      try {
        await handleDocUpload({ target: { files: [file] } });
      } catch (e) {
        setError(getErrorMessage(e, 'Could not import that file type.'));
      }
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
    <>
      {isInitializing && (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ff4e00] to-[#ff8a5c] flex items-center justify-center mb-6 animate-pulse">
            <span className="font-serif italic font-bold text-4xl text-white tracking-wider">A</span>
          </div>
          <h1 className="font-serif italic font-semibold text-2xl tracking-[0.2em] text-white mb-2">ASK AMO</h1>
          <div className="flex items-center gap-2 text-white/50 mb-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">{downloadStatus || 'Initializing...'}</span>
          </div>
          <p className="text-xs text-white/30 mt-2">First launch may take 10-30 seconds</p>
          {error && (
            <div className="mt-4 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>
      )}
      <WelcomeGuide onComplete={() => {}} />
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

            {isLoading && (
              <button
                onClick={handleCancelThinking}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 text-[11px] font-bold uppercase tracking-widest transition-all hover:bg-red-500/25 animate-pulse"
                title="Stop Amo response"
                aria-label="Stop response"
              >
                <X className="w-3 h-3" aria-hidden="true" />
                Stop
              </button>
            )}

            <button
              onClick={clearChat}
              className="p-2 text-white/40 hover:text-white/80 transition-colors"
              title="Clear conversation"
              aria-label="Clear conversation"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
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
          onSwitchIdeTab={setActiveIdeTab}
          onSwitchLearnTab={setActiveLearnTab}
          onRunCommand={handleRunQuickCommand}
          onSaveCurrentPage={handleSaveCurrentPage}
          onExportBrain={handleExportBrain}
          onImportBrain={handleImportBrain}
          onRestoreDefaultBrain={handleRestoreDefaultBrain}
          selectedModelId={selectedModel.id}
          availableModels={AVAILABLE_MODELS}
          onSelectModel={(id) => { 
            try {
              console.log('[App] onSelectModel called with:', id);
              const cloudModel = AVAILABLE_MODELS.find(m => m.id === id);
              if (cloudModel) {
                console.log('[App] Found cloud model:', cloudModel.name, 'family:', cloudModel.family);
                setSelectedModel(cloudModel);
                localStorage.setItem('amo_selected_model_id', cloudModel.id);
                return;
              }
              const downloadedModelIds = (nativeOfflineStatus?.availableModels || []).map(m => {
                const filename = m.relativePath.split('/').pop() || m.relativePath;
                const modelIdMap: Record<string, string> = {
                  'Phi-3.5-mini-Instruct-Q4_K_M.gguf': 'phi-3.5-mini',
                };
                return modelIdMap[filename] || filename;
              });
              if (downloadedModelIds.includes(id)) {
                const nativeModel: ModelConfig = {
                  id,
                  name: id,
                  description: 'Local offline model',
                  size: 'Local',
                  family: 'native',
                  isCloud: false
                };
                console.log('[App] Selected native model:', nativeModel.name);
                setSelectedModel(nativeModel);
                localStorage.setItem('amo_selected_model_id', id);
                return;
              }
              console.error('[App] Model not found for ID:', id);
            } catch (e: any) {
              console.error('[App] Error in onSelectModel:', e);
              setError(`Failed to select model: ${e.message}`);
            }
          }}
          nativeModelStatus={localRuntimeState.capability}
          nativeModelName={nativeOfflineStatus?.activeModel?.displayName || 'No model loaded'}
          hasGroqKey={hasGroqApiKey}
          hasGeminiKey={hasGeminiApiKey}
          hasOpenAiKey={hasOpenAiApiKey}
          hasOpenRouterKey={hasOpenRouterApiKey}
          hasMistralKey={hasMistralApiKey}
          hasInworldKey={hasInworldApiKey}
          groqApiKey={groqApiKey}
          geminiApiKey={geminiApiKey}
          openAiApiKey={openAiApiKey}
          openRouterApiKey={openRouterApiKey}
          mistralApiKey={mistralApiKey}
          inworldApiKey={inworldApiKey}
          onSetGroqKey={setGroqApiKey}
          onSetGeminiKey={setGeminiApiKey}
          onSetOpenAiKey={setOpenAiApiKey}
          onSetOpenRouterKey={setOpenRouterApiKey}
          onSetMistralKey={setMistralApiKey}
          onSetInworldKey={setInworldApiKey}
          downloadedModels={(nativeOfflineStatus?.availableModels || []).map(m => {
            const filename = m.relativePath.split('/').pop() || m.relativePath;
            const modelIdMap: Record<string, string> = {
              'Phi-3.5-mini-Instruct-Q4_K_M.gguf': 'phi-3.5-mini',
            };
            return modelIdMap[filename] || filename;
          })}
          onSelectNativeModel={undefined}
            onDownloadModel={async (model) => {
              setIsDownloadingNativeModel(true);
              setDownloadProgress({ percent: 0, status: 'Preparing...' });
              setDownloadStatus(`Downloading ${model.name}...`);
              try {
                setDownloadProgress({ percent: 10, status: 'Initializing runtime...' });
                await nativeOfflineLlmService.prepareRuntime();
                
                setDownloadProgress({ percent: 20, status: `Downloading ${model.name}...` });
                
                // Check if this is a vision model with mmproj
                const modelWithMmproj = model as any;
                if (modelWithMmproj.mmprojUrl) {
                  // Download main model file
                  const mainResult = await nativeOfflineLlmService.downloadModel({
                    sourceUrl: modelWithMmproj.url,
                    displayName: modelWithMmproj.name + "-main",
                    activate: false, // Don't activate yet, wait for mmproj
                  });
                  
                  if (!mainResult) {
                    throw new Error('Failed to download main model file');
                  }
                  
                  setDownloadProgress({ percent: 60, status: 'Downloading vision model...' });
                  
                  // Download mmproj file
                  const mmprojResult = await nativeOfflineLlmService.downloadModel({
                    sourceUrl: modelWithMmproj.mmprojUrl,
                    displayName: modelWithMmproj.name + "-mmproj",
                    activate: false,
                  });
                  
                  if (!mmprojResult) {
                    throw new Error('Failed to download mmproj file');
                  }
                  
                  setDownloadProgress({ percent: 90, status: 'Activating model...' });
                  
                  // Set the main model as active (the mmproj will be referenced internally)
                  await nativeOfflineLlmService.setActiveModel({ 
                    relativePath: mainResult.importedModel.relativePath,
                    // We'd need to pass mmproj path to native service, but for now
                    // we'll rely on naming convention or extend the service later
                  });
                  
                  setNativeOfflineStatus(mainResult.status);
                  setDownloadProgress({ percent: 100, status: 'Download complete!' });
                  setDownloadStatus(`Downloaded ${model.name} with vision support!`);
                  // Refresh model list to make the downloaded model available in dropdown
                  const { loadLocalModels } = await import('./stores/modelSettingsStore');
                  await loadLocalModels();
                } else {
                  // Regular model download
                  setDownloadProgress({ percent: 30, status: 'Downloading model...' });
                  const result = await nativeOfflineLlmService.downloadModel({
                    sourceUrl: model.url,
                    displayName: model.name,
                    activate: true,
                  });
                 if (result) {
                   setDownloadProgress({ percent: 90, status: 'Activating model...' });
                   setNativeOfflineStatus(result.status);
                   setDownloadProgress({ percent: 100, status: 'Download complete!' });
                   setDownloadStatus(`Downloaded ${model.name}!`);
                   // Refresh model list to make the downloaded model available in dropdown
                   const { loadLocalModels } = await import('./stores/modelSettingsStore');
                   await loadLocalModels();
                 }
               }
             } catch (e: any) {
                setError(e.message);
              } finally {
                setIsDownloadingNativeModel(false);
                // Keep progress visible for 2 seconds then clear
                setTimeout(() => setDownloadProgress(null), 2000);
              }
            }}
          onDeleteModel={async (modelId) => {
            const model = nativeOfflineStatus?.availableModels.find(m => 
              m.displayName.toLowerCase().replace(/\s+/g, '-') === modelId
            );
            if (!model) return;
            try {
              const status = await nativeOfflineLlmService.removeModel({ relativePath: model.relativePath });
              setNativeOfflineStatus(status);
              // Refresh model list after deletion
              const { loadLocalModels } = await import('./stores/modelSettingsStore');
              await loadLocalModels();
            } catch (e: any) {
              setError(e.message);
            }
          }}
          onImportModel={handleImportNativeModel}
          isDownloadingModel={isDownloadingNativeModel}
          onSendPrompt={(text) => { setInput(text); inputRef.current = text; textareaRef.current?.focus(); }}
          isVoiceMode={isVoiceMode}
           onToggleVoiceMode={() => { const newVal = !isVoiceMode; setIsVoiceMode(newVal); localStorage.setItem('amo_voice_mode', String(newVal)); }}
           voiceContinuous={voiceContinuous}
           onToggleVoiceContinuous={() => { const newVal = !voiceContinuous; setVoiceContinuous(newVal); localStorage.setItem('amo_voice_continuous', String(newVal)); }}
           isWebSearchEnabled={isWebSearchEnabled}
           onToggleWebSearch={() => { const newVal = !isWebSearchEnabled; setIsWebSearchEnabled(newVal); localStorage.setItem('amo_web_search_enabled', String(newVal)); }}
           isDeepThinkEnabled={isDeepThinkEnabled}
           onToggleDeepThink={() => { const newVal = !isDeepThinkEnabled; setIsDeepThinkEnabled(newVal); localStorage.setItem('amo_deep_think_enabled', String(newVal)); }}
          onClearMemory={handleClearMemory}
          onExportHistory={handleExportHistory}
          onOpenInChrome={handleOpenInChrome}
          appVersion="1.0.0"
        />

        <main className="flex-1 flex flex-col relative overflow-hidden">
          {/* Navigation */}
          <div className="border-b border-white/10 px-4 sm:px-6 py-3">
            <div className="flex items-center gap-2 max-w-none overflow-x-auto custom-scrollbar">
              <button onClick={() => setActiveView('chat')} className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap", activeView === 'chat' ? "bg-[#ff4e00] text-white shadow-lg shadow-[#ff4e00]/25" : "text-white/60 hover:text-white hover:bg-white/5")}>Chat</button>
              <button onClick={() => { setActiveView('ide'); setActiveIdeTab('editor'); }} className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap", activeView === 'ide' && activeIdeTab === 'editor' ? "bg-[#ff4e00] text-white shadow-lg shadow-[#ff4e00]/25" : "text-white/60 hover:text-white hover:bg-white/5")}>Editor</button>
              <button onClick={() => { setActiveView('ide'); setActiveIdeTab('terminal'); }} className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap", activeView === 'ide' && activeIdeTab === 'terminal' ? "bg-[#ff4e00] text-white shadow-lg shadow-[#ff4e00]/25" : "text-white/60 hover:text-white hover:bg-white/5")}>Terminal</button>
              <button onClick={() => { setActiveView('ide'); setActiveIdeTab('files'); }} className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap", activeView === 'ide' && activeIdeTab === 'files' ? "bg-[#ff4e00] text-white shadow-lg shadow-[#ff4e00]/25" : "text-white/60 hover:text-white hover:bg-white/5")}>Files</button>
              <button onClick={() => { setActiveView('ide'); setActiveIdeTab('debug'); }} className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap", activeView === 'ide' && activeIdeTab === 'debug' ? "bg-[#ff4e00] text-white shadow-lg shadow-[#ff4e00]/25" : "text-white/60 hover:text-white hover:bg-white/5")}>Debug</button>
              <button onClick={() => { setActiveView('ide'); setActiveIdeTab('run'); }} className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap", activeView === 'ide' && activeIdeTab === 'run' ? "bg-[#ff4e00] text-white shadow-lg shadow-[#ff4e00]/25" : "text-white/60 hover:text-white hover:bg-white/5")}>Run</button>
              <button onClick={() => setActiveView('preview')} className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap", activeView === 'preview' ? "bg-[#ff4e00] text-white shadow-lg shadow-[#ff4e00]/25" : "text-white/60 hover:text-white hover:bg-white/5")}>Preview</button>
              <button onClick={() => { setActiveView('learn'); setActiveLearnTab('vocabulary'); }} className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap", activeView === 'learn' ? "bg-[#ff4e00] text-white shadow-lg shadow-[#ff4e00]/25" : "text-white/60 hover:text-white hover:bg-white/5")}>Learn</button>
              <button onClick={() => setActiveView('web')} className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap", activeView === 'web' ? "bg-[#ff4e00] text-white shadow-lg shadow-[#ff4e00]/25" : "text-white/60 hover:text-white hover:bg-white/5")}>Web</button>
              <button onClick={() => setActiveView('settings')} className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap", activeView === 'settings' ? "bg-[#ff4e00] text-white shadow-lg shadow-[#ff4e00]/25" : "text-white/60 hover:text-white hover:bg-white/5")}>Settings</button>
              
              {/* Sub-tabs for Learn */}
              {activeView === 'learn' && (
                <div className="flex items-center gap-1 ml-4 pl-4 border-l border-white/10">
                  <button onClick={() => setActiveLearnTab('vocabulary')} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", activeLearnTab === 'vocabulary' ? "bg-white/10 text-white" : "text-white/40 hover:text-white")}>Vocabulary</button>
                  <button onClick={() => setActiveLearnTab('sentences')} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", activeLearnTab === 'sentences' ? "bg-white/10 text-white" : "text-white/40 hover:text-white")}>Sentences</button>
                  <button onClick={() => setActiveLearnTab('intent')} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", activeLearnTab === 'intent' ? "bg-white/10 text-white" : "text-white/40 hover:text-white")}>Intent</button>
                  <button onClick={() => setActiveLearnTab('brain')} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", activeLearnTab === 'brain' ? "bg-white/10 text-white" : "text-white/40 hover:text-white")}>Brain</button>
                  <button onClick={() => setActiveLearnTab('practice')} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", activeLearnTab === 'practice' ? "bg-white/10 text-white" : "text-white/40 hover:text-white")}>Practice</button>
                </div>
              )}
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
                      <div className="rounded-2xl border border-[#ff4e00]/20 bg-[#ff4e00]/8 px-4 py-3 text-sm text-white/80">
                        <div className="flex items-start gap-3">
                          <DownloadCloud className="mt-0.5 h-4 w-4 shrink-0 text-[#ff8a5c] animate-pulse" />
                          <div className="flex-1">
                            <span>{downloadProgress?.status || downloadStatus}</span>
                            {downloadProgress && (
                              <div className="mt-2">
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-[#ff4e00] rounded-full transition-all duration-500"
                                    style={{ width: `${downloadProgress.percent}%` }}
                                  />
                                </div>
                                <div className="flex justify-between mt-1 text-[10px] text-white/40">
                                  <span>{downloadProgress.status}</span>
                                  <span>{downloadProgress.percent}%</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
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
                    <MessageList messages={messages} assistantName="Amo" onCopy={handleCopy} onRegenerate={handleRegenerate} onUseInEditor={handleUseCodeInEditor} />
                 )}
                 <div ref={messagesEndRef} />
               </div>
             </div>
           )}

            {/* Preview View - dedicated preview panel */}
            {activeView === 'preview' && (
              <div className="h-full flex flex-col p-4">
                <div className="flex-1 glass-panel border border-white/10 rounded-2xl overflow-hidden">
                  <CodePreview 
                    code={previewContent?.code || ''} 
                    language={previewContent?.language || 'html'} 
                    onClose={() => setPreviewContent(null)} 
                  />
                </div>
                {(!previewContent || !previewContent.code) && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-white/30 text-sm">Preview will appear here when you create HTML/JS code</p>
                  </div>
                )}
              </div>
            )}

            {/* IDE View - Editor + Terminal + Files + Debug + Run */}
            {activeView === 'ide' && (
              <div className="h-full p-4">
                {activeIdeTab === 'editor' && (
                  <div className="h-full">
                    <CodeEditor 
                      key={pendingEditorCode?.token || 'editor-default'}
                      initialCode={pendingEditorCode?.code} 
                      initialFileName={pendingEditorCode?.filename}
                      autoRun={pendingEditorCode?.autoRun}
                      autoPreview={true}
                      refreshKey={fileRefreshKey}
                      onOutputCapture={(output) => setAmoTerminalOutput(output)}
                      onGenerate={(prompt) => {
                        setInput(prompt);
                        setActiveView('chat');
                        setTimeout(() => handleSend(), 100);
                      }}
                    />
                  </div>
                )}
                {activeIdeTab === 'terminal' && (
                  <div className="h-full glass-panel border border-white/10 rounded-2xl overflow-hidden">
                    <Terminal />
                  </div>
                )}
                {activeIdeTab === 'files' && (
                  <div className="h-full glass-panel border border-white/10 rounded-2xl overflow-hidden p-4">
                    <h3 className="text-sm font-medium text-white/80 mb-4">Files</h3>
                    <FileTree
                      onFileSelect={(path, content) => {
                        setPendingEditorCode({ code: content, filename: path, token: crypto.randomUUID() });
                        setActiveIdeTab('editor');
                      }}
                      refreshKey={fileRefreshKey}
                    />
                  </div>
                )}
                {activeIdeTab === 'debug' && (
                  <div className="h-full glass-panel border border-white/10 rounded-2xl overflow-hidden p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-white/90">Debug Console</h2>
                      <button 
                        onClick={() => setActiveIdeTab('terminal')}
                        className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                      >
                        Open Terminal
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                        <div className="text-xs text-white/40 mb-2">Console Output</div>
                        <div className="font-mono text-sm text-white/70 h-48 overflow-auto custom-scrollbar">
                          {amoTerminalOutput || 'No output yet. Run code to see results here.'}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                        <div className="text-xs text-white/40 mb-2">Breakpoints</div>
                        <div className="text-sm text-white/50">No breakpoints set</div>
                      </div>
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                        <div className="text-xs text-white/40 mb-2">Variables</div>
                        <div className="text-sm text-white/50">No variables in scope</div>
                      </div>
                    </div>
                  </div>
                )}
                {activeIdeTab === 'run' && (
                  <div className="h-full glass-panel border border-white/10 rounded-2xl overflow-hidden p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-white/90">Run & Execute</h2>
                      <button 
                        onClick={() => setActiveIdeTab('editor')}
                        className="px-4 py-2 text-sm bg-[#ff4e00] hover:bg-[#ff4e00]/90 text-white rounded-lg transition-all"
                      >
                        Open Editor
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setActiveIdeTab('editor')}
                        className="p-6 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#ff4e00]/30 hover:bg-[#ff4e00]/5 transition-all text-left"
                      >
                        <div className="text-2xl mb-2">▶</div>
                        <div className="text-sm font-medium text-white/80">Run Code</div>
                        <div className="text-xs text-white/40 mt-1">Execute current file</div>
                      </button>
                      <button 
                        onClick={() => setActiveView('preview')}
                        className="p-6 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#ff4e00]/30 hover:bg-[#ff4e00]/5 transition-all text-left"
                      >
                        <div className="text-2xl mb-2">🌐</div>
                        <div className="text-sm font-medium text-white/80">Preview</div>
                        <div className="text-xs text-white/40 mt-1">View HTML/JS output</div>
                      </button>
                      <button 
                        onClick={() => setActiveIdeTab('debug')}
                        className="p-6 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#ff4e00]/30 hover:bg-[#ff4e00]/5 transition-all text-left"
                      >
                        <div className="text-2xl mb-2">🐛</div>
                        <div className="text-sm font-medium text-white/80">Debug</div>
                        <div className="text-xs text-white/40 mt-1">Inspect variables</div>
                      </button>
                      <button 
                        onClick={() => setActiveIdeTab('terminal')}
                        className="p-6 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#ff4e00]/30 hover:bg-[#ff4e00]/5 transition-all text-left"
                      >
                        <div className="text-2xl mb-2">$</div>
                        <div className="text-sm font-medium text-white/80">Terminal</div>
                        <div className="text-xs text-white/40 mt-1">Command shell</div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Learn View - Vocabulary + Sentences + Intent */}
            {activeView === 'learn' && (
              <div className="h-full p-4">
                {activeLearnTab === 'vocabulary' && (
                  <div className="h-full">
                    {localStorage.getItem('amo_vocabulary_visited') !== 'true' && (
                      <div className="mb-4 p-4 bg-[#ff4e00]/5 border border-[#ff4e00]/20 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="text-[#ff8a5c] mt-0.5">💡</div>
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-white/90 mb-1">Quick Start: Vocabulary Builder</h3>
                            <p className="text-xs text-white/70 mb-2">
                              Click the <strong>Help</strong> button (❓) in the top-right to learn how to extract words from websites, generate vocabulary sets, and practice with flashcards.
                            </p>
                            <button 
                              onClick={() => localStorage.setItem('amo_vocabulary_visited', 'true')}
                              className="text-xs text-[#ff8a5c] hover:text-[#ff4e00] transition-colors"
                            >
                              Got it
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    <VocabularyBuilder />
                  </div>
                )}
                {activeLearnTab === 'sentences' && (
                  <div className="h-full">
                    {localStorage.getItem('amo_sentence_builder_visited') !== 'true' && (
                      <div className="mb-4 p-4 bg-[#ff4e00]/5 border border-[#ff4e00]/20 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="text-[#ff8a5c] mt-0.5">💡</div>
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-white/90 mb-1">Quick Start: Sentence Builder</h3>
                            <p className="text-xs text-white/70 mb-2">
                              Click the <strong>Help</strong> button (❓) to learn how to create sentences with AI, build templates, and use vocabulary words in practice sentences.
                            </p>
                            <button 
                              onClick={() => localStorage.setItem('amo_sentence_builder_visited', 'true')}
                              className="text-xs text-[#ff8a5c] hover:text-[#ff4e00] transition-colors"
                            >
                              Got it
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    <SentenceBuilder />
                  </div>
                )}
                {activeLearnTab === 'intent' && (
                  <div className="h-full">
                    {localStorage.getItem('amo_intent_enhancer_visited') !== 'true' && (
                      <div className="mb-4 p-4 bg-[#ff4e00]/5 border border-[#ff4e00]/20 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="text-[#ff8a5c] mt-0.5">💡</div>
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-white/90 mb-1">Quick Start: Intent Enhancer</h3>
                            <p className="text-xs text-white/70 mb-2">
                              Teach Amo to understand you better by adding patterns, examples, and clarifications.
                            </p>
                            <button 
                              onClick={() => localStorage.setItem('amo_intent_enhancer_visited', 'true')}
                              className="text-xs text-[#ff8a5c] hover:text-[#ff4e00] transition-colors"
                            >
                              Got it
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    <IntentEnhancer />
                  </div>
                )}
                {activeLearnTab === 'brain' && (
                  <div className="h-full glass-panel border border-white/10 rounded-2xl overflow-hidden p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-white/90">Brain & Memory</h2>
                      <div className="flex gap-2">
                        <button className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition-all">
                          Export
                        </button>
                        <button className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition-all">
                          Import
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                        <div className="text-2xl font-bold text-white/90">{brainMemoryRows.length}</div>
                        <div className="text-xs text-white/40 mt-1">Memory Notes</div>
                      </div>
                      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                        <div className="text-2xl font-bold text-white/90">{brainSummaryRows.length}</div>
                        <div className="text-xs text-white/40 mt-1">Summaries</div>
                      </div>
                      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                        <div className="text-2xl font-bold text-white/90">{seedPackRows.length}</div>
                        <div className="text-xs text-white/40 mt-1">Seed Packs</div>
                      </div>
                    </div>
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-white/70 mb-3">Recent Memories</h3>
                      <div className="space-y-2 max-h-64 overflow-auto custom-scrollbar">
                        {brainMemoryRows.slice(0, 10).map((row, i) => (
                          <div key={i} className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                            <div className="text-xs text-white/50 truncate">{row.scope}</div>
                            <div className="text-sm text-white/80 mt-1">{row.content?.substring(0, 100)}...</div>
                          </div>
                        ))}
                        {brainMemoryRows.length === 0 && (
                          <div className="text-sm text-white/40 text-center py-8">No memories yet. Chat with Amo to build memory.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {activeLearnTab === 'practice' && (
                  <div className="h-full glass-panel border border-white/10 rounded-2xl overflow-hidden p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-white/90">Practice Mode</h2>
                      <button 
                        onClick={() => setActiveLearnTab('vocabulary')}
                        className="px-4 py-2 text-sm bg-[#ff4e00] hover:bg-[#ff4e00]/90 text-white rounded-lg transition-all"
                      >
                        Start Practice
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setActiveLearnTab('vocabulary')}
                        className="p-6 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#ff4e00]/30 hover:bg-[#ff4e00]/5 transition-all text-left"
                      >
                        <div className="text-2xl mb-2">📚</div>
                        <div className="text-sm font-medium text-white/80">Vocabulary Quiz</div>
                        <div className="text-xs text-white/40 mt-1">Test your word knowledge</div>
                      </button>
                      <button 
                        onClick={() => setActiveLearnTab('sentences')}
                        className="p-6 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#ff4e00]/30 hover:bg-[#ff4e00]/5 transition-all text-left"
                      >
                        <div className="text-2xl mb-2">✍️</div>
                        <div className="text-sm font-medium text-white/80">Sentence Building</div>
                        <div className="text-xs text-white/40 mt-1">Practice constructing sentences</div>
                      </button>
                      <button 
                        onClick={() => setActiveLearnTab('intent')}
                        className="p-6 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#ff4e00]/30 hover:bg-[#ff4e00]/5 transition-all text-left"
                      >
                        <div className="text-2xl mb-2">🎯</div>
                        <div className="text-sm font-medium text-white/80">Intent Recognition</div>
                        <div className="text-xs text-white/40 mt-1">Test pattern matching</div>
                      </button>
                      <button 
                        onClick={() => setActiveLearnTab('brain')}
                        className="p-6 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#ff4e00]/30 hover:bg-[#ff4e00]/5 transition-all text-left"
                      >
                        <div className="text-2xl mb-2">🧠</div>
                        <div className="text-sm font-medium text-white/80">Memory Recall</div>
                        <div className="text-xs text-white/40 mt-1">Test your learned knowledge</div>
                      </button>
                    </div>
                    <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/10">
                      <h3 className="text-sm font-medium text-white/70 mb-3">Progress</h3>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-white/50 mb-1">
                            <span>Overall Progress</span>
                            <span>0%</span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-[#ff4e00] rounded-full w-0 transition-all" />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-white/40 mt-3">Complete practice activities to track your progress.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Web View */}
            {activeView === 'web' && (
              <div className="h-full max-w-4xl mx-auto w-full min-h-[420px]">
                <WebBrowser url={webViewUrl} onNavigate={(url) => setWebViewUrl(url)} />
              </div>
            )}

            {/* Settings View */}
            {activeView === 'settings' && (
              <div className="h-full p-4">
                <div className="max-w-2xl mx-auto space-y-4">
                  {/* Settings content would go here */}
                  <h2 className="text-xl font-semibold text-white/90">Settings</h2>
                  <p className="text-white/60">Configure your Amo preferences.</p>
                </div>
              </div>
            )}
          </div>

          {/* Chat input bar - always visible when in chat view */}
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
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept={documentService.getSupportedExtensions() + ',image/*'} className="hidden" />
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
      </div>
      
      {/* Brain Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-3">Reset Amo's Brain?</h3>
            <p className="text-sm text-white/70 mb-6">
              This will clear all of Amo's memories, knowledge, and learning. This action cannot be undone unless you save a backup first.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleConfirmReset(true)}
                disabled={isSavingBeforeReset}
                className="w-full py-3 px-4 bg-[#ff4e00] hover:bg-[#ff4e00]/80 text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingBeforeReset ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving & Resetting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Save Brain & Reset
                  </>
                )}
              </button>
              
              <button
                onClick={() => handleConfirmReset(false)}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
              >
                Reset Without Saving
              </button>
              
              <button
                onClick={() => setShowResetConfirm(false)}
                className="w-full py-3 px-4 text-white/60 hover:text-white/80 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Container */}
      <ToastContainer
        toasts={toasts}
        onClose={handleToastClose}
        onSpeechToggle={handleToastSpeechToggle}
      />
    </ErrorBoundary>
    </>
  );
}
