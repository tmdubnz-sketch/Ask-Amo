import { sentenceStructureParser, type SentenceStructure, type VariableSlot, type VariableType } from './sentenceStructureParser';
import { followUpQuestionGenerator, type FollowUpQuestion, type IntentRefinement } from './followUpQuestionGenerator';

export interface RefinedIntent {
  query: string;
  structure: SentenceStructure;
  intentType: 'informational' | 'transactional' | 'conversational' | 'ambiguous';
  keyVariables: VariableSlot[];
  suggestedFollowUps: FollowUpQuestion[];
  needsClarification: boolean;
  refinementSuggestions: string[];
  confidenceScore: number;
  adjustedQuery?: string;
}

export interface IntentSlot {
  name: string;
  value: string;
  type: VariableType;
  confidence: number;
  canAdjust: boolean;
}

const INTENT_KEYWORDS: Record<string, string[]> = {
  informational: [
    'what', 'who', 'where', 'when', 'why', 'how', 'explain', 'define', 'tell me about',
    'find', 'search', 'lookup', 'information', 'facts', 'learn', 'know', 'understand'
  ],
  transactional: [
    'do', 'make', 'create', 'build', 'write', 'run', 'execute', 'send', 'get', 'find',
    'book', 'buy', 'order', 'schedule', 'reserve', 'open', 'close', 'save', 'delete'
  ],
  conversational: [
    'hi', 'hello', 'hey', 'how are', 'what up', 'thanks', 'thank', 'please', 'sorry',
    'good', 'nice', 'cool', 'love', 'like', 'think', 'feel', 'believe', 'opinion'
  ],
};

const VARIABLE_EXTRACTION_PATTERNS: Array<{
  pattern: RegExp;
  slotName: string;
  variableType: VariableType;
}> = [
  { pattern: /\b(who|whom|whose)\b\s+(.*)/i, slotName: 'person', variableType: 'person' },
  { pattern: /\bwhat\s+(.*?)\s+(is|are|was|were)\b/i, slotName: 'thing', variableType: 'thing' },
  { pattern: /\bwhere\b\s+(.*)/i, slotName: 'location', variableType: 'place' },
  { pattern: /\bwhen\b\s+(.*)/i, slotName: 'time', variableType: 'time' },
  { pattern: /\bwhy\b\s+(.*)/i, slotName: 'reason', variableType: 'reason' },
  { pattern: /\bhow\s+(many|much|long|often|far)\b\s+(.*)/i, slotName: 'quantity', variableType: 'quantity' },
  { pattern: /\bhow\b\s+(.*?)\s+(do|does|did|to|about)\b/i, slotName: 'manner', variableType: 'manner' },
  { pattern: /\bwhich\s+(.*)/i, slotName: 'choice', variableType: 'choice' },
];

class IntentRefinementService {
  
  analyze(userInput: string, conversationHistory?: string[]): RefinedIntent {
    const structure = sentenceStructureParser.parse(userInput);
    const refinement = followUpQuestionGenerator.refineIntent(userInput);
    
    const intentType = this.classifyIntentType(userInput, structure);
    const keyVariables = this.extractKeyVariables(structure, userInput);
    const suggestedFollowUps = followUpQuestionGenerator.generate(structure);
    const needsClarification = refinement.canAnswer === false;
    const refinementSuggestions = this.generateRefinementSuggestions(structure, keyVariables);
    const confidenceScore = this.calculateConfidenceScore(structure, keyVariables, refinement);
    const adjustedQuery = this.adjustQueryForAmbiguity(structure, keyVariables);
    
    return {
      query: userInput,
      structure,
      intentType,
      keyVariables,
      suggestedFollowUps,
      needsClarification,
      refinementSuggestions,
      confidenceScore,
      adjustedQuery,
    };
  }

  private classifyIntentType(userInput: string, structure: SentenceStructure): 
    'informational' | 'transactional' | 'conversational' | 'ambiguous' {
    
    const lowerInput = userInput.toLowerCase();
    let maxScore = 0;
    let detectedIntent: string = 'ambiguous';
    
    for (const [intentType, keywords] of Object.entries(INTENT_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        if (lowerInput.includes(keyword)) {
          score++;
        }
      }
      if (score > maxScore) {
        maxScore = score;
        detectedIntent = intentType;
      }
    }
    
    if (maxScore === 0) return 'ambiguous';
    
    if (structure.type === 'interrogative' && detectedIntent === 'conversational') {
      return 'informational';
    }
    
    if (structure.variables.length > 2 && detectedIntent === 'conversational') {
      return 'informational';
    }
    
    return detectedIntent as 'informational' | 'transactional' | 'conversational';
  }

  private extractKeyVariables(structure: SentenceStructure, userInput: string): VariableSlot[] {
    const variables = [...structure.variables];
    
    for (const { pattern, slotName, variableType } of VARIABLE_EXTRACTION_PATTERNS) {
      const match = userInput.match(pattern);
      if (match && !variables.find(v => v.type === variableType)) {
        variables.push({
          word: match[2] || match[1] || '',
          type: variableType,
          position: 0,
          context: match[0],
          canBeClarified: true,
          examples: [],
        });
      }
    }
    
    const capitalizedWords = userInput.match(/[A-Z][a-z]+/g) || [];
    for (const word of capitalizedWords.slice(0, 2)) {
      if (!variables.find(v => v.word.toLowerCase() === word.toLowerCase())) {
        variables.push({
          word,
          type: 'entity',
          position: 0,
          context: word,
          canBeClarified: true,
          examples: [],
        });
      }
    }
    
    return variables;
  }

  private generateRefinementSuggestions(structure: SentenceStructure, variables: VariableSlot[]): string[] {
    const suggestions: string[] = [];
    
    if (structure.subject && structure.subject.length < 3) {
      suggestions.push('Consider specifying the subject more clearly');
    }
    
    if (variables.length === 0) {
      suggestions.push('Try including more specific details in your query');
    }
    
    if (structure.confidence < 0.5) {
      suggestions.push('Your query may benefit from more context');
    }
    
    if (variables.some(v => v.type === 'thing' || v.type === 'entity')) {
      suggestions.push('Clarify what specific thing or entity you\'re asking about');
    }
    
    if (structure.type === 'declarative') {
      suggestions.push('Consider rephrasing as a question if you need information');
    }
    
    return suggestions;
  }

  private calculateConfidenceScore(
    structure: SentenceStructure, 
    variables: VariableSlot[],
    refinement: IntentRefinement
  ): number {
    let score = structure.confidence;
    
    if (variables.length > 0 && variables.length <= 3) {
      score += 0.15;
    } else if (variables.length > 3) {
      score -= 0.1;
    }
    
    if (refinement.clarificationNeeded.length === 0) {
      score += 0.15;
    } else {
      score -= refinement.clarificationNeeded.length * 0.1;
    }
    
    if (structure.type === 'interrogative') {
      score += 0.1;
    }
    
    if (structure.subject) {
      score += 0.1;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  private adjustQueryForAmbiguity(structure: SentenceStructure, variables: VariableSlot[]): string | undefined {
    if (variables.length === 0) return undefined;
    
    const ambiguousVariables = variables.filter(v => 
      v.type === 'thing' || v.type === 'entity' || v.type === 'person'
    );
    
    if (ambiguousVariables.length === 0) return undefined;
    
    const adjustments: string[] = [];
    
    for (const variable of ambiguousVariables) {
      const clarification = this.getClarificationTemplate(variable.type);
      if (clarification) {
        adjustments.push(clarification.replace('{word}', variable.word));
      }
    }
    
    return adjustments.length > 0 ? adjustments[0] : undefined;
  }

  private getClarificationTemplate(type: VariableType): string | null {
    const templates: Record<VariableType, string | null> = {
      person: 'Are you asking about {word}?',
      thing: 'Do you mean "{word}"?',
      place: 'Is "{word}" the location you\'re asking about?',
      time: 'Are you asking about when "{word}" happens?',
      reason: 'Do you want to know why "{word}"?',
      manner: 'Are you asking how "{word}" works?',
      quantity: 'How many "{word}" are you asking about?',
      frequency: 'How often should "{word}" happen?',
      duration: 'How long should "{word}" last?',
      choice: 'Are you asking which "{word}"?',
      definition: 'Do you want to know what "{word}" means?',
      comparison: 'What are you comparing "{word}" to?',
      purpose: 'What is "{word}" for?',
      entity: 'Can you tell me more about "{word}"?',
    };
    
    return templates[type] || null;
  }

  generateAdjustableReply(
    variable: VariableSlot,
    currentValue: string,
    adjustment: 'more_specific' | 'more_general' | 'related'
  ): string {
    switch (adjustment) {
      case 'more_specific':
        return this.generateMoreSpecificQuestion(variable, currentValue);
      case 'more_general':
        return this.generateMoreGeneralQuestion(variable, currentValue);
      case 'related':
        return this.generateRelatedQuestion(variable, currentValue);
      default:
        return currentValue;
    }
  }

  private generateMoreSpecificQuestion(variable: VariableSlot, currentValue: string): string {
    const templates: Record<VariableType, string> = {
      person: `Are you asking about a specific person like ${currentValue}?`,
      thing: `Do you mean "${currentValue}" specifically?`,
      place: `Is "${currentValue}" the exact place?`,
      time: `Are you asking about ${currentValue} specifically?`,
      reason: `Is there a specific reason related to "${currentValue}"?`,
      manner: `Do you want to know about "${currentValue}" specifically?`,
      quantity: `How many of "${currentValue}" exactly?`,
      frequency: `How often specifically about "${currentValue}"?`,
      duration: `How long specifically for "${currentValue}"?`,
      choice: `Which specific "${currentValue}"?`,
      definition: `The definition of "${currentValue}" specifically?`,
      comparison: `Comparing "${currentValue}" to what?`,
      purpose: `The purpose of "${currentValue}" specifically?`,
      entity: `More details about "${currentValue}"?`,
    };
    
    return templates[variable.type] || `Can you be more specific about "${currentValue}"?`;
  }

  private generateMoreGeneralQuestion(variable: VariableSlot, currentValue: string): string {
    const templates: Record<VariableType, string> = {
      person: `Are you asking about people in general, not just "${currentValue}"?`,
      thing: `Do you mean something like "${currentValue}" in general?`,
      place: `Are you asking about places in general, not "${currentValue}" specifically?`,
      time: `Are you asking about timing in general, not just "${currentValue}"?`,
      reason: `Are you asking about reasons in general?`,
      manner: `Are you asking about the way things work in general?`,
      quantity: `Are you asking about quantity in general?`,
      frequency: `Are you asking about how often things happen generally?`,
      duration: `Are you asking about duration in general?`,
      choice: `Are you asking about options in general?`,
      definition: `Are you asking for a general definition?`,
      comparison: `Are you asking for a general comparison?`,
      purpose: `Are you asking about purpose in general?`,
      entity: `Are you asking about this type of thing generally?`,
    };
    
    return templates[variable.type] || `Would a broader answer about "${currentValue}" help?`;
  }

  private generateRelatedQuestion(variable: VariableSlot, currentValue: string): string {
    const templates: Record<VariableType, string> = {
      person: `Do you want to know about people related to "${currentValue}"?`,
      thing: `Are you interested in things similar to "${currentValue}"?`,
      place: `Do you want to know about places near "${currentValue}"?`,
      time: `Are you asking about what happens around "${currentValue}"?`,
      reason: `Are you curious about reasons related to "${currentValue}"?`,
      manner: `Are you asking how "${currentValue}" relates to other things?`,
      quantity: `Are you curious about related quantities?`,
      frequency: `Are you interested in similar frequencies?`,
      duration: `Are you asking about related timeframes?`,
      choice: `Are you comparing "${currentValue}" to alternatives?`,
      definition: `Do you want to know related terms or concepts?`,
      comparison: `What else compares to "${currentValue}"?`,
      purpose: `What other purposes relate to "${currentValue}"?`,
      entity: `What else is related to "${currentValue}"?`,
    };
    
    return templates[variable.type] || `Would learning about related concepts help?`;
  }
}

export const intentRefinementService = new IntentRefinementService();
