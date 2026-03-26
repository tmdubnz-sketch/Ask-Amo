import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CacheEntry {
  query: string;
  response: string;
  timestamp: number;
  modelId: string;
}

interface ResponseCacheState {
  cache: Record<string, CacheEntry>;
  hits: number;
  misses: number;
  setCache: (query: string, response: string, modelId: string) => void;
  getCache: (query: string, modelId: string) => string | null;
  clearCache: () => void;
  getStats: () => { hits: number; misses: number; size: number; hitRate: string };
}

const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const MAX_CACHE_SIZE = 100;

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

export const useResponseCacheStore = create<ResponseCacheState>()(
  persist(
    (set, get) => ({
      cache: {},
      hits: 0,
      misses: 0,

      setCache: (query: string, response: string, modelId: string) => {
        const normalized = normalizeQuery(query);
        set((state) => {
          const entries = Object.entries(state.cache);
          
          // Remove oldest if at capacity
          let newCache: Record<string, CacheEntry> = { ...state.cache };
          if (entries.length >= MAX_CACHE_SIZE) {
            const sorted = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
            const oldestKey = sorted[sorted.length - 1][0];
            const { [oldestKey]: _, ...rest } = newCache;
            newCache = rest;
          }
          
          newCache[normalized] = {
            query: normalized,
            response,
            timestamp: Date.now(),
            modelId,
          };
          return { cache: newCache };
        });
      },

      getCache: (query: string, modelId: string) => {
        const normalized = normalizeQuery(query);
        const entry = get().cache[normalized];
        
        if (!entry) {
          set((state) => ({ misses: state.misses + 1 }));
          return null;
        }
        
        if (entry.modelId !== modelId) {
          set((state) => ({ misses: state.misses + 1 }));
          return null;
        }
        
        if (Date.now() - entry.timestamp > CACHE_TTL) {
          set((state) => ({ 
            cache: { ...state.cache, [normalized]: undefined as any },
            misses: state.misses + 1 
          }));
          return null;
        }
        
        set((state) => ({ hits: state.hits + 1 }));
        return entry.response;
      },

      clearCache: () => set({ cache: {}, hits: 0, misses: 0 }),

      getStats: () => {
        const state = get();
        const total = state.hits + state.misses;
        const hitRate = total > 0 ? ((state.hits / total) * 100).toFixed(1) : '0.0';
        return { hits: state.hits, misses: state.misses, size: Object.keys(state.cache).length, hitRate: `${hitRate}%` };
      },
    }),
    {
      name: 'amo-response-cache',
    }
  )
);
