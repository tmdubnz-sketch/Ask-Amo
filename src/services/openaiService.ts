import { apiKeyStorage } from './apiKeyStorage';
import { buildAssistantSystemPrompt, normalizeChatMessages, type AssistantMessage } from './assistantPrompt';

export class OpenAiService {
  private getApiKey(): string {
    return apiKeyStorage.get('openai') || import.meta.env.VITE_OPENAI_API_KEY?.trim() || '';
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
      throw new Error('Missing OpenAI API key');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'system',
            content: buildAssistantSystemPrompt(botName, context, options),
          },
          ...normalizeChatMessages(messages),
        ],
        temperature: options?.deepThink ? 0.2 : 0.3,
        max_tokens: options?.deepThink ? 640 : 256,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI API Error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    if (!text) {
      throw new Error('OpenAI returned an empty response.');
    }

    onUpdate(text);
    return text;
  }
}

export const openaiService = new OpenAiService();
