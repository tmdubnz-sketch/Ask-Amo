import {
  knowledgeStoreService,
  type ConversationMemoryRow,
  type MemorySummaryRow,
  type SeedPackRow,
  type ToolRegistryRow,
} from './knowledgeStoreService';
import { builderBridgeService } from './builderBridgeService';

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
    console.info('[Brain] Remembered:', scope, title);
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

  async rememberFact(scope: string, fact: string, value: string): Promise<void> {
    const id = `fact:${scope}:${fact.toLowerCase().replace(/\s+/g, '-')}`;
    await knowledgeStoreService.upsertConversationMemory({
      id,
      scope,
      memoryType: 'fact',
      title: fact,
      content: value,
      tags: ['user-fact', 'permanent', 'ask-once'],
      weight: 10,
    });
  },

  async alreadyKnows(scope: string, query: string): Promise<string | null> {
    const memories = await knowledgeStoreService.listConversationMemory(scope);
    const normalized = query.toLowerCase();
    const match = memories.find(m => {
      const haystack = `${m.title} ${m.content} ${m.tags_json}`.toLowerCase();
      return m.weight >= 8 && haystack.split(/\s+/).some(
        word => word.length > 3 && normalized.includes(word)
      );
    });
    return match?.content ?? null;
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

    const permanentFacts = memories.filter(m => m.weight >= 8);
    if (permanentFacts.length > 0) {
      lines.push('Known facts about this user:');
      for (const fact of permanentFacts.slice(0, 5)) {
        lines.push(`- ${fact.title}: ${trimText(fact.content, 100)}`);
      }
    }

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

    // Inject live builder state so Amo can reason over vocab/sentence/intent data
    try {
      const builderContext = await builderBridgeService.getBuilderContext();
      if (builderContext) lines.push(builderContext);
    } catch { /* builder state is optional */ }

    return lines.join('\n').trim();
  },

  async learnFact(
    topic: string,
    content: string,
    tags: string[],
  ): Promise<void> {
    const id = `learned:${topic.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    await knowledgeStoreService.upsertConversationMemory({
      id,
      scope: 'app:ask-amo',
      memoryType: 'learned-fact',
      title: topic,
      content,
      tags: [...tags, 'self-learned', 'permanent'],
      weight: 8,
    });
    console.info('[Brain] Amo learned:', topic);
  },

  async updateFact(topic: string, newContent: string): Promise<void> {
    const memories = await knowledgeStoreService.listConversationMemory('app:ask-amo');
    const existing = memories.find(m =>
      m.title.toLowerCase().includes(topic.toLowerCase())
    );
    if (existing) {
      const existingTags = JSON.parse(existing.tags_json || '[]');
      await knowledgeStoreService.updateConversationMemory({
        id: existing.id,
        title: existing.title,
        content: newContent,
        tags: [...existingTags, 'updated'],
        weight: existing.weight,
      });
    } else {
      await this.learnFact(topic, newContent, ['updated']);
    }
  },

  async forgetFact(topic: string): Promise<void> {
    const memories = await knowledgeStoreService.listConversationMemory('app:ask-amo');
    const toRemove = memories.filter(m =>
      m.title.toLowerCase().includes(topic.toLowerCase()) &&
      m.memory_type === 'learned-fact'
    );
    for (const m of toRemove) {
      await knowledgeStoreService.deleteConversationMemory(m.id);
    }
  },
};
