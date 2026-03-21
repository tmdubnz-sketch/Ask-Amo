import { apiKeyStorage } from './apiKeyStorage';
import { buildAssistantSystemPrompt, normalizeChatMessages, type AssistantMessage } from './assistantPrompt';

export class MistralService {
  private getApiKey(): string {
    return apiKeyStorage.get('mistral') || import.meta.env.VITE_MISTRAL_API_KEY?.trim() || '';
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
      throw new Error('Missing Mistral API key');
    }

    const systemPrompt = buildAssistantSystemPrompt(botName, context, options);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          ...normalizeChatMessages(messages).map((m: any) => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content : m.content[0]?.text || '',
          })),
        ],
        temperature: options?.deepThink ? 0.2 : 0.3,
        max_tokens: options?.deepThink ? 1024 : 512,
        stream: true,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.message || errorData.error?.message || `Mistral API Error: ${response.status}`;
      if (response.status === 401) {
        throw new Error('Mistral API key is invalid. Check your key in Settings > Models.');
      }
      throw new Error(errorMsg);
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

        try {
          const data = JSON.parse(trimmedLine.slice(6));
          const content = data.choices?.[0]?.delta?.content || '';
          fullText += content;
          onUpdate(fullText);
        } catch {
          // Skip invalid JSON
        }
      }

      if (done) {
        break;
      }
    }

    return fullText;
  }
}

export const mistralService = new MistralService();
