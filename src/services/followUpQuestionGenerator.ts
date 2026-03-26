import { sentenceStructureParser, type SentenceStructure, type VariableType, type VariableSlot } from './sentenceStructureParser';

export interface FollowUpQuestion {
  question: string;
  type: 'clarification' | 'expansion' | 'confirmation' | 'deepening' | 'action';
  priority: number;
  variables: string[];
  exampleReplies: string[];
}

export interface IntentRefinement {
  originalQuery: string;
  refinedQuery: string;
  variablesIdentified: VariableSlot[];
  clarificationNeeded: FollowUpQuestion[];
  canAnswer: boolean;
  confidence: number;
}

const VARIABLE_CLARIFICATIONS: Record<VariableType, string[]> = {
  person: [
    'Do you mean a specific person?',
    'Are you asking about someone in particular?',
    'Who are you referring to?',
  ],
  thing: [
    'What exactly do you mean by that?',
    'Can you be more specific about what you\'re asking?',
    'Are you referring to something particular?',
  ],
  place: [
    'Which location are you asking about?',
    'Do you mean a specific place?',
    'Where exactly are you referring to?',
  ],
  time: [
    'When specifically are you asking about?',
    'What time period do you mean?',
    'Are you asking about a particular time?',
  ],
  reason: [
    'Why do you want to know?',
    'What\'s the purpose of your question?',
    'Are you looking for a specific reason?',
  ],
  manner: [
    'What specific way are you asking about?',
    'Do you mean in a particular way?',
    'How exactly should I explain this?',
  ],
  quantity: [
    'How many are you asking about?',
    'What quantity do you need?',
    'Are you asking about a specific number?',
  ],
  frequency: [
    'How often should this happen?',
    'What frequency are you asking about?',
    'How frequently do you need this?',
  ],
  duration: [
    'How long should this last?',
    'What duration are you asking about?',
    'For how long?',
  ],
  choice: [
    'Which option are you considering?',
    'Are you choosing between specific things?',
    'What are your options?',
  ],
  definition: [
    'Are you asking for a definition?',
    'Do you want me to explain what this means?',
    'Should I define this term for you?',
  ],
  comparison: [
    'What are you comparing this to?',
    'Do you want a comparison?',
    'What\'s the baseline you\'re comparing against?',
  ],
  purpose: [
    'What is this for?',
    'What\'s the intended use?',
    'Why do you need this?',
  ],
  entity: [
    'Can you provide more details about this?',
    'What specific entity are you asking about?',
    'Do you have a particular example in mind?',
  ],
};

const CONTEXTUAL_FOLLOWUPS: Record<string, string[]> = {
  help: [
    'What specifically do you need help with?',
    'Are you working on something right now?',
    'Is there a particular task you\'re trying to accomplish?',
  ],
  search: [
    'What kind of information are you looking for?',
    'Do you want recent information or general knowledge?',
    'Should I search the web for this?',
  ],
  create: [
    'What should this look like when it\'s done?',
    'Do you have any specific requirements?',
    'What format would you prefer?',
  ],
  explain: [
    'How detailed should my explanation be?',
    'Do you need examples?',
    'Should I keep it simple or go in-depth?',
  ],
  code: [
    'What programming language should I use?',
    'Do you have any specific requirements?',
    'Should I include comments?',
  ],
  default: [
    'Can you tell me more about what you\'re looking for?',
    'Would you like me to elaborate?',
    'Should I go into more detail?',
  ],
};

export class FollowUpQuestionGenerator {
  
  generate(structure: SentenceStructure, response?: string): FollowUpQuestion[] {
    const questions: FollowUpQuestion[] = [];
    
    if (structure.variables.length > 0) {
      const clarificationQuestions = this.generateClarificationQuestions(structure.variables);
      questions.push(...clarificationQuestions);
    }
    
    const contextQuestions = this.generateContextQuestions(structure);
    questions.push(...contextQuestions);
    
    if (response) {
      const deepeningQuestions = this.generateDeepeningQuestions(structure, response);
      questions.push(...deepeningQuestions);
    }
    
    const actionQuestions = this.generateActionQuestions(structure);
    questions.push(...actionQuestions);
    
    return questions
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 4);
  }

  private generateClarificationQuestions(variables: VariableSlot[]): FollowUpQuestion[] {
    return variables
      .filter(v => v.canBeClarified)
      .slice(0, 2)
      .map(variable => {
        const clarifications = VARIABLE_CLARIFICATIONS[variable.type] || VARIABLE_CLARIFICATIONS.thing;
        const randomQuestion = clarifications[Math.floor(Math.random() * clarifications.length)];
        
        return {
          question: randomQuestion,
          type: 'clarification' as const,
          priority: 10,
          variables: [variable.word],
          exampleReplies: variable.examples,
        };
      });
  }

  private generateContextQuestions(structure: SentenceStructure): FollowUpQuestion[] {
    const questions: FollowUpQuestion[] = [];
    
    const detectedIntent = this.detectIntentFromStructure(structure);
    const contextQs = CONTEXTUAL_FOLLOWUPS[detectedIntent] || CONTEXTUAL_FOLLOWUPS.default;
    
    if (contextQs.length > 0) {
      const randomQ = contextQs[Math.floor(Math.random() * contextQs.length)];
      questions.push({
        question: randomQ,
        type: 'expansion' as const,
        priority: 7,
        variables: [],
        exampleReplies: [],
      });
    }
    
    if (structure.type === 'declarative' && structure.confidence < 0.7) {
      questions.push({
        question: 'Did I understand you correctly?',
        type: 'confirmation' as const,
        priority: 8,
        variables: [],
        exampleReplies: ['Yes', 'No, I meant...'],
      });
    }
    
    return questions;
  }

  private generateDeepeningQuestions(structure: SentenceStructure, response: string): FollowUpQuestion[] {
    const questions: FollowUpQuestion[] = [];
    
    const responseLength = response.split(/\s+/).length;
    if (responseLength > 50) {
      questions.push({
        question: 'Would you like me to explain any part in more detail?',
        type: 'deepening' as const,
        priority: 5,
        variables: [],
        exampleReplies: ['Yes, explain...', 'That\'s clear, thanks'],
      });
    }
    
    if (structure.type === 'interrogative') {
      questions.push({
        question: 'Are you looking for more information on this topic?',
        type: 'expansion' as const,
        priority: 6,
        variables: [],
        exampleReplies: ['Yes, tell me more', 'No, that\'s enough'],
      });
    }
    
    return questions;
  }

  private generateActionQuestions(structure: SentenceStructure): FollowUpQuestion[] {
    const questions: FollowUpQuestion[] = [];
    
    if (structure.type === 'imperative') {
      questions.push({
        question: 'Should I proceed with this now?',
        type: 'action' as const,
        priority: 9,
        variables: [],
        exampleReplies: ['Yes please', 'Wait, let me think...'],
      });
    }
    
    return questions;
  }

  private detectIntentFromStructure(structure: SentenceStructure): string {
    const text = structure.normalized.toLowerCase();
    
    if (/\b(help|assist|how do|can you)\b/i.test(text)) return 'help';
    if (/\b(search|find|look up|what is|who is)\b/i.test(text)) return 'search';
    if (/\b(create|make|write|build|generate)\b/i.test(text)) return 'create';
    if (/\b(explain|describe|tell me about)\b/i.test(text)) return 'explain';
    if (/\b(code|program|function|script)\b/i.test(text)) return 'code';
    
    return 'default';
  }

  refineIntent(userInput: string): IntentRefinement {
    const structure = sentenceStructureParser.parse(userInput);
    const followUps = this.generate(structure);
    
    const clarificationNeeded = followUps.filter(q => q.type === 'clarification');
    const canAnswer = clarificationNeeded.length === 0 || 
                     structure.confidence > 0.6 ||
                     structure.variables.length === 0;
    
    const refinedQuery = this.buildRefinedQuery(structure);
    
    return {
      originalQuery: userInput,
      refinedQuery,
      variablesIdentified: structure.variables,
      clarificationNeeded,
      canAnswer,
      confidence: structure.confidence,
    };
  }

  private buildRefinedQuery(structure: SentenceStructure): string {
    const parts: string[] = [];
    
    if (structure.subject) {
      parts.push(`subject: ${structure.subject}`);
    }
    if (structure.verb) {
      parts.push(`action: ${structure.verb}`);
    }
    if (structure.object) {
      parts.push(`target: ${structure.object}`);
    }
    if (structure.complement) {
      parts.push(`context: ${structure.complement}`);
    }
    
    if (structure.variables.length > 0) {
      const varWords = structure.variables.map(v => `${v.type}:${v.word}`).join(', ');
      parts.push(`variables: [${varWords}]`);
    }
    
    return parts.length > 0 ? parts.join(' | ') : structure.normalized;
  }

  generateConfirmationPrompt(structure: SentenceStructure, response: string): string {
    const subject = structure.subject || 'this';
    const verb = structure.verb || 'is about';
    const object = structure.object ? ` "${structure.object}"` : '';
    
    return `You asked about ${subject} ${verb}${object}. I answered: "${response.slice(0, 100)}...". Ask if the user wants clarification or more details.`;
  }
}

export const followUpQuestionGenerator = new FollowUpQuestionGenerator();
