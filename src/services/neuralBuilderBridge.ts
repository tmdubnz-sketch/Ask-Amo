import { vocabularyService, type VocabularyWord } from './vocabularyService';
import { sentenceBuilderService } from './sentenceBuilderService';
import { intentEnhancementService } from './intentEnhancementService';

export interface NeuralBuilderLink {
  isActive: boolean;
  vocabulary: {
    words: VocabularyWord[];
    patterns: string[];
    mastery: number;
    lastUpdated: number;
  };
  sentences: {
    templates: Array<{ name: string; structure: string; wordCount: number }>;
    patterns: string[];
    variationCount: number;
  };
  intents: {
    keywords: string[];
    tags: string[];
    predictions: Record<string, string>;
    confidence: number;
  };
  understanding: string;
}

export interface BuilderMemory {
  featureId: string;
  learnedPatterns: string[];
  contextUsed: number;
  lastUsed: number;
}

const NEURAL_PATTERNS = {
  vocabulary: [
    { trigger: /\b(word|vocab|vocabulary|learn(ing)?|word[s]?)\b/i, aspect: 'vocabulary' },
    { trigger: /\b(defini(tion|ng)|meaning|what.*mean)\b/i, aspect: 'vocabulary' },
    { trigger: /\b(synonym|antonym|related)\b/i, aspect: 'vocabulary' },
    { trigger: /\b(flashcard|review|mastery)\b/i, aspect: 'vocabulary' },
  ],
  sentences: [
    { trigger: /\b(sentence|template|variation|phrase|construct)\b/i, aspect: 'sentences' },
    { trigger: /\b(generate|create|build|compose).*sentence/i, aspect: 'sentences' },
    { trigger: /\b(pattern|structure|grammar)\b/i, aspect: 'sentences' },
    { trigger: /\b(template|slot|option)\b/i, aspect: 'sentences' },
  ],
  intents: [
    { trigger: /\b(intent|predict|anticipate|understand.*(want|need|mean))\b/i, aspect: 'intents' },
    { trigger: /\b(keyword|tag|label)\b/i, aspect: 'intents' },
    { trigger: /\b(user.*(want|need|mean|prefer))\b/i, aspect: 'intents' },
    { trigger: /\b(pattern.*match|classif(y|ication))\b/i, aspect: 'intents' },
  ],
};

class NeuralBuilderBridge {
  private memory: Map<string, BuilderMemory> = new Map();
  private lastSync = 0;
  private cachedLink: NeuralBuilderLink | null = null;

  async getNeuralLink(): Promise<NeuralBuilderLink> {
    const now = Date.now();
    
    if (this.cachedLink && now - this.lastSync < 30000) {
      return this.cachedLink;
    }

    try {
      const [vocabStats, sentenceStats, intentStats] = await Promise.all([
        vocabularyService.getVocabularyStats(),
        sentenceBuilderService.getStats(),
        intentEnhancementService.getStats(),
      ]);

      const vocabWords = await vocabularyService.getWordsForReview();
      const recentVocab = vocabWords.slice(0, 50);

      const templates = await sentenceBuilderService.getTemplates();

      const vocabPatterns = recentVocab
        .flatMap(w => [w.word, ...w.synonyms.slice(0, 3)])
        .filter(Boolean)
        .slice(0, 100);

      const sentencePatterns = templates
        .slice(0, 20)
        .map(t => t.name.toLowerCase().replace(/\s+/g, '_'));

      const intentKeywords = intentStats?.topKeywords?.map(k => typeof k === 'string' ? k : k.keyword).slice(0, 30) || [];
      const intentTags = intentStats?.topTags?.map(t => typeof t === 'string' ? t : t.tag).slice(0, 20) || [];

      const predictions: Record<string, string> = {};
      for (const intent of intentStats?.topIntents?.slice(0, 10) || []) {
        predictions[intent.intent] = intent.intent;
      }

      const understanding = this.generateUnderstanding({
        vocabCount: vocabStats?.totalWords || 0,
        sentenceCount: sentenceStats?.totalTemplates || 0,
        intentCount: intentStats?.totalPredictions || 0,
        avgMastery: vocabStats?.averageMastery || 0,
        avgConfidence: intentStats?.averageConfidence || 0,
      });

      this.cachedLink = {
        isActive: true,
        vocabulary: {
          words: recentVocab,
          patterns: vocabPatterns,
          mastery: vocabStats?.averageMastery || 0,
          lastUpdated: vocabStats?.recentAdditions?.[0]?.learnedAt || now,
        },
        sentences: {
          templates: templates.slice(0, 10).map(t => ({
            name: t.name,
            structure: t.structure?.map(s => s.position + ':' + (s.type || 'slot')).join('|') || '',
            wordCount: t.structure?.reduce((sum, s) => sum + (s.options?.length || 0), 0) || 0,
          })),
          patterns: sentencePatterns,
          variationCount: sentenceStats?.totalTemplates ? 
            templates.reduce((sum, t) => {
              const variations = t.structure?.reduce((v, s) => v * ((s.options?.length || 1)), 1) || 1;
              return sum + variations;
            }, 0) : 0,
        },
        intents: {
          keywords: intentKeywords,
          tags: intentTags,
          predictions,
          confidence: intentStats?.averageConfidence || 0,
        },
        understanding,
      };

      this.lastSync = now;
      return this.cachedLink;
    } catch (error) {
      console.error('[NeuralBuilderBridge] Failed to get neural link:', error);
      return {
        isActive: false,
        vocabulary: { words: [], patterns: [], mastery: 0, lastUpdated: 0 },
        sentences: { templates: [], patterns: [], variationCount: 0 },
        intents: { keywords: [], tags: [], predictions: {}, confidence: 0 },
        understanding: 'Builder features currently unavailable.',
      };
    }
  }

  private generateUnderstanding(data: {
    vocabCount: number;
    sentenceCount: number;
    intentCount: number;
    avgMastery: number;
    avgConfidence: number;
  }): string {
    const parts: string[] = [];

    if (data.vocabCount > 0) {
      parts.push(`I have ${data.vocabCount} words in my vocabulary, ${Math.round(data.avgMastery)}% mastered on average.`);
    }
    if (data.sentenceCount > 0) {
      parts.push(`I can generate variations from ${data.sentenceCount} sentence templates.`);
    }
    if (data.intentCount > 0) {
      parts.push(`I understand ${data.intentCount} intent patterns with ${Math.round(data.avgConfidence)}% confidence.`);
    }

    if (parts.length === 0) {
      return "I'm still learning about your language preferences. Use the vocabulary builder, sentence builder, and intent enhancer to teach me.";
    }

    return parts.join(' ') + " These help me understand you better.";
  }

  detectBuilderRelevance(input: string): { aspect: string; confidence: number; matchedPatterns: string[] } {
    const matches: Array<{ aspect: string; confidence: number; pattern: string }> = [];

    for (const [aspect, patterns] of Object.entries(NEURAL_PATTERNS)) {
      for (const { trigger, aspect: asp } of patterns) {
        if (trigger.test(input)) {
          matches.push({
            aspect: asp,
            confidence: 0.8,
            pattern: trigger.source,
          });
        }
      }
    }

    if (matches.length === 0) {
      return { aspect: 'none', confidence: 0, matchedPatterns: [] };
    }

    const best = matches.reduce((a, b) => a.confidence > b.confidence ? a : b);

    return {
      aspect: best.aspect,
      confidence: best.confidence,
      matchedPatterns: matches.map(m => m.pattern),
    };
  }

  async enhanceWithBuilderKnowledge(input: string): Promise<string> {
    const relevance = this.detectBuilderRelevance(input);
    
    if (relevance.aspect === 'none') {
      return '';
    }

    const link = await this.getNeuralLink();
    const enhancements: string[] = [];

    if (relevance.aspect === 'vocabulary' && link.vocabulary.words.length > 0) {
      const relevantWords = link.vocabulary.words
        .filter(w => input.toLowerCase().includes(w.word.toLowerCase()))
        .slice(0, 3);

      if (relevantWords.length > 0) {
        const wordDefs = relevantWords
          .map(w => `${w.word}: ${w.definition || 'known word'}`)
          .join('; ');
        enhancements.push(`[From your vocabulary] ${wordDefs}`);
      }
    }

    if (relevance.aspect === 'sentences' && link.sentences.templates.length > 0) {
      const relevantTemplates = link.sentences.templates
        .filter(t => input.toLowerCase().includes(t.name.toLowerCase().split(' ')[0]))
        .slice(0, 2);

      if (relevantTemplates.length > 0) {
        const templateInfo = relevantTemplates
          .map(t => `${t.name} (${t.wordCount} word options)`)
          .join(', ');
        enhancements.push(`[Your sentence templates] ${templateInfo}`);
      }
    }

    if (relevance.aspect === 'intents' && link.intents.predictions) {
      const matchingKeywords = link.intents.keywords
        .filter(k => input.toLowerCase().includes(k.toLowerCase()));

      if (matchingKeywords.length > 0) {
        enhancements.push(`[Known intent keywords] ${matchingKeywords.slice(0, 5).join(', ')}`);
      }
    }

    return enhancements.join('\n');
  }

  async generateBuilderAwareResponse(input: string): Promise<{
    canUseVocabulary: boolean;
    canUseSentences: boolean;
    canUseIntents: boolean;
    suggestions: string[];
    contextInjection: string;
  }> {
    const link = await this.getNeuralLink();
    const relevance = this.detectBuilderRelevance(input);

    const suggestions: string[] = [];
    let contextInjection = '';

    if (link.vocabulary.words.length > 0) {
      suggestions.push('Use vocabulary definitions from your personal word list');
    }

    if (link.sentences.templates.length > 0) {
      suggestions.push('Generate sentence variations using your templates');
    }

    if (link.intents.predictions && Object.keys(link.intents.predictions).length > 0) {
      suggestions.push('Apply your intent patterns to better understand user needs');
    }

    contextInjection = link.understanding;

    return {
      canUseVocabulary: relevance.aspect === 'vocabulary' || link.vocabulary.words.length > 0,
      canUseSentences: relevance.aspect === 'sentences' || link.sentences.templates.length > 0,
      canUseIntents: relevance.aspect === 'intents' || Object.keys(link.intents.predictions).length > 0,
      suggestions,
      contextInjection,
    };
  }

  rememberBuilderUsage(featureId: string, patterns: string[]) {
    const existing = this.memory.get(featureId);
    const now = Date.now();

    if (existing) {
      const uniquePatterns = [...new Set([...existing.learnedPatterns, ...patterns])];
      this.memory.set(featureId, {
        featureId,
        learnedPatterns: uniquePatterns.slice(0, 50),
        contextUsed: existing.contextUsed + 1,
        lastUsed: now,
      });
    } else {
      this.memory.set(featureId, {
        featureId,
        learnedPatterns: patterns,
        contextUsed: 1,
        lastUsed: now,
      });
    }
  }

  getBuilderMemory(): Array<{ featureId: string; contextUsed: number; lastUsed: number }> {
    return Array.from(this.memory.values()).map(m => ({
      featureId: m.featureId,
      contextUsed: m.contextUsed,
      lastUsed: m.lastUsed,
    }));
  }

  getNeuralExplanation(): string {
    const link = this.cachedLink;
    if (!link || !link.isActive) return "I connect to my learning tools: vocabulary builder, sentence builder, and intent enhancer. They help me understand you better.";

    return `I have a neural connection to your learning tools:
- Vocabulary: ${link.vocabulary.words.length} words indexed with ${Math.round(link.vocabulary.mastery)}% mastery
- Sentence Builder: ${link.sentences.templates.length} templates with ~${link.sentences.variationCount} possible variations  
- Intent Enhancer: ${link.intents.keywords.length} keywords, ${link.intents.tags.length} tags

${link.understanding}`;
  }
}

export const neuralBuilderBridge = new NeuralBuilderBridge();
