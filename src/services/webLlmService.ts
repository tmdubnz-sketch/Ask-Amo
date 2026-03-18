import { CreateWebWorkerMLCEngine, InitProgressCallback, WebWorkerMLCEngine } from "@mlc-ai/web-llm";

// Map model IDs to Hugging Face repositories
const MODEL_REPO_MAP: Record<string, string> = {
  "Llama-3.2-3B-Instruct-webllm": "mlc-ai/Phi-3.5-mini-instruct-q4f16_1-MLC",
};

export class WebLlmService {
  private engine: WebWorkerMLCEngine | null = null;
  private currentModelId: string | null = null;

  async initEngine(modelId: string, onProgress: InitProgressCallback) {
    if (this.engine && this.currentModelId === modelId) {
      console.log("[WebLLM] Reusing existing engine for", modelId);
      return this.engine;
    }

    try {
      // Map model ID to Hugging Face repository
      const repoId = MODEL_REPO_MAP[modelId] || modelId;
      console.log("[WebLLM] Initializing engine for", modelId, "-> repo:", repoId);
      
      this.engine = await CreateWebWorkerMLCEngine(
        new Worker(new URL('./webLlmWorker.ts', import.meta.url), { type: 'module' }),
        repoId,
        { initProgressCallback: onProgress }
      );
      this.currentModelId = modelId;
      console.log("[WebLLM] Engine initialized successfully for model:", modelId);
      return this.engine;
    } catch (error) {
      console.error("[WebLLM] Failed to initialize engine for model:", modelId, error);
      // Add more context to the error
      const err = error as Error;
      throw new Error(`WebLLM failed to load model "${modelId}": ${err.message}. Make sure you're using Chrome with WebGPU enabled.`);
    }
  }

  async prepareModel(modelId: string, onProgress: (progress: number) => void) {
    try {
      // Check for WebGPU support first
      const gpu = (navigator as any).gpu;
      if (!gpu) {
        throw new Error("WebGPU is not available in this browser. WebLLM requires WebGPU. Try Chrome/Edge on desktop or enable WebGPU in browser flags.");
      }
      
      return this.initEngine(modelId, (report) => {
        const progress = typeof report.progress === 'number'
          ? report.progress
          : typeof report.progress === 'string'
            ? Number.parseFloat(report.progress)
            : Number.NaN;
        onProgress(Number.isFinite(progress) ? progress : 0);
      });
    } catch (error) {
      console.error("WebLLM prepareModel failed:", error);
      throw error;
    }
  }

  async generate(
    messages: { role: "system" | "user" | "assistant"; content: string | { type: string; image_url?: { url: string } }[] }[],
    onUpdate: (text: string) => void
  ) {
    if (!this.engine) {
      throw new Error("WebLLM engine not initialized. Please tap the download/load button in Settings > Models to load the model first, then try again.");
    }

    let fullText = "";
    
    console.log("[WebLLM] Generating with messages:", messages.length);
    const processedMessages = messages.map(m => {
      if (typeof m.content === 'string') {
        return { role: m.role, content: m.content };
      }
      // For multimodal content (array with image_url)
      return { role: m.role, content: m.content };
    });

    const chunks = await this.engine.chat.completions.create({
      messages: processedMessages as any,
      stream: true,
      temperature: 0.3,
      max_tokens: 256,
    });

    for await (const chunk of chunks) {
      const content = chunk.choices[0]?.delta?.content || "";
      fullText += content;
      onUpdate(fullText);
    }

    return fullText;
  }
}

export const webLlmService = new WebLlmService();
