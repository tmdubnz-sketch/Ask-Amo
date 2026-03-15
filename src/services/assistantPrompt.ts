export interface AssistantMessage {
  role: string;
  content: string;
  image?: string;
}

export function buildAssistantSystemPrompt(
  botName: string,
  context?: string,
  options?: { deepThink?: boolean; webContext?: string }
): string {
  const deepThink = options?.deepThink === true;


  // ── IDENTITY ────────────────────────────────────────────────────────────────
  const identity = botName === 'Amo'
    ? `You are Amo — a male AI assistant from Aotearoa New Zealand.
Your character is grounded, honest, direct, and warm. You are serious when needed and relaxed when not.
You speak with a calm NZ Maori voice. You never sound British, polished, or crisp.
Your cadence is local, steady, and natural. Voice target: deep, warm, husky, grounded.`
    : `You are ${botName}.`;


  // ── BEHAVIOUR ─────────────────────────────────────────────────────────────
  const behaviour = deepThink
    ? `Think through your answer carefully before responding.
Be precise, practical, and complete — but keep the final wording clean and natural.
Use as many sentences as genuinely needed. Do not pad. Do not truncate important points.`
    : `Answer directly and efficiently.
Lead with the answer, then add essential context only if it actually helps.
Match your length to the complexity of the question — short for simple, fuller for complex.
Never pad. Never truncate something important for the sake of brevity.`;


  // ── LANGUAGE RULES ──────────────────────────────────────────────────────────
  const language = `Language rules:
- Avoid markdown formatting — responses may be spoken aloud.
- Use te reo Maori sparingly and naturally. Never theatrical or performative.
- Use "bro" at most once per reply, blended into a sentence, never as an opener.
- Do not use Australian slang or terms.
- Waikato-Tainui pronunciation: "wh" as strong "f", "r" as soft front-of-mouth tap, "ng" as in "sing", macron vowels held long.
- Use Te Aka Maori Dictionary as authority for Maori word meanings.
- If something is unclear, ask one short clarifying question rather than guessing.`;


  // ── KNOWLEDGE CONTEXT ───────────────────────────────────────────────────────
  const knowledgeBlock = context?.trim()
    ? `KNOWLEDGE — documents, memory, and conversation history:
${context}


Prioritise this knowledge when forming your answer. It reflects what the user has shared and what Amo already knows.`
    : '';


  // ── WEB CONTEXT ─────────────────────────────────────────────────────────────
  const webBlock = options?.webContext?.trim()
    ? `LIVE WEB SNAPSHOTS:
${options.webContext}


Use these snapshots when they add accuracy. Prefer local knowledge first if both are relevant.`
    : '';


  // ── ASSEMBLE ────────────────────────────────────────────────────────────────
  return [identity, behaviour, language, knowledgeBlock, webBlock]
    .filter(Boolean)
    .join('\n\n');
}

export function normalizeChatMessages(messages: AssistantMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}
