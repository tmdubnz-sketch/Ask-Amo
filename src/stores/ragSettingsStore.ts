import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RagSettings {
  chunkSize: number;
  topK: number;
  relevanceThreshold: number;
  hybridSearch: boolean;
  autoEmbed: boolean;
}

interface RagSettingsState extends RagSettings {
  setChunkSize: (size: number) => void;
  setTopK: (k: number) => void;
  setRelevanceThreshold: (threshold: number) => void;
  setHybridSearch: (enabled: boolean) => void;
  setAutoEmbed: (enabled: boolean) => void;
}

export const useRagSettingsStore = create<RagSettingsState>()(
  persist(
    (set) => ({
      chunkSize: 512,
      topK: 5,
      relevanceThreshold: 0.3,
      hybridSearch: false,
      autoEmbed: true,

      setChunkSize: (chunkSize) => set({ chunkSize }),
      setTopK: (topK) => set({ topK }),
      setRelevanceThreshold: (relevanceThreshold) => set({ relevanceThreshold }),
      setHybridSearch: (hybridSearch) => set({ hybridSearch }),
      setAutoEmbed: (autoEmbed) => set({ autoEmbed }),
    }),
    {
      name: 'amo-rag-settings',
    }
  )
);
