type NativeSessionRole = 'user' | 'assistant';

export interface NativeSessionMessage {
  role: NativeSessionRole;
  content: string;
}

const MAX_SESSION_MESSAGES = 4;
const MAX_MESSAGE_CHARS = 48;
const sessions = new Map<string, NativeSessionMessage[]>();

function trimText(text: string, maxChars: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }

  return normalized.slice(normalized.length - maxChars).trim();
}

function clampMessages(messages: NativeSessionMessage[]): NativeSessionMessage[] {
  return messages
    .map((message) => ({
      role: message.role,
      content: trimText(message.content, MAX_MESSAGE_CHARS),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-MAX_SESSION_MESSAGES);
}

export const nativeChatSessionService = {
  getSession(chatId: string): NativeSessionMessage[] {
    return [...(sessions.get(chatId) || [])];
  },

  resetChat(chatId: string): void {
    sessions.delete(chatId);
  },

  resetAll(): void {
    sessions.clear();
  },

  hydrateFromMessages(chatId: string, messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>): void {
    const compactMessages = messages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => ({
        role: message.role as NativeSessionRole,
        content: message.content,
      }));

    sessions.set(chatId, clampMessages(compactMessages));
  },

  recordExchange(chatId: string, userInput: string, assistantOutput: string): void {
    const current = sessions.get(chatId) || [];
    const next = clampMessages([
      ...current,
      { role: 'user', content: userInput },
      { role: 'assistant', content: assistantOutput },
    ]);
    sessions.set(chatId, next);
  },

  buildPrompt(chatId: string, userInput: string): string {
    const session = sessions.get(chatId) || [];
    const parts = [
      'You are Amo, a grounded New Zealand Maori assistant.',
      'Reply naturally in one short sentence.',
    ];

    if (session.length > 0) {
      const recent = session
        .map((message) => `${message.role === 'user' ? 'User' : 'Amo'}: ${trimText(message.content, MAX_MESSAGE_CHARS)}`)
        .join('\n');
      parts.push(`Recent:\n${recent}`);
    }

    parts.push(`User: ${trimText(userInput, 32)}`);
    parts.push('Amo:');
    return parts.join('\n');
  },
};
