import { apiKeyStorage } from './apiKeyStorage';
import { createError, ERROR_CODES, logError } from './errorHandlingService';
import { buildAssistantSystemPrompt, normalizeChatMessages } from './assistantPrompt';

export const inworldService = {
  async generate(
    modelId: string,
    messages: any[],
    assistantName: string,
    handler: (chunk: string) => void,
    context?: string,
    options?: { temperature?: number; top_p?: number; max_tokens?: number; webContext?: string }
  ): Promise<string> {
    try {
      const apiKey = apiKeyStorage.get('inworld');
      if (!apiKey) {
        throw createError(
          'InworldService',
          ERROR_CODES.MISSING_API_KEY,
          'Inworld API key not configured. Please set it in Settings → API Keys.'
        );
      }

      const systemMessage = {
        role: 'system',
        content: buildAssistantSystemPrompt(assistantName, context, options),
      };

      const payload = {
        model: modelId,
        messages: [
          systemMessage,
          { role: 'assistant', content: `You are ${assistantName}.` },
          ...normalizeChatMessages(messages)
        ],
        temperature: options?.temperature ?? 0.7,
        top_p: options?.top_p ?? 0.9,
        max_tokens: options?.max_tokens ?? 2048,
        stream: true
      };

      const response = await fetch('https://api.inworld.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw createError(
          'InworldService',
          ERROR_CODES.FETCH_FAILED,
          `Inworld API error: ${response.status} ${errorText}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content ?? '';
        return text;
      }

      let accumulated = '';
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          const lines = accumulated.split('\n');
          accumulated = lines.pop() ?? '';
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            if (trimmedLine === 'data: [DONE]') continue;
            if (trimmedLine.startsWith('data: ')) {
              const dataStr = trimmedLine.slice(6);
              try {
                const data = JSON.parse(dataStr);
                const delta = data.choices?.[0]?.delta;
                if (delta?.content) {
                  fullText += delta.content;
                  handler(fullText);
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return fullText;
    } catch (error) {
      logError('InworldService', error, 'generate');
      throw error;
    }
  }
};
