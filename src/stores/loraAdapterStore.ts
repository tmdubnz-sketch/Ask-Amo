import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LoraAdapter {
  id: string;
  name: string;
  path: string;
  scale: number;
  enabled: boolean;
}

interface LoraAdapterState {
  adapters: LoraAdapter[];
  activeAdapterId: string | null;
  addAdapter: (name: string, path: string) => void;
  removeAdapter: (id: string) => void;
  setAdapterScale: (id: string, scale: number) => void;
  setActiveAdapter: (id: string | null) => void;
  toggleAdapter: (id: string) => void;
}

export const useLoraAdapterStore = create<LoraAdapterState>()(
  persist(
    (set) => ({
      adapters: [],
      activeAdapterId: null,

      addAdapter: (name: string, path: string) => {
        const id = `lora_${Date.now()}`;
        set((state) => ({
          adapters: [...state.adapters, { id, name, path, scale: 1.0, enabled: true }],
        }));
      },

      removeAdapter: (id: string) => {
        set((state) => ({
          adapters: state.adapters.filter((a) => a.id !== id),
          activeAdapterId: state.activeAdapterId === id ? null : state.activeAdapterId,
        }));
      },

      setAdapterScale: (id: string, scale: number) => {
        set((state) => ({
          adapters: state.adapters.map((a) => (a.id === id ? { ...a, scale } : a)),
        }));
      },

      setActiveAdapter: (id: string | null) => {
        set({ activeAdapterId: id });
      },

      toggleAdapter: (id: string) => {
        set((state) => ({
          adapters: state.adapters.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
        }));
      },
    }),
    {
      name: 'amo-lora-adapters',
    }
  )
);
