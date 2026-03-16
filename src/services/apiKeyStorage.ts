import { secretStorageService } from './secretStorageService';

export type ProviderKey = 'groq' | 'openrouter' | 'openai' | 'gemini' | 'mistral';

const STORAGE_KEYS: Record<ProviderKey, string> = {
  groq: 'amo_groq_api_key',
  openrouter: 'amo_openrouter_api_key',
  openai: 'amo_openai_api_key',
  gemini: 'amo_gemini_api_key',
  mistral: 'amo_mistral_api_key',
};

const cache: Record<ProviderKey, string> = {
  groq: '',
  openrouter: '',
  openai: '',
  gemini: '',
  mistral: '',
};

let initPromise: Promise<void> | null = null;
let hydrated = false;

async function hydrateProvider(provider: ProviderKey): Promise<void> {
  const key = STORAGE_KEYS[provider];
  const secureValue = await secretStorageService.get(key);
  const resolved = secureValue;

  cache[provider] = resolved;
}

async function ensureInitialized(): Promise<void> {
  if (hydrated) {
    return;
  }

  if (!initPromise) {
    initPromise = (async () => {
      await Promise.all((Object.keys(STORAGE_KEYS) as ProviderKey[]).map(hydrateProvider));
      hydrated = true;
    })();
  }

  await initPromise;
}

export const apiKeyStorage = {
  async init(): Promise<void> {
    await ensureInitialized();
  },

  isHydrated(): boolean {
    return hydrated;
  },

  get(provider: ProviderKey): string {
    return cache[provider];
  },

  getAll(): Record<ProviderKey, string> {
    return { ...cache };
  },

  set(provider: ProviderKey, value: string): void {
    const key = STORAGE_KEYS[provider];
    const trimmed = value.trim();
    cache[provider] = trimmed;

    void (trimmed
      ? secretStorageService.set(key, trimmed)
      : secretStorageService.remove(key));
  },
};
