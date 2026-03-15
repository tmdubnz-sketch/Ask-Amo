import { create } from 'zustand';

interface InferenceParams {
  temperature: number;
  topP: number;
  maxTokens: number;
}

interface ModelSettingsState extends InferenceParams {
  setTemperature: (t: number) => void;
  setTopP: (p: number) => void;
  setMaxTokens: (m: number) => void;
}

export const useModelSettingsStore = create<ModelSettingsState>((set) => ({
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 2048,
  setTemperature: (temperature) => set({ temperature }),
  setTopP: (topP) => set({ topP }),
  setMaxTokens: (maxTokens) => set({ maxTokens }),
}));

export function getInferenceParams(): InferenceParams {
  return useModelSettingsStore.getState();
}
