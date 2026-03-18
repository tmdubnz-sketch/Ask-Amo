import { createError, ERROR_CODES, logError } from './errorHandlingService';

export interface SentenceTemplate {
  id: string;
  name: string;
  description: string;
  structure: SentenceStructure[];
  weight: number; // 0-100, higher = more likely to be used
  category: 'greeting' | 'question' | 'statement' | 'command' | 'response' | 'custom';
  tags: string[];
  examples: string[];
  difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert';
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  successRate: number; // 0-100, user satisfaction
}

export interface SentenceStructure {
  id: string;
  type: 'subject' | 'verb' | 'object' | 'adjective' | 'adverb' | 'preposition' | 'conjunction' | 'article' | 'determiner' | 'interjection' | 'punctuation' | 'interrogative' | 'auxiliary' | 'custom';
  required: boolean;
  weight: number; // 0-100, affects selection probability
  options: WordOption[];
  position: number;
  flexible: boolean; // can be repositioned
  alternatives: SentenceStructure[]; // alternative structures
}

export interface WordOption {
  id: string;
  text: string;
  weight: number; // 0-100, selection probability
  context?: string;
  tags: string[];
  synonyms?: string[];
  antonyms?: string[];
  examples?: string[];
}

export interface WeightedWordTable {
  id: string;
  name: string;
  description: string;
  category: 'nouns' | 'verbs' | 'adjectives' | 'adverbs' | 'prepositions' | 'conjunctions' | 'articles' | 'interjections' | 'custom';
  words: WeightedWord[];
  totalWeight: number;
  lastUpdated: number;
}

export interface WeightedWord {
  id: string;
  word: string;
  weight: number; // 0-100
  frequency: number; // usage count
  context?: string;
  tags: string[];
  synonyms?: string[];
  antonyms?: string[];
  examples?: string[];
  partOfSpeech: string;
  difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert';
}

export interface SentenceGenerationRequest {
  intent: string;
  context?: string;
  style?: 'formal' | 'informal' | 'technical' | 'creative' | 'casual';
  complexity?: 'simple' | 'moderate' | 'complex';
  length?: 'short' | 'medium' | 'long';
  templateIds?: string[];
  excludeTemplates?: string[];
  customRules?: CustomRule[];
}

export interface CustomRule {
  id: string;
  name: string;
  condition: string; // JavaScript expression
  action: 'include' | 'exclude' | 'modify' | 'reorder';
  target: string; // what to apply rule to
  weight: number;
  enabled: boolean;
}

export interface GeneratedSentence {
  id: string;
  text: string;
  templateId: string;
  structure: SentenceStructure[];
  selectedWords: { structureId: string; word: WeightedWord; position: number }[];
  confidence: number; // 0-100
  metadata: {
    generationTime: number;
    intent: string;
    style: string;
    complexity: string;
    length: string;
    tags: string[];
  };
  alternatives?: string[];
}

export interface SentenceBuilderStats {
  totalTemplates: number;
  totalWords: number;
  averageWeight: number;
  mostUsedTemplates: { templateId: string; name: string; usageCount: number }[];
  mostUsedWords: { wordId: string; word: string; frequency: number }[];
  successRate: number;
  averageGenerationTime: number;
}

class SentenceBuilderService {
  private readonly STORAGE_KEY = 'amo_sentence_builder';
  private readonly DEFAULT_TEMPLATES: SentenceTemplate[] = [
    {
      id: 'greeting-basic',
      name: 'Basic Greeting',
      description: 'Simple greeting structure',
      structure: [
        {
          id: 'greeting-1',
          type: 'interjection',
          required: true,
          weight: 80,
          position: 0,
          flexible: false,
          alternatives: [],
          options: [
            { id: 'hello', text: 'Hello', weight: 90, context: 'friendly greeting', tags: ['formal', 'friendly'] },
            { id: 'hi', text: 'Hi', weight: 85, context: 'casual greeting', tags: ['informal', 'casual'] },
            { id: 'hey', text: 'Hey', weight: 75, context: 'very casual greeting', tags: ['informal', 'very casual'] }
          ]
        },
        {
          id: 'greeting-2',
          type: 'subject',
          required: false,
          weight: 60,
          position: 1,
          flexible: true,
          alternatives: [],
          options: [
            { id: 'there', text: 'there', weight: 80, context: 'attention getter', tags: ['common'] },
            { id: 'everyone', text: 'everyone', weight: 60, context: 'group greeting', tags: ['group'] },
            { id: 'world', text: 'world', weight: 40, context: 'dramatic greeting', tags: ['dramatic'] }
          ]
        },
        {
          id: 'greeting-3',
          type: 'punctuation',
          required: true,
          weight: 95,
          position: 2,
          flexible: false,
          alternatives: [],
          options: [
            { id: 'exclamation', text: '!', weight: 80, context: 'enthusiastic', tags: ['enthusiastic'] },
            { id: 'period', text: '.', weight: 60, context: 'neutral', tags: ['neutral'] },
            { id: 'comma', text: ',', weight: 40, context: 'continuation', tags: ['continuation'] }
          ]
        }
      ],
      weight: 85,
      category: 'greeting',
      tags: ['basic', 'common'],
      examples: ['Hello there!', 'Hi everyone.', 'Hey!'],
      difficulty: 'basic',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
      successRate: 0
    },
    {
      id: 'question-basic',
      name: 'Basic Question',
      description: 'Simple question structure',
      structure: [
        {
          id: 'question-1',
          type: 'interrogative',
          required: true,
          weight: 90,
          position: 0,
          flexible: false,
          alternatives: [],
          options: [
            { id: 'what', text: 'What', weight: 85, context: 'information request', tags: ['information'] },
            { id: 'how', text: 'How', weight: 80, context: 'process inquiry', tags: ['process'] },
            { id: 'why', text: 'Why', weight: 75, context: 'reason inquiry', tags: ['reason'] },
            { id: 'where', text: 'Where', weight: 70, context: 'location inquiry', tags: ['location'] },
            { id: 'when', text: 'When', weight: 65, context: 'time inquiry', tags: ['time'] }
          ]
        },
        {
          id: 'question-2',
          type: 'auxiliary',
          required: false,
          weight: 70,
          position: 1,
          flexible: false,
          alternatives: [],
          options: [
            { id: 'is', text: 'is', weight: 85, context: 'present tense', tags: ['present'] },
            { id: 'are', text: 'are', weight: 80, context: 'present tense plural', tags: ['present', 'plural'] },
            { id: 'do', text: 'do', weight: 75, context: 'present tense', tags: ['present'] },
            { id: 'did', text: 'did', weight: 70, context: 'past tense', tags: ['past'] }
          ]
        },
        {
          id: 'question-3',
          type: 'subject',
          required: true,
          weight: 85,
          position: 2,
          flexible: false,
          alternatives: [],
          options: [
            { id: 'this', text: 'this', weight: 80, context: 'nearby object', tags: ['nearby'] },
            { id: 'that', text: 'that', weight: 75, context: 'distant object', tags: ['distant'] },
            { id: 'it', text: 'it', weight: 70, context: 'impersonal', tags: ['impersonal'] }
          ]
        },
        {
          id: 'question-4',
          type: 'punctuation',
          required: true,
          weight: 95,
          position: 3,
          flexible: false,
          alternatives: [],
          options: [
            { id: 'question-mark', text: '?', weight: 95, context: 'question', tags: ['question'] }
          ]
        }
      ],
      weight: 80,
      category: 'question',
      tags: ['basic', 'common'],
      examples: ['What is this?', 'How are you?', 'Why did that happen?'],
      difficulty: 'basic',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
      successRate: 0
    }
  ];

  private readonly DEFAULT_WORD_TABLES: WeightedWordTable[] = [
    {
      id: 'nouns-common',
      name: 'Common Nouns',
      description: 'Frequently used nouns',
      category: 'nouns',
      words: [
        { id: 'time', word: 'time', weight: 90, frequency: 0, tags: ['common', 'abstract'], partOfSpeech: 'noun', difficulty: 'basic' },
        { id: 'person', word: 'person', weight: 85, frequency: 0, tags: ['common', 'people'], partOfSpeech: 'noun', difficulty: 'basic' },
        { id: 'day', word: 'day', weight: 80, frequency: 0, tags: ['common', 'time'], partOfSpeech: 'noun', difficulty: 'basic' },
        { id: 'thing', word: 'thing', weight: 75, frequency: 0, tags: ['common', 'general'], partOfSpeech: 'noun', difficulty: 'basic' },
        { id: 'way', word: 'way', weight: 70, frequency: 0, tags: ['common', 'method'], partOfSpeech: 'noun', difficulty: 'basic' }
      ],
      totalWeight: 400,
      lastUpdated: Date.now()
    },
    {
      id: 'verbs-common',
      name: 'Common Verbs',
      description: 'Frequently used verbs',
      category: 'verbs',
      words: [
        { id: 'be', word: 'be', weight: 95, frequency: 0, tags: ['common', 'existence'], partOfSpeech: 'verb', difficulty: 'basic' },
        { id: 'have', word: 'have', weight: 90, frequency: 0, tags: ['common', 'possession'], partOfSpeech: 'verb', difficulty: 'basic' },
        { id: 'do', word: 'do', weight: 85, frequency: 0, tags: ['common', 'action'], partOfSpeech: 'verb', difficulty: 'basic' },
        { id: 'say', word: 'say', weight: 80, frequency: 0, tags: ['common', 'communication'], partOfSpeech: 'verb', difficulty: 'basic' },
        { id: 'get', word: 'get', weight: 75, frequency: 0, tags: ['common', 'obtain'], partOfSpeech: 'verb', difficulty: 'basic' }
      ],
      totalWeight: 425,
      lastUpdated: Date.now()
    },
    {
      id: 'adjectives-common',
      name: 'Common Adjectives',
      description: 'Frequently used adjectives',
      category: 'adjectives',
      words: [
        { id: 'good', word: 'good', weight: 90, frequency: 0, tags: ['common', 'positive'], partOfSpeech: 'adjective', difficulty: 'basic' },
        { id: 'new', word: 'new', weight: 85, frequency: 0, tags: ['common', 'time'], partOfSpeech: 'adjective', difficulty: 'basic' },
        { id: 'first', word: 'first', weight: 80, frequency: 0, tags: ['common', 'order'], partOfSpeech: 'adjective', difficulty: 'basic' },
        { id: 'last', word: 'last', weight: 75, frequency: 0, tags: ['common', 'order'], partOfSpeech: 'adjective', difficulty: 'basic' },
        { id: 'long', word: 'long', weight: 70, frequency: 0, tags: ['common', 'size'], partOfSpeech: 'adjective', difficulty: 'basic' }
      ],
      totalWeight: 400,
      lastUpdated: Date.now()
    }
  ];

  /**
   * Generate a sentence based on request parameters
   */
  async generateSentence(request: SentenceGenerationRequest): Promise<GeneratedSentence> {
    try {
      logError('SentenceBuilder', `Generating sentence for intent: ${request.intent}`, 'generateSentence');
      
      const startTime = Date.now();
      
      // Select appropriate templates
      const templates = await this.selectTemplates(request);
      const template = this.selectWeightedTemplate(templates);
      
      // Generate sentence structure
      const selectedWords = await this.fillStructure(template.structure, request);
      
      // Build sentence text
      const text = this.buildSentenceText(selectedWords, template.structure);
      
      // Calculate confidence
      const confidence = this.calculateConfidence(template, selectedWords, request);
      
      const generatedSentence: GeneratedSentence = {
        id: `sentence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text,
        templateId: template.id,
        structure: template.structure,
        selectedWords,
        confidence,
        metadata: {
          generationTime: Date.now() - startTime,
          intent: request.intent,
          style: request.style || 'neutral',
          complexity: request.complexity || 'moderate',
          length: request.length || 'medium',
          tags: template.tags
        },
        alternatives: await this.generateAlternatives(template, request)
      };
      
      // Update template usage
      await this.updateTemplateUsage(template.id, true);
      
      logError('SentenceBuilder', `Generated sentence: "${text}" with confidence ${confidence}`, 'generateSentence');
      return generatedSentence;
    } catch (error) {
      logError('SentenceBuilder', error, 'generateSentence');
      throw error;
    }
  }

  /**
   * Create a new sentence template
   */
  async createTemplate(template: Omit<SentenceTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'successRate'>): Promise<SentenceTemplate> {
    try {
      const newTemplate: SentenceTemplate = {
        ...template,
        id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0,
        successRate: 0
      };
      
      const templates = await this.getTemplates();
      templates.push(newTemplate);
      await this.saveTemplates(templates);
      
      return newTemplate;
    } catch (error) {
      logError('SentenceBuilder', error, 'createTemplate');
      throw error;
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(templateId: string, updates: Partial<SentenceTemplate>): Promise<SentenceTemplate> {
    try {
      const templates = await this.getTemplates();
      const index = templates.findIndex(t => t.id === templateId);
      
      if (index === -1) {
        throw createError('SentenceBuilder', ERROR_CODES.FILE_NOT_FOUND, 'Template not found');
      }
      
      templates[index] = {
        ...templates[index],
        ...updates,
        updatedAt: Date.now()
      };
      
      await this.saveTemplates(templates);
      return templates[index];
    } catch (error) {
      logError('SentenceBuilder', error, 'updateTemplate');
      throw error;
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      const templates = await this.getTemplates();
      const filtered = templates.filter(t => t.id !== templateId);
      await this.saveTemplates(filtered);
    } catch (error) {
      logError('SentenceBuilder', error, 'deleteTemplate');
      throw error;
    }
  }

  /**
   * Create or update a word table
   */
  async saveWordTable(wordTable: WeightedWordTable): Promise<void> {
    try {
      const tables = await this.getWordTables();
      const index = tables.findIndex(t => t.id === wordTable.id);
      
      const updatedTable = {
        ...wordTable,
        totalWeight: wordTable.words.reduce((sum, word) => sum + word.weight, 0),
        lastUpdated: Date.now()
      };
      
      if (index >= 0) {
        tables[index] = updatedTable;
      } else {
        tables.push(updatedTable);
      }
      
      await this.saveWordTables(tables);
    } catch (error) {
      logError('SentenceBuilder', error, 'saveWordTable');
      throw error;
    }
  }

  /**
   * Get all templates
   */
  async getTemplates(): Promise<SentenceTemplate[]> {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY}_templates`);
      const templates = stored ? JSON.parse(stored) : [...this.DEFAULT_TEMPLATES];
      return templates;
    } catch (error) {
      logError('SentenceBuilder', error, 'getTemplates');
      return [...this.DEFAULT_TEMPLATES];
    }
  }

  /**
   * Get all word tables
   */
  async getWordTables(): Promise<WeightedWordTable[]> {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY}_word_tables`);
      const tables = stored ? JSON.parse(stored) : [...this.DEFAULT_WORD_TABLES];
      return tables;
    } catch (error) {
      logError('SentenceBuilder', error, 'getWordTables');
      return [...this.DEFAULT_WORD_TABLES];
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<SentenceBuilderStats> {
    try {
      const templates = await this.getTemplates();
      const wordTables = await this.getWordTables();
      
      const totalWeight = templates.reduce((sum, t) => sum + t.weight, 0);
      const averageWeight = templates.length > 0 ? totalWeight / templates.length : 0;
      
      const mostUsedTemplates = templates
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5)
        .map(t => ({ templateId: t.id, name: t.name, usageCount: t.usageCount }));
      
      const allWords = wordTables.flatMap(table => table.words);
      const mostUsedWords = allWords
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5)
        .map(w => ({ wordId: w.id, word: w.word, frequency: w.frequency }));
      
      const successRate = templates.length > 0 
        ? templates.reduce((sum, t) => sum + t.successRate, 0) / templates.length 
        : 0;
      
      return {
        totalTemplates: templates.length,
        totalWords: allWords.length,
        averageWeight,
        mostUsedTemplates,
        mostUsedWords,
        successRate,
        averageGenerationTime: 0 // Would be tracked during generation
      };
    } catch (error) {
      logError('SentenceBuilder', error, 'getStats');
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async selectTemplates(request: SentenceGenerationRequest): Promise<SentenceTemplate[]> {
    const templates = await this.getTemplates();
    
    return templates.filter(template => {
      // Filter by excluded templates
      if (request.excludeTemplates?.includes(template.id)) return false;
      
      // Filter by included templates (if specified)
      if (request.templateIds && request.templateIds.length > 0) {
        return request.templateIds.includes(template.id);
      }
      
      // Filter by category based on intent
      if (request.intent.includes('greet') && template.category !== 'greeting') return false;
      if (request.intent.includes('question') && template.category !== 'question') return false;
      
      // Filter by difficulty
      const difficultyMap = { simple: 'basic', moderate: 'intermediate', complex: 'advanced' } as const;
      const targetDifficulty = difficultyMap[request.complexity || 'moderate'];
      if (targetDifficulty && template.difficulty !== targetDifficulty) {
        // Allow similar difficulties
        const difficultyOrder = ['basic', 'intermediate', 'advanced', 'expert'];
        const templateIndex = difficultyOrder.indexOf(template.difficulty);
        const targetIndex = difficultyOrder.indexOf(targetDifficulty);
        if (Math.abs(templateIndex - targetIndex) > 1) return false;
      }
      
      return true;
    });
  }

  private selectWeightedTemplate(templates: SentenceTemplate[]): SentenceTemplate {
    const totalWeight = templates.reduce((sum, t) => sum + t.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const template of templates) {
      random -= template.weight;
      if (random <= 0) return template;
    }
    
    return templates[0]; // Fallback
  }

  private async fillStructure(structure: SentenceStructure[], request: SentenceGenerationRequest): Promise<{ structureId: string; word: WeightedWord; position: number }[]> {
    const wordTables = await this.getWordTables();
    const result: { structureId: string; word: WeightedWord; position: number }[] = [];
    
    for (const struct of structure) {
      if (!struct.required && Math.random() > (struct.weight / 100)) {
        continue; // Skip optional structures
      }
      
      // Select word from options or word tables
      let selectedWord: WeightedWord;
      
      if (struct.options.length > 0) {
        // Use predefined options
        selectedWord = this.selectWeightedOption(struct.options);
      } else {
        // Use word tables
        const category = this.getWordCategory(struct.type);
        const table = wordTables.find(t => t.category === category);
        
        if (table && table.words.length > 0) {
          selectedWord = this.selectWeightedWord(table.words);
        } else {
          // Fallback word
          selectedWord = {
            id: 'fallback',
            word: struct.type,
            weight: 50,
            frequency: 0,
            partOfSpeech: struct.type,
            difficulty: 'basic',
            tags: ['fallback']
          };
        }
      }
      
      result.push({
        structureId: struct.id,
        word: selectedWord,
        position: struct.position
      });
    }
    
    return result;
  }

  private selectWeightedOption(options: WordOption[]): WeightedWord {
    const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const option of options) {
      random -= option.weight;
      if (random <= 0) {
        return {
          id: option.id,
          word: option.text,
          weight: option.weight,
          frequency: 0,
          partOfSpeech: 'unknown',
          difficulty: 'basic',
          tags: option.tags || []
        };
      }
    }
    
    // Fallback
    return {
      id: options[0].id,
      word: options[0].text,
      weight: options[0].weight,
      frequency: 0,
      partOfSpeech: 'unknown',
      difficulty: 'basic',
      tags: options[0].tags || []
    };
  }

  private selectWeightedWord(words: WeightedWord[]): WeightedWord {
    const totalWeight = words.reduce((sum, word) => sum + word.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const word of words) {
      random -= word.weight;
      if (random <= 0) return word;
    }
    
    return words[0]; // Fallback
  }

  private buildSentenceText(selectedWords: { structureId: string; word: WeightedWord; position: number }[], structure: SentenceStructure[]): string {
    // Sort by position
    const sorted = selectedWords.sort((a, b) => a.position - b.position);
    
    // Build sentence
    let sentence = '';
    let lastWord = '';
    
    for (const item of sorted) {
      const word = item.word.word;
      
      // Add spacing rules
      if (sentence.length > 0) {
        // No space before punctuation
        if (this.isPunctuation(word)) {
          sentence += word;
        } else if (this.isPunctuation(lastWord)) {
          sentence += ' ' + word;
        } else {
          sentence += ' ' + word;
        }
      } else {
        sentence += word;
      }
      
      lastWord = word;
    }
    
    // Capitalize first letter
    sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
    
    return sentence.trim();
  }

  private isPunctuation(word: string): boolean {
    return /[.,!?;:]/.test(word);
  }

  private getWordCategory(structType: string): WeightedWordTable['category'] {
    const categoryMap: Record<string, WeightedWordTable['category']> = {
      subject: 'nouns',
      verb: 'verbs',
      adjective: 'adjectives',
      adverb: 'adverbs',
      preposition: 'prepositions',
      conjunction: 'conjunctions',
      article: 'articles',
      interjection: 'interjections',
      interrogative: 'interjections',
      auxiliary: 'verbs',
      punctuation: 'custom'
    };
    
    return categoryMap[structType] || 'custom';
  }

  private calculateConfidence(template: SentenceTemplate, selectedWords: { structureId: string; word: WeightedWord; position: number }[], request: SentenceGenerationRequest): number {
    let confidence = 50; // Base confidence
    
    // Template weight
    confidence += (template.weight / 100) * 20;
    
    // Word selection quality
    const avgWordWeight = selectedWords.reduce((sum, item) => sum + item.word.weight, 0) / selectedWords.length;
    confidence += (avgWordWeight / 100) * 20;
    
    // Structure completeness
    const requiredFilled = template.structure.filter(s => s.required).length;
    const actualFilled = selectedWords.length;
    if (actualFilled >= requiredFilled) {
      confidence += 15;
    } else {
      confidence -= 15;
    }
    
    // Template usage success rate
    confidence += (template.successRate / 100) * 15;
    
    return Math.min(100, Math.max(0, confidence));
  }

  private async generateAlternatives(template: SentenceTemplate, request: SentenceGenerationRequest): Promise<string[]> {
    const alternatives: string[] = [];
    
    // Generate 2-3 alternatives with slight variations
    for (let i = 0; i < 3; i++) {
      try {
        const selectedWords = await this.fillStructure(template.structure, request);
        const text = this.buildSentenceText(selectedWords, template.structure);
        
        if (text && !alternatives.includes(text)) {
          alternatives.push(text);
        }
      } catch (error) {
        // Skip failed alternatives
        continue;
      }
    }
    
    return alternatives;
  }

  private async updateTemplateUsage(templateId: string, success: boolean): Promise<void> {
    try {
      const templates = await this.getTemplates();
      const template = templates.find(t => t.id === templateId);
      
      if (template) {
        template.usageCount += 1;
        if (success) {
          template.successRate = Math.min(100, template.successRate + 5);
        } else {
          template.successRate = Math.max(0, template.successRate - 5);
        }
        template.updatedAt = Date.now();
        
        await this.saveTemplates(templates);
      }
    } catch (error) {
      logError('SentenceBuilder', error, 'updateTemplateUsage');
    }
  }

  private async saveTemplates(templates: SentenceTemplate[]): Promise<void> {
    try {
      localStorage.setItem(`${this.STORAGE_KEY}_templates`, JSON.stringify(templates));
    } catch (error) {
      logError('SentenceBuilder', error, 'saveTemplates');
      throw error;
    }
  }

  private async saveWordTables(tables: WeightedWordTable[]): Promise<void> {
    try {
      localStorage.setItem(`${this.STORAGE_KEY}_word_tables`, JSON.stringify(tables));
    } catch (error) {
      logError('SentenceBuilder', error, 'saveWordTables');
      throw error;
    }
  }
}

export const sentenceBuilderService = new SentenceBuilderService();
