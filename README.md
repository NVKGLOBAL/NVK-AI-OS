# NVK 3D AI OS

**Angelic Spatial Workspace & Multi-Model Business Operations OS**

NVK 3D AI OS is a spatial 3D operating environment featuring WebGPU local LLMs, cloud AI orchestration, real-time voice streaming, and dynamic visual workspace shards. It operates autonomously with multi-model AI integration, zero-egress local processing options, and high-precision spatial layouts.

---

## Key Highlights & AI Features

- **Model Agnostic AI Engine**: Seamlessly switch AI models across Google Gemini, OpenAI (GPT-4o), Anthropic (Claude 3.5 Sonnet), DeepSeek, Mistral, OpenRouter, Groq, Together AI, NVIDIA Kimi, and Local Ollama.
- **Zero-Egress Local LLMs**: Run WebGPU models directly inside the browser using `@mlc-ai/web-llm` for complete privacy and offline operation.
- **Real-Time Voice WebSocket Stream**: Native bidirectional voice interaction powered by Gemini Live API with automatic fallback.
- **Interactive 3D Codex Canvas**: Built with React Three Fiber, Framer Motion, and Three.js with full mouse/touch container mapping.
- **Dynamic Shard Synthesis**: Generates sandboxed interactive Single Page Applications (SPAs), charts, code widgets, and live data views on the fly.

---

## Model Swapping Guide

Swapping models or AI providers is simple and requires zero structural code modifications.

### Option 1: Via Environment Variables (`.env`)

Copy `.env.example` to `.env` and set your preferred provider and model defaults:

```env
# Default provider choices: gemini | openai | anthropic | deepseek | mistral | openrouter | groq | together | nvidia | ollama
DEFAULT_AI_PROVIDER=gemini

# Gemini Models (e.g. gemini-2.5-flash, gemini-1.5-pro, gemini-2.0-flash-exp)
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash

# OpenAI Models (e.g. gpt-4o, gpt-4o-mini, o3-mini)
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini

# Anthropic Models (e.g. claude-3-5-sonnet-latest, claude-3-5-haiku-latest)
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_MODEL=claude-3-5-sonnet-latest

# DeepSeek Models (e.g. deepseek-chat, deepseek-reasoner)
DEEPSEEK_API_KEY=your_deepseek_key
DEEPSEEK_MODEL=deepseek-chat

# Ollama Local Server
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3
```

### Option 2: Via In-App UI Settings

Click the **Logic Core Orchestrator** / Settings panel in the 3D workspace UI to:
- Select active AI Provider (Cloud or Local WebGPU)
- Enter user-specific API keys
- Choose target model variants dynamically

---

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion, `@react-three/fiber`, `@react-three/drei`, Three.js
- **Backend Server**: Express 5, `esbuild` server bundler, Node.js WebSocket (`ws`)
- **AI Libraries**: `@google/genai`, `@mlc-ai/web-llm`
- **Database & State**: Dexie.js (IndexedDB client-side logs & history)

---

## Quickstart & Local Development

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/nvk-os.git
   cd nvk-os
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment:
   ```bash
   cp .env.example .env
   ```

4. Start Development Server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## Building for Production & Deployment

### Build Script

To compile both the Vite frontend assets and bundle the Express server into `dist/server.cjs`:

```bash
npm run build
```

### Production Start

```bash
npm run start
```

### Deploying to Cloud Run / Docker / Render / Fly.io

NVK OS is bundled as a single self-contained Node server running on port `3000`.

**Dockerfile Example:**

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "run", "start"]
```

---

## API Endpoints

- `POST /api/ai/chat` - Unified multi-provider AI text generation
- `GET /api/ai/config` - Status of configured AI providers and models
- `POST /api/kernel/extrude` - Spatial intent routing and shard command extrusions
- `POST /api/kernel/synthesize` - Standalone interactive SPA widget synthesis
- `POST /api/gemini/generate` - Backward-compatible AI text generation route
- `POST /api/gemini/generate-image` - Image generation route (Imagen)
- `WS /api/live-ws` - Real-time audio streaming WebSocket gateway

---

## License

MIT License
