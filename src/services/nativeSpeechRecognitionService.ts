import { Capacitor, registerPlugin } from '@capacitor/core';

interface NativeSpeechRecognitionPlugin {
  isSupported(): Promise<{ supported: boolean }>;
  start(): Promise<void>;
  stop(): Promise<void>;
  abort(): Promise<void>;
  isListening(): Promise<{ listening: boolean }>;
  addListener(eventName: string, callback: (event: any) => void): Promise<any>;
}

const NativeSpeechRecognition = registerPlugin<NativeSpeechRecognitionPlugin>('NativeSpeechRecognition');

export type SpeechEventCallback = (text: string, isFinal: boolean) => void;
export type SpeechErrorCallback = (error: string) => void;

class NativeSpeechRecognitionService {
  private isRunning = false;
  private onTranscript: SpeechEventCallback | null = null;
  private onError: SpeechErrorCallback | null = null;
  private listener: any = null;

  async isSupported(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      // Web fallback - check for Web Speech API
      return typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    }
    
    try {
      const result = await NativeSpeechRecognition.isSupported();
      return result.supported;
    } catch {
      return false;
    }
  }

  setCallbacks(onTranscript: SpeechEventCallback, onError?: SpeechErrorCallback) {
    this.onTranscript = onTranscript;
    this.onError = onError || null;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    const supported = await this.isSupported();
    if (!supported) {
      this.onError?.('Speech recognition is not supported on this device');
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      // Web fallback - use Web Speech API directly
      this.startWeb();
      return;
    }

    try {
      // Remove any existing listener
      if (this.listener) {
        this.listener.remove();
      }

      // Listen for speech events from native plugin
      this.listener = await NativeSpeechRecognition.addListener('speechEvent', (event: any) => {
        switch (event.type) {
          case 'ready':
            this.isRunning = true;
            console.log('[NativeSpeech] Ready');
            break;
          case 'beginning':
            console.log('[NativeSpeech] Beginning of speech');
            break;
          case 'volume':
            // Can be used for UI feedback
            break;
          case 'result':
            if (event.text) {
              this.onTranscript?.(event.text, event.isFinal);
            }
            break;
          case 'end':
            this.isRunning = false;
            console.log('[NativeSpeech] End of speech');
            break;
          case 'error':
            this.isRunning = false;
            this.onError?.(event.error);
            break;
        }
      });

      await NativeSpeechRecognition.start();
      this.isRunning = true;
      console.log('[NativeSpeech] Started');
    } catch (e) {
      this.isRunning = false;
      this.onError?.(e instanceof Error ? e.message : 'Failed to start speech recognition');
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      if (Capacitor.isNativePlatform()) {
        await NativeSpeechRecognition.stop();
      } else {
        this.stopWeb();
      }
    } catch (e) {
      console.error('[NativeSpeech] Error stopping:', e);
    }
    this.isRunning = false;
  }

  async abort(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        await NativeSpeechRecognition.abort();
        if (this.listener) {
          this.listener.remove();
          this.listener = null;
        }
      } else {
        this.stopWeb();
      }
    } catch (e) {
      console.error('[NativeSpeech] Error aborting:', e);
    }
    this.isRunning = false;
  }

  isActive(): boolean {
    return this.isRunning;
  }

  // Web Speech API fallback
  private webRecognition: any = null;

  private startWeb() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      this.onError?.('Speech recognition not supported');
      return;
    }

    this.webRecognition = new SR();
    this.webRecognition.continuous = true;
    this.webRecognition.interimResults = true;
    this.webRecognition.lang = 'en-NZ';

    this.webRecognition.onstart = () => {
      this.isRunning = true;
      console.log('[WebSpeech] Started');
    };

    this.webRecognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        this.onTranscript?.(result[0].transcript, result.isFinal);
      }
    };

    this.webRecognition.onerror = (event: any) => {
      this.isRunning = false;
      this.onError?.(event.error);
    };

    this.webRecognition.onend = () => {
      this.isRunning = false;
    };

    try {
      this.webRecognition.start();
    } catch (e) {
      this.onError?.('Failed to start speech recognition');
    }
  }

  private stopWeb() {
    if (this.webRecognition) {
      try {
        this.webRecognition.stop();
        this.webRecognition = null;
      } catch {}
    }
  }
}

export const nativeSpeechRecognitionService = new NativeSpeechRecognitionService();
