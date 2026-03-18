import { knowledgeStoreService } from './knowledgeStoreService';
import { webBrowserService } from './webBrowserService';
import { documentService } from './documentService';
import { createError, ERROR_CODES, logError } from './errorHandlingService';

export interface VocabularyWord {
  id: string;
  word: string;
  definition: string;
  partOfSpeech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' | 'preposition' | 'conjunction' | 'interjection' | 'other';
  pronunciation?: string;
  etymology?: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  context: string;
  source: 'dictionary' | 'document' | 'web' | 'user' | 'composer';
  sourceUrl?: string;
  difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert';
  frequency: number;
  learnedAt: number;
  lastReviewed: number;
  reviewCount: number;
  masteryLevel: number; // 0-100
  tags: string[];
  relatedConcepts: string[];
}

export interface VocabularySet {
  id: string;
  name: string;
  description: string;
  words: VocabularyWord[];
  createdAt: number;
  updatedAt: number;
  source: string;
  category: 'general' | 'technical' | 'academic' | 'business' | 'creative' | 'scientific';
  difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert';
  wordCount: number;
}

export interface VocabularyStats {
  totalWords: number;
  masteredWords: number;
  learningWords: number;
  newWords: number;
  averageMastery: number;
  wordsByDifficulty: Record<string, number>;
  wordsByPartOfSpeech: Record<string, number>;
  recentAdditions: VocabularyWord[];
  upcomingReviews: VocabularyWord[];
}

export interface ComposerRequest {
  topic: string;
  difficulty?: 'basic' | 'intermediate' | 'advanced' | 'expert';
  category?: 'general' | 'technical' | 'academic' | 'business' | 'creative' | 'scientific';
  wordCount?: number;
  context?: string;
  includeDefinitions?: boolean;
  includeExamples?: boolean;
  includeRelations?: boolean;
  source?: 'dictionary' | 'document' | 'web' | 'user' | 'composer';
  sourceUrl?: string;
}

class VocabularyService {
  private readonly STORAGE_KEY = 'amo_vocabulary';
  private readonly REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60, 90]; // days

  /**
   * Extract vocabulary from web content using composer
   */
  async extractFromWeb(url: string, options: Partial<ComposerRequest> = {}): Promise<VocabularyWord[]> {
    try {
      logError('VocabularyService', `Extracting vocabulary from web: ${url}`, 'extractFromWeb');
      
      // Fetch page content
      const page = await webBrowserService.fetchPage(url, 5000);
      if (!page?.content) {
        throw createError('VocabularyService', ERROR_CODES.NETWORK_REQUEST_FAILED, 'Failed to fetch page content');
      }

      // Extract vocabulary using AI
      const words = await this.extractVocabularyFromText(page.content, {
        ...options,
        source: 'web',
        sourceUrl: url,
        context: `From page: ${page.title}`,
        topic: options.topic || 'general'
      });

      // Save extracted vocabulary
      await this.saveVocabularyWords(words);
      
      logError('VocabularyService', `Extracted ${words.length} words from web`, 'extractFromWeb');
      return words;
    } catch (error) {
      logError('VocabularyService', error, 'extractFromWeb');
      throw error;
    }
  }

  /**
   * Extract vocabulary from uploaded document
   */
  async extractFromFile(file: File, options: Partial<ComposerRequest> = {}): Promise<VocabularyWord[]> {
    try {
      logError('VocabularyService', `Extracting vocabulary from file: ${file.name}`, 'extractFromFile');
      
      // Parse document content
      const parsed = await documentService.parseFile(file);
      if (!parsed) {
        throw createError('VocabularyService', ERROR_CODES.FILE_NOT_FOUND, 'Failed to parse file content');
      }

      // Extract vocabulary using AI
      const words = await this.extractVocabularyFromText(typeof parsed === 'string' ? parsed : parsed.content || '', {
        ...options,
        source: 'document',
        context: `From document: ${file.name}`,
        topic: options.topic || 'general'
      });

      // Save extracted vocabulary
      await this.saveVocabularyWords(words);
      
      logError('VocabularyService', `Extracted ${words.length} words from file`, 'extractFromFile');
      return words;
    } catch (error) {
      logError('VocabularyService', error, 'extractFromFile');
      throw error;
    }
  }

  /**
   * Use composer to generate vocabulary for a specific topic
   */
  async generateVocabularySet(request: ComposerRequest): Promise<VocabularySet> {
    try {
      logError('VocabularyService', `Generating vocabulary set for topic: ${request.topic}`, 'generateVocabularySet');
      
      const prompt = this.buildComposerPrompt(request);
      
      // This would integrate with Amo's AI to generate vocabulary
      // For now, we'll simulate with a basic implementation
      const words = await this.generateVocabularyWithAI(prompt, request);
      
      const vocabularySet: VocabularySet = {
        id: `set-${Date.now()}`,
        name: `${request.topic} Vocabulary`,
        description: `Vocabulary set for ${request.topic} (${request.difficulty || 'intermediate'})`,
        words,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        source: 'composer',
        category: request.category || 'general',
        difficulty: request.difficulty || 'intermediate',
        wordCount: words.length
      };

      await this.saveVocabularySet(vocabularySet);
      await this.saveVocabularyWords(words);
      
      logError('VocabularyService', `Generated vocabulary set with ${words.length} words`, 'generateVocabularySet');
      return vocabularySet;
    } catch (error) {
      logError('VocabularyService', error, 'generateVocabularySet');
      throw error;
    }
  }

  /**
   * Add a single vocabulary word manually
   */
  async addVocabularyWord(word: Omit<VocabularyWord, 'id' | 'learnedAt' | 'lastReviewed' | 'reviewCount' | 'masteryLevel'>): Promise<VocabularyWord> {
    try {
      const vocabularyWord: VocabularyWord = {
        ...word,
        id: `word-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        learnedAt: Date.now(),
        lastReviewed: Date.now(),
        reviewCount: 0,
        masteryLevel: 0
      };

      await this.saveVocabularyWords([vocabularyWord]);
      return vocabularyWord;
    } catch (error) {
      logError('VocabularyService', error, 'addVocabularyWord');
      throw error;
    }
  }

  /**
   * Get vocabulary statistics
   */
  async getVocabularyStats(): Promise<VocabularyStats> {
    try {
      const words = await this.getAllVocabularyWords();
      
      const stats: VocabularyStats = {
        totalWords: words.length,
        masteredWords: words.filter(w => w.masteryLevel >= 80).length,
        learningWords: words.filter(w => w.masteryLevel >= 20 && w.masteryLevel < 80).length,
        newWords: words.filter(w => w.masteryLevel < 20).length,
        averageMastery: words.length > 0 ? words.reduce((sum, w) => sum + w.masteryLevel, 0) / words.length : 0,
        wordsByDifficulty: this.groupByField(words, 'difficulty'),
        wordsByPartOfSpeech: this.groupByField(words, 'partOfSpeech'),
        recentAdditions: words
          .sort((a, b) => b.learnedAt - a.learnedAt)
          .slice(0, 10),
        upcomingReviews: this.getUpcomingReviews(words)
      };

      return stats;
    } catch (error) {
      logError('VocabularyService', error, 'getVocabularyStats');
      throw error;
    }
  }

  /**
   * Review and update mastery level for a word
   */
  async reviewWord(wordId: string, performance: 'excellent' | 'good' | 'fair' | 'poor'): Promise<VocabularyWord> {
    try {
      const words = await this.getAllVocabularyWords();
      const wordIndex = words.findIndex(w => w.id === wordId);
      
      if (wordIndex === -1) {
        throw createError('VocabularyService', ERROR_CODES.FILE_NOT_FOUND, 'Word not found');
      }

      const word = words[wordIndex];
      const performanceScore = { excellent: 100, good: 75, fair: 50, poor: 25 }[performance];
      
      // Update mastery level using spaced repetition algorithm
      const newMasteryLevel = Math.min(100, Math.max(0, 
        word.masteryLevel * 0.7 + performanceScore * 0.3
      ));
      
      word.masteryLevel = newMasteryLevel;
      word.lastReviewed = Date.now();
      word.reviewCount += 1;
      
      await this.saveVocabularyWords([word]);
      return word;
    } catch (error) {
      logError('VocabularyService', error, 'reviewWord');
      throw error;
    }
  }

  /**
   * Search vocabulary words
   */
  async searchVocabulary(query: string, filters?: {
    difficulty?: string;
    partOfSpeech?: string;
    category?: string;
    source?: string;
  }): Promise<VocabularyWord[]> {
    try {
      const words = await this.getAllVocabularyWords();
      
      return words.filter(word => {
        const matchesQuery = !query || 
          word.word.toLowerCase().includes(query.toLowerCase()) ||
          word.definition.toLowerCase().includes(query.toLowerCase()) ||
          word.examples.some(e => e.toLowerCase().includes(query.toLowerCase()));
        
        const matchesDifficulty = !filters?.difficulty || word.difficulty === filters.difficulty;
        const matchesPartOfSpeech = !filters?.partOfSpeech || word.partOfSpeech === filters.partOfSpeech;
        const matchesCategory = !filters?.category || word.tags.includes(filters.category);
        const matchesSource = !filters?.source || word.source === filters.source;
        
        return matchesQuery && matchesDifficulty && matchesPartOfSpeech && matchesCategory && matchesSource;
      });
    } catch (error) {
      logError('VocabularyService', error, 'searchVocabulary');
      throw error;
    }
  }

  /**
   * Get words due for review
   */
  async getWordsForReview(): Promise<VocabularyWord[]> {
    try {
      const words = await this.getAllVocabularyWords();
      const now = Date.now();
      
      return words.filter(word => {
        const daysSinceLastReview = (now - word.lastReviewed) / (1000 * 60 * 60 * 24);
        const reviewInterval = this.REVIEW_INTERVALS[Math.min(word.reviewCount, this.REVIEW_INTERVALS.length - 1)];
        
        return daysSinceLastReview >= reviewInterval && word.masteryLevel < 100;
      }).sort((a, b) => a.lastReviewed - b.lastReviewed);
    } catch (error) {
      logError('VocabularyService', error, 'getWordsForReview');
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async extractVocabularyFromText(text: string, options: Partial<ComposerRequest>): Promise<VocabularyWord[]> {
    // This would integrate with Amo's AI to extract vocabulary
    // For now, return a basic implementation
    const words: VocabularyWord[] = [];
    
    // Simple word extraction (would be replaced with AI-powered extraction)
    const wordMatches = text.match(/\b[a-zA-Z]{4,}\b/g) || [];
    const uniqueWords = [...new Set(wordMatches.map(w => w.toLowerCase()))];
    
    for (const word of uniqueWords.slice(0, options.wordCount || 20)) {
      words.push({
        id: `word-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        word,
        definition: `Definition for ${word}`,
        partOfSpeech: 'other',
        examples: [`Example using ${word}`],
        synonyms: [],
        antonyms: [],
        context: options.context || '',
        source: options.source || 'user',
        sourceUrl: options.sourceUrl,
        difficulty: options.difficulty || 'intermediate',
        frequency: 1,
        learnedAt: Date.now(),
        lastReviewed: Date.now(),
        reviewCount: 0,
        masteryLevel: 0,
        tags: [options.category || 'general'],
        relatedConcepts: []
      });
    }
    
    return words;
  }

  private async generateVocabularyWithAI(prompt: string, request: ComposerRequest): Promise<VocabularyWord[]> {
    // This would integrate with Amo's AI service
    // For now, return mock data
    const mockWords: VocabularyWord[] = [];
    
    for (let i = 0; i < (request.wordCount || 10); i++) {
      mockWords.push({
        id: `word-${Date.now()}-${i}`,
        word: `${request.topic}_${i}`,
        definition: `Definition related to ${request.topic}`,
        partOfSpeech: 'noun',
        examples: [`Example using ${request.topic}_${i}`],
        synonyms: [],
        antonyms: [],
        context: `Related to ${request.topic}`,
        source: 'composer',
        difficulty: request.difficulty || 'intermediate',
        frequency: 1,
        learnedAt: Date.now(),
        lastReviewed: Date.now(),
        reviewCount: 0,
        masteryLevel: 0,
        tags: [request.category || 'general'],
        relatedConcepts: [request.topic]
      });
    }
    
    return mockWords;
  }

  private buildComposerPrompt(request: ComposerRequest): string {
    return `
Generate a vocabulary set for the topic: ${request.topic}
Difficulty level: ${request.difficulty || 'intermediate'}
Category: ${request.category || 'general'}
Number of words: ${request.wordCount || 10}
Context: ${request.context || 'General learning'}

For each word, provide:
- The word
- Definition
- Part of speech
- Pronunciation (if available)
- 2-3 example sentences
- Synonyms and antonyms
- Related concepts
- Difficulty assessment

Format as structured data for processing.
    `.trim();
  }

  private async getAllVocabularyWords(): Promise<VocabularyWord[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      logError('VocabularyService', error, 'getAllVocabularyWords');
      return [];
    }
  }

  public async saveVocabularyWords(words: VocabularyWord[]): Promise<void> {
    try {
      const existing = await this.getAllVocabularyWords();
      const wordMap = new Map(existing.map(w => [w.id, w]));
      
      // Add or update words
      words.forEach(word => wordMap.set(word.id, word));
      
      const updated = Array.from(wordMap.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      logError('VocabularyService', error, 'saveVocabularyWords');
      throw error;
    }
  }

  private async saveVocabularySet(set: VocabularySet): Promise<void> {
    try {
      const setsKey = `${this.STORAGE_KEY}_sets`;
      const existing = JSON.parse(localStorage.getItem(setsKey) || '[]');
      existing.push(set);
      localStorage.setItem(setsKey, JSON.stringify(existing));
    } catch (error) {
      logError('VocabularyService', error, 'saveVocabularySet');
      throw error;
    }
  }

  private groupByField(words: VocabularyWord[], field: keyof VocabularyWord): Record<string, number> {
    return words.reduce((acc, word) => {
      const key = String(word[field]);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getUpcomingReviews(words: VocabularyWord[]): VocabularyWord[] {
    const now = Date.now();
    return words
      .filter(word => {
        const daysSinceLastReview = (now - word.lastReviewed) / (1000 * 60 * 60 * 24);
        const reviewInterval = this.REVIEW_INTERVALS[Math.min(word.reviewCount, this.REVIEW_INTERVALS.length - 1)];
        return daysSinceLastReview >= reviewInterval - 1 && daysSinceLastReview <= reviewInterval + 1;
      })
      .sort((a, b) => a.lastReviewed - b.lastReviewed)
      .slice(0, 5);
  }
}

export const vocabularyService = new VocabularyService();
