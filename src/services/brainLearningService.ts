import { amoBrainService } from './amoBrainService';
import { webAssistService } from './webAssistService';
import { vectorDbService } from './vectorDbService';

export const brainLearningService = {

  async analyseAndLearn(
    userInput: string,
    amoReply: string,
    chatId: string,
  ): Promise<void> {
    void this.extractAndStore(userInput, amoReply, chatId);
  },

  async extractAndStore(
    userInput: string,
    amoReply: string,
    chatId: string,
  ): Promise<void> {
    try {
      const selfFact = this.extractUserFact(userInput);
      if (selfFact) {
        await amoBrainService.learnFact(
          selfFact.topic,
          selfFact.content,
          ['user-fact', 'personal'],
        );
      }

      const isFactualAnswer = this.looksFactual(userInput, amoReply);
      if (isFactualAnswer) {
        const topic = userInput.slice(0, 60).trim();
        await amoBrainService.learnFact(
          topic,
          amoReply.slice(0, 400),
          ['factual-answer', 'cached'],
        );
      }

      const correction = this.extractCorrection(userInput);
      if (correction) {
        await amoBrainService.updateFact(correction.topic, correction.newValue);
        console.info('[BrainLearning] Correction applied:', correction.topic);
      }

      const needsWebLearning = this.needsWebData(userInput, amoReply);
      if (needsWebLearning && typeof navigator !== 'undefined' && navigator.onLine) {
        const webContent = await webAssistService.resolve(userInput);
        if (webContent) {
          const docId = `web-learned:${Date.now()}`;
          await vectorDbService.addDocument({
            id: docId,
            documentId: docId,
            documentName: `Learned: ${userInput.slice(0, 50)}`,
            content: webContent,
            metadata: {
              assetKind: 'dataset',
              source: 'self-learned',
              learnedAt: new Date().toISOString(),
            },
          });
        }
      }

    } catch (e) {
      console.warn('[BrainLearning] Background learning failed:', e);
    }
  },

  extractUserFact(input: string): { topic: string; content: string } | null {
    const patterns = [
      { re: /my name is ([^.!?]+)/i,         topic: 'User name' },
      { re: /i(?:'m| am) ([^.!?,]+)/i,        topic: 'User identity' },
      { re: /i work (?:at|for) ([^.!?,]+)/i,  topic: 'User employer' },
      { re: /i live in ([^.!?,]+)/i,           topic: 'User location' },
      { re: /i prefer ([^.!?,]+)/i,            topic: 'User preference' },
      { re: /i(?:'m| am) (?:a |an )?([^.!?,]+(?:developer|designer|engineer|teacher|student|manager))/i, topic: 'User role' },
    ];
    for (const { re, topic } of patterns) {
      const match = input.match(re);
      if (match) {
        return { topic, content: `${topic}: ${match[1].trim()}` };
      }
    }
    return null;
  },

  extractCorrection(input: string): { topic: string; newValue: string } | null {
    const correctionPatterns = [
      /actually[,\s]+it(?:'s| is) ([^.!?]+)/i,
      /that(?:'s| is) wrong[,\s]+it(?:'s| is) ([^.!?]+)/i,
      /no[,\s]+it(?:'s| is) ([^.!?]+)/i,
      /you(?:'re| are) wrong[,\s]+([^.!?]+)/i,
    ];
    for (const pattern of correctionPatterns) {
      const match = input.match(pattern);
      if (match) {
        return {
          topic: match[1].slice(0, 40),
          newValue: match[1].trim(),
        };
      }
    }
    return null;
  },

  looksFactual(question: string, answer: string): boolean {
    const q = question.toLowerCase();
    const factualStarters = ['what is', 'who is', 'when did', 'where is', 'how does', 'what are'];
    const isFactualQ = factualStarters.some(s => q.startsWith(s));
    const isShortAnswer = answer.length > 20 && answer.length < 600;
    const isNotTask = !/(create|write|build|run|open|make|generate)/i.test(q);
    return isFactualQ && isShortAnswer && isNotTask;
  },

  needsWebData(question: string, answer: string): boolean {
    const admitsIgnorance = /(i don't know|i'm not sure|i can't|unclear|not certain)/i.test(answer);
    const isTimeSensitive = /(latest|current|today|recent|now|2024|2025|2026)/i.test(question);
    return admitsIgnorance || isTimeSensitive;
  },
};
