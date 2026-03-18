import { vocabularyService, type VocabularyStats } from './vocabularyService';
import { sentenceBuilderService, type SentenceBuilderStats } from './sentenceBuilderService';
import { intentEnhancementService, type IntentEnhancementStats } from './intentEnhancementService';

// ── TYPES ────────────────────────────────────────────────────────────────────

export interface BuilderSnapshot {
  vocabulary: {
    totalWords: number;
    masteredWords: number;
    learningWords: number;
    newWords: number;
    averageMastery: number;
    topDifficulties: Record<string, number>;
  };
  sentenceBuilder: {
    totalTemplates: number;
    totalWords: number;
    estimatedVariations: number;
    topTemplates: { name: string; usageCount: number }[];
  };
  intentEnhancer: {
    totalKeywords: number;
    totalTags: number;
    totalPredictions: number;
    averageConfidence: number;
    topIntents: { intent: string; count: number }[];
  };
  summary: string;
}

// ── VARIATION CALCULATOR ─────────────────────────────────────────────────────
// Estimates how many unique sentence variations the current templates can produce
// without generating them all — just multiplies option counts per slot per template.

async function estimateSentenceVariations(): Promise<number> {
  try {
    const templates = await sentenceBuilderService.getTemplates();
    let total = 0;
    for (const template of templates) {
      if (!template.structure || template.structure.length === 0) continue;
      let templateVariations = 1;
      for (const slot of template.structure) {
        const optionCount = slot.options.length + (slot.required ? 0 : 1);
        // +1 for optional slots (can be skipped)
        if (optionCount > 0) templateVariations *= optionCount;
      }
      total += templateVariations;
    }
    return total;
  } catch {
    return 0;
  }
}

// ── SNAPSHOT ──────────────────────────────────────────────────────────────────
// Builds a lightweight snapshot of all three builder states.
// Designed to be cheap enough to call on every prompt assembly.

async function getBuilderSnapshot(): Promise<BuilderSnapshot> {
  let vocabStats: VocabularyStats | null = null;
  let sentenceStats: SentenceBuilderStats | null = null;
  let intentStats: IntentEnhancementStats | null = null;

  // Gather stats in parallel — silently degrade if a builder fails
  const [v, s, i] = await Promise.allSettled([
    vocabularyService.getVocabularyStats(),
    sentenceBuilderService.getStats(),
    intentEnhancementService.getStats(),
  ]);
  if (v.status === 'fulfilled') vocabStats = v.value;
  if (s.status === 'fulfilled') sentenceStats = s.value;
  if (i.status === 'fulfilled') intentStats = i.value;

  const estimatedVariations = await estimateSentenceVariations();

  const snapshot: BuilderSnapshot = {
    vocabulary: {
      totalWords: vocabStats?.totalWords ?? 0,
      masteredWords: vocabStats?.masteredWords ?? 0,
      learningWords: vocabStats?.learningWords ?? 0,
      newWords: vocabStats?.newWords ?? 0,
      averageMastery: Math.round(vocabStats?.averageMastery ?? 0),
      topDifficulties: vocabStats?.wordsByDifficulty ?? {},
    },
    sentenceBuilder: {
      totalTemplates: sentenceStats?.totalTemplates ?? 0,
      totalWords: sentenceStats?.totalWords ?? 0,
      estimatedVariations,
      topTemplates: (sentenceStats?.mostUsedTemplates ?? []).map(t => ({
        name: t.name,
        usageCount: t.usageCount,
      })),
    },
    intentEnhancer: {
      totalKeywords: intentStats?.topKeywords?.length ?? 0,
      totalTags: intentStats?.topTags?.length ?? 0,
      totalPredictions: intentStats?.totalPredictions ?? 0,
      averageConfidence: Math.round(intentStats?.averageConfidence ?? 0),
      topIntents: (intentStats?.topIntents ?? []).slice(0, 5).map(t => ({
        intent: t.intent,
        count: t.count,
      })),
    },
    summary: '',
  };

  // Build a compact human-readable summary for injection into prompts
  const lines: string[] = ['[Builder state]'];

  if (snapshot.vocabulary.totalWords > 0) {
    lines.push(
      `Vocabulary: ${snapshot.vocabulary.totalWords} words (${snapshot.vocabulary.masteredWords} mastered, ${snapshot.vocabulary.learningWords} learning, ${snapshot.vocabulary.newWords} new). Avg mastery ${snapshot.vocabulary.averageMastery}%.`
    );
  } else {
    lines.push('Vocabulary: empty — no words added yet.');
  }

  if (snapshot.sentenceBuilder.totalTemplates > 0) {
    lines.push(
      `Sentence Builder: ${snapshot.sentenceBuilder.totalTemplates} templates, ${snapshot.sentenceBuilder.totalWords} words, ~${snapshot.sentenceBuilder.estimatedVariations.toLocaleString()} estimated unique variations.`
    );
  } else {
    lines.push('Sentence Builder: no templates yet.');
  }

  if (snapshot.intentEnhancer.totalKeywords > 0) {
    const topIntentStr = snapshot.intentEnhancer.topIntents
      .slice(0, 3)
      .map(t => t.intent)
      .join(', ');
    lines.push(
      `Intent Enhancer: ${snapshot.intentEnhancer.totalKeywords} keywords, ${snapshot.intentEnhancer.totalTags} tags, ${snapshot.intentEnhancer.totalPredictions} predictions. Top intents: ${topIntentStr || 'none yet'}. Avg confidence ${snapshot.intentEnhancer.averageConfidence}%.`
    );
  } else {
    lines.push('Intent Enhancer: no data yet.');
  }

  snapshot.summary = lines.join('\n');
  return snapshot;
}

// ── COMPACT CONTEXT STRING ───────────────────────────────────────────────────
// Returns a short string suitable for injection into the system prompt context.
// Cheap to generate and small enough for native GGUF token budgets.

async function getBuilderContext(): Promise<string> {
  try {
    const snapshot = await getBuilderSnapshot();
    return snapshot.summary;
  } catch {
    return '';
  }
}

// ── EXPORTS ──────────────────────────────────────────────────────────────────

export const builderBridgeService = {
  getBuilderSnapshot,
  getBuilderContext,
  estimateSentenceVariations,
};
