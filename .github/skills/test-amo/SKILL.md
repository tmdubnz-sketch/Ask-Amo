---
name: test-amo
description: Drives Amo's UI to test features end-to-end. Sends prompts, checks responses, exercises vocabulary/sentence/intent builders, and validates web search, code editor, and knowledge brain.
---

# Test Amo Skill

This skill drives Amo's UI for automated testing by calling its services directly and validating outputs.

## Prerequisites

1. Run `npm run dev` to start Amo's dev server
2. Open `http://localhost:5173` in browser

## Test Procedure

### Step 1: Test Chat Response

Send a prompt through the native orchestrator and validate the response:

```bash
node scripts/test-amo.mjs chat "what can you do"
```

Expected: Response should list Amo's capabilities including web search, terminal, code editor, vocabulary builder, etc.

### Step 2: Test Vocabulary Builder

```bash
node scripts/test-amo.mjs vocab "extract words from: The quick brown fox jumps over the lazy dog"
```

Expected: Should extract vocabulary words and update the builder state.

### Step 3: Test Sentence Builder

```bash
node scripts/test-amo.mjs sentence "generate variations of: I want to learn programming"
```

Expected: Should generate sentence variations using templates.

### Step 4: Test Intent Enhancer

```bash
node scripts/test-amo.mjs intent "how do I improve my communication skills"
```

Expected: Should analyze the intent and provide suggestions.

### Step 5: Test Web Search (Cloud Models)

```bash
node scripts/test-amo.mjs search "latest AI news 2026"
```

Expected: Cloud models should return web search results automatically.

### Step 6: Test Knowledge Brain

```bash
node scripts/test-amo.mjs learn "the capital of France is Paris"
```

Expected: Should store the fact in the knowledge brain.

## Validation Rules

1. **Response Quality**: Responses should be >20 characters and relevant to the question
2. **No Hallucinations**: If unsure, Amo should say "I don't know" or ask for clarification
3. **Feature Awareness**: When asked "what can you do", Amo must list at least 5 features
4. **Code Preference**: Code blocks >8 lines should be saved to Code Editor, not inline
5. **Web Search**: Cloud models must search when online; native models need toggle ON

## Edge Cases

- Empty prompts → Should respond with "What do you need?"
- Very long prompts (>2000 chars) → Should truncate gracefully
- Special characters → Should handle without crashing
- Offline mode → Should use local knowledge only
