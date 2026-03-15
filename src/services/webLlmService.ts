import { CreateWebWorkerMLCEngine, InitProgressCallback, WebWorkerMLCEngine } from "@mlc-ai/web-llm";

export class WebLlmService {
  private engine: WebWorkerMLCEngine | null = null;
  private currentModelId: string | null = null;

  async initEngine(modelId: string, onProgress: InitProgressCallback) {
    if (this.engine && this.currentModelId === modelId) {
      return this.engine;
    }

    try {
      this.engine = await CreateWebWorkerMLCEngine(
        new Worker(new URL('./webLlmWorker.ts', import.meta.url), { type: 'module' }),
        modelId,
        { initProgressCallback: onProgress }
      );
      this.currentModelId = modelId;
      return this.engine;
    } catch (error) {
      console.error("Failed to initialize WebLLM engine:", error);
      throw error;
    }
  }

  async prepareModel(modelId: string, onProgress: (progress: number) => void) {
    return this.initEngine(modelId, (report) => {
      const progress = typeof report.progress === 'number'
        ? report.progress
        : typeof report.progress === 'string'
          ? Number.parseFloat(report.progress)
          : Number.NaN;
      onProgress(Number.isFinite(progress) ? progress : 0);
    });
  }

  async generate(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    onUpdate: (text: string) => void
  ) {
    if (!this.engine) {
      throw new Error("Engine not initialized");
    }

    let fullText = "";
    
    // We filter out any empty messages or image fields before sending to WebLLM
    const cleanMessages = messages.map(m => ({ role: m.role, content: m.content }));

    const chunks = await this.engine.chat.completions.create({
      messages: cleanMessages,
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
