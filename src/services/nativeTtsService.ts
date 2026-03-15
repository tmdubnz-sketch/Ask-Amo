import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativeTtsVoiceInfo {
  name: string;
  locale: string;
  quality: number;
  latency: number;
  networkConnectionRequired: boolean;
  installed: boolean;
}

export interface NativeTtsStatus {
  ready: boolean;
  language: string;
  voiceName?: string | null;
  availableVoices?: NativeTtsVoiceInfo[];
  message: string;
}

interface NativeTtsPlugin {
  getStatus(): Promise<NativeTtsStatus>;
  speak(options: {
    text: string;
    rate?: number;
    pitch?: number;
    language?: string;
    voiceName?: string;
  }): Promise<{
    queued: boolean;
    utteranceId: string;
    language: string;
    voiceName?: string | null;
  }>;
  stop(): Promise<void>;
}

const NativeTts = registerPlugin<NativeTtsPlugin>('NativeTts');

export const nativeTtsService = {
  isAvailable(): boolean {
    return Capacitor.isNativePlatform();
  },

  async getStatus(): Promise<NativeTtsStatus | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    return NativeTts.getStatus();
  },

  async speak(options: {
    text: string;
    rate?: number;
    pitch?: number;
    language?: string;
    voiceName?: string;
  }): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    await NativeTts.speak(options);
    return true;
  },

  async stop(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    await NativeTts.stop();
  },
};
