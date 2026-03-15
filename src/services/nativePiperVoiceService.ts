import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativePiperVoicePack {
  voiceId: string;
  displayName: string;
  ready: boolean;
  fileKinds: string[];
  files: string[];
  sizeBytes: number;
}

export interface NativePiperVoiceStatus {
  backend: string;
  runtimeReady: boolean;
  message: string;
  availableVoices: NativePiperVoicePack[];
  activeVoice: NativePiperVoicePack | null;
}

export interface NativePiperPickedFile {
  sourceUri: string;
  displayName: string;
  valid: boolean;
  kind: string;
}

interface NativePiperVoicePlugin {
  getStatus(): Promise<NativePiperVoiceStatus>;
  getPaths(): Promise<{ root: string; voices: string; activeVoiceFile: string }>;
  prepareRuntime(): Promise<{ ready: boolean; backend: string; message: string }>;
  pickVoiceFile(): Promise<NativePiperPickedFile>;
  importVoiceFile(options: {
    sourceUri: string;
    displayName?: string;
  }): Promise<{ importedVoice: NativePiperVoicePack; status: NativePiperVoiceStatus }>;
  setActiveVoice(options: {
    voiceId: string;
    displayName?: string;
  }): Promise<NativePiperVoiceStatus>;
  removeVoice(options: {
    voiceId: string;
  }): Promise<NativePiperVoiceStatus>;
}

const NativePiperVoice = registerPlugin<NativePiperVoicePlugin>('NativePiperVoice');

export const nativePiperVoiceService = {
  isAvailable(): boolean {
    return Capacitor.isNativePlatform();
  },

  async getStatus(): Promise<NativePiperVoiceStatus | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return NativePiperVoice.getStatus();
  },

  async getPaths(): Promise<{ root: string; voices: string; activeVoiceFile: string } | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return NativePiperVoice.getPaths();
  },

  async prepareRuntime(): Promise<{ ready: boolean; backend: string; message: string } | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return NativePiperVoice.prepareRuntime();
  },

  async pickVoiceFile(): Promise<NativePiperPickedFile | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return NativePiperVoice.pickVoiceFile();
  },

  async importVoiceFile(options: {
    sourceUri: string;
    displayName?: string;
  }): Promise<{ importedVoice: NativePiperVoicePack; status: NativePiperVoiceStatus } | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return NativePiperVoice.importVoiceFile(options);
  },

  async setActiveVoice(options: {
    voiceId: string;
    displayName?: string;
  }): Promise<NativePiperVoiceStatus | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return NativePiperVoice.setActiveVoice(options);
  },

  async removeVoice(options: {
    voiceId: string;
  }): Promise<NativePiperVoiceStatus | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return NativePiperVoice.removeVoice(options);
  },
};
