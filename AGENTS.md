**Purpose**
- Guide agentic coding tools working in this repository.
- Capture the real build/lint/test workflow, repo conventions, and safety notes.
- Prefer small, targeted edits that preserve the current product tone and UI direction.

**Rule Files**
- Root `AGENTS.md` exists and is the primary instruction source for agents.
- No `.cursor/rules/` directory is present.
- No `.cursorrules` file is present.
- No `.github/copilot-instructions.md` file is present.
- 11 agent skills in `.github/skills/`: refactor-helper, boilerplate-gen, tdd-enforcer, auto-debugger, cli-master, doc-search, build-amo-vocab, debug-tests, playwright-test, red-team-amo, test-amo.

**Project Snapshot**
- React 19 SPA built with Vite 6.
- TypeScript in `strict` mode for both client and server code.
- Express server in `server.ts` handles dev middleware and production static hosting.
- Tailwind CSS v4 is enabled through `@tailwindcss/vite`.
- PWA support is configured with `vite-plugin-pwa`.
- Capacitor Android files are checked in under `android/`.
- Local AI features use Groq, WebLLM, browser APIs, and lightweight document retrieval.
- The settings modal uses a five-tab top strip with in-app provider secret entry, native GGUF download/import controls, and URL-based knowledge import.
- Amo's persona is neutral and locale-independent — no NZ Maori references.
- Five superbrain seed packs (core reasoning, builder integration, conversation patterns, instant replies, features guide) are seeded on first DB init.
- Chain-of-thought reasoning is available for both cloud (deepThink mode) and native GGUF (structured CoT scaffold).
- Builder bridge injects live vocabulary/sentence/intent state into every prompt context.
- Code editor with CodeMirror, file tree, syntax highlighting, and in-browser execution (JS via iframe, Python via Pyodide).
- Welcome guide modal shows on first launch with 8-step onboarding.

**Repo Map**
- `src/App.tsx`: main app shell, chat orchestration, uploads, voice, settings, code-to-editor flow.
- `src/components/MessageList.tsx`: threaded message rendering with code block extraction.
- `src/components/CodeEditor.tsx`: CodeMirror editor with file tree, run button, preview, and AI generation.
- `src/components/CodePreview.tsx`: sandboxed iframe for HTML/JS preview.
- `src/components/CodeSnippet.tsx`: inline code display with copy button for chat.
- `src/components/FileTree.tsx`: workspace file browser with new file creation.
- `src/components/Terminal.tsx`: xterm.js terminal with command execution and auto-resize.
- `src/components/WebBrowser.tsx`: external browser integration with content fetch.
- `src/components/WelcomeGuide.tsx`: first-launch onboarding modal.
- `src/hooks/useMessages.ts`: message state helper with streaming-safe IDs.
- `src/services/groqService.ts`: cloud chat + transcription client.
- `src/services/openaiService.ts`: OpenAI chat client.
- `src/services/geminiService.ts`: Gemini chat client.
- `src/services/openrouterService.ts`: OpenRouter chat client.
- `src/services/mistralService.ts`: Mistral chat client.
- `src/services/apiKeyStorage.ts`: provider key storage backed by secure native/browser secret storage.
- `src/services/secretStorageService.ts`: secure persistence abstraction for secrets.
- `src/services/webLlmService.ts`: offline WebLLM wrapper.
- `src/services/documentService.ts`: PDF/text parsing and chunking.
- `src/services/vectorDbService.ts`: browser-side embedding store and similarity search.
- `src/services/sqliteAdapter.ts`: async SQLite adapter layer — `WasmSQLiteAdapter` for browser, `CapacitorSQLiteAdapter` for native Android persistent storage.
- `src/services/nativeOfflineLlmService.ts`: Android native GGUF runtime bridge, model import, and direct-download APIs.
- `src/services/nativeSpeechRecognitionService.ts`: native Android speech recognition with web fallback.
- `src/services/audioCaptureService.ts`: legacy microphone capture (replaced by nativeSpeechRecognitionService).
- `src/services/speechT5Service.ts`: offline/browser speech synthesis helpers.
- `src/services/builderBridgeService.ts`: unified read-only bridge that exposes vocabulary, sentence builder, and intent enhancer state as a snapshot for prompt injection.
- `src/services/amoBrainService.ts`: high-level brain API — memory, facts, summaries, seed packs, and builder-aware fast context assembly.
- `src/services/amoIdeLoop.ts`: agentic IDE loop with tool execution, multi-iteration support.
- `src/services/amoIdeDispatcher.ts`: tool dispatch for run, write, read, list, preview, install, search, and builder tools.
- `src/services/amoIdePrompt.ts`: IDE system prompt with tool definitions and examples.
- `src/services/amoToolCoordinator.ts`: pre-processing coordinator for IDE tasks.
- `src/services/nativeReplyCoordinator.ts`: instant reply system with pattern matching.
- `src/services/assistantPrompt.ts`: cloud model system prompt builder with chain-of-thought reasoning.
- `src/services/nativeAssistantOrchestrator.ts`: native GGUF prompt builder with CoT scaffold and few-shot examples.
- `src/services/knowledgeBootstrapService.ts`: seeds brain with starter packs, instant replies, and feature guide.
- `src/services/knowledgeStoreService.ts`: SQLite-based knowledge storage with seed packs.
- `src/services/browserService.ts`: external browser opening with popup blocker fallback.
- `src/services/webAssistService.ts`: web search and content fetching.
- `src/services/terminalService.ts`: terminal command execution via HTTP.
- `src/services/terminalBridgeService.ts`: terminal bridge for command execution.
- `src/utils/codeExecutor.ts`: unified code execution (iframe for JS, Pyodide for Python, terminal for shell).
- `src/utils/securityUtils.ts`: command sandbox, path sanitization, tool validation, retry with backoff, rate limiter.
- `src/data/amoSingleSource.ts`: single source of truth for all features, commands, and identity.
- `src/data/amoInstantReplies.ts`: instant reply patterns and actions.
- `src/data/amoHelpData.ts`: help knowledge for commands and prompt templates.
- `src/data/userManual.ts`: comprehensive in-app user manual with 8 sections.
- `src/index.css`: theme tokens, typography, glass styling, and shared utility classes.
- `server.ts`: Vite middleware in dev, `dist/` hosting in production.

**Install And Run**
- Install deps: `npm install`
- Start local dev server: `npm run dev`
- Build production assets: `npm run build`
- Start built server: `npm run start`
- Clean build output: `npm run clean`

**Build / Lint / Test Commands**
- `npm run dev`: runs `tsx server.ts`; Vite is mounted as middleware from Express.
- `npm run build`: runs `vite build && tsc -p tsconfig.server.json`.
- `npm run start`: runs `node dist/server.js`; requires `dist/` to exist first.
- `npm run lint`: runs `tsc --noEmit` across the client TypeScript config.
- `npm run test`: runs Vitest for unit tests.
- `npm run test:ui`: runs Vitest UI mode.
- `npm run test:coverage`: runs Vitest with coverage.
- `npm run test:amo`: runs Playwright UI tests for Amo.
- `npm run test:amo:all`: runs all automated tests including security tests.
- `npm run seed:vocab`: seeds vocabulary builder with 500+ words.
- `npm run cap:wireless`: builds web assets, runs `npx cap sync`, sanitizes regenerated Capacitor Android Gradle warning sources, assembles the debug APK, performs streamed ADB install, and launches the app.
- To run a single test file: `npm run test -- src/services/exampleService.test.ts`

**Current Validation Status**
- `npm run build` succeeds as of this repo snapshot.
- `npm run lint` succeeds as of this repo snapshot.
- Vite chunk warnings and the `onnxruntime-web` eval warning are now suppressed or reduced through bundler config because the large AI bundles are expected.
- `npm run clean` uses `rm -rf dist`, which assumes a Unix-like shell.
- Android debug builds succeed with JDK 21 from Android Studio `jbr`.
- `npx cap sync android` succeeds after a clean web build.
- `./gradlew :app:assembleDebug` succeeds for current Android sources.
- `cap:wireless` now patches the regenerated `android/capacitor-cordova-android-plugins/build.gradle` after `cap sync` so recurring `flatDir` and Gradle property-syntax warnings do not reappear every deploy.

**Agent Skills**
- 11 skills in `.github/skills/` for agent-driven development:
  - `refactor-helper`: Cleans up messy code for readability and performance.
  - `boilerplate-gen`: Generates standardized project files.
  - `tdd-enforcer`: Drives development using Red-Green-Refactor loop.
  - `auto-debugger`: Investigates and repairs failing tests or build errors.
  - `cli-master`: Performs project administration and environment tasks.
  - `doc-search`: Queries external documentation for latest API specifications.
  - `build-amo-vocab`: Vocabulary builder seeding for Amo.
  - `debug-tests`: Specialized test debugging.
  - `playwright-test`: Playwright UI testing.
  - `red-team-amo`: Security testing.
  - `test-amo`: Amo-specific test automation.

**Test Commands**
- `npm run test:amo chat "what can you do"` — test chat response
- `npm run test:amo security` — run red-team security tests
- `npm run test:amo:all` — run all tests
- `npm run seed:vocab` — seed vocabulary builder

**Environment And Secrets**
- Client env values use the Vite convention: `import.meta.env` with `VITE_*` names.
- `.env.example` currently documents `APP_URL` and `VITE_GROQ_API_KEY`.
- Provider keys are read from `apiKeyStorage` first and then from `import.meta.env.VITE_*` fallbacks when present.
- Do not add hardcoded provider keys or tokens to source files.
- Never commit real API keys, tokens, or service credentials.
- Prefer environment injection over literals in source files.

**TypeScript And Build Settings**
- Client config uses `moduleResolution: "bundler"`, `moduleDetection: "force"`, `jsx: "react-jsx"`, and `strict: true`.
- Path alias `@/*` maps to the repo root, not just `src/`. Use `@/` for imports (e.g., `import { cn } from '@/lib/utils'`).
- Client `tsconfig.json` includes only `src/`.
- Server build is compiled separately with `tsconfig.server.json`.
- `server.ts` is ESM-flavored TypeScript and outputs into `dist/`.

**Imports**
- Put React imports first, third-party packages next, then local modules.
- Use `@/` alias for local imports (e.g., `import { cn } from '@/lib/utils'`).
- Use named imports when the file already does so for icons, hooks, and helpers.
- Keep long icon import lists multi-line for readability.
- Avoid leaving unused imports behind; `tsc --noEmit` is the main lint gate.

**Formatting**
- Follow the current semicolon-heavy style in most files.
- Prefer single quotes in app code and double quotes only where the file already uses them.
- Keep object literals and JSX props expanded when lines get dense.
- Use trailing commas sparingly; match existing local style.
- Keep helper functions short and colocated unless reused broadly.
- Do not reformat whole files unless the task requires it.

**Types And Interfaces**
- Prefer explicit interfaces/types for structured data such as messages, chats, models, and document chunks.
- Use narrow string unions for roles and model families.
- Add return types to exported functions and public class methods when they are not obvious.
- Guard nullable refs and optional values explicitly; strict null checks are on.
- Prefer `unknown` over `any` for new code unless a library boundary makes that impractical.
- Reuse existing domain types from `src/types.ts` or nearby modules before creating duplicates.

**React Conventions**
- Use functional components and hooks only.
- Keep render output derived from state; push side effects into `useEffect`.
- Use refs for imperative browser APIs such as scrolling, file inputs, speech recognition, and textareas.
- Preserve the streaming message pattern from `useMessages.ts`: create once, append chunks, then finalize.
- When syncing state to `localStorage`, protect initial mount behavior if duplicate writes would be noisy.
- Avoid introducing global state libraries unless the task clearly needs them.

**Naming**
- Components use `PascalCase`; hooks and helpers use `camelCase`.
- State variables and setters follow React conventions like `isLoading` / `setIsLoading`.
- Event handlers are verb-led: `handleSend`, `handleDocUpload`, `removeDoc`.
- Constants use `UPPER_SNAKE_CASE` when they behave like configuration.
- Prefer descriptive booleans such as `isVoiceMode`, `isOfflineMode`, and `isSidebarOpen`.

**Error Handling**
- Wrap async browser/service calls in `try/catch` when user actions can fail.
- Surface readable error messages to UI state instead of silently swallowing failures.
- `console.error(...)` is used throughout the codebase for operational failures; keep logs contextual.
- Throw `Error` objects with actionable messages for fetch and parsing failures.
- Validate required runtime state early, e.g. missing engine instances or unsupported file types.
- All cloud API calls have 60-second timeouts via AbortController.
- Tool calls are validated before execution using `securityUtils.validateToolCall()`.

**Networking And Streaming**
- Groq chat responses stream via SSE-like `data:` lines; accumulate output incrementally.
- WebLLM generation also streams and updates the full assembled response each chunk.
- Cloud models search the web automatically based on query intent.
- Native models require the web search toggle to be ON for web search.
- Keep spoken-response prompts plain-text friendly; markdown symbols are stripped for speech.
- Preserve incremental UI updates instead of buffering a full response before render.
- Speech starts immediately during streaming (sentence-by-sentence).

**Persistence And IDs**
- Chats are stored in `localStorage` under `amo_chats` with migration from `amo_chat_history`.
- Knowledge chunks and metadata are persisted through `knowledgeStoreService`; agents should not assume the old `vector_db_docs` localStorage shape is authoritative.
- On native Android, brain data uses `@capacitor-community/sqlite` via `CapacitorSQLiteAdapter` — stored in `/data/data/<package>/databases/` for true persistence across restarts and redeploys.
- On browser, brain data uses SQLite WASM with `JsStorageDb` (localStorage-backed) via `WasmSQLiteAdapter`.
- Both adapters implement the `AsyncSQLiteDb` interface from `src/services/sqliteAdapter.ts`; all `knowledgeStoreService` DB calls are async (`await`).
- Use stable unique IDs for React keys and persisted entities.
- Prefer `crypto.randomUUID()` when available; existing code falls back to timestamp + random for older support.
- Be careful not to create duplicate message IDs during hydration or streaming.
- Workspace files stored as `amo-file:{filename}` in localStorage.
- Database init has retry logic for "database locked" errors with 500ms delay.

**UI And Styling**
- Tailwind utility classes are the main styling approach.
- Shared visual tokens live in `src/index.css` via CSS variables and `@theme` font definitions.
- Existing UI direction is dark, glassy, and accent-driven with orange highlights around `#ff4e00`.
- Reuse helper classes such as `glass-panel`, `micro-label`, `serif-content`, `nav-pill`, and `scroll-mask`.
- `cn()` from `src/lib/utils.ts` is the standard class merge helper: `import { cn } from '@/lib/utils'`.
- Motion uses `motion/react`; keep animations subtle and purposeful.

**Code Editor**
- Uses CodeMirror for syntax highlighting with 20+ language support.
- File tree toggleable via folder icon button.
- Run button executes code via `codeExecutor.ts` (iframe for JS, Pyodide for Python, terminal for shell).
- Preview button shows HTML/JS in sandboxed iframe.
- AI code generation via prompt input at bottom of editor.
- TypeScript syntax is stripped before browser execution.

**Speech Synthesis**
- Three-tier fallback: native TTS (Android) → SpeechT5 (WASM) → browser speechSynthesis.
- Markdown symbols stripped for natural speech.
- Streaming speech: sentences spoken as they arrive during response generation.
- Speech canceled when user sends new message.

**Voice Recognition**
- Native Android: Uses `NativeSpeechRecognitionPlugin` (Android SpeechRecognizer API).
- Web fallback: Uses Web Speech API.
- Continuous mode: auto-restarts after each utterance when enabled.
- Must run on Android main thread.

**Accessibility And UX**
- Preserve `title` attributes on icon buttons.
- Keep textarea submit behavior consistent: Enter submits, Shift+Enter inserts a newline.
- Maintain mobile-friendly sizing and spacing when editing chat layouts.
- Preserve loading, streaming, and disabled states for user feedback.
- For uploaded images and docs, keep reset/cleanup behavior on the related file inputs.
- Do not hide or obstruct the settings header; the five-tab strip belongs directly below it.
- Settings flows should feel real: use actual URIs, actionable controls, and persisted state instead of placeholder-only inputs.

**Server Notes**
- `server.ts` exposes a simple health route at `/api/health`.
- In development it creates a Vite server with `middlewareMode: true`.
- In production it serves static files from `dist/` and falls back to `dist/index.html`.
- Shutdown logic listens for `SIGTERM` and closes the HTTP server gracefully.

**Capacitor / Android**
- `npm run cap:sync` and `npm run cap:android` depend on a successful web build first.
- `capacitor.config.ts` points `webDir` at `dist`.
- Prefer JDK 21 from Android Studio `jbr` for Android builds on this machine.
- `redeploy-android.mjs` is the canonical wireless deploy path; it also sanitizes generated Capacitor plugin Gradle files after sync.
- Native offline chat on Android is driven through `nativeOfflineLlmService`; prefer its `downloadModel`, `importModel`, `setActiveModel`, and `getStatus` APIs rather than inventing parallel model state.
- When debugging wireless installs or UI state, use `adb -t 2` consistently on this machine unless the active transport changes.
- Avoid editing generated Android build artifacts unless the task explicitly targets native code.
- All custom Android plugins must be registered in `MainActivity.java`:
  - `CapacitorSQLitePlugin`
  - `NativeTtsPlugin`
  - `NativeTerminalPlugin`
  - `NativeOfflineLlmPlugin`
  - `NativePiperVoicePlugin`
  - `SecretStorePlugin`
  - `NativeSpeechRecognitionPlugin`

**Working Agreement For Agents**
- Make minimal, local edits and preserve user changes.
- Do not add new dependencies or a test runner unless the task needs it.
- If you add tests in the future, update this file with exact run commands, including single-test usage.
- Before finishing non-trivial work, prefer running `npm run lint` and/or `npm run build` and report real failures clearly.
- Use `securityUtils.ts` for command validation and path sanitization.
- Use `codeExecutor.ts` for code execution (not raw eval or Function constructor).
