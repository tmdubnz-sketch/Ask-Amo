import { createError, ERROR_CODES, logError } from './errorHandlingService';

export interface Keyword {
  id: string;
  keyword: string;
  category: 'action' | 'subject' | 'modifier' | 'context' | 'emotion' | 'technical' | 'custom';
  weight: number; // 0-100, importance for intent detection
  synonyms: string[];
  patterns: string[]; // regex patterns for matching
  contexts: string[]; // contexts where this keyword is relevant
  intentMapping: IntentMapping[];
  frequency: number; // usage frequency
  successRate: number; // prediction success rate
  lastUsed: number;
  createdAt: number;
  updatedAt: number;
}

export interface IntentMapping {
  intent: string;
  confidence: number; // 0-100
  required: boolean; // must be present for this intent
  boost: number; // confidence boost when present
  context?: string;
}

export interface Tag {
  id: string;
  name: string;
  type: 'user' | 'system' | 'context' | 'emotion' | 'domain' | 'complexity' | 'urgency' | 'custom';
  weight: number; // 0-100
  keywords: string[]; // associated keywords
  patterns: string[];
  intentMapping: IntentMapping[];
  combinations: TagCombination[];
  frequency: number;
  successRate: number;
  lastUsed: number;
  createdAt: number;
  updatedAt: number;
}

export interface TagCombination {
  tagIds: string[];
  intent: string;
  confidence: number;
  boost: number;
  required: boolean;
}

export interface IntentPrediction {
  id: string;
  intent: string;
  confidence: number;
  matchedKeywords: { keyword: string; weight: number; boost: number }[];
  matchedTags: { tag: string; weight: number; boost: number }[];
  context: string;
  reasoning: string;
  alternatives: { intent: string; confidence: number }[];
}

export interface IntentEnhancementRequest {
  userInput: string;
  context?: string;
  previousIntents?: string[];
  userPreferences?: UserPreferences;
  sessionContext?: SessionContext;
}

export interface UserPreferences {
  commonIntents: string[];
  preferredComplexity: 'simple' | 'moderate' | 'complex';
  communicationStyle: 'formal' | 'informal' | 'technical' | 'casual';
  domainExpertise: string[];
  avoidIntents: string[];
}

export interface SessionContext {
  currentTopic?: string;
  conversationStage: 'opening' | 'middle' | 'closing';
  userMood?: 'positive' | 'neutral' | 'negative' | 'frustrated' | 'excited';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  deviceType: 'mobile' | 'desktop' | 'tablet';
  previousQueries: string[];
}

export interface IntentModel {
  id: string;
  name: string;
  version: string;
  keywords: Keyword[];
  tags: Tag[];
  patterns: IntentPattern[];
  accuracy: number;
  lastTrained: number;
  trainingData: TrainingExample[];
}

export interface IntentPattern {
  id: string;
  pattern: string; // regex pattern
  intent: string;
  confidence: number;
  examples: string[];
  weight: number;
}

export interface TrainingExample {
  input: string;
  expectedIntent: string;
  actualIntent?: string;
  confidence: number;
  timestamp: number;
  feedback: 'correct' | 'incorrect' | 'partial';
}

export interface IntentEnhancementStats {
  totalPredictions: number;
  accuracyRate: number;
  averageConfidence: number;
  topIntents: { intent: string; count: number; accuracy: number }[];
  topKeywords: { keyword: string; frequency: number; successRate: number }[];
  topTags: { tag: string; frequency: number; successRate: number }[];
  improvementTrend: number; // percentage change over time
}

class IntentEnhancementService {
  private readonly STORAGE_KEY = 'amo_intent_enhancement';
  private readonly MIN_CONFIDENCE_THRESHOLD = 30;
  private readonly MAX_ALTERNATIVES = 3;

  private readonly DEFAULT_KEYWORDS: Keyword[] = [
    // Action keywords
    {
      id: 'kw-create',
      keyword: 'create',
      category: 'action',
      weight: 90,
      synonyms: ['make', 'build', 'generate', 'develop', 'design'],
      patterns: ['\\b(create|make|build|generate|develop|design)\\b'],
      contexts: ['development', 'design', 'content'],
      intentMapping: [
        { intent: 'create_content', confidence: 85, required: false, boost: 25 },
        { intent: 'develop_feature', confidence: 75, required: false, boost: 20 },
        { intent: 'design_element', confidence: 70, required: false, boost: 15 }
      ],
      frequency: 0,
      successRate: 0,
      lastUsed: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'kw-help',
      keyword: 'help',
      category: 'action',
      weight: 95,
      synonyms: ['assist', 'support', 'guide', 'show', 'explain'],
      patterns: ['\\b(help|assist|support|guide|show|explain)\\b'],
      contexts: ['general', 'support', 'learning'],
      intentMapping: [
        { intent: 'request_help', confidence: 95, required: false, boost: 30 },
        { intent: 'get_information', confidence: 80, required: false, boost: 20 },
        { intent: 'learn_something', confidence: 70, required: false, boost: 15 }
      ],
      frequency: 0,
      successRate: 0,
      lastUsed: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'kw-fix',
      keyword: 'fix',
      category: 'action',
      weight: 85,
      synonyms: ['repair', 'solve', 'resolve', 'correct', 'debug'],
      patterns: ['\\b(fix|repair|solve|resolve|correct|debug)\\b'],
      contexts: ['development', 'troubleshooting', 'maintenance'],
      intentMapping: [
        { intent: 'solve_problem', confidence: 90, required: false, boost: 25 },
        { intent: 'debug_code', confidence: 85, required: false, boost: 20 },
        { intent: 'troubleshoot', confidence: 80, required: false, boost: 15 }
      ],
      frequency: 0,
      successRate: 0,
      lastUsed: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    
    // Subject keywords
    {
      id: 'kw-code',
      keyword: 'code',
      category: 'subject',
      weight: 80,
      synonyms: ['programming', 'script', 'function', 'method', 'algorithm'],
      patterns: ['\\b(code|programming|script|function|method|algorithm)\\b'],
      contexts: ['development', 'technical', 'programming'],
      intentMapping: [
        { intent: 'write_code', confidence: 85, required: false, boost: 20 },
        { intent: 'debug_code', confidence: 80, required: false, boost: 15 },
        { intent: 'review_code', confidence: 75, required: false, boost: 10 }
      ],
      frequency: 0,
      successRate: 0,
      lastUsed: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'kw-api',
      keyword: 'api',
      category: 'technical',
      weight: 75,
      synonyms: ['interface', 'endpoint', 'service', 'rest', 'graphql'],
      patterns: ['\\b(api|interface|endpoint|service|rest|graphql)\\b'],
      contexts: ['development', 'integration', 'technical'],
      intentMapping: [
        { intent: 'api_integration', confidence: 90, required: false, boost: 25 },
        { intent: 'api_documentation', confidence: 80, required: false, boost: 20 },
        { intent: 'api_testing', confidence: 75, required: false, boost: 15 }
      ],
      frequency: 0,
      successRate: 0,
      lastUsed: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    
    // Modifier keywords
    {
      id: 'kw-quickly',
      keyword: 'quickly',
      category: 'modifier',
      weight: 60,
      synonyms: ['fast', 'rapid', 'urgent', 'asap', 'immediately'],
      patterns: ['\\b(quickly|fast|rapid|urgent|asap|immediately)\\b'],
      contexts: ['general', 'time_sensitive'],
      intentMapping: [
        { intent: 'urgent_request', confidence: 80, required: false, boost: 20 },
        { intent: 'time_sensitive', confidence: 75, required: false, boost: 15 }
      ],
      frequency: 0,
      successRate: 0,
      lastUsed: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    
    // Context keywords
    {
      id: 'kw-error',
      keyword: 'error',
      category: 'context',
      weight: 85,
      synonyms: ['mistake', 'bug', 'issue', 'problem', 'exception'],
      patterns: ['\\b(error|mistake|bug|issue|problem|exception)\\b'],
      contexts: ['troubleshooting', 'development', 'debugging'],
      intentMapping: [
        { intent: 'solve_problem', confidence: 90, required: false, boost: 25 },
        { intent: 'debug_code', confidence: 85, required: false, boost: 20 },
        { intent: 'get_help', confidence: 80, required: false, boost: 15 }
      ],
      frequency: 0,
      successRate: 0,
      lastUsed: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ];

  private readonly DEFAULT_TAGS: Tag[] = [
    {
      id: 'tag-urgent',
      name: 'urgent',
      type: 'urgency',
      weight: 80,
      keywords: ['urgent', 'asap', 'immediately', 'quickly', 'fast'],
      patterns: ['\\b(urgent|asap|immediately|quickly|fast)\\b'],
      intentMapping: [
        { intent: 'urgent_request', confidence: 85, required: false, boost: 25 },
        { intent: 'time_sensitive', confidence: 80, required: false, boost: 20 }
      ],
      combinations: [
        { tagIds: ['tag-urgent', 'tag-help'], intent: 'urgent_help', confidence: 90, boost: 30, required: true },
        { tagIds: ['tag-urgent', 'tag-fix'], intent: 'urgent_fix', confidence: 85, boost: 25, required: true }
      ],
      frequency: 0,
      successRate: 0,
      lastUsed: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'tag-technical',
      name: 'technical',
      type: 'domain',
      weight: 70,
      keywords: ['code', 'api', 'database', 'algorithm', 'function', 'method'],
      patterns: ['\\b(code|api|database|algorithm|function|method)\\b'],
      intentMapping: [
        { intent: 'technical_help', confidence: 85, required: false, boost: 20 },
        { intent: 'code_assistance', confidence: 80, required: false, boost: 15 }
      ],
      combinations: [
        { tagIds: ['tag-technical', 'tag-help'], intent: 'technical_help', confidence: 90, boost: 25, required: true },
        { tagIds: ['tag-technical', 'tag-create'], intent: 'create_technical', confidence: 85, boost: 20, required: true }
      ],
      frequency: 0,
      successRate: 0,
      lastUsed: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'tag-learning',
      name: 'learning',
      type: 'context',
      weight: 75,
      keywords: ['learn', 'understand', 'explain', 'teach', 'show', 'demo'],
      patterns: ['\\b(learn|understand|explain|teach|show|demo)\\b'],
      intentMapping: [
        { intent: 'learn_something', confidence: 90, required: false, boost: 25 },
        { intent: 'get_explanation', confidence: 85, required: false, boost: 20 }
      ],
      combinations: [
        { tagIds: ['tag-learning', 'tag-technical'], intent: 'learn_technical', confidence: 90, boost: 30, required: true },
        { tagIds: ['tag-learning', 'tag-code'], intent: 'learn_code', confidence: 85, boost: 25, required: true }
      ],
      frequency: 0,
      successRate: 0,
      lastUsed: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ];

  private readonly DEFAULT_PATTERNS: IntentPattern[] = [
    {
      id: 'pattern-question',
      pattern: '\\?\\s*$',
      intent: 'ask_question',
      confidence: 75,
      examples: ['What is this?', 'How do I fix this?', 'Can you help?'],
      weight: 80
    },
    {
      id: 'pattern-command',
      pattern: '^(create|make|build|generate|write|code)\\s',
      intent: 'create_something',
      confidence: 80,
      examples: ['create a function', 'make a component', 'write code'],
      weight: 85
    },
    {
      id: 'pattern-greeting',
      pattern: '^(hi|hello|hey|good morning|good afternoon)\\b',
      intent: 'greeting',
      confidence: 90,
      examples: ['hi there', 'hello', 'good morning'],
      weight: 90
    },
    {
      id: 'pattern-help',
      pattern: '\\b(help|assist|support|guide)\\b',
      intent: 'request_help',
      confidence: 85,
      examples: ['help me', 'I need assistance', 'can you guide me'],
      weight: 85
    }
  ];

  /**
   * Enhanced intent prediction with keywords and tags
   */
  async predictIntent(request: IntentEnhancementRequest): Promise<IntentPrediction> {
    try {
      logError('IntentEnhancement', `Predicting intent for: "${request.userInput}"`, 'predictIntent');
      
      const startTime = Date.now();
      
      // Get data
      const keywords = await this.getKeywords();
      const tags = await this.getTags();
      const patterns = await this.getPatterns();
      
      // Analyze input
      const analysis = this.analyzeInput(request.userInput, keywords, tags, patterns);
      
      // Calculate intent scores
      const intentScores = await this.calculateIntentScores(analysis, request);
      
      // Get top intent
      const topIntent = this.getTopIntent(intentScores);
      
      // Generate alternatives
      const alternatives = this.getAlternatives(intentScores, topIntent.intent);
      
      const prediction: IntentPrediction = {
        id: `pred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        intent: topIntent.intent,
        confidence: topIntent.confidence,
        matchedKeywords: analysis.matchedKeywords,
        matchedTags: analysis.matchedTags,
        context: this.determineContext(request, analysis),
        reasoning: this.generateReasoning(topIntent, analysis),
        alternatives
      };
      
      // Update usage statistics
      await this.updateUsageStats(prediction);
      
      logError('IntentEnhancement', `Predicted intent: ${prediction.intent} (${prediction.confidence}% confidence)`, 'predictIntent');
      return prediction;
    } catch (error) {
      logError('IntentEnhancement', error, 'predictIntent');
      throw error;
    }
  }

  /**
   * Add custom keyword
   */
  async addKeyword(keyword: Omit<Keyword, 'id' | 'frequency' | 'successRate' | 'lastUsed' | 'createdAt' | 'updatedAt'>): Promise<Keyword> {
    try {
      const newKeyword: Keyword = {
        ...keyword,
        id: `kw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        frequency: 0,
        successRate: 0,
        lastUsed: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const keywords = await this.getKeywords();
      keywords.push(newKeyword);
      await this.saveKeywords(keywords);
      
      return newKeyword;
    } catch (error) {
      logError('IntentEnhancement', error, 'addKeyword');
      throw error;
    }
  }

  /**
   * Add custom tag
   */
  async addTag(tag: Omit<Tag, 'id' | 'frequency' | 'successRate' | 'lastUsed' | 'createdAt' | 'updatedAt'>): Promise<Tag> {
    try {
      const newTag: Tag = {
        ...tag,
        id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        frequency: 0,
        successRate: 0,
        lastUsed: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const tags = await this.getTags();
      tags.push(newTag);
      await this.saveTags(tags);
      
      return newTag;
    } catch (error) {
      logError('IntentEnhancement', error, 'addTag');
      throw error;
    }
  }

  /**
   * Add intent pattern
   */
  async addPattern(pattern: Omit<IntentPattern, 'id'>): Promise<IntentPattern> {
    try {
      const newPattern: IntentPattern = {
        ...pattern,
        id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      const patterns = await this.getPatterns();
      patterns.push(newPattern);
      await this.savePatterns(patterns);
      
      return newPattern;
    } catch (error) {
      logError('IntentEnhancement', error, 'addPattern');
      throw error;
    }
  }

  /**
   * Update keyword weights based on feedback
   */
  async updateKeywordFromFeedback(keywordId: string, success: boolean): Promise<void> {
    try {
      const keywords = await this.getKeywords();
      const keyword = keywords.find(k => k.id === keywordId);
      
      if (keyword) {
        keyword.frequency += 1;
        keyword.lastUsed = Date.now();
        
        if (success) {
          keyword.successRate = Math.min(100, keyword.successRate + 5);
          keyword.weight = Math.min(100, keyword.weight + 2);
        } else {
          keyword.successRate = Math.max(0, keyword.successRate - 5);
          keyword.weight = Math.max(10, keyword.weight - 2);
        }
        
        keyword.updatedAt = Date.now();
        await this.saveKeywords(keywords);
      }
    } catch (error) {
      logError('IntentEnhancement', error, 'updateKeywordFromFeedback');
      throw error;
    }
  }

  /**
   * Update tag weights based on feedback
   */
  async updateTagFromFeedback(tagId: string, success: boolean): Promise<void> {
    try {
      const tags = await this.getTags();
      const tag = tags.find(t => t.id === tagId);
      
      if (tag) {
        tag.frequency += 1;
        tag.lastUsed = Date.now();
        
        if (success) {
          tag.successRate = Math.min(100, tag.successRate + 5);
          tag.weight = Math.min(100, tag.weight + 2);
        } else {
          tag.successRate = Math.max(0, tag.successRate - 5);
          tag.weight = Math.max(10, tag.weight - 2);
        }
        
        tag.updatedAt = Date.now();
        await this.saveTags(tags);
      }
    } catch (error) {
      logError('IntentEnhancement', error, 'updateTagFromFeedback');
      throw error;
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<IntentEnhancementStats> {
    try {
      const keywords = await this.getKeywords();
      const tags = await this.getTags();
      const patterns = await this.getPatterns();
      
      const totalPredictions = keywords.reduce((sum, k) => sum + k.frequency, 0);
      const averageConfidence = keywords.length > 0 
        ? keywords.reduce((sum, k) => sum + k.successRate, 0) / keywords.length 
        : 0;
      
      const topIntents = await this.getTopIntents(keywords, tags);
      const topKeywords = keywords
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10)
        .map(k => ({ keyword: k.keyword, frequency: k.frequency, successRate: k.successRate }));
      
      const topTags = tags
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10)
        .map(t => ({ tag: t.name, frequency: t.frequency, successRate: t.successRate }));
      
      return {
        totalPredictions,
        accuracyRate: averageConfidence,
        averageConfidence,
        topIntents,
        topKeywords,
        topTags,
        improvementTrend: 0 // Would be calculated from historical data
      };
    } catch (error) {
      logError('IntentEnhancement', error, 'getStats');
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private analyzeInput(input: string, keywords: Keyword[], tags: Tag[], patterns: IntentPattern[]) {
    const normalizedInput = input.toLowerCase().trim();
    const matchedKeywords: { keyword: string; weight: number; boost: number }[] = [];
    const matchedTags: { tag: string; weight: number; boost: number }[] = [];
    const matchedPatterns: IntentPattern[] = [];

    // Match keywords
    for (const keyword of keywords) {
      for (const pattern of keyword.patterns) {
        const regex = new RegExp(pattern, 'gi');
        if (regex.test(normalizedInput)) {
          matchedKeywords.push({
            keyword: keyword.keyword,
            weight: keyword.weight,
            boost: this.calculateKeywordBoost(keyword, normalizedInput)
          });
          break; // Only count each keyword once
        }
      }
    }

    // Match tags
    for (const tag of tags) {
      for (const pattern of tag.patterns) {
        const regex = new RegExp(pattern, 'gi');
        if (regex.test(normalizedInput)) {
          matchedTags.push({
            tag: tag.name,
            weight: tag.weight,
            boost: this.calculateTagBoost(tag, normalizedInput)
          });
          break; // Only count each tag once
        }
      }
    }

    // Match patterns
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.pattern, 'gi');
      if (regex.test(normalizedInput)) {
        matchedPatterns.push(pattern);
      }
    }

    return {
      matchedKeywords,
      matchedTags,
      matchedPatterns,
      normalizedInput
    };
  }

  private async calculateIntentScores(analysis: any, request: IntentEnhancementRequest): Promise<Map<string, number>> {
    const scores = new Map<string, number>();

    // Score from keywords
    for (const matchedKeyword of analysis.matchedKeywords) {
      const keyword = this.getKeywordByName(matchedKeyword.keyword);
      if (keyword) {
        for (const mapping of keyword.intentMapping) {
          const currentScore = scores.get(mapping.intent) || 0;
          const boost = matchedKeyword.boost * (mapping.boost / 100);
          scores.set(mapping.intent, currentScore + mapping.confidence + boost);
        }
      }
    }

    // Score from tags
    for (const matchedTag of analysis.matchedTags) {
      const tag = this.getTagByName(matchedTag.tag);
      if (tag) {
        for (const mapping of tag.intentMapping) {
          const currentScore = scores.get(mapping.intent) || 0;
          const boost = matchedTag.boost * (mapping.boost / 100);
          scores.set(mapping.intent, currentScore + mapping.confidence + boost);
        }
      }
    }

    // Score from patterns
    for (const pattern of analysis.matchedPatterns) {
      const currentScore = scores.get(pattern.intent) || 0;
      scores.set(pattern.intent, currentScore + pattern.confidence);
    }

    // Score from tag combinations
    const tags = await this.getTags();
    for (const tag of tags) {
      for (const combination of tag.combinations) {
        if (this.matchesCombination(combination.tagIds, analysis.matchedTags)) {
          const currentScore = scores.get(combination.intent) || 0;
          scores.set(combination.intent, currentScore + combination.confidence + combination.boost);
        }
      }
    }

    // Apply context and user preferences
    return this.applyContextualAdjustment(scores, request, analysis);
  }

  private calculateKeywordBoost(keyword: Keyword, input: string): number {
    // Boost based on position, frequency, and context
    const position = input.indexOf(keyword.keyword);
    const positionBoost = position === 0 ? 1.2 : position < input.length / 2 ? 1.1 : 1.0;
    const frequencyBoost = keyword.frequency > 10 ? 1.1 : 1.0;
    
    return keyword.weight * positionBoost * frequencyBoost;
  }

  private calculateTagBoost(tag: Tag, input: string): number {
    // Similar to keyword boost but for tags
    const positionBoost = 1.1; // Tags get slight position boost
    const frequencyBoost = tag.frequency > 10 ? 1.1 : 1.0;
    
    return tag.weight * positionBoost * frequencyBoost;
  }

  private matchesCombination(requiredTagIds: string[], matchedTags: { tag: string }[]): boolean {
    const matchedTagNames = matchedTags.map(mt => mt.tag);
    return requiredTagIds.every(tagId => {
      const tag = this.getTagById(tagId);
      return tag && matchedTagNames.includes(tag.name);
    });
  }

  private applyContextualAdjustment(scores: Map<string, number>, request: IntentEnhancementRequest, analysis: any): Map<string, number> {
    const adjustedScores = new Map(scores);

    // Apply user preferences
    if (request.userPreferences) {
      for (const preferredIntent of request.userPreferences.commonIntents) {
        const currentScore = adjustedScores.get(preferredIntent) || 0;
        adjustedScores.set(preferredIntent, currentScore * 1.2);
      }

      for (const avoidedIntent of request.userPreferences.avoidIntents) {
        const currentScore = adjustedScores.get(avoidedIntent) || 0;
        adjustedScores.set(avoidedIntent, currentScore * 0.5);
      }
    }

    // Apply session context
    if (request.sessionContext) {
      if (request.sessionContext.userMood === 'frustrated') {
        // Boost help-related intents
        for (const [intent, score] of adjustedScores) {
          if (intent.includes('help') || intent.includes('fix') || intent.includes('solve')) {
            adjustedScores.set(intent, score * 1.3);
          }
        }
      }
    }

    return adjustedScores;
  }

  private getTopIntent(scores: Map<string, number>): { intent: string; confidence: number } {
    let topIntent = '';
    let topScore = 0;

    for (const [intent, score] of scores) {
      if (score > topScore) {
        topScore = score;
        topIntent = intent;
      }
    }

    return {
      intent: topIntent || 'unknown',
      confidence: Math.min(100, Math.max(0, topScore))
    };
  }

  private getAlternatives(scores: Map<string, number>, topIntent: string): { intent: string; confidence: number }[] {
    const alternatives: { intent: string; confidence: number }[] = [];
    const sortedScores = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .filter(([intent]) => intent !== topIntent)
      .slice(0, this.MAX_ALTERNATIVES);

    for (const [intent, score] of sortedScores) {
      if (score >= this.MIN_CONFIDENCE_THRESHOLD) {
        alternatives.push({
          intent,
          confidence: Math.min(100, Math.max(0, score))
        });
      }
    }

    return alternatives;
  }

  private determineContext(request: IntentEnhancementRequest, analysis: any): string {
    const contexts = [];
    
    if (request.context) contexts.push(request.context);
    if (request.sessionContext?.currentTopic) contexts.push(request.sessionContext.currentTopic);
    if (analysis.matchedTags.length > 0) contexts.push('tagged');
    if (analysis.matchedKeywords.length > 0) contexts.push('keyworded');
    
    return contexts.join(', ') || 'general';
  }

  private generateReasoning(topIntent: { intent: string; confidence: number }, analysis: any): string {
    const reasons = [];
    
    if (analysis.matchedKeywords.length > 0) {
      reasons.push(`Matched keywords: ${analysis.matchedKeywords.map((mk: any) => mk.keyword).join(', ')}`);
    }
    
    if (analysis.matchedTags.length > 0) {
      reasons.push(`Matched tags: ${analysis.matchedTags.map((mt: any) => mt.tag).join(', ')}`);
    }
    
    if (analysis.matchedPatterns.length > 0) {
      reasons.push(`Matched patterns: ${analysis.matchedPatterns.length}`);
    }
    
    reasons.push(`Confidence: ${topIntent.confidence}%`);
    
    return reasons.join('; ');
  }

  private async getTopIntents(keywords: Keyword[], tags: Tag[]): Promise<{ intent: string; count: number; accuracy: number }[]> {
    const intentCounts = new Map<string, { count: number; accuracy: number }>();
    
    // Count from keywords
    for (const keyword of keywords) {
      for (const mapping of keyword.intentMapping) {
        const current = intentCounts.get(mapping.intent) || { count: 0, accuracy: 0 };
        intentCounts.set(mapping.intent, {
          count: current.count + keyword.frequency,
          accuracy: current.accuracy + keyword.successRate
        });
      }
    }
    
    // Count from tags
    for (const tag of tags) {
      for (const mapping of tag.intentMapping) {
        const current = intentCounts.get(mapping.intent) || { count: 0, accuracy: 0 };
        intentCounts.set(mapping.intent, {
          count: current.count + tag.frequency,
          accuracy: current.accuracy + tag.successRate
        });
      }
    }
    
    return Array.from(intentCounts.entries())
      .map(([intent, data]) => ({
        intent,
        count: data.count,
        accuracy: data.count > 0 ? data.accuracy / data.count : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private async updateUsageStats(prediction: IntentPrediction): Promise<void> {
    try {
      // Update matched keywords
      for (const matchedKeyword of prediction.matchedKeywords) {
        const keyword = await this.getKeywordByName(matchedKeyword.keyword);
        if (keyword) {
          await this.updateKeywordFromFeedback(keyword.id, true);
        }
      }
      
      // Update matched tags
      for (const matchedTag of prediction.matchedTags) {
        const tag = await this.getTagByName(matchedTag.tag);
        if (tag) {
          await this.updateTagFromFeedback(tag.id, true);
        }
      }
    } catch (error) {
      logError('IntentEnhancement', error, 'updateUsageStats');
    }
  }

  // Data access methods
  async getKeywords(): Promise<Keyword[]> {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY}_keywords`);
      return stored ? JSON.parse(stored) : [...this.DEFAULT_KEYWORDS];
    } catch (error) {
      logError('IntentEnhancement', error, 'getKeywords');
      return [...this.DEFAULT_KEYWORDS];
    }
  }

  async getTags(): Promise<Tag[]> {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY}_tags`);
      return stored ? JSON.parse(stored) : [...this.DEFAULT_TAGS];
    } catch (error) {
      logError('IntentEnhancement', error, 'getTags');
      return [...this.DEFAULT_TAGS];
    }
  }

  async getPatterns(): Promise<IntentPattern[]> {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY}_patterns`);
      return stored ? JSON.parse(stored) : [...this.DEFAULT_PATTERNS];
    } catch (error) {
      logError('IntentEnhancement', error, 'getPatterns');
      return [...this.DEFAULT_PATTERNS];
    }
  }

  private async saveKeywords(keywords: Keyword[]): Promise<void> {
    try {
      localStorage.setItem(`${this.STORAGE_KEY}_keywords`, JSON.stringify(keywords));
    } catch (error) {
      logError('IntentEnhancement', error, 'saveKeywords');
      throw error;
    }
  }

  private async saveTags(tags: Tag[]): Promise<void> {
    try {
      localStorage.setItem(`${this.STORAGE_KEY}_tags`, JSON.stringify(tags));
    } catch (error) {
      logError('IntentEnhancement', error, 'saveTags');
      throw error;
    }
  }

  private async savePatterns(patterns: IntentPattern[]): Promise<void> {
    try {
      localStorage.setItem(`${this.STORAGE_KEY}_patterns`, JSON.stringify(patterns));
    } catch (error) {
      logError('IntentEnhancement', error, 'savePatterns');
      throw error;
    }
  }

  private getKeywordByName(name: string): Keyword | null {
    // This would be implemented to get keyword by name from cached data
    return null; // Placeholder
  }

  private getTagByName(name: string): Tag | null {
    // This would be implemented to get tag by name from cached data
    return null; // Placeholder
  }

  private getTagById(id: string): Tag | null {
    // This would be implemented to get tag by ID from cached data
    return null; // Placeholder
  }
}

export const intentEnhancementService = new IntentEnhancementService();
