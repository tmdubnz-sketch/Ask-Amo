import { apiKeyStorage } from './apiKeyStorage';
import { buildAssistantSystemPrompt, type AssistantMessage } from './assistantPrompt';

function buildGeminiContents(messages: AssistantMessage[]) {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }));
}

export class GeminiService {
  private getApiKey(): string {
    return apiKeyStorage.get('gemini') || import.meta.env.VITE_GEMINI_API_KEY?.trim() || '';
  }

  async generate(
    modelId: string,
    messages: AssistantMessage[],
    botName: string,
    onUpdate: (text: string) => void,
    context?: string,
    options?: { deepThink?: boolean; webContext?: string }
  ) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Missing Gemini API key');
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildAssistantSystemPrompt(botName, context, options) }],
        },
        contents: buildGeminiContents(messages),
        generationConfig: {
          temperature: options?.deepThink ? 0.2 : 0.3,
          maxOutputTokens: options?.deepThink ? 640 : 256,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('').trim() || '';
    if (!text) {
      throw new Error('Gemini returned an empty response.');
    }

    onUpdate(text);
    return text;
  }
}

export const geminiService = new GeminiService();
