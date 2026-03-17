import { create } from 'zustand';
import { nativeOfflineLlmService } from '../services/nativeOfflineLlmService';

export interface LocalModel {
  id: string;
  displayName: string;
  relativePath: string;
  sizeBytes: number;
  quant?: string;
}

interface InferenceParams {
  temperature: number;
  topP: number;
  maxTokens: number;
}

interface ModelSettingsState extends InferenceParams {
  localModels: LocalModel[];
  currentModelId: string | null;
  isLoadingModels: boolean;
  setTemperature: (t: number) => void;
  setTopP: (p: number) => void;
  setMaxTokens: (m: number) => void;
  loadLocalModels: () => Promise<void>;
  setCurrentModel: (modelId: string) => Promise<void>;
}

export const useModelSettingsStore = create<ModelSettingsState>((set, get) => ({
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 2048,
  localModels: [],
  currentModelId: null,
  isLoadingModels: false,

  setTemperature: (temperature) => set({ temperature }),
  setTopP: (topP) => set({ topP }),
  setMaxTokens: (maxTokens) => set({ maxTokens }),

  loadLocalModels: async () => {
    set({ isLoadingModels: true });
    try {
      if (!nativeOfflineLlmService.isAvailable()) {
        set({ localModels: [], isLoadingModels: false });
        return;
      }

      const status = await nativeOfflineLlmService.getStatus();
      const availableModels = status?.availableModels || [];
      
      const models: LocalModel[] = availableModels.map((m: any) => ({
        id: m.relativePath,
        displayName: m.displayName,
        relativePath: m.relativePath,
        sizeBytes: m.sizeBytes || 0,
        quant: extractQuant(m.displayName),
      }));

      set({ localModels: models });

      if (models.length > 0 && !get().currentModelId) {
        // Auto-select Phi-3.5-mini if available (best for S20), otherwise first model
        const phi35Model = models.find(m => 
          m.displayName.toLowerCase().includes('phi-3.5-mini') || 
          m.relativePath.toLowerCase().includes('phi-3.5-mini')
        );
        
        const activeModel = status?.activeModel;
        const readyModel = models.find(m => m.id === activeModel?.relativePath);
        
        if (readyModel) {
          set({ currentModelId: readyModel.id });
        } else if (phi35Model) {
          // Phi-3.5-mini found - auto-select it
          console.log('[ModelStore] Auto-selecting Phi-3.5-mini as default');
          set({ currentModelId: phi35Model.id });
          await nativeOfflineLlmService.setActiveModel({ relativePath: phi35Model.id });
        } else {
          set({ currentModelId: models[0].id });
        }
      }
    } catch (e) {
      console.error('Failed to load local models:', e);
    } finally {
      set({ isLoadingModels: false });
    }
  },

  setCurrentModel: async (modelId: string) => {
    set({ currentModelId: modelId });
    try {
      const model = get().localModels.find(m => m.id === modelId);
      if (model && nativeOfflineLlmService.isAvailable()) {
        await nativeOfflineLlmService.setActiveModel({ relativePath: modelId });
      }
    } catch (e) {
      console.error('Failed to set active model:', e);
    }
  },
}));

function extractQuant(name: string): string | undefined {
  const match = name.match(/(Q[0-9]+[KSM]*(?:_\w+)?)/i);
  return match ? match[1] : undefined;
}

export function getInferenceParams(): InferenceParams {
  return useModelSettingsStore.getState();
}

export function getRecommendedParamsForS20(): InferenceParams {
  return {
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 2048,
  };
}

export function useLocalModels() {
  return useModelSettingsStore((state) => ({
    models: state.localModels,
    currentModelId: state.currentModelId,
    isLoading: state.isLoadingModels,
    loadModels: state.loadLocalModels,
    setModel: state.setCurrentModel,
  }));
}