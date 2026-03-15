# Ask-Amo Developer Guide

This document provides an overview of the Ask-Amo codebase architecture, key concepts, and development guidelines.

## Table of Contents
1. [Project Structure](#project-structure)
2. [Key Architectural Concepts](#key-architectural-concepts)
3. [Services Layer](#services-layer)
4. [State Management](#state-management)
5. [Development Workflow](#development-workflow)
6. [Adding New Features](#adding-new-features)
7. [Testing Guidelines](#testing-guidelines)
8. [Performance Considerations](#performance-considerations)

## Project Structure

```
ask-amo/
├── src/                    # Source code
│   ├── App.tsx             # Main application component
│   ├── components/         # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # Business logic and API integrations
│   ├── types.ts            # TypeScript type definitions
│   ├── index.css           # Global styles and Tailwind configuration
│   ├── main.tsx            # React entry point
│   └── vite-env.d.ts       # Vite environment types
├── android/                # Capacitor Android project
├── dist/                   # Production build output
├── public/                 # Static assets
├── knowledge-inputs/       # Knowledge base import inputs
├── scripts/                # Utility scripts (e.g., knowledge import)
├── server.ts               # Express server (dev middleware/production static)
├── capacitor.config.ts     # Capacitor configuration
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # Frontend TypeScript configuration
├── tsconfig.server.json    # Backend TypeScript configuration
├── package.json            # Dependencies and scripts
└── README.md               # Project overview
```

## Key Architectural Concepts

### 1. Modular Service Architecture
Ask-Amo follows a service-oriented architecture where each major concern is encapsulated in a dedicated service:

- **AI Provider Services**: `groqService.ts`, `openaiService.ts`, etc. - Handle communication with cloud AI providers
- **Local AI Services**: `webLlmService.ts`, `nativeOfflineLlmService.ts` - Handle browser and device-based AI execution
- **Knowledge Services**: `documentService.ts`, `vectorDbService.ts`, `knowledgeStoreService.ts` - Handle document processing and storage
- **Utility Services**: `audioCaptureService.ts`, `speechT5Service.ts` - Handle media input/output
- **Orchestration Services**: `assistantRuntimeService.ts`, `nativeReplyCoordinator.ts` - Coordinate complex workflows

### 2. State Management Patterns
- **React State**: Component-level state managed with `useState`, `useEffect`, `useRef`
- **Custom Hooks**: `useMessages.ts` manages chat message state with streaming-safe IDs
- **LocalStorage Persistence**: Chats are persisted to `localStorage` under `amo_chats`
- **IndexedDB/SQLite**: Knowledge base uses `sqlite-wasm` for persistent vector storage

### 3. Streaming Response Handling
Both cloud and local AI responses use streaming patterns:
- Cloud providers (Groq, OpenAI, etc.) use Server-Sent Events (SSE) with `data:` lines
- WebLLM and native services use similar chunk-based streaming
- UI updates incrementally via `addStreamingMessage`/`updateMessage` pattern

### 4. Plugin-like Extensibility
New AI providers can be added by:
1. Creating a new service file following the pattern in `groqService.ts`
2. Adding the provider to `AVAILABLE_MODELS` in `types.ts`
3. Adding handling in the model switching logic in `App.tsx`

## Services Layer

### Core Services
- **`groqService.ts`**: Handles Groq API communication (chat + transcription)
- **`openaiService.ts`**: Handles OpenAI API communication
- **`geminiService.ts`**: Handles Gemini API communication
- **`openrouterService.ts`**: Handles OpenRouter API communication
- **`webLlmService.ts`**: Manages WebLLM lifecycle (loading, generation)
- **`nativeOfflineLlmService.ts`**: Bridges to native GGUF execution on Android
- **`documentService.ts`**: Parses PDF/TXT/MD/audio files into text
- **`vectorDbService.ts`**: Manages document storage and similarity search
- **`knowledgeStoreService.ts`**: SQLite-based knowledge persistence layer
- **`amoBrainService.ts`**: Higher-level knowledge operations (memory, tools, etc.)
- **`assistantRuntimeService.ts`**: Builds context bundles for AI generation
- **`webSearchService.ts`**: Performs web searches and fetches page content
- **`audioCaptureService.ts`**: Handles microphone input
- **`speechT5Service.ts`**: Handles browser-based text-to-speech

### Service Interaction Patterns
1. **API Key Management**: Services use `apiKeyStorage` for secure key persistence
2. **Error Handling**: Services throw descriptive errors that are caught and displayed in UI
3. **Streaming**: All generation services accept an `onUpdate` callback for incremental updates
4. **Context Building**: `assistantRuntimeService` constructs prompts with conversation history, knowledge, and web search results

## State Management

### Chat State
Managed by `useMessages` hook in `src/hooks/useMessages.ts`:
- Creates stable message IDs for React rendering
- Handles streaming messages (create → append chunks → finalize)
- Provides immutable update functions (`addMessage`, `updateMessage`, etc.)

### Application State
Root state in `App.tsx` manages:
- Chat list and current chat selection
- UI states (sidebar, settings, voice mode, etc.)
- API key states
- Model selection and readiness states
- Native offline model states
- Uploaded documents and imported assets

### Persistence Strategies
- **Chats**: `localStorage` (amo_chats) with JSON serialization
- **API Keys**: Secure storage via `secretStorageService` (native/browser)
- **Knowledge Base**: SQLite database via `@sqlite.org/sqlite-wasm`
- **Settings Flags**: `localStorage` (voice mode, deep think, web search, etc.)

## Development Workflow

### Getting Started
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run production build
npm run start
```

### Mobile Development
```bash
# Add Android platform (first time only)
npm run cap:add:android

# Sync web assets with native project
npm run cap:sync

# Open in Android Studio
npm run cap:android

# Wireless development/deployment
npm run cap:wireless
```

### Testing
```bash
# Run unit tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Code Quality
```bash
# Type checking
npm run lint

# Format files (if prettier/ESLint configured)
# npm run format
```

## Adding New Features

### Adding a New AI Provider
1. Create a new service file (e.g., `anthropicService.ts`) following existing patterns
2. Add the provider to `AVAILABLE_MODELS` array in `src/types.ts`
3. Add API key handling in `App.tsx` state initialization
4. Add model selection logic in the `isSelectedModelReady` computation
5. Add provider handling in the `handleSend` function switch statement

### Adding a New Knowledge Source Type
1. Update `ImportSourceKind` and `ImportedAssetKind` types in `App.tsx`
2. Add handling in document/service import functions
3. Update UI components to display the new type
4. Add any specific processing logic needed

### Adding a New Settings Section
1. Add new value to `SettingsSection` type in `App.tsx`
2. Add new tab to `settingsTabs` array
3. Add conditional rendering section in settings content
4. Add any state persistence needed

## Testing Guidelines

### Unit Tests
- Place tests in `src/**/__tests__/` or alongside source files as `*.test.{ts,tsx}`
- Test individual service functions in isolation
- Mock external dependencies (fetch, localStorage, etc.)
- Use `@testing-library/react` for component tests

### Test Examples
See `src/__tests__/example.test.ts` for a basic test structure.

### Coverage
- Aim for >80% coverage on new code
- Run `npm run test:coverage` to generate coverage report
- View HTML report in `coverage/` directory

## Performance Considerations

### Bundle Optimization
- Manual chunking in `vite.config.ts` separates large AI libraries:
  - `webllm`: WebLLM and worker
  - `pdfjs`: PDF.js library
  - `transformers`: Transformers and ONNX Runtime
- Lazy loading opportunities for non-critical components
- PWA caching strategy optimized for 50MB ONNX WASM files

### Runtime Performance
- Virtual scrolling not implemented for message lists (typically <100 messages)
- Debouncing/throttling used where appropriate (search, resize handlers)
- Web workers used for PDF parsing to avoid blocking UI
- Memory leaks prevented through proper cleanup in useEffect cleanups

### AI-Specific Optimizations
- Context window management to prevent exceeding token limits
- Streaming responses to reduce perceived latency
- Knowledge chunking with overlap to maintain context boundaries
- Embedding generation batching where possible

## Security Considerations

### API Key Handling
- Keys never stored in plaintext in source code
- Uses secure storage APIs (Keychain/Keystore on mobile, encrypted storage on web)
- Keys cleared from memory when no longer needed
- No logging of keys or tokens

### Data Protection
- User data stored locally unless explicitly shared
- Knowledge base encrypted via device storage mechanisms
- No telemetry or data collection without explicit consent
- Input sanitization for URL imports and file processing

### Communication Security
- All API calls use HTTPS
- Certificate pinning not implemented (relying on platform security)
- WebSocket connections use secure protocols (wss://)

## Troubleshooting

### Common Issues
1. **Build Failures**: 
   - Check Node.js version compatibility
   - Clear `node_modules` and reinstall if lockfile corrupted
   - Ensure Android build tools installed for mobile builds

2. **Runtime Errors**:
   - Check browser console for detailed error messages
   - Verify API keys are correctly configured
   - Ensure sufficient memory for AI model loading (especially WebLLM)

3. **Mobile Build Issues**:
   - Run `npx cap sync android` after web changes
   - Clean Android project if Gradle caching issues occur
   - Verify AndroidManifest permissions match Capacitor plugin requirements

### Debugging
- Enable verbose logging in services by adding `console.log` statements
- Use React DevTools for component inspection
- Use Android Studio profiler for mobile performance analysis
- Check service worker status for PWA issues (`chrome://serviceworker-internals`)

## Contributing Guidelines

1. **Branch Naming**: Use descriptive names like `feature/voice-enhancements` or `fix/chat-persistence`
2. **Commit Messages**: Follow conventional commits format (`feat: add voice settings`, `fix: resolve memory leak`)
3. **Pull Requests**: Include description of changes and any relevant screenshots
4. **Code Review**: All changes require review before merging
5. **Testing**: Add tests for new functionality when possible
6. **Documentation**: Update README or developer guide for significant changes

## License
See LICENSE file in project root.
