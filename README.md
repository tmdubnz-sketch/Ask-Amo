# Ask-Amo – Offline AI Assistant & IDE for Mobile

**Ask-Amo** is an open-source, privacy-first mobile AI chatbot with emerging IDE features — running **fully offline** using local LLMs (via llama.cpp). Built with Capacitor for Android (iOS planned), it combines chat, a 7-panel sidebar, file/workspace awareness, and future code editing/execution.

Currently in very early development — rapid prototyping phase.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/tmdubnz-sketch/Ask-Amo)](https://github.com/tmdubnz-sketch/Ask-Amo)
[![GitHub last commit](https://img.shields.io/github/last-commit/tmdubnz-sketch/Ask-Amo)](https://github.com/tmdubnz-sketch/Ask-Amo)

## Features (Current)

- Offline LLM inference with llama.cpp (e.g., Phi-3.5-mini support)
- Chat interface with streaming responses
- 7-panel sidebar (Chat, Files, Help, Settings, etc.)
- Workspace context awareness (early stage)
- Personality "seed packs" for customized AI behavior
- Voice input planned (offline STT)
- WebView integration for previews/docs
- Self-directed brain learning from conversations
- Brain commands: `learn this:`, `forget this:`, `what do you know about:`, `upgrade brain`

## Limitations (Early Stage)

- Android-only for now (Capacitor hybrid app)
- CPU inference only (no GPU acceleration yet)
- No safe code execution/interpretation yet
- Model loading can be slow or OOM on low-RAM devices
- Basic UI — mobile optimizations ongoing

## Screenshots

![Main Chat Screen](adb-screen.png)
*Main chat interface with sidebar toggle*

![Sidebar Panels](adb-sidebar.png)
*7-panel sidebar (Chat, Files, Help, etc.)*

## Quick Start – Run Locally

**Prerequisites**
- Node.js (v18+ recommended)
- Android Studio / SDK (for building APK)
- Optional: llama.cpp compatible GGUF model (e.g., Phi-3.5-mini Q4_K_M)

1. Clone the repo
   ```bash
   git clone https://github.com/tmdubnz-sketch/Ask-Amo.git
   cd Ask-Amo
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Run dev server (web preview)
   ```bash
   npm run dev
   ```

4. For Android build/deploy
   ```bash
   npm run cap:wireless
   ```

## Recommended Models

- **Best balance**: Phi-3.5-mini-instruct Q4_K_M (~2–3 GB RAM needed)
- **Low-end devices**: TinyLlama-1.1B or Gemma-2B Q3_K_S

Place GGUF files in `/models/` or configure path in app settings.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 6
- **Styling**: Tailwind CSS v4
- **Mobile**: Capacitor Android
- **AI**: llama.cpp (via webllm), Groq (cloud fallback)
- **PWA**: vite-plugin-pwa
- **Persistence**: SQLite (file-based, survives cache clears)

## Documentation

- [ROADMAP.md](ROADMAP.md) – Planned features & priorities
- [AGENTS.md](AGENTS.md) – Agent/personality system for coding tools
- [CONTRIBUTING.md](CONTRIBUTING.md) – How to contribute (coming soon)

## Contributing

Love to have help! Project is early — issues, PRs, ideas welcome.

- Report bugs or request features via [Issues](https://github.com/tmdubnz-sketch/Ask-Amo/issues)
- Fork and submit PRs for improvements

## Built with ❤️ in New Zealand

## License: MIT
