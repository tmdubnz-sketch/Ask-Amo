import { amoBrainService } from './amoBrainService';
import { amoToolCoordinator } from './amoToolCoordinator';
import { runIdeLoop } from './amoIdeLoop';
import { createError, logError, ERROR_CODES } from './errorHandlingService';
import type { ExtractedSlots } from './slotExtractorService';

export interface IntegrationContext {
  chatId: string;
  userInput: string;
  slots: ExtractedSlots;
  isOnline: boolean;
  isWebSearchEnabled: boolean;
  currentWebViewUrl: string;
  baseContext: string;
}

export interface IntegrationResult {
  response: string;
  toolsUsed: string[];
  viewSwitch?: string;
  webViewUrl?: string;
  contextBlock: string;
  success: boolean;
  error?: string;
}

export const amoIntegrationService = {
  
  /**
   * Main integration point that coordinates all Amo services
   */
  async processRequest(context: IntegrationContext): Promise<IntegrationResult> {
    try {
      // 1. Check brain service for relevant context and memories
      const brainContext = await amoBrainService.buildFastContext(context.chatId, context.userInput);
      
      // 2. Learn from this interaction
      await this.learnFromInteraction(context);
      
      // 3. Determine if this is an IDE task or general request
      const isIdeTask = await this.isIdeTask(context);
      
      if (isIdeTask) {
        return await this.handleIdeTask(context, brainContext);
      } else {
        return await this.handleGeneralRequest(context, brainContext);
      }
      
    } catch (error) {
      logError('IntegrationService', error, `Processing request: ${context.userInput}`);
      
      return {
        response: `I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        toolsUsed: [],
        contextBlock: '',
        success: false,
        error: String(error),
      };
    }
  },

  /**
   * Handle IDE-specific tasks with the full IDE loop
   */
  async handleIdeTask(context: IntegrationContext, brainContext: string): Promise<IntegrationResult> {
    const combinedContext = [
      context.baseContext,
      brainContext ? `---\n[Memory context]\n${brainContext}` : '',
    ].filter(Boolean).join('\n\n');

    // This would need to be integrated with the actual IDE loop execution
    // For now, return a placeholder that would be handled by the caller
    return {
      response: '[IDE_TASK_DETECTED]',
      toolsUsed: ['ide-loop'],
      contextBlock: combinedContext,
      success: true,
    };
  },

  /**
   * Handle general requests with tool coordinator
   */
  async handleGeneralRequest(context: IntegrationContext, brainContext: string): Promise<IntegrationResult> {
    const toolResult = await amoToolCoordinator.handle(
      context.slots,
      context.userInput,
      context.chatId,
      {
        isOnline: context.isOnline,
        isWebSearchEnabled: context.isWebSearchEnabled,
        currentWebViewUrl: context.currentWebViewUrl,
      }
    );

    const combinedContext = [
      brainContext ? `[Memory context]\n${brainContext}` : '',
      toolResult.contextBlock,
    ].filter(Boolean).join('\n\n');

    return {
      response: toolResult.instantReply || '',
      toolsUsed: toolResult.toolsUsed,
      viewSwitch: toolResult.viewSwitch,
      webViewUrl: toolResult.webViewUrl,
      contextBlock: combinedContext,
      success: true,
    };
  },

  /**
   * Learn from user interactions to improve future responses
   */
  async learnFromInteraction(context: IntegrationContext): Promise<void> {
    // Learn user preferences
    if (context.slots.action === 'store' || context.slots.target === 'knowledge') {
      await amoBrainService.remember(
        context.chatId,
        'User preference',
        context.userInput,
        ['tool-preference', 'interaction']
      );
    }

    // Learn successful patterns
    if (context.slots.action === 'execute' && context.slots.target === 'terminal') {
      await amoBrainService.rememberFact(
        context.chatId,
        'preferred-command-pattern',
        context.userInput
      );
    }

    // Learn topics of interest
    if (context.slots.topic) {
      await amoBrainService.remember(
        context.chatId,
        'Topic interest',
        context.slots.topic,
        ['interest', 'topic']
      );
    }
  },

  /**
   * Determine if this is an IDE task based on patterns and context
   */
  async isIdeTask(context: IntegrationContext): Promise<boolean> {
    const normalized = context.userInput.toLowerCase();
    
    const idePatterns = [
      /\b(create|make|write|build|generate|scaffold)\b.+\b(file|app|project|script|function|class|component|html|css|js|ts|py|java|code)\b/i,
      /\b(run|execute|test|compile|build|start|launch)\b.+\b(this|it|the|my|that|code|script|app|file|project)\b/i,
      /\b(fix|debug|find the (bug|error|issue)|what.s wrong|why (is|does|isn.t))\b/i,
      /\b(hello world|fizzbuzz|todo app|api|server|express|react|node|python)\b/i,
      /\b(npm|pip|yarn|node|python|java|gcc|make)\b/i,
      /\b(git (init|clone|commit|push|pull|status|log))\b/i,
      /\b(workspace|amo-workspace|project folder)\b/i,
    ];

    return idePatterns.some(pattern => pattern.test(normalized));
  },

  /**
   * Get enhanced context for a specific chat
   */
  async getEnhancedContext(chatId: string, query: string): Promise<string> {
    const [brainContext] = await Promise.all([
      amoBrainService.buildFastContext(chatId, query),
    ]);

    return brainContext || '';
  },

  /**
   * Update Amo's learning based on user feedback
   */
  async updateFromFeedback(
    chatId: string,
    originalRequest: string,
    wasHelpful: boolean,
    feedback?: string
  ): Promise<void> {
    if (wasHelpful) {
      await amoBrainService.remember(
        chatId,
        'Successful interaction',
        originalRequest,
        ['success', 'helpful']
      );
    } else {
      await amoBrainService.remember(
        chatId,
        'Unhelpful interaction',
        feedback || originalRequest,
        ['improvement-needed']
      );
    }
  },
};
