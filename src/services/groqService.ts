import { apiKeyStorage } from './apiKeyStorage';
import { buildAssistantSystemPrompt, normalizeChatMessages } from './assistantPrompt';

export class GroqService {
  private getApiKey(): string {
    return apiKeyStorage.get('groq') || import.meta.env.VITE_GROQ_API_KEY?.trim() || '';
  }

  async generate(
    modelId: string,
    messages: { role: string; content: string; image?: string }[],
    botName: string,
    onUpdate: (text: string) => void,
    context?: string,
    options?: { deepThink?: boolean; webContext?: string }
  ) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Missing VITE_GROQ_API_KEY');
    }

    const deepThink = options?.deepThink === true;
    const systemMessage = {
      role: 'system',
      content: buildAssistantSystemPrompt(botName, context, options),
    };

    const body = {
      model: modelId,
      messages: [systemMessage, ...normalizeChatMessages(messages)],
      stream: true,
      temperature: deepThink ? 0.2 : 0.3,
      max_tokens: deepThink ? 640 : 256,
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Groq API Error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === 'data: [DONE]') {
          continue;
        }

        if (!trimmedLine.startsWith('data: ')) {
          continue;
        }

        const data = JSON.parse(trimmedLine.slice(6));
        const content = data.choices[0]?.delta?.content || '';
        fullText += content;
        onUpdate(fullText);
      }

      if (done) {
        break;
      }
    }

    if (buffer.trim() && buffer.trim() !== 'data: [DONE]') {
      throw new Error('Groq stream ended with an incomplete SSE payload.');
    }

    return fullText;
  }

  async transcribe(audioBlob: Blob): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Missing VITE_GROQ_API_KEY');
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', 'en');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Groq Transcription Error: ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  }
}

export const groqService = new GroqService();
