import {
  knowledgeStoreService,
  type ConversationMemoryRow,
  type MemorySummaryRow,
  type SeedPackRow,
  type ToolRegistryRow,
} from './knowledgeStoreService';

function trimText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const amoBrainService = {
  async getToolRegistry(): Promise<ToolRegistryRow[]> {
    return knowledgeStoreService.listToolRegistry();
  },

  async getSeedPacks(): Promise<SeedPackRow[]> {
    return knowledgeStoreService.listSeedPacks();
  },

  async getConversationMemory(scope: string): Promise<ConversationMemoryRow[]> {
    return knowledgeStoreService.listConversationMemory(scope);
  },

  async getMemorySummaries(scope: string): Promise<MemorySummaryRow[]> {
    return knowledgeStoreService.listMemorySummaries(scope);
  },

  async updateMemoryNote(id: string, title: string, content: string, tags: string[] = []): Promise<void> {
    await knowledgeStoreService.updateConversationMemory({
      id,
      title,
      content,
      tags,
    });
  },

  async deleteMemoryNote(id: string): Promise<void> {
    await knowledgeStoreService.deleteConversationMemory(id);
  },

  async clearMemoryNotes(scope: string): Promise<void> {
    await knowledgeStoreService.clearConversationMemoryScope(scope);
  },

  async remember(scope: string, title: string, content: string, tags: string[] = [], weight = 1): Promise<void> {
    await knowledgeStoreService.upsertConversationMemory({
      id: createId('memory'),
      scope,
      memoryType: 'note',
      title,
      content,
      tags,
      weight,
    });
  },

  async summarize(scope: string, sourceType: string, sourceId: string, summary: string, keywords: string[] = []): Promise<void> {
    await knowledgeStoreService.upsertMemorySummary({
      id: createId('summary'),
      scope,
      sourceType,
      sourceId,
      summary,
      keywords,
    });
  },

  async updateSummary(id: string, summary: string, keywords: string[] = []): Promise<void> {
    await knowledgeStoreService.updateMemorySummary({
      id,
      summary,
      keywords,
    });
  },

  async deleteSummary(id: string): Promise<void> {
    await knowledgeStoreService.deleteMemorySummary(id);
  },

  async clearSummaries(scope: string): Promise<void> {
    await knowledgeStoreService.clearMemorySummariesScope(scope);
  },

  async buildFastContext(scope: string, query: string): Promise<string> {
    const appScope = 'app:ask-amo';
    const [scopeMemories, appMemories, scopeSummaries, appSummaries, packs] = await Promise.all([
      knowledgeStoreService.listConversationMemory(scope),
      scope === appScope ? Promise.resolve([]) : knowledgeStoreService.listConversationMemory(appScope),
      knowledgeStoreService.listMemorySummaries(scope),
      scope === appScope ? Promise.resolve([]) : knowledgeStoreService.listMemorySummaries(appScope),
      knowledgeStoreService.listSeedPacks(),
    ]);

    const memories = [...scopeMemories, ...appMemories];
    const summaries = [...scopeSummaries, ...appSummaries];
    const normalizedQuery = query.toLowerCase();
    const queryTerms = normalizedQuery.split(/\s+/).filter(t => t.length > 2);

    // Score memories by relevance, fall back to recency
    const scoredMemories = memories.map(memory => {
      const haystack = `${memory.title} ${memory.content} ${memory.tags_json}`.toLowerCase();
      const score = queryTerms.filter(term => haystack.includes(term)).length;
      return { memory, score };
    }).sort((a, b) => b.score - a.score || b.memory.weight - a.memory.weight);

    const scoredSummaries = summaries.map(summary => {
      const haystack = `${summary.summary} ${summary.keywords_json}`.toLowerCase();
      const score = queryTerms.filter(term => haystack.includes(term)).length;
      return { summary, score };
    }).sort((a, b) => b.score - a.score);

    // Always take top results regardless of score — never return empty
    const topMemories = scoredMemories.slice(0, 4).map(s => s.memory);
    const topSummaries = scoredSummaries.slice(0, 3).map(s => s.summary);
    const activePacks = packs.slice(0, 3);

    const lines: string[] = [];

    if (topMemories.length > 0) {
      lines.push('Remembered context:');
      for (const memory of topMemories) {
        lines.push(`- ${memory.title}: ${trimText(memory.content, 120)}`);
      }
    }

    if (topSummaries.length > 0) {
      lines.push('Conversation history:');
      for (const summary of topSummaries) {
        lines.push(`- ${trimText(summary.summary, 100)}`);
      }
    }

    if (activePacks.length > 0) {
      lines.push('Guidance:');
      for (const pack of activePacks) {
        lines.push(`- ${pack.pack_name}: ${trimText(pack.description, 80)}`);
      }
    }

    return lines.join('\n').trim();
  },
};
