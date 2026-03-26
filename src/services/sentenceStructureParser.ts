export type SentenceType = 
  | 'declarative'   // Statement: "The sky is blue"
  | 'interrogative' // Question: "Is the sky blue?"
  | 'imperative'    // Command: "Look at the sky"
  | 'exclamatory';  // Exclamation: "What a beautiful sky!"

export type GrammaticalRole = 
  | 'subject'
  | 'verb'
  | 'object'
  | 'complement'
  | 'modifier'
  | 'conjunction'
  | 'preposition'
  | 'article'
  | 'pronoun'
  | 'auxiliary'
  | 'unknown';

export interface Token {
  word: string;
  original: string;
  role: GrammaticalRole;
  POS: string;
  index: number;
  isVariable: boolean;
  variableType?: VariableType;
}

export type VariableType = 
  | 'person'      // who
  | 'thing'       // what
  | 'place'       // where
  | 'time'        // when
  | 'reason'      // why
  | 'manner'      // how
  | 'quantity'    // how many/how much
  | 'frequency'   // how often
  | 'duration'    // how long
  | 'choice'      // which
  | 'definition'  // what does X mean
  | 'comparison'  // compared to what
  | 'purpose'     // what for
  | 'entity';     // specific thing/name/etc

export interface SentenceStructure {
  original: string;
  normalized: string;
  type: SentenceType;
  tokens: Token[];
  subject: string | null;
  verb: string | null;
  object: string | null;
  complement: string | null;
  variables: VariableSlot[];
  clauseType: 'simple' | 'compound' | 'complex' | 'compound-complex';
  tense: string;
  polarity: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export interface VariableSlot {
  word: string;
  type: VariableType;
  position: number;
  context: string;
  canBeClarified: boolean;
  examples: string[];
}

const WH_WORDS: Record<string, VariableType> = {
  'who': 'person',
  'whom': 'person',
  'whose': 'person',
  'what': 'thing',
  'which': 'choice',
  'where': 'place',
  'when': 'time',
  'why': 'reason',
  'how': 'manner',
};

const WH_PHRASES: Array<{ pattern: RegExp; type: VariableType }> = [
  { pattern: /^how\s+many$/i, type: 'quantity' },
  { pattern: /^how\s+much$/i, type: 'quantity' },
  { pattern: /^how\s+long$/i, type: 'duration' },
  { pattern: /^how\s+often$/i, type: 'frequency' },
  { pattern: /^how\s+far$/i, type: 'quantity' },
  { pattern: /^what\s+kind\s+of$/i, type: 'choice' },
  { pattern: /^what\s+does.*mean$/i, type: 'definition' },
  { pattern: /^what\s+is.*like$/i, type: 'comparison' },
  { pattern: /^what\s+for$/i, type: 'purpose' },
];

const VERB_PATTERNS = [
  { pattern: /\b(is|are|was|were|be|been|being)\b/i, tense: 'be-verb' },
  { pattern: /\b(have|has|had|having)\b/i, tense: 'perfect' },
  { pattern: /\b(do|does|did|doing)\b/i, tense: 'do-support' },
  { pattern: /\b(will|would|shall|should|can|could|may|might|must)\b/i, tense: 'modal' },
  { pattern: /\b(was|were)\s+.*\s+by\b/i, tense: 'passive' },
];

const NEGATION_WORDS = [
  'not', "n't", 'no', 'never', 'neither', 'nor', 'nobody', 'nothing', 
  'nowhere', 'hardly', 'barely', 'scarcely', 'seldom', 'rarely'
];

const IMPERATIVE_VERBS = [
  'look', 'listen', 'watch', 'tell', 'ask', 'give', 'show', 'send', 'bring',
  'take', 'make', 'get', 'let', 'help', 'start', 'stop', 'begin', 'finish',
  'try', 'use', 'open', 'close', 'save', 'delete', 'create', 'build'
];

export class SentenceStructureParser {
  
  parse(input: string): SentenceStructure {
    const normalized = this.normalize(input);
    const tokens = this.tokenize(normalized, input);
    const type = this.detectSentenceType(input, tokens);
    const clauseType = this.detectClauseType(tokens);
    const tense = this.detectTense(tokens);
    const polarity = this.detectPolarity(tokens);
    const subject = this.extractSubject(tokens);
    const verb = this.extractVerb(tokens);
    const object = this.extractObject(tokens);
    const complement = this.extractComplement(tokens);
    const variables = this.extractVariables(tokens, input);

    const confidence = this.calculateConfidence(tokens, variables);

    return {
      original: input,
      normalized,
      type,
      tokens,
      subject,
      verb,
      object,
      complement,
      variables,
      clauseType,
      tense,
      polarity,
      confidence,
    };
  }

  private normalize(input: string): string {
    return input
      .replace(/[^\w\s'?-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenize(normalized: string, original: string): Token[] {
    const words = normalized.split(/\s+/);
    const isQuestion = this.isQuestionWord(normalized);
    
    return words.map((word, index) => {
      const role = this.assignRole(word, index, words, isQuestion);
      const pos = this.guessPOS(word, role);
      return {
        word: word.toLowerCase(),
        original: word,
        role,
        POS: pos,
        index,
        isVariable: this.isVariableWord(word, isQuestion),
      };
    });
  }

  private isQuestionWord(text: string): boolean {
    const lower = text.toLowerCase().trim();
    return /^(who|what|where|when|why|how|which)\b/i.test(lower) || 
           lower.endsWith('?') ||
           /\b(is|are|was|were|do|does|did|can|could|will|would)\b/i.test(lower);
  }

  private assignRole(word: string, index: number, words: string[], isQuestion: boolean): GrammaticalRole {
    const lower = word.toLowerCase();
    
    if (WH_WORDS[lower]) return 'unknown';
    if (index === 0 && isQuestion) return 'unknown';
    
    if (['the', 'a', 'an'].includes(lower)) return 'article';
    if (['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their'].includes(lower)) return 'pronoun';
    if (['is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having'].includes(lower)) return 'auxiliary';
    if (['and', 'but', 'or', 'so', 'yet', 'for', 'nor'].includes(lower)) return 'conjunction';
    if (['in', 'on', 'at', 'to', 'from', 'with', 'by', 'for', 'of', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'under', 'over'].includes(lower)) return 'preposition';
    
    if (index === 0) {
      if (IMPERATIVE_VERBS.includes(lower) || !isQuestion) return 'verb';
      return 'subject';
    }
    
    if (index === 1 && words[0]?.toLowerCase() === 'i') return 'verb';
    
    return 'unknown';
  }

  private guessPOS(word: string, role: GrammaticalRole): string {
    const lower = word.toLowerCase();
    
    if (role === 'article') return 'DET';
    if (role === 'pronoun') return 'PRON';
    if (role === 'auxiliary') return 'AUX';
    if (role === 'conjunction') return 'CONJ';
    if (role === 'preposition') return 'PREP';
    
    if (lower.endsWith('ing')) return 'VBG';
    if (lower.endsWith('ed')) return 'VBN';
    if (lower.endsWith('s') && !lower.endsWith('ss')) return 'VBZ';
    if (lower.endsWith('ly')) return 'RB';
    if (lower.endsWith('ness')) return 'NN';
    if (lower.endsWith('ment')) return 'NN';
    if (lower.endsWith('tion') || lower.endsWith('sion')) return 'NN';
    
    return 'UNK';
  }

  private isVariableWord(word: string, isQuestion: boolean): boolean {
    const lower = word.toLowerCase();
    
    if (WH_WORDS[lower]) return true;
    if (isQuestion && /^[a-z]+$/i.test(word)) return true;
    if (/^[A-Z][a-z]+$/.test(word) && word.length > 2) return true;
    
    return false;
  }

  private detectSentenceType(input: string, tokens: Token[]): SentenceType {
    const trimmed = input.trim();
    
    if (trimmed.endsWith('!')) return 'exclamatory';
    if (trimmed.endsWith('?')) return 'interrogative';
    
    const firstWord = tokens[0]?.word.toLowerCase();
    if (firstWord && IMPERATIVE_VERBS.includes(firstWord)) return 'imperative';
    if (tokens[0]?.role === 'verb') return 'imperative';
    
    const hasQuestionWords = tokens.some(t => WH_WORDS[t.word]);
    if (hasQuestionWords && tokens.some(t => t.word === '?')) return 'interrogative';
    
    return 'declarative';
  }

  private detectClauseType(tokens: Token[]): 'simple' | 'compound' | 'complex' | 'compound-complex' {
    const hasConjunction = tokens.some(t => t.role === 'conjunction');
    const hasSubordinate = tokens.some(t => 
      /\b(because|although|while|when|if|unless|since|after|before|until|that|which|who)\b/i.test(t.word)
    );
    
    if (hasConjunction && hasSubordinate) return 'compound-complex';
    if (hasConjunction) return 'compound';
    if (hasSubordinate) return 'complex';
    return 'simple';
  }

  private detectTense(tokens: Token[]): string {
    const words = tokens.map(t => t.word).join(' ');
    
    for (const { pattern, tense } of VERB_PATTERNS) {
      if (pattern.test(words)) return tense;
    }
    
    return 'present';
  }

  private detectPolarity(tokens: Token[]): 'positive' | 'negative' | 'neutral' {
    const hasNegation = tokens.some(t => NEGATION_WORDS.includes(t.word.toLowerCase()));
    return hasNegation ? 'negative' : 'positive';
  }

  private extractSubject(tokens: Token[]): string | null {
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.role === 'subject' || token.role === 'pronoun') {
        return token.word;
      }
    }
    
    const firstNoun = tokens.find(t => t.POS.startsWith('NN'));
    if (firstNoun) return firstNoun.word;
    
    return null;
  }

  private extractVerb(tokens: Token[]): string | null {
    const verb = tokens.find(t => t.role === 'verb' || t.POS.startsWith('VB'));
    return verb?.word || null;
  }

  private extractObject(tokens: Token[]): string | null {
    const prepositionIndex = tokens.findIndex(t => t.role === 'preposition');
    
    if (prepositionIndex >= 0 && prepositionIndex < tokens.length - 1) {
      const afterPrep = tokens.slice(prepositionIndex + 1);
      const obj = afterPrep.find(t => t.POS.startsWith('NN') || t.role === 'pronoun');
      if (obj) return obj.word;
    }
    
    const afterVerb = tokens.slice(1).find(t => t.POS.startsWith('NN'));
    if (afterVerb) return afterVerb.word;
    
    return null;
  }

  private extractComplement(tokens: Token[]): string | null {
    const beVerbs = tokens.filter(t => 
      /\b(is|are|was|were|be|become|seem|appear)\b/i.test(t.word)
    );
    
    if (beVerbs.length > 0) {
      const lastBe = beVerbs[beVerbs.length - 1];
      const afterIndex = tokens.findIndex(t => t === lastBe) + 1;
      if (afterIndex < tokens.length) {
        return tokens.slice(afterIndex).map(t => t.word).join(' ');
      }
    }
    
    return null;
  }

  private extractVariables(tokens: Token[], original: string): VariableSlot[] {
    const variables: VariableSlot[] = [];
    const words = tokens.map(t => t.word);
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const lower = token.word.toLowerCase();
      
      let varType: VariableType | null = null;
      
      if (WH_WORDS[lower]) {
        varType = WH_WORDS[lower];
      } else {
        for (const { pattern, type } of WH_PHRASES) {
          const phrase = words.slice(Math.max(0, i - 1), i + 2).join(' ');
          if (pattern.test(phrase)) {
            varType = type;
            break;
          }
        }
      }
      
      if (!varType && /^[A-Z][a-z]+$/.test(token.original) && token.original.length > 2) {
        varType = 'entity';
      }
      
      if (varType) {
        const start = Math.max(0, i - 2);
        const end = Math.min(words.length, i + 3);
        const context = words.slice(start, end).join(' ');
        
        variables.push({
          word: token.original,
          type: varType,
          position: i,
          context,
          canBeClarified: this.canBeClarified(varType),
          examples: this.getQuestionExamples(varType),
        });
      }
    }
    
    return variables;
  }

  private canBeClarified(type: VariableType): boolean {
    const clarifiable: VariableType[] = [
      'person', 'thing', 'place', 'time', 'quantity', 'choice', 'entity'
    ];
    return clarifiable.includes(type);
  }

  private getQuestionExamples(type: VariableType): string[] {
    const examples: Record<VariableType, string[]> = {
      person: ['Who specifically?', 'Which person?'],
      thing: ['What exactly?', 'What do you mean by that?'],
      place: ['Where specifically?', 'Which location?'],
      time: ['When exactly?', 'What timeframe?'],
      reason: ['Why do you ask?', 'What purpose?'],
      manner: ['How specifically?', 'In what way?'],
      quantity: ['How many?', 'How much?'],
      frequency: ['How often?', 'How frequently?'],
      duration: ['How long?', 'What duration?'],
      choice: ['Which option?', 'Which one?'],
      definition: ['Do you mean...?', 'Are you asking about...'],
      comparison: ['Compared to what?', 'What are you comparing?'],
      purpose: ['For what purpose?', 'What for?'],
      entity: ['Can you be more specific?', 'What do you mean by...?'],
    };
    
    return examples[type] || [];
  }

  private calculateConfidence(tokens: Token[], variables: VariableSlot[]): number {
    if (tokens.length === 0) return 0;
    
    const hasSubject = tokens.some(t => t.role === 'subject');
    const hasVerb = tokens.some(t => t.role === 'verb' || t.POS.startsWith('VB'));
    const hasVariables = variables.length > 0;
    
    let confidence = 0.5;
    if (hasSubject) confidence += 0.2;
    if (hasVerb) confidence += 0.2;
    if (hasVariables) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }
}

export const sentenceStructureParser = new SentenceStructureParser();
