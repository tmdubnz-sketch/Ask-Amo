---
name: build-amo-vocab
description: Populates Amo's vocabulary builder with curated words, creates sentence templates, and seeds intent patterns. Builds Amo's language understanding through structured data.
---

# Build Amo Vocabulary & Grammar Skill

Seeds Amo's vocabulary builder, sentence templates, and intent patterns.

## Prerequisites

1. Run `npm run dev` to start Amo
2. Amo's services must be initialized

## Procedure

### Step 1: Seed Vocabulary

Create a vocabulary seeder that adds common English words:

```bash
node scripts/seed-vocab.mjs
```

This adds 500+ words across categories: nouns, verbs, adjectives, adverbs, prepositions.

### Step 2: Create Sentence Templates

```bash
node scripts/seed-templates.mjs
```

Creates templates for:
- Greetings and farewells
- Questions and answers
- Commands and requests
- Descriptions and explanations

### Step 3: Seed Intent Patterns

```bash
node scripts/seed-intents.mjs
```

Adds intent patterns for:
- Feature discovery ("what can you do", "how do I...")
- Code generation ("write a function", "create a script")
- Knowledge queries ("what do you know about...")
- Web search ("search for", "find information about...")
- Translation ("translate X to Y")

### Step 4: Validate

```bash
node scripts/test-amo.mjs vocab-stats
```

Expected output: Shows word counts, template counts, and intent patterns.

## Vocabulary Categories

| Category | Count | Examples |
|----------|-------|---------|
| Nouns | 200 | code, function, variable, database, API |
| Verbs | 150 | create, delete, update, search, translate |
| Adjectives | 100 | fast, efficient, complex, simple, modern |
| Adverbs | 50 | quickly, carefully, efficiently, properly |
| Prepositions | 30 | in, on, at, by, with, from, to, for |

## Sentence Templates

```
"I want to [verb] [noun]"
"How do I [verb] [noun]?"
"Can you [verb] [noun] for me?"
"Please [verb] the [noun]"
"What is the [adjective] [noun]?"
```

## Intent Patterns

| Intent | Triggers | Example |
|--------|----------|---------|
| feature_discovery | what can you, how do I, explain | "what can you do?" |
| code_generation | write, create, code, function | "write a python function" |
| knowledge_query | what do you know, remember, learn | "what do you know about AI?" |
| web_search | search, find, look up, latest | "search for AI news" |
| translation | translate, how do you say | "translate hello to Spanish" |

## Grammar Rules

The sentence builder uses weighted word tables:
- Position 1: Subjects (I, you, we, they)
- Position 2: Verbs (want, need, can, will)
- Position 3: Objects (code, help, information, file)
- Position 4: Modifiers (quickly, carefully, properly)

This generates variations like:
- "I want code quickly"
- "You need help carefully"
- "We can get information properly"
