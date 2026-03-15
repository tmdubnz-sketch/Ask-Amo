import {
  knowledgeStoreService,
  type ConversationMemoryRow,
  type MemorySummaryRow,
  type SeedPackRow,
  type ToolRegistryRow,
} from './knowledgeStoreService';

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

    const matchedMemories = memories
      .filter((memory) => {
        const haystack = `${memory.title} ${memory.content} ${memory.tags_json}`.toLowerCase();
        return haystack.includes(normalizedQuery) || normalizedQuery.split(/\s+/).some((term) => term.length > 2 && haystack.includes(term));
      })
      .slice(0, 3);

    const matchedSummaries = summaries
      .filter((summary) => {
        const haystack = `${summary.summary} ${summary.keywords_json}`.toLowerCase();
        return haystack.includes(normalizedQuery) || normalizedQuery.split(/\s+/).some((term) => term.length > 2 && haystack.includes(term));
      })
      .slice(0, 2);

    const activePacks = packs.slice(0, 2);
    const lines: string[] = [];

    if (matchedMemories.length > 0) {
      lines.push('Remembered user context:');
      for (const memory of matchedMemories) {
        lines.push(`- ${memory.title}: ${memory.content}`);
      }
    }

    if (matchedSummaries.length > 0) {
      lines.push('Recent conversation summary:');
      for (const summary of matchedSummaries) {
        lines.push(`- ${summary.summary}`);
      }
    }

    if (activePacks.length > 0) {
      lines.push('Response guidance:');
      for (const pack of activePacks) {
        lines.push(`- ${pack.pack_name}: ${pack.description}`);
      }
    }

    return lines.join('\n').trim();
  },
};
