# Ask Amo — Advanced Features Guide

## Table of Contents
1. [Vocabulary Builder](#vocabulary-builder)
2. [Sentence Builder](#sentence-builder)
3. [Intent Enhancer](#intent-enhancer)
4. [Brain Persistence — Architecture & Fix Options](#brain-persistence)

---

## 1. Vocabulary Builder

**Access:** Sidebar → Tools → switch view to `vocabulary`, or type `/vocabulary` in chat.

The Vocabulary Builder has **four tabs**: Extract, Composer, Library, and Review.

### Tab 1: Extract — Pull Words from Content

**From a URL:**
1. Open the **Extract** tab.
2. Paste a URL into the input (e.g., a Wikipedia article, blog post, documentation page).
3. Optionally set **Difficulty** (Basic → Expert) and **Category** (General, Technical, Academic, Business, Creative, Scientific) to filter extraction.
4. Tap **Extract from Web**. The service fetches the page, parses its text, and uses pattern matching + frequency analysis to identify vocabulary words.
5. Extracted words appear below with part of speech, difficulty rating, definition, and example sentence.
6. **Select** individual words (tap each card) or use **Select All**.
7. Tap **Save Selected** to persist them to your vocabulary library (`amo_vocabulary_sets` in localStorage).

**From a File:**
1. Tap the file input under **Extract from File**.
2. Choose a `.txt`, `.md`, `.pdf`, or `.doc/.docx` file.
3. Tap **Extract from File**. The service reads and analyses the file content the same way.
4. Select and save words as above.

**Pro tips:**
- Extract from technical docs to build a domain-specific word bank.
- Use difficulty filters to target words at your level — e.g., set "Advanced" to skip basic words.
- Combine web and file extractions into the same library session.

### Tab 2: Composer — AI-Generated Vocabulary Sets

1. Open the **Composer** tab.
2. Enter a **Topic** — be specific for better results (e.g., "Machine Learning Optimization Techniques" rather than just "AI").
3. Set **Difficulty** and **Category** to match your target level.
4. Set **Number of Words** (5–50). Start with 10–15 for focused study.
5. Optionally add **Context** — describe what you're studying or working on for more relevant results.
6. Tap **Generate Vocabulary Set**.
7. The generated set appears with full definitions, examples, and relations. It's also auto-saved to your Library.

**Advanced usage:**
- Generate overlapping sets (same topic, different difficulties) to build progressive mastery.
- Use the context field to constrain generation: "I'm writing a research paper on quantum computing for a general audience" produces different words than "I'm debugging a quantum circuit simulator."

### Tab 3: Library — Browse & Search

1. Open the **Library** tab.
2. Browse all saved vocabulary sets with their metadata (word count, difficulty, category, source).
3. Use the **Search** bar to find specific words across all sets.
4. Use the **Filter** button to narrow by difficulty or category.

### Tab 4: Review — Spaced Repetition

1. Open the **Review** tab.
2. Review words to improve mastery and retention.
3. Words are presented for recall practice. (This tab is a scaffold for future spaced repetition features.)

---

## 2. Sentence Builder

**Access:** Sidebar → Tools → switch view to `sentence-builder`.

The Sentence Builder has **five tabs**: Generator, Templates, Word Tables, Rules, and Statistics.

### Tab 1: Generator — Create Sentences

1. Open the **Generator** tab.
2. Fill in the generation controls:
   - **Intent**: What the sentence should accomplish (e.g., "greet user", "ask technical question", "make a polite request").
   - **Style**: Formal, Informal, Technical, Creative, or Casual.
   - **Complexity**: Simple, Moderate, or Complex.
   - **Length**: Short, Medium, or Long.
3. Tap **Generate Sentence**.
4. The engine selects a matching template, fills structural slots from weighted word tables, and produces the sentence with a **confidence score**.
5. Each generated sentence shows:
   - The main output text
   - Confidence percentage
   - Which template was used
   - **Alternatives** — 2–3 variations using different word selections
6. Tap a sentence to view **Sentence Details**: the full breakdown of structure, style, complexity, and word choices.
7. Use the **Copy** button to copy any sentence to clipboard.
8. History of your last 10 generated sentences is preserved in the session.

**How the engine works:**
- Templates define sentence structures (e.g., `[interjection] + [subject] + [punctuation]`).
- Each structural slot has weighted options. Higher-weight options are more likely to be selected.
- The confidence score factors in template weight, word quality, structure completeness, and historical success rate.

### Tab 2: Templates — Define Sentence Structures

1. Open the **Templates** tab.
2. Browse existing templates (defaults: Basic Greeting, Basic Question).
3. Tap **+ New Template** to create your own:
   - **Name** and **Description**
   - **Category**: greeting, question, statement, command, etc.
   - **Difficulty**: basic → expert
   - **Structure**: Define ordered slots, each with:
     - **Type** (subject, verb, adjective, interjection, punctuation, etc.)
     - **Required** or optional
     - **Weight** (0–100, likelihood of inclusion)
     - **Options**: Predefined word choices with individual weights
4. Tap **Save**. The template is stored in `amo_sentence_builder_templates` (localStorage).
5. Use **Edit** to modify existing templates or **Delete** to remove them.

**Advanced template design:**
- Set `flexible: true` on a structure slot to allow the engine to reorder it.
- Use `alternatives` arrays on structure slots for fallback options.
- Create category-specific templates (e.g., "email-opening", "code-comment", "NZ-slang-greeting").

### Tab 3: Word Tables — Weighted Word Banks

1. Open the **Word Tables** tab.
2. Browse default tables: Common Nouns, Common Verbs, Common Adjectives.
3. Create or edit tables:
   - **Category**: nouns, verbs, adjectives, adverbs, prepositions, conjunctions, articles, interjections, or custom.
   - Each word entry has:
     - **Word** text
     - **Weight** (0–100): higher = more likely selected
     - **Tags**: for filtering (e.g., "formal", "casual", "technical")
     - **Synonyms/Antonyms**: optional relations
     - **Examples**: usage examples
     - **Difficulty**: basic → expert
4. The engine uses these tables to fill template slots when no predefined options exist.

**Power user tips:**
- Build domain-specific word tables (e.g., "Medical Verbs", "Legal Nouns").
- Adjust weights based on your preferences — increase weights for words you want to practice.
- Tag words by register (formal/informal) so style-filtered generation picks the right vocabulary.

### Tab 4: Rules — Custom Generation Rules

1. Open the **Rules** tab.
2. Create custom rules that modify generation behavior:
   - **Name**: descriptive label
   - **Condition**: JavaScript expression evaluated during generation
   - **Action**: `include`, `exclude`, `modify`, or `reorder`
   - **Target**: what the rule applies to
   - **Weight**: importance (0–100)
   - **Enabled**: toggle on/off
3. Rules are applied during sentence generation to fine-tune output.

**Example rules:**
- Exclude profanity: `condition: "word.tags.includes('profane')"`, action: `exclude`
- Boost formal words: `condition: "request.style === 'formal'"`, action: `modify`, target: formal-tagged words, weight boost

### Tab 5: Statistics — Track Your Usage

1. Open the **Statistics** tab.
2. View:
   - Total templates and words
   - Average weight across templates
   - Most-used templates (by usage count)
   - Most-used words (by frequency)
   - Overall success rate
   - Average generation time

---

## 3. Intent Enhancer

**Access:** Sidebar → Tools → switch view to `intent-enhancer`.

The Intent Enhancer has **five tabs**: Predictor, Keywords, Tags, Patterns, and Analytics.

### Tab 1: Predictor — Analyze User Intent

1. Open the **Predictor** tab.
2. Enter text in the **User Input** field — this is the message you want to analyze.
3. Optionally fill in:
   - **Context**: surrounding conversation context
   - **Previous Intents**: what intents were detected before (comma-separated)
   - **Session Context**: conversation stage, user mood, time of day, device type
   - **User Preferences**: communication style, domain expertise, complexity level
4. Tap **Predict Intent**.
5. The prediction shows:
   - **Primary intent** with confidence score
   - **Matched keywords** with their weights and boosts
   - **Matched tags** with their weights and boosts
   - **Reasoning**: why this intent was selected
   - **Alternative intents** ranked by confidence
6. Use the **Feedback** buttons (correct/incorrect/partial) to train the model over time.

**How prediction works:**
1. Input is scanned against all registered **keywords** (with synonym and regex matching).
2. Matched keywords map to intents with confidence scores and boosts.
3. **Tags** are checked — tag combinations can trigger specific intents.
4. **Patterns** (regex) provide additional intent signals.
5. Scores are aggregated, weighted by keyword importance and tag combinations.
6. Session context and user preferences modify final scores.

### Tab 2: Keywords — Manage Intent Keywords

1. Open the **Keywords** tab.
2. Browse default keywords organized by category: Action (create, help, fix), Subject (code, API), Modifier (quickly), Context (error), Emotion, Technical, Custom.
3. Create new keywords:
   - **Keyword**: the word or phrase
   - **Category**: action, subject, modifier, context, emotion, technical, custom
   - **Weight** (0–100): importance for intent detection
   - **Synonyms**: alternative forms (e.g., "create" → ["make", "build", "generate"])
   - **Patterns**: regex patterns for flexible matching
   - **Contexts**: where this keyword is relevant
   - **Intent Mappings**: which intents this keyword maps to, with confidence and boost values
4. Each keyword tracks its own **frequency** and **success rate** over time.

**Advanced keyword strategy:**
- Add domain-specific keywords for your workflow (e.g., "deploy", "migrate", "refactor" for dev work).
- Use regex patterns for flexible matching: `\\b(deploy|push|ship|release)\\b`.
- Set `required: true` on an intent mapping to make the keyword mandatory for that intent.

### Tab 3: Tags — Contextual Labels

1. Open the **Tags** tab.
2. Browse default tags: urgent (urgency), technical (domain), learning (context).
3. Create new tags:
   - **Name** and **Type**: user, system, context, emotion, domain, complexity, urgency, custom
   - **Weight**: importance
   - **Keywords**: words that activate this tag
   - **Patterns**: regex for detection
   - **Intent Mappings**: direct intent associations
   - **Combinations**: when this tag appears WITH another tag, trigger a specific intent (e.g., "urgent" + "help" → "urgent_help" at 90% confidence)
4. Tag combinations are a powerful feature — they detect compound intents that single keywords miss.

**Example combinations:**
- `[urgent, technical]` → `urgent_technical_help` (confidence: 90, boost: 30)
- `[learning, code]` → `learn_code` (confidence: 85, boost: 25)

### Tab 4: Patterns — Regex Intent Rules

1. Open the **Patterns** tab.
2. Browse default patterns:
   - Questions ending with `?` → `ask_question`
   - Commands starting with "create/make/build" → `create_something`
   - Greetings starting with "hi/hello/hey" → `greeting`
   - Help requests containing "help/assist/support" → `request_help`
3. Create new patterns:
   - **Pattern**: regex string
   - **Intent**: what intent this pattern maps to
   - **Confidence**: how confident the match is (0–100)
   - **Weight**: priority relative to other signals
   - **Examples**: sample inputs that should match
4. Patterns are checked early in the prediction pipeline for fast intent shortcuts.

### Tab 5: Analytics — Performance Dashboard

1. Open the **Analytics** tab.
2. View:
   - Total predictions made
   - Overall accuracy rate (based on user feedback)
   - Average confidence across predictions
   - Top intents by count and accuracy
   - Top keywords by frequency and success rate
   - Top tags by frequency and success rate
   - Improvement trend over time

---

## 4. Brain Persistence — Why It Doesn't Hold <a name="brain-persistence"></a>

### The Problem

The brain data (conversation memory, summaries, knowledge chunks, seed packs) is stored in **SQLite WASM** running inside the Capacitor WebView. On Android, the current code does:

```typescript
// knowledgeStoreService.ts line 148
db = new sqlite.oo1.DB('amo-knowledge.sqlite3', 'ct');
```

This creates a SQLite database in the **WebView's virtual filesystem (OPFS/memory)**. This storage is **volatile** — it can be wiped when:
- The app is force-stopped or killed by the OS
- The app is updated/reinstalled via `cap:wireless`
- The system clears WebView cache under memory pressure
- The WebView process is recycled

On browser, it uses `JsStorageDb` (localStorage-backed), which is more persistent but still limited.

### Why PocketBase Is NOT the Right Fix

PocketBase is a self-hosted backend server with its own SQLite. It would:
- ❌ Require running a server process (on device or remote)
- ❌ Add network dependency to what should be offline-first
- ❌ Be overkill — you already have SQLite, just in the wrong storage layer
- ❌ Break the local-first architecture of Ask Amo

### The Right Fix: Capacitor SQLite Plugin

The best solution is `@capacitor-community/sqlite` — it provides **native Android SQLite** access through Capacitor, storing the database in the app's **protected internal storage** (`/data/data/<package>/databases/`). This storage:
- ✅ Persists across app restarts, force-stops, and OS memory pressure
- ✅ Survives app updates (data directory is preserved)
- ✅ Works fully offline
- ✅ No server needed
- ✅ Same SQL interface — minimal code changes

### Migration Path

1. **Install**: `npm install @capacitor-community/sqlite`
2. **Modify `knowledgeStoreService.ts`**: On native platforms, use the Capacitor SQLite plugin instead of SQLite WASM. On web, keep `JsStorageDb` as fallback.
3. **Data migration**: On first launch with the new plugin, check if WASM DB has data and migrate it to native SQLite.
4. **Sync `npx cap sync`** to register the native plugin.

The change is isolated to `knowledgeStoreService.ts` — the rest of the app (amoBrainService, vectorDbService, all components) uses the same `knowledgeStoreService` API and won't need changes.

### Other Services That Use localStorage

These services also store data in localStorage and would benefit from the same migration:
- `vocabularyService` → `amo_vocabulary_sets`
- `sentenceBuilderService` → `amo_sentence_builder_templates`, `amo_sentence_builder_word_tables`
- `intentEnhancementService` → `amo_intent_enhancement_*`

These could be migrated to the same native SQLite database as additional tables, or kept in localStorage if the data is small and non-critical.

### Quick Workaround (Without Plugin Change)

If you want a fast interim fix before migrating to native SQLite:
- Use the existing **Export Brain** / **Import Brain** feature (Sidebar → Brain → Export/Import) to manually back up and restore brain data after each redeploy.
- The export produces a JSON file with all knowledge documents, conversation memory, summaries, seed packs, and tool registry.
