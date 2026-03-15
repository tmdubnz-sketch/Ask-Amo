# Ask-Amo App Test Suite
# Comprehensive test verification for all features

## Test Categories:
1. Core Chat Functionality
2. Voice Features
3. Model Selection & Offline
4. Terminal & Commands
5. Knowledge Management
6. UI Navigation
7. Error Handling

## Test Results

### 1. Core Chat Functionality
✅ Message sending and receiving
✅ Message history persistence (localStorage)
✅ Image upload and display
✅ Chat deletion and creation
✅ Copy message content
✅ Regenerate response

### 2. Voice Features
✅ Voice mode toggle in settings
✅ Voice capture service (audioCaptureService)
✅ Speech-to-text via Groq Whisper
✅ Text-to-speech via native TTS
✅ Auto-speak replies when voice mode enabled

### 3. Model Selection & Offline
✅ Native model auto-selection after import
✅ Phi-3.5 Mini download recommendations
✅ Cloud provider API key storage
✅ Offline runtime readiness checks
✅ Model switching in sidebar

### 4. Terminal & Commands
✅ Terminal view opens/closes
✅ Command execution (npm run build, git status, etc.)
✅ Working directory tracking
✅ Output capture and display

### 5. Knowledge Management
✅ Document import (PDF, TXT, MD)
✅ URL import to knowledge base
✅ Superbrain pack initialization
✅ Memory notes and summaries
✅ Knowledge query via vector DB

### 6. UI Navigation
✅ 7-panel sidebar with icon rail
✅ Chats, Files, Brain, Tools, Models, Help, Settings tabs
✅ View switching (Chat, WebView, Terminal, Editor)
✅ Settings modal accessible
✅ Header navigation tabs

### 7. Error Handling
✅ Error boundary component
✅ Error display in UI
✅ Loading states with spinners
✅ Request cancellation support
✅ API key validation

## Critical Flow Tests

### Test 1: Chat with Native Model
1. Select native offline model
2. Send message "Hello"
3. ✅ Response should stream from local model
4. ✅ Message saved to chat history

### Test 2: Voice Mode
1. Toggle voice mode ON in settings
2. Send message via voice
3. ✅ Should transcribe via Whisper
4. ✅ Should respond via TTS

### Test 3: Model Switching
1. Import Phi-3.5 Mini GGUF
2. Verify auto-switch to native
3. Send message
4. ✅ Uses Phi-3.5 for responses

### Test 4: Commands
1. Open terminal
2. Run `git status`
3. ✅ Should show git status output
4. Run `npm run build`
5. ✅ Should execute build script

### Test 5: Knowledge Import
1. Import a PDF file
2. Ask "What do you know about [document topic]"
3. ✅ Should reference imported document

## App Flow Verification

```
[Start App]
  ↓
[Welcome Screen] - Amo avatar, greeting
  ↓
[Main Chat View] - Messages, input, actions
  ↓
[Send Message] - Enter text, click send
  ↓
[AI Response] - Streaming response from selected model
  ↓
[Save to Memory] - Conversation saved to brain
  ↓
[Continue Chat] - Multi-turn conversation
```

## Button Mapping Verification

| Button | Action | Status |
|--------|--------|--------|
| Send (orange) | handleSend() | ✅ |
| Mic button | toggleListening() | ✅ |
| Plus (upload) | File input trigger | ✅ |
| Settings gear | Open sidebar | ✅ |
| Sidebar tabs | Switch panels | ✅ |
| Chat delete | deleteChat() | ✅ |
| New chat | createNewChat() | ✅ |

## Professional Behavior Check

Amo should:
- ✅ Answer directly without padding
- ✅ Use plain language
- ✅ Reference imported knowledge
- ✅ Execute tasks step-by-step
- ✅ Provide clear error messages
- ✅ Stay grounded in Superbrain principles

## Build & Deploy Status

- ✅ Lint passes
- ✅ Build succeeds
- ✅ ADB deploy successful
- ✅ App launches on device
