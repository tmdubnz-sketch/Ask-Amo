type TranscriptCallback = (text: string, isFinal: boolean) => void;
type ErrorCallback = (error: string) => void;

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResult[];
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

class AudioCaptureService {
  private recognition: SpeechRecognition | null = null;
  private onTranscript: TranscriptCallback | null = null;
  private onError: ErrorCallback | null = null;
  private isRunning = false;
  private finalResultTimer: number | undefined;

  isSupported(): boolean {
    return typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }

  setCallbacks(onTranscript: TranscriptCallback, onError?: ErrorCallback) {
    this.onTranscript = onTranscript;
    this.onError = onError || null;
  }

  async start(): Promise<void> {
    if (!this.isSupported()) {
      this.onError?.('Speech recognition is not supported on this device.');
      return;
    }
    if (this.isRunning) return;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      this.onError?.('Speech recognition is not supported on this device.');
      return;
    }
    this.recognition = new SR();

    if (!this.recognition) {
      this.onError?.('Failed to initialize speech recognition.');
      return;
    }

    this.recognition.lang = 'en-NZ';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isRunning = true;
      console.info('[AudioCapture] Listening started — en-NZ');
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      if (interimText) {
        const clean = this.sanitizeTranscript(interimText);
        if (clean) this.onTranscript?.(clean, false);
      }

      if (finalText) {
        window.clearTimeout(this.finalResultTimer);
        this.finalResultTimer = window.setTimeout(() => {
          const clean = this.sanitizeTranscript(finalText);
          if (clean) {
            this.onTranscript?.(clean, true);
          } else {
            console.warn('[AudioCapture] Rejected transcript — wrong language or empty:', finalText);
          }
        }, 120);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('[AudioCapture] Error:', event.error);
      this.isRunning = false;
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        this.onError?.(this.mapError(event.error));
      }
    };

    this.recognition.onend = () => {
      this.isRunning = false;
      console.info('[AudioCapture] Listening ended');
    };

    try {
      this.recognition.start();
    } catch (e) {
      this.isRunning = false;
      this.onError?.('Failed to start microphone. Check browser permissions.');
    }
  }

  stop(): void {
    window.clearTimeout(this.finalResultTimer);
    if (this.recognition && this.isRunning) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.isRunning = false;
  }

  isActive(): boolean {
    return this.isRunning;
  }

  private sanitizeTranscript(text: string): string {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 2) return '';

    const latinChars = (trimmed.match(/[a-zA-Z\s.,!?''\-0-9āēīōūĀĒĪŌŪ]/g) || []).length;
    const ratio = latinChars / trimmed.length;
    if (trimmed.length > 4 && ratio < 0.6) {
      console.warn('[AudioCapture] Non-Latin transcript rejected:', trimmed);
      return '';
    }

    const hallucinations = [
      'thank you for watching',
      'thanks for watching',
      'please subscribe',
      'subtitles by',
      'transcribed by',
      'amara.org',
    ];
    const lower = trimmed.toLowerCase();
    if (hallucinations.some(h => lower.includes(h))) {
      console.warn('[AudioCapture] Hallucination rejected:', trimmed);
      return '';
    }

    return trimmed;
  }

  private mapError(code: string): string {
    const map: Record<string, string> = {
      'not-allowed': 'Microphone permission denied. Allow access in device settings.',
      'network': 'Network error during speech recognition.',
      'audio-capture': 'No microphone detected.',
      'service-not-allowed': 'Speech recognition not allowed on this page.',
    };
    return map[code] || `Speech recognition error: ${code}`;
  }
}

export const audioCaptureService = new AudioCaptureService();
