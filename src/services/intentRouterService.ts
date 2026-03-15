export interface IntentRouteResult {
  canonicalInput: string;
  instantReply?: string;
  offlineCommand?: string;
  preferWebAssist?: boolean;
  forceRetrieval?: boolean;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeModernSlang(text: string): string {
  return text
    .replace(/\bu\b/gi, 'you')
    .replace(/\bya\b/gi, 'you')
    .replace(/\br\b/gi, 'are')
    .replace(/\bur\b/gi, 'your')
    .replace(/\bwat\b/gi, 'what')
    .replace(/\bwot\b/gi, 'what')
    .replace(/\bgonna\b/gi, 'going to')
    .replace(/\bwanna\b/gi, 'want to')
    .replace(/\bim\b/gi, 'I am')
    .replace(/\baint\b/gi, 'is not')
    .replace(/\bthx\b/gi, 'thanks')
    .replace(/\btks\b/gi, 'thanks')
    .replace(/\bplz\b/gi, 'please')
    .replace(/\bnz\b/gi, 'New Zealand')
    .replace(/\bhows\b/gi, 'how is')
    .replace(/\bhowsit\b/gi, 'how is it')
    .replace(/\bwa\b/gi, 'what');
}

function cleanTranscript(rawText: string): string {
  let text = normalizeWhitespace(rawText);
  if (!text) return text;

  text = normalizeModernSlang(text);

  text = text
    .replace(/\bkiaora\b/gi, 'kia ora')
    .replace(/\bask amo\b/gi, 'Ask Amo')
    .replace(/\bamo\b/gi, 'Amo')
    .replace(/\bi\b/g, 'I');

  if (/^[a-z]/.test(text)) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  if (!/[.!?]$/.test(text) && text.length > 2) {
    text += '.';
  }

  return text;
}

export function normalizeTranscriptText(rawText: string): string {
  return cleanTranscript(rawText);
}

function scoreIntent(input: string, keywords: string[]): number {
  const lowered = input.toLowerCase();
  let score = 0;
  const words = lowered.split(/\W+/).filter(Boolean);

  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    if (kwLower.includes(' ')) {
      // Check for multi-word phrase anywhere in the input
      if (lowered.includes(kwLower)) {
        score += 1.5;
      }
    } else {
      // Check for single keyword at the word level
      if (words.includes(kwLower)) {
        score += 1;
      } else {
        // Simple typo tolerance (Levenshtein-ish check for words > 4 chars)
        for (const word of words) {
          if (word.length > 4 && kwLower.length > 4) {
            const diff = Math.abs(word.length - kwLower.length);
            if (diff <= 1 && word.startsWith(kwLower.substring(0, 3))) {
              // Basic fuzzy match
              score += 0.5;
            }
          }
        }
      }
    }
  }
  return score;
}

export function routeUserIntent(rawInput: string): IntentRouteResult {
  const canonicalInput = cleanTranscript(rawInput);
  const lowered = canonicalInput.toLowerCase();

  if (!canonicalInput) {
    return { canonicalInput };
  }

  // --- Self-Knowledge Patterns: force retrieval from knowledge brain ---
  const selfKnowledgePatterns = [
    /how (do|can|to) (i|you|amo|we)/i,
    /can (you|amo)/i,
    /what (can|does|do) (you|amo)/i,
    /how (does|do) .*(work|use|open|run|access)/i,
    /show me how/i,
    /what is the .*(editor|terminal|webview|browser|voice|chat|knowledge|memory|brain)/i,
    /\b(feature|guide|help|tutorial|how to)\b/i,
    /how.*(terminal|webview|editor|code editor|voice|chat|browser|settings|knowledge|memory)/i,
    /how.*(import|upload|download|attach)/i,
    /what.*(feature|capability|tool)/i,
    /list.*(feature|tool|capability)/i,
  ];

  const isSelfKnowledgeQuery = selfKnowledgePatterns.some(p => p.test(lowered));

  // --- 1. Small Talk & Greetings ---
  const greetKeywords = ['hi', 'hey', 'hello', 'kia ora', 'kiaora', 'yo', 'sup', 'morning', 'afternoon', 'evening', 'chur', 'bro', 'cuz', 'g', 'how are you', 'how u', 'hows it', 'howsit', 'howsit going', 'how is it'];
  const greetWords = lowered.split(/\W+/).filter(Boolean);
  if (scoreIntent(lowered, greetKeywords) >= 1 && greetWords.length <= 6) {
    if (lowered.includes('how') || lowered.includes('sup') || lowered.includes('status')) {
      const replies = ['All good bro.', 'Sweet as bro.', 'Yea not bad.', 'I dont have feelings, but I am ready to help.'];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      return { canonicalInput, instantReply: randomReply };
    }
    if (lowered.includes('chur')) return { canonicalInput, instantReply: 'Chur. What can I do for you?' };
    return {
      canonicalInput,
      instantReply: 'Kia ora. How can I help you?',
    };
  }

  const identityKeywords = ['who are you', 'what are you', 'introduce yourself', 'tell me about yourself', 'who is amo', 'what is amo'];
  if (scoreIntent(lowered, identityKeywords) >= 1) {
    // Force retrieval from self-knowledge for identity questions
    return {
      canonicalInput,
      forceRetrieval: true,
    };
  }

  // --- 2. Capabilities & Help ---
  const helpKeywords = ['help', 'do', 'can', 'offline', 'capability', 'capabilities', 'how', 'assist'];
  if (scoreIntent(lowered, helpKeywords) >= 2 && !lowered.includes('knowledge')) {
    // Force retrieval for capability questions to get detailed answer from self-knowledge
    return {
      canonicalInput,
      forceRetrieval: true,
    };
  }

  const statusKeywords = ['how', 'are', 'you', 'doing', 'status', 'there', 'ready'];
  if (scoreIntent(lowered, statusKeywords) >= 2 && (lowered.includes('how') || lowered.includes('ready'))) {
    return {
      canonicalInput,
      instantReply: "I'm here and ready to help.",
    };
  }

  // --- 3. App Guidance & Navigation ---
  const navKeywords = ['how to use', 'navigate', 'settings', 'change model', 'where is', 'how do i', 'instructions', 'help me with this app'];
  if (scoreIntent(lowered, navKeywords) >= 1.5) {
    if (lowered.includes('settings')) return { canonicalInput, instantReply: 'You can find Settings by clicking the gear icon in the top right. There you can change models, API keys, and voice options.' };
    if (lowered.includes('model') || lowered.includes('change')) return { canonicalInput, instantReply: 'To change models, go to Settings > Models. You can pick between Cloud (Gemini, Groq) or Native Offline.' };
    if (lowered.includes('knowledge') || lowered.includes('documents')) return { canonicalInput, instantReply: 'To import documents, go to Settings > Knowledge and use the upload buttons.' };
    return { canonicalInput, instantReply: 'I can help with that. You can chat with me, use voice mode (mic icon), or go to Settings to configure your experience. What specifically do you need to find?' };
  }

  // --- 3. Offline Commands (Knowledge/Files) ---
  const fileKeywords = ['files', 'docs', 'knowledge', 'imported', 'show', 'list', 'my', 'documents'];
  if (scoreIntent(lowered, fileKeywords) >= 2) {
    return {
      canonicalInput,
      offlineCommand: 'show imported knowledge',
    };
  }

  const workspaceKeywords = ['workspace', 'connected', 'check', 'status', 'location', 'path'];
  if (scoreIntent(lowered, workspaceKeywords) >= 2 && lowered.includes('workspace')) {
    return {
      canonicalInput,
      offlineCommand: 'show workspace status',
    };
  }

  const modelKeywords = ['models', 'offline', 'local', 'installed', 'show', 'list', 'GGUF'];
  if (scoreIntent(lowered, modelKeywords) >= 2 && (lowered.includes('models') || lowered.includes('local'))) {
    return {
      canonicalInput,
      offlineCommand: 'show offline models',
    };
  }

  const offlineStatusKeywords = ['offline', 'status', 'local', 'running', 'active'];
  if (scoreIntent(lowered, offlineStatusKeywords) >= 2 && lowered.includes('status')) {
    return {
      canonicalInput,
      offlineCommand: 'offline status',
    };
  }

  // --- 4. Web Assist & Factual Trigger ---
  const webKeywords = ['search', 'look up', 'find', 'online', 'web', 'internet', 'latest', 'today', 'news', 'who is', 'what is', 'where is', 'why is', 'tell me about', 'what is ai', 'how does ai work'];
  if (scoreIntent(lowered, webKeywords) >= 1) {
    return {
      canonicalInput,
      preferWebAssist: true,
    };
  }

  // --- 5. Politeness & Acknowledgments ---
  const acknowledgmentKeywords = ['yea', 'na', 'ae', 'shot', 'shot bro', 'mean', 'choice', 'hard', 'hardout', 'sweet as', 'kare', 'ae kare'];
  if (scoreIntent(lowered, acknowledgmentKeywords) >= 1 && lowered.split(/\W+/).length <= 3) {
    if (lowered.includes('shot')) return { canonicalInput, instantReply: 'Too right. Glad I could help.' };
    if (lowered.includes('mean') || lowered.includes('choice')) return { canonicalInput, instantReply: 'Chur, choice one.' };
    if (lowered.includes('hard') || lowered.includes('hardout')) return { canonicalInput, instantReply: 'Too right.' };
    if (lowered.includes('ae') || (lowered.includes('yea') && !lowered.includes('na'))) return { canonicalInput, instantReply: 'Ae, choice.' };
    if (lowered.includes('kare')) return { canonicalInput, instantReply: 'Ae kare, all good.' };
    if (lowered.includes('na')) return { canonicalInput, instantReply: 'No worries.' };
    return { canonicalInput, instantReply: 'Sweet as.' };
  }

  // --- 6. Confusion & Disagreement ---
  const confusionKeywords = ['what the hell', 'what the heck', 'what the heke', 'what you on', 'what you on about', 'you reckon but'];
  if (scoreIntent(lowered, confusionKeywords) >= 1) {
    return { canonicalInput, instantReply: "Sorry if that's a bit much. What can I clarify for you?" };
  }

  const disagreementKeywords = ['not even', 'i dont think so', 'sorry but', 'im afraid not', 'not this time', 'cut it out'];
  if (scoreIntent(lowered, disagreementKeywords) >= 1) {
    if (lowered.includes('not even')) return { canonicalInput, instantReply: 'Fair enough. We can drop it.' };
    if (lowered.includes('cut it out')) return { canonicalInput, instantReply: "Understood. I'll stop that." };
    return { canonicalInput, instantReply: 'All good. What should we do instead?' };
  }

  const politeKeywords = ['thanks', 'thank', 'cheers', 'awesome', 'cool', 'great'];
  if (scoreIntent(lowered, politeKeywords) >= 1 && lowered.split(/\W+/).length <= 4) {
    return {
      canonicalInput,
      instantReply: "You're welcome.",
    };
  }

  // --- Fallback: Self-knowledge query detected but not handled above ---
  if (isSelfKnowledgeQuery) {
    return {
      canonicalInput,
      forceRetrieval: true,
    };
  }

  return { canonicalInput };
}
