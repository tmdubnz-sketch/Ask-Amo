import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativeOfflineModelInfo {
  relativePath: string;
  displayName: string;
  templateHint?: string;
  sizeBytes?: number;
}

export interface NativeOfflinePickedModel {
  sourceUri: string;
  displayName: string;
  valid: boolean;
  templateHint?: string;
  error?: string;
}

export interface NativeOfflineStatus {
  backend: string;
  runtimeMode?: 'scaffold' | string;
  scaffold: boolean;
  runtimeReady: boolean;
  modelLoaded: boolean;
  loadedModelPath: string | null;
  message: string;
  availableModels: NativeOfflineModelInfo[];
  activeModel: NativeOfflineModelInfo | null;
}

export interface NativeOfflineDownloadAuthStatus {
  hfTokenConfigured: boolean;
  message: string;
}

interface NativeOfflineLlmPlugin {
  getStatus(): Promise<NativeOfflineStatus>;
  prepareRuntime(): Promise<{
    ready: boolean;
    backend: string;
    message: string;
  }>;
  loadModel(options: {
    relativePath: string;
    templateHint?: string;
  }): Promise<{
    message: string;
    status: NativeOfflineStatus;
  }>;
  unloadModel(): Promise<{
    message: string;
    status: NativeOfflineStatus;
  }>;
  generate(options: {
    prompt: string;
  }): Promise<{
    text: string;
    status: NativeOfflineStatus;
  }>;
  pickModelFile(): Promise<NativeOfflinePickedModel>;
  importModel(options: {
    sourceUri: string;
    displayName?: string;
    templateHint?: string;
    activate?: boolean;
  }): Promise<{
    importedModel: NativeOfflineModelInfo;
    status: NativeOfflineStatus;
  }>;
  setActiveModel(options: {
    relativePath: string;
    displayName?: string;
    templateHint?: string;
  }): Promise<NativeOfflineStatus>;
  removeModel(options: {
    relativePath: string;
  }): Promise<NativeOfflineStatus>;
  clearActiveModel(): Promise<NativeOfflineStatus>;
  getDownloadAuthStatus(): Promise<NativeOfflineDownloadAuthStatus>;
  downloadModel(options: {
    sourceUrl: string;
    displayName?: string;
    templateHint?: string;
    activate?: boolean;
  }): Promise<{
    importedModel: NativeOfflineModelInfo;
    status: NativeOfflineStatus;
    message: string;
  }>;
  getPaths(): Promise<{
    root: string;
    imports: string;
    activeModelFile: string;
  }>;
}

const NativeOfflineLlm = registerPlugin<NativeOfflineLlmPlugin>('NativeOfflineLlm');

export const nativeOfflineLlmService = {
  isAvailable(): boolean {
    return Capacitor.isNativePlatform();
  },

  async getStatus(): Promise<NativeOfflineStatus | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return NativeOfflineLlm.getStatus();
  },

  async prepareRuntime(): Promise<{ ready: boolean; backend: string; message: string } | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return NativeOfflineLlm.prepareRuntime();
  },

  async pickModelFile(): Promise<NativeOfflinePickedModel | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return NativeOfflineLlm.pickModelFile();
  },

  async loadModel(options: {
    relativePath: string;
    templateHint?: string;
  }): Promise<{ message: string; status: NativeOfflineStatus } | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return NativeOfflineLlm.loadModel(options);
  },

  async unloadModel(): Promise<{ message: string; status: NativeOfflineStatus } | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return NativeOfflineLlm.unloadModel();
  },

  async generate(options: {
    prompt: string;
  }): Promise<{ text: string; status: NativeOfflineStatus } | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return NativeOfflineLlm.generate(options);
  },

  async importModel(options: {
    sourceUri: string;
    displayName?: string;
    templateHint?: string;
    activate?: boolean;
  }): Promise<{ importedModel: NativeOfflineModelInfo; status: NativeOfflineStatus } | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return NativeOfflineLlm.importModel(options);
  },

  async setActiveModel(options: {
    relativePath: string;
    displayName?: string;
    templateHint?: string;
  }): Promise<NativeOfflineStatus | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return NativeOfflineLlm.setActiveModel(options);
  },

  async removeModel(options: {
    relativePath: string;
  }): Promise<NativeOfflineStatus | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return NativeOfflineLlm.removeModel(options);
  },

  async clearActiveModel(): Promise<NativeOfflineStatus | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return NativeOfflineLlm.clearActiveModel();
  },

  async getDownloadAuthStatus(): Promise<NativeOfflineDownloadAuthStatus | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return NativeOfflineLlm.getDownloadAuthStatus();
  },

  async downloadModel(options: {
    sourceUrl: string;
    displayName?: string;
    templateHint?: string;
    activate?: boolean;
  }): Promise<{ importedModel: NativeOfflineModelInfo; status: NativeOfflineStatus; message: string } | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return NativeOfflineLlm.downloadModel(options);
  },

  async getPaths(): Promise<{ root: string; imports: string; activeModelFile: string } | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return NativeOfflineLlm.getPaths();
  },
};
