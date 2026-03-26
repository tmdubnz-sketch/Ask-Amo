import { vocabularyService, type VocabularyWord } from './vocabularyService';
import { knowledgeStoreService } from './knowledgeStoreService';

const COMMON_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there',
  'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time',
  'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than',
  'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work',
  'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'is', 'are', 'was',
  'were', 'been', 'being', 'has', 'had', 'did', 'does', 'doing', 'made', 'said', 'came', 'went', 'got', 'seen', 'known', 'taken',
  'become', 'became', 'got', 'getting', 'thing', 'things', 'person', 'people', 'world', 'life', 'hand', 'part', 'child', 'eye',
  'woman', 'man', 'place', 'case', 'week', 'company', 'system', 'program', 'question', 'government', 'number', 'night', 'point',
  'home', 'water', 'room', 'mother', 'area', 'money', 'story', 'fact', 'month', 'lot', 'right', 'study', 'book', 'job', 'word',
  'business', 'issue', 'side', 'kind', 'head', 'house', 'service', 'friend', 'father', 'power', 'hour', 'game', 'line', 'end',
  'member', 'law', 'car', 'city', 'name', 'team', 'minute', 'idea', 'kid', 'body', 'information', 'back', 'face', 'others',
  'level', 'office', 'door', 'health', 'art', 'war', 'history', 'party', 'result', 'change', 'morning', 'reason', 'research',
  'girl', 'guy', 'moment', 'air', 'teacher', 'force', 'education', 'foot', 'boy', 'age', 'policy', 'process', 'music', 'market',
  'sense', 'nation', 'plan', 'college', 'interest', 'death', 'experience', 'effect', 'use', 'class', 'control', 'care', 'field',
  'development', 'role', 'effort', 'rate', 'heart', 'drug', 'show', 'leader', 'light', 'voice', 'wife', 'whole', 'police',
  'mind', 'church', 'report', 'action', 'price', 'need', 'difference', 'picture', 'table', 'group', 'term', 'student',
]);

const TECHNICAL_COMMON = new Set([
  'function', 'return', 'var', 'let', 'const', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue',
  'try', 'catch', 'throw', 'new', 'this', 'class', 'extends', 'import', 'export', 'default', 'async', 'await',
  'true', 'false', 'null', 'undefined', 'typeof', 'instanceof', 'void', 'delete', 'in', 'of',
  'function', 'parameter', 'argument', 'value', 'variable', 'constant', 'string', 'number', 'boolean', 'array', 'object',
  'property', 'method', 'event', 'listener', 'callback', 'promise', 'async', 'await', 'error', 'exception',
  'console', 'log', 'print', 'debug', 'trace', 'warn', 'error',
  'file', 'folder', 'directory', 'path', 'import', 'export', 'require', 'module', 'package', 'dependency',
  'server', 'client', 'request', 'response', 'header', 'body', 'query', 'param', 'route', 'endpoint', 'api', 'rest', 'http', 'https',
  'database', 'query', 'table', 'row', 'column', 'index', 'key', 'value', 'select', 'insert', 'update', 'delete',
  'git', 'commit', 'push', 'pull', 'merge', 'branch', 'clone', 'fetch', 'checkout',
  'npm', 'node', 'python', 'java', 'javascript', 'typescript', 'html', 'css', 'json', 'xml',
  'build', 'run', 'start', 'stop', 'install', 'test', 'deploy', 'debug',
  'error', 'warning', 'info', 'success', 'fail', 'exception',
  'data', 'cache', 'session', 'token', 'auth', 'login', 'logout', 'user', 'admin',
]);

export type LearningSource = 'chat' | 'document' | 'web' | 'transcription' | 'file-edit' | 'code';

export interface LearningContext {
  source: LearningSource;
  sourceId?: string;
  sourceUrl?: string;
  title?: string;
  timestamp: number;
}

export interface ExtractedTerm {
  word: string;
  context: string;
  frequency: number;
  isNew: boolean;
}

class AutoLearningService {
  private knownWords: Set<string> = new Set();
  private initialized = false;
  private lastVocabularyUpdate = 0;

  async init() {
    if (this.initialized) return;
    
    await this.loadKnownVocabulary();
    this.initialized = true;
  }

  private async loadKnownVocabulary() {
    try {
      const words = await vocabularyService.getAllVocabularyWordsPublic();
      for (const word of words) {
        this.knownWords.add(word.word.toLowerCase());
      }
    } catch (e) {
      console.warn('[AutoLearning] Failed to load vocabulary:', e);
    }
  }

  async refreshVocabulary() {
    if (Date.now() - this.lastVocabularyUpdate > 60000) {
      await this.loadKnownVocabulary();
      this.lastVocabularyUpdate = Date.now();
    }
  }

  extractTerms(text: string, context: LearningContext): ExtractedTerm[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s'-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

    const termCounts = new Map<string, number>();
    const termContexts = new Map<string, string>();

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (COMMON_WORDS.has(word) || TECHNICAL_COMMON.has(word)) continue;
      if (/^\d+$/.test(word)) continue;
      if (word.includes("'") && word.length < 5) continue;

      termCounts.set(word, (termCounts.get(word) || 0) + 1);

      if (!termContexts.has(word)) {
        const start = Math.max(0, i - 3);
        const end = Math.min(words.length, i + 4);
        termContexts.set(word, words.slice(start, end).join(' '));
      }
    }

    const terms: ExtractedTerm[] = [];
    for (const [word, frequency] of termCounts) {
      terms.push({
        word,
        context: termContexts.get(word) || '',
        frequency,
        isNew: !this.knownWords.has(word),
      });
    }

    return terms.sort((a, b) => b.frequency - a.frequency).slice(0, 20);
  }

  async learnFromText(text: string, context: LearningContext): Promise<number> {
    await this.init();
    await this.refreshVocabulary();

    const terms = this.extractTerms(text, context);
    const newTerms = terms.filter(t => t.isNew);

    if (newTerms.length === 0) return 0;

    const vocabularyWords: Partial<VocabularyWord>[] = newTerms.slice(0, 10).map(term => ({
      word: term.word,
      definition: '',
      partOfSpeech: 'other' as const,
      examples: [term.context],
      synonyms: [],
      antonyms: [],
      context: `${context.source}: ${term.context}`,
      source: this.mapSource(context.source),
      sourceUrl: context.sourceUrl,
      difficulty: this.estimateDifficulty(term.word),
      frequency: term.frequency,
      learnedAt: Date.now(),
      lastReviewed: Date.now(),
      reviewCount: 0,
      masteryLevel: 0,
      tags: [context.source, context.title || 'auto-learned'],
      relatedConcepts: [],
    }));

    try {
      await vocabularyService.saveVocabularyWords(vocabularyWords as VocabularyWord[]);
      
      for (const term of newTerms.slice(0, 10)) {
        this.knownWords.add(term.word);
      }

      await this.storeLearnedTerms(context, newTerms.slice(0, 10));

      return newTerms.slice(0, 10).length;
    } catch (e) {
      console.error('[AutoLearning] Failed to save terms:', e);
      return 0;
    }
  }

  private async storeLearnedTerms(context: LearningContext, terms: ExtractedTerm[]) {
    const content = terms.map(t => `"${t.word}" (${t.frequency}x) - context: "${t.context}"`).join('\n');
    
    try {
      await knowledgeStoreService.upsertChunk({
        id: `learned_${context.source}_${Date.now()}`,
        documentId: `auto_learning_${context.source}`,
        documentName: `Auto-learned from ${context.source}`,
        content: `[Auto-Learning ${context.source}]\n${content}\n\nSource: ${context.sourceUrl || context.source}\nLearned: ${new Date(context.timestamp).toISOString()}`,
        embedding: [],
        metadata: { 
          type: 'auto_learned', 
          source: context.source,
          termCount: terms.length 
        },
      });
    } catch (e) {
      console.warn('[AutoLearning] Failed to store learned terms:', e);
    }
  }

  private mapSource(source: LearningSource): 'dictionary' | 'document' | 'web' | 'user' | 'composer' {
    switch (source) {
      case 'chat': return 'user';
      case 'document': return 'document';
      case 'web': return 'web';
      case 'transcription': return 'user';
      case 'file-edit': return 'document';
      case 'code': return 'document';
      default: return 'user';
    }
  }

  private estimateDifficulty(word: string): 'basic' | 'intermediate' | 'advanced' | 'expert' {
    const length = word.length;
    
    if (length <= 5) return 'basic';
    if (length <= 8) return 'intermediate';
    if (length <= 12) return 'advanced';
    return 'expert';
  }

  async learnFromChat(message: string, chatId: string) {
    return this.learnFromText(message, {
      source: 'chat',
      sourceId: chatId,
      timestamp: Date.now(),
    });
  }

  async learnFromDocument(content: string, documentName: string, documentId?: string) {
    return this.learnFromText(content, {
      source: 'document',
      sourceId: documentId,
      title: documentName,
      timestamp: Date.now(),
    });
  }

  async learnFromWeb(content: string, url: string, title?: string) {
    return this.learnFromText(content, {
      source: 'web',
      sourceUrl: url,
      title,
      timestamp: Date.now(),
    });
  }

  async learnFromTranscription(text: string) {
    return this.learnFromText(text, {
      source: 'transcription',
      timestamp: Date.now(),
    });
  }

  async learnFromCode(code: string, filename: string) {
    const codeTerms = this.extractTerms(code, {
      source: 'code',
      title: filename,
      timestamp: Date.now(),
    });
    
    return this.learnFromText(code, {
      source: 'code',
      title: filename,
      timestamp: Date.now(),
    });
  }

  async learnFromFileEdit(content: string, filename: string) {
    return this.learnFromText(content, {
      source: 'file-edit',
      title: filename,
      timestamp: Date.now(),
    });
  }

  getNewTermsCount(text: string): number {
    const terms = this.extractTerms(text, { source: 'chat', timestamp: Date.now() });
    return terms.filter(t => t.isNew).length;
  }
}

export const autoLearningService = new AutoLearningService();
