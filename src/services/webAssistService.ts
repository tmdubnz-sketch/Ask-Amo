import { webSearchService } from './webSearchService';
import { vectorDbService } from './vectorDbService';

const WEB_CACHE_TTL_MS = 1000 * 60 * 30;
const SEARCH_TIMEOUT_MS = 10000;
const FETCH_TIMEOUT_MS = 8000;

interface WebCacheEntry {
  query: string;
  result: string;
  fetchedAt: number;
}

const sessionCache = new Map<string, WebCacheEntry>();

function normalizeQuery(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function isCacheValid(entry: WebCacheEntry): boolean {
  return Date.now() - entry.fetchedAt < WEB_CACHE_TTL_MS;
}

async function fetchWithTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  let tid: number;
  const timeout = new Promise<T>((_, reject) => {
    tid = window.setTimeout(
      () => reject(new Error(`[WebAssist] ${label} timed out after ${ms}ms`)),
      ms
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    window.clearTimeout(tid!);
  }
}

export const webAssistService = {
  async resolve(query: string, resultCount = 5): Promise<string | null> {
    const key = normalizeQuery(query);
    if (!key) return null;

    const cached = sessionCache.get(key);
    if (cached && isCacheValid(cached)) {
      console.info('[WebAssist] Session cache hit:', key);
      return cached.result;
    }

    try {
      const results = await fetchWithTimeout(
        webSearchService.search(query, resultCount),
        SEARCH_TIMEOUT_MS,
        'search'
      );

      if (!results?.length) return null;

      const formatted = webSearchService.formatResults(results);
      if (!formatted?.trim()) return null;

      sessionCache.set(key, { query, result: formatted, fetchedAt: Date.now() });

      return formatted;

    } catch (err) {
      console.warn('[WebAssist] Fetch failed:', err);
      return null;
    }
  },

  async fetchPage(url: string, maxChars = 3000): Promise<string | null> {
    const key = normalizeQuery(url);
    const cached = sessionCache.get(key);
    if (cached && isCacheValid(cached)) return cached.result;

    try {
      const snapshot = await fetchWithTimeout(
        webSearchService.readPage(url, maxChars),
        FETCH_TIMEOUT_MS,
        'page fetch'
      );
      if (!snapshot?.text) return null;
      const result = snapshot.text.slice(0, maxChars);
      sessionCache.set(key, { query: url, result, fetchedAt: Date.now() });
      return result;
    } catch (err) {
      console.warn('[WebAssist] Page fetch failed:', err);
      return null;
    }
  },

  async fetchNews(topics: string[] = ['New Zealand news today', 'world news today']): Promise<void> {
    for (const topic of topics) {
      try {
        const result = await this.resolve(topic, 6);
        if (!result) continue;

        const docId = `news:${normalizeQuery(topic)}`;
        const content = `[News snapshot — ${new Date().toLocaleDateString('en-NZ')}]\n${result}`;

        await vectorDbService.addDocument({
          id: docId,
          documentId: docId,
          documentName: `News: ${topic}`,
          content,
          metadata: { assetKind: 'dataset', source: 'system', isNews: true },
        });

        console.info('[WebAssist] News updated:', topic);
      } catch (err) {
        console.warn('[WebAssist] News fetch failed for:', topic, err);
      }
    }
  },

  clearSessionCache(): void {
    sessionCache.clear();
  },
};
