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
BANNED_KEY=your_gemini_key
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

Verified against `server.ts` (2026-11-22). Routes that used to be listed
here but never existed on the server — `/api/ai/config`,
`/api/kernel/synthesize`, `/api/gemini/generate`, `/api/gemini/generate-image`,
`WS /api/live-ws` — are removed. Do not re-add a route without implementing
it in `server.ts` and listing it here.

- `GET /api/health` — liveness probe, `{ status: "ok" }`
- `POST /api/log-error` — client telemetry/error sink
- `POST /api/browse` — connected web access (SSRF-guarded: public http(s) only)
- `POST /api/webhooks/stripe` — Stripe webhook receiver (logs receipt only)
- `GET /api/agent/manifest` and `GET /.well-known/agent.json` — agent manifest
- `POST /api/agent/dispatch` — terminal / file actions. **Bearer-token auth required** (NVK_AGENT_TOKEN, else a token generated at startup and printed once to the server console). Destructive commands are shield-rejected. Every call is audit-logged to `uploads/dispatch-audit.jsonl`.
- `POST /api/integrations/webhook/:userId/:connectionId` — wireboard webhook receiver
- `POST /api/export/brief` — writes a real `.md`/`.txt` file to `uploads/`, returns a real same-origin download URL. `pdf` is refused — no PDF writer exists.
- `POST /api/export/proposal` — same as brief, for proposals
- `POST /api/share/shard` — stores a shard with expiry, returns a real same-origin URL (`/api/share/shard/:token`)
- `GET /api/share/shard/:token` — serves a stored shard; 404 unknown, 410 expired
- `POST /api/ai/chat` — narrow allowlisted cloud provider proxy (openai, anthropic), plain fetch, no provider SDK. Key comes from the request body only and is never logged or stored. No key → 400 "provide a key". Gemini is excluded by this repo's no-Gemini runtime rule (AGENTS.md §1, enforced by the build audit).
- `POST /api/kernel/extrude` — thin wrapper: `commands` is always `[]` (no extrusion engine is connected); the response says so.
- `GET /api/voice/status` — `{ liveVoice: false, localAvailable: true }`. Cloud live voice is not connected; local WebGPU voice is the working path.
- `GET /api/proxy?url=` — fetch proxy (SSRF-guarded: public http(s) only)
- `GET /api/fs/list?path=` — list files under `uploads/` (traversal-guarded)
- `POST /api/fs/upload` — upload a file into `uploads/`
- `GET /api/fs/download/:filename` — download a file from `uploads/` (traversal-guarded)
- `POST /api/fs/write` — write a file inside `uploads/` (traversal-guarded)
- `POST /api/fs/delete` — delete a file inside `uploads/` (traversal-guarded)
- `POST /api/terminal` — shell execution. **Bearer-token auth required** (same dispatch token). Destructive commands are shield-rejected. Every call is audit-logged.

Server binds `127.0.0.1` by default; set `NVK_HOST` to opt in to another
interface (e.g. `NVK_HOST=0.0.0.0` for LAN use).

---

## License

MIT License
