import { pipeline, env, Tensor } from '@xenova/transformers';

// Configure Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

export class SpeechT5Service {
  private synthesizer: any = null;
  private speakerEmbeddings: any = null;
  private audioContext: AudioContext | null = null;
  private isDownloading = false;
  private initPromise: Promise<void> | null = null;
  private speakerProfile: 'male' | 'female' = 'male';

  setSpeakerProfile(profile: 'male' | 'female') {
    this.speakerProfile = profile;
  }

  async init() {
    if (this.synthesizer) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.isDownloading = true;
      try {
        console.log('[SpeechT5] Loading model (this may take a while on first run)...');
        
        // 1. Load the text-to-speech pipeline
        // This automatically downloads the ONNX model and tokenizer for SpeechT5
        this.synthesizer = await pipeline('text-to-speech', 'Xenova/speecht5_tts', {
          quantized: true // Use quantized model for smaller size (~140MB)
        });

        // 2. Load speaker embeddings. Default to a lower male voice profile for Amo.
        const speakerUrl = this.speakerProfile === 'male'
          ? 'https://huggingface.co/datasets/Xenova/cmu-arctic-xvectors/resolve/main/cmu_us_bdl_arctic-wav-arctic_a0001.bin'
          : 'https://huggingface.co/datasets/Xenova/cmu-arctic-xvectors/resolve/main/cmu_us_slt_arctic-wav-arctic_a0001.bin';
        const speakerResponse = await fetch(speakerUrl);
        const speakerBuffer = await speakerResponse.arrayBuffer();
        const speakerData = new Float32Array(speakerBuffer);
        
        this.speakerEmbeddings = new Tensor('float32', speakerData, [1, 512]);
        
        // 3. Setup AudioContext for playback
        this.audioContext = new AudioContext({ sampleRate: 16000 });
        
        console.log('[SpeechT5] Offline TTS Model Loaded Successfully!');
      } catch (error) {
        console.error('[SpeechT5] Failed to load model:', error);
        throw error;
      } finally {
        this.isDownloading = false;
        this.initPromise = null;
      }
    })();

    try {
      await this.initPromise;
    } catch (error) {
      this.synthesizer = null;
      this.speakerEmbeddings = null;
      this.audioContext = null;
      throw error;
    }
  }

  async speak(text: string) {
    if (!this.synthesizer || !this.speakerEmbeddings || !this.audioContext) {
      throw new Error('SpeechT5 model is not loaded yet.');
    }

    console.log(`[SpeechT5] Generating audio for: "${text}"`);
    
    // Resume AudioContext if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      console.log('[SpeechT5] Resuming suspended AudioContext...');
      await this.audioContext.resume();
    }
    
    // Generate audio
    const result = await this.synthesizer(text, {
      speaker_embeddings: this.speakerEmbeddings
    });

    // The result contains audio data and sampling rate
    const audioData = result.audio; // Float32Array
    const sampleRate = result.sampling_rate;

    this.playAudio(audioData, sampleRate);
  }

  private playAudio(pcmData: Float32Array, sampleRate: number) {
    if (!this.audioContext) return;
    
    const audioBuffer = this.audioContext.createBuffer(1, pcmData.length, sampleRate);
    audioBuffer.getChannelData(0).set(pcmData);
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    source.start();
  }

  isReady(): boolean {
    return this.synthesizer !== null && this.speakerEmbeddings !== null && this.audioContext !== null;
  }
}

export const speechT5Service = new SpeechT5Service();
