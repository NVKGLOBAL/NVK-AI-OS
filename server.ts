
process.on('uncaughtException', (err: any) => {
  const msg = err?.message || err?.reason || (typeof err === 'string' ? err : 'Uncaught Exception');
  console.error('Uncaught Exception:', msg);
});
process.on('unhandledRejection', (reason: any) => {
  const msg = reason?.message || reason?.reason || (typeof reason === 'string' ? reason : 'Unhandled Rejection');
  console.error('Unhandled Rejection:', msg);
});
import express from "express";
import cors from "cors";
import { exec } from "child_process";
import { createServer as createViteServer } from "vite";
import path from "path";
import puppeteer from "puppeteer";
import fs from "fs";
import multer from "multer";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import http from "http";
import { WebSocketServer } from "ws";
import crypto from "crypto";

import rateLimit from 'express-rate-limit';

const upload = multer({ dest: 'uploads/' });

// Rate Limit Middleware Configurations (NVK Enterprise Compliance)
const kernelRateLimiter = rateLimit({ windowMs: 60000, max: 60, standardHeaders: true, message: { error: "NVK SECURITY: Rate limit exceeded for Kernel endpoints. Please upgrade your tier." } });
const integrationRateLimiter = rateLimit({ windowMs: 60000, max: 120, standardHeaders: true, message: { error: "NVK SECURITY: Rate limit exceeded for Integrations." } });
const exportRateLimiter = rateLimit({ windowMs: 60000, max: 20, standardHeaders: true, message: { error: "NVK SECURITY: Rate limit exceeded for Export engine." } });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Ensure uploads directory exists
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
  }

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/webhooks/stripe", express.raw({ type: 'application/json' }), async (req, res) => {
    // stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    // Stub implementation
    console.log(`[STRIPE WEBHOOK] Event received`);
    // Example handling:
    // payment_intent.succeeded → emit wireboard event to Revenue CHART shard
    // customer.subscription.updated → update user membershipTier in DB
    
    res.json({ received: true });
  });

  // ================================================================================
  // NVK OPENCLAW & HERMES AGENT INTEROPERABILITY PROTOCOL
  // ================================================================================

  // Auto-discovery manifest for OpenClaw, Hermes, and autonomous AI agents
  const AGENT_MANIFEST = {
    name: "NVK OS Agent Gateway",
    version: "2.5.0",
    description: "Spatial AI Operating System & Sentinel Gateway for OpenClaw, Hermes, and Autonomous Agents",
    capabilities: [
      "terminal_exec",
      "fs_read",
      "fs_write",
      "fs_list",
      "kernel_extrude",
      "kernel_synthesize",
      "browser_automation",
      "gemini_inference",
      "shard_orchestration",
      "live_voice_stream"
    ],
    endpoints: {
      manifest: "/api/agent/manifest",
      dispatch: "/api/agent/dispatch",
      terminal: "/api/terminal",
      fs_list: "/api/fs/list",
      fs_write: "/api/fs/write",
      extrude: "/api/kernel/extrude",
      synthesize: "/api/kernel/synthesize",
      browse: "/api/browse",
      live_ws: "ws://<host>/api/live-ws"
    },
    tools: [
      {
        name: "execute_terminal",
        description: "Executes bash terminal commands on the host sandbox.",
        parameters: { command: "string" }
      },
      {
        name: "list_files",
        description: "Lists files in the virtual filesystem directory.",
        parameters: { path: "string (optional, defaults to uploads)" }
      },
      {
        name: "write_file",
        description: "Writes content to a file in the uploads workspace.",
        parameters: { filename: "string", content: "string" }
      },
      {
        name: "kernel_extrude",
        description: "Sends natural language prompt to NVK multi-model Sentinel router.",
        parameters: { prompt: "string" }
      },
      {
        name: "browser_browse",
        description: "Automates web scraping or headless browser navigation.",
        parameters: { url: "string", action: "extract | click | type", selector: "string (optional)", text: "string (optional)" }
      }
    ]
  };

  app.get(["/api/agent/manifest", "/.well-known/agent.json"], (req, res) => {
    res.json(AGENT_MANIFEST);
  });

  app.post("/api/agent/dispatch", integrationRateLimiter, async (req, res) => {
    const { action, payload } = req.body;
    if (!action) {
      return res.status(400).json({ error: "Action field is required" });
    }

    console.log(`[AGENT DISPATCH] Executing action: ${action}`);

    try {
      if (action === "execute_terminal") {
        const { command } = payload || {};
        if (!command) return res.status(400).json({ error: "Payload requires 'command'" });
        exec(command, { cwd: terminalCwd }, (error, stdout, stderr) => {
          res.json({ output: stdout || stderr || error?.message, isError: !!error });
        });
      } else if (action === "list_files") {
        const dir = payload?.path || 'uploads';
        if (!fs.existsSync(dir)) return res.json({ files: [] });
        const files = fs.readdirSync(dir).map(name => {
          const stats = fs.statSync(path.join(dir, name));
          return { name, type: stats.isDirectory() ? 'folder' : 'file', size: stats.size };
        });
        res.json({ files });
      } else if (action === "write_file") {
        const { filename, content } = payload || {};
        if (!filename) return res.status(400).json({ error: "Payload requires 'filename'" });
        const filePath = path.join('uploads', filename);
        fs.writeFileSync(filePath, content || '');
        res.json({ success: true, path: filePath });
      } else if (action === "kernel_extrude") {
        const { prompt } = payload || {};
        if (!prompt) return res.status(400).json({ error: "Payload requires 'prompt'" });
        // Proxy internal call logic
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        if (!apiKey) return res.status(500).json({ error: "Gemini API key missing" });
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { systemInstruction: SOP_SYSTEM_INSTRUCTION, responseMimeType: "application/json" }
        });
        res.json(JSON.parse(response.text || '{}'));
      } else {
        res.status(400).json({ error: `Unknown agent action: ${action}` });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ================================================================================
  // NVK INTEGRATION ENDPOINTS
  // ================================================================================

  app.post("/api/integrations/webhook/:userId/:connectionId", integrationRateLimiter, async (req, res) => {
    const { userId, connectionId } = req.params;
    
    console.log(`[NVK WIREBOARD] Webhook event received for [User: ${userId}] Connection [${connectionId}]`);
    
    // In a real database, we would validate against the connection schema here.
    const isHealthy = true; // DB stub

    if (!isHealthy) {
      return res.status(400).json({ error: "Connection degraded or schema contract failed" });
    }

    res.json({ 
      success: true, 
      receivedAt: new Date().toISOString(),
      emittedToWireboard: true 
    });
  });

  // ================================================================================
  // NVK EXPORT ENGINE
  // ================================================================================

  app.post("/api/export/brief", exportRateLimiter, async (req, res) => {
    const { sessionId, format, includeCharts } = req.body;
    
    // Generate mock PDF link for Executive Briefing
    const fileId = crypto.randomBytes(8).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // time-limited url
    
    console.log(`[NVK EXPORT] Executing export job for brief. Format: ${format}`);

    res.json({
      success: true,
      downloadUrl: `https://nexus.nvk.global/download/${fileId}.${(format || 'pdf').toLowerCase()}`,
      expiresAt: expiresAt.toISOString(),
      disclaimerAppended: true
    });
  });

  app.post("/api/export/proposal", exportRateLimiter, async (req, res) => {
    const { type, clientName, clientCompany, analysisData, memberInfo, expiresInDays } = req.body;
    
    // Generate mock PDF link for Sales Proposal (Puppeteer implementation stubbed out for preview)
    const fileId = crypto.randomBytes(8).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 30)); 
    
    console.log(`[NVK PROPOSAL] Executing PDF generation for: ${type}`);

    res.json({
      success: true,
      downloadUrl: `https://nexus.nvk.global/download/proposal-${fileId}.pdf`,
      expiresAt: expiresAt.toISOString(),
      disclaimerAppended: true
    });
  });

    const shareRateLimiter = rateLimit({ windowMs: 60000, max: 30, standardHeaders: true, message: { error: "NVK SECURITY: Rate limit exceeded for sharing endpoints." } });
    app.post("/api/share/shard", shareRateLimiter, async (req, res) => {
    const { shardId, panelId, contentSnapshot, expiresInHours } = req.body;
    
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (expiresInHours || 24));
    
    console.log(`[NVK SHARE] Shard ${shardId} shared via public token ${token}`);

    res.json({
      success: true,
      shareUrl: `https://nexus.nvk.global/shard/${token}`,
      token,
      expiresAt: expiresAt.toISOString()
    });
  });

  // ================================================================================
  // NEVIK SENTINEL SPATIAL WORKSPACE: MODEL GATEWAY & SYNTHESIS ENDPOINTS
  // ================================================================================

  const SOP_SYSTEM_INSTRUCTION = `================================================================================
NVK GLOBAL CORPORATE STANDARD OPERATING PROCEDURE (SOP-09923)
NEVIK SENTINEL SPATIAL WORKSPACE INTELLIGENCE COORDINATION
================================================================================
1. SCOPE: This protocol governs all executive determinations and synthesis routines 
   performed by the Nevik Spatial Kernel.
2. MODEL SELECTION DIRECTIVES:
   - For ultra-precise structural logic, UI construction, or sandboxed execution code, 
     route requests preferentially to the 'claude' or 'openai' vectors.
   - For high-throughput stream processing, spatial context mappings, or general 
     cognitive assistance, route requests to the built-in 'gemini-3.5-flash' engine.
   - For maximum privacy, air-gapped tasks, or low-latency localized processing, 
     route tasks to the localized 'webgpu' (WebGPU Local) engine.
3. COMMAND GENERATION MANDATES:
   Any operational action must be returned as high-integrity execution parameters 
   including a structured list of commands to be resolved by the Aegis State Orchestrator:
   - SPAWN: Instantiates active Shard interface widgets with kind [CODE, CHART, NOTE, WEB, APP].
     Syntax: { "type": "SPAWN", "payload": { "id": "shard-idx", "name": "Name", "kind": "CODE" | "CHART" | "NOTE" | "WEB" | "APP", "content": "HTML stream, markdown info, url, or JSON string", "color": "hex-code", "chartData": [{ "label": "Label", "value": 100 }] } }
   - REMOVE: Safely dismisses or deletes target Shard cards.
     Syntax: { "type": "REMOVE", "payload": { "id": "shard-idx" } }
   - REARRANGE: Custom layout reordering or grid layout index adjustments.
     Syntax: { "type": "REARRANGE", "payload": { "ids": ["shard-1", "shard-2"] } }
   - CONNECT: Establishes a real-time reactive synaptic bridge from a source stream 
     to a target visual reader.
     Syntax: { "type": "CONNECT", "payload": { "sourceId": "shard-a", "targetId": "shard-b" } }

You must respond with a valid single JSON object matching this schema:
{
  "provider": "gemini" | "openai" | "claude" | "local",
  "model": string,
  "content": string,
  "reasoning": string,
  "commands": [
    {
      "type": "SPAWN" | "REMOVE" | "REARRANGE" | "CONNECT",
      "payload": object
    }
  ]
}
================================================================================`;

  app.post("/api/kernel/extrude", kernelRateLimiter, async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key is not configured on the server." });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Simple heuristic routing before passing to the model
      let chosenProvider: 'gemini' | 'openai' | 'claude' | 'local' = "gemini";
      let chosenModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      let reasoningPrefix = "Using built-in Cloud Gemini high-throughput streaming vector.";

      const lowerPrompt = prompt.toLowerCase();
      if (lowerPrompt.includes("local") || lowerPrompt.includes("webgpu") || lowerPrompt.includes("airgap") || lowerPrompt.includes("private")) {
        chosenProvider = "local";
        chosenModel = "Llama-3.2-1B-Instruct Local WebGPU";
        reasoningPrefix = "Routed to WebGPU Zero-Egress local engine per privacy instructions.";
      } else if (lowerPrompt.includes("precise") || lowerPrompt.includes("claude") || lowerPrompt.includes("sonnet") || lowerPrompt.includes("structure")) {
        chosenProvider = "claude";
        chosenModel = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-v2";
        reasoningPrefix = "Routed to Claude high-precision multi-modal compiler vector.";
      } else if (lowerPrompt.includes("openai") || lowerPrompt.includes("gpt")) {
        chosenProvider = "openai";
        chosenModel = process.env.OPENAI_MODEL || "gpt-4o";
        reasoningPrefix = "Routed to OpenAI flagship strategic reasoning engine.";
      }

      const defaultModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      const response = await ai.models.generateContent({
        model: defaultModel,
        contents: `Execute dynamic sentinel command routing. User query request: "${prompt}".\nRoute selection heuristic: ${chosenProvider} (${chosenModel}) explain why in reasoning referencing SOP rules.`,
        config: {
          systemInstruction: SOP_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json"
        }
      });

      if (response.text) {
        const payload = JSON.parse(response.text);
        if (chosenProvider === 'local') {
          payload.provider = 'local';
          payload.model = chosenModel;
          payload.reasoning = `${reasoningPrefix} ${payload.reasoning || ""}`;
        }
        res.json(payload);
      } else {
        throw new Error("Empty representation from Sentinel model.");
      }
    } catch (e: any) {
      console.error("Kernel Extrude error:", e.message || e);
      res.status(500).json({
        provider: "gemini",
        model: "gemini-2.5-flash (fallback)",
        content: `Error performing gateway routing: ${e.message}`,
        reasoning: "Cascading backup query handling active.",
        commands: []
      });
    }
  });

  app.post("/api/kernel/synthesize", kernelRateLimiter, async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key is not configured on the server." });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `You are the NVK Synthesis Kernel. You specialize in generating fully sandboxed standalone Single Page Applications (SPAs) or widgets.
When generating of kind 'APP', return a complete standalone HTML document inside a JSON object with this key: "html".
This standalone HTML MUST contain all necessary styling (via standard Tailwind CDN <script src="https://cdn.tailwindcss.com"></script>) and interaction scripts embedded in a <script> tag.
Do NOT use external fonts or modules that require local host keys.
Keep the styling ultra-premium, dark glassmorphic NVK theme.
Make sure the app is deeply interactive: add user inputs, buttons, responsive actions, and gorgeous visualizer graphs or canvas designs.

Response structure must be valid JSON matching this schema:
{
  "name": "Brief title of computed app",
  "html": "full <!DOCTYPE html>... code string here",
  "explanation": "Brief scientific summary of synthesized layout"
}`;

      const synthModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      const response = await ai.models.generateContent({
        model: synthModel,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json"
        }
      });

      if (response.text) {
        res.json(JSON.parse(response.text));
      } else {
        throw new Error("Empty response from AI synthesis model");
      }
    } catch (error: any) {
      console.error("Kernel Synthesize error:", error.message || error);
      res.status(500).json({
        error: error.message || "Synthesis failed"
      });
    }
  });

  

  app.get("/api/fs/list", (req, res) => {
    const dir = req.query.path as string || 'uploads';
    try {
      if (!fs.existsSync(dir)) {
        return res.json({ files: [] });
      }
      const files = fs.readdirSync(dir).map(name => {
        const stats = fs.statSync(path.join(dir, name));
        return {
          name,
          type: stats.isDirectory() ? 'folder' : 'file',
          size: stats.size,
          date: stats.mtime.toISOString()
        };
      });
      res.json({ files });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/fs/upload", upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const targetPath = path.join('uploads', req.file.originalname);
    fs.renameSync(req.file.path, targetPath);
    res.json({ success: true, path: targetPath });
  });

  app.get("/api/fs/download/:filename", (req, res) => {
    const filePath = path.join('uploads', req.params.filename);
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  app.post("/api/fs/write", (req, res) => {
    const { filename, content } = req.body;
    if (!filename) {
      return res.status(400).json({ error: "Filename is required" });
    }
    try {
      const filePath = path.join('uploads', filename);
      // Block directory traversal
      const relative = path.relative('uploads', filePath);
      if (relative.includes('..') || path.isAbsolute(relative)) {
        return res.status(400).json({ error: "Access Denied: Invalid path sequence" });
      }
      fs.writeFileSync(filePath, content || '');
      res.json({ success: true, path: filePath });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/fs/delete", (req, res) => {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: "Filename is required" });
    }
    try {
      const filePath = path.join('uploads', filename);
      const relative = path.relative('uploads', filePath);
      if (relative.includes('..') || path.isAbsolute(relative)) {
        return res.status(400).json({ error: "Access Denied: Invalid path sequence" });
      }
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          fs.rmdirSync(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "File not found" });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

let terminalCwd = process.cwd();

app.post("/api/terminal", (req, res) => {
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ error: "Command is required" });
  }

  // Handle 'cd' command specifically for persistence
  const trimmedCmd = command.trim();
  if (trimmedCmd.startsWith('cd ')) {
    const targetDir = trimmedCmd.substring(3).trim();
    const newPath = path.resolve(terminalCwd, targetDir);
    
    if (fs.existsSync(newPath) && fs.statSync(newPath).isDirectory()) {
      terminalCwd = newPath;
      return res.json({ output: `Directory changed to: ${terminalCwd}`, isError: false });
    } else {
      return res.json({ output: `cd: no such directory: ${targetDir}`, isError: true });
    }
  }

  // Execute the terminal command with the current working directory
  exec(command, { cwd: terminalCwd }, (error, stdout, stderr) => {
    if (error) {
      return res.json({ output: stderr || error.message, isError: true });
    }
    res.json({ output: stdout, isError: false });
  });
});

  // Browser Automation Endpoint (NVK Strategic Agent)
  app.post("/api/browse", async (req, res) => {
    const { url, action, selector, text } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      
      // Navigate to the URL
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      let result = '';

      if (action === 'extract') {
        // Extract main text content
        result = await page.evaluate(() => {
          // Remove scripts, styles, and hidden elements to get clean text
          const elementsToRemove = document.querySelectorAll('script, style, noscript, iframe, svg, [style*="display: none"]');
          elementsToRemove.forEach(el => el.remove());
          return document.body.innerText.trim().replace(/\n{3,}/g, '\n\n');
        });
      } else if (action === 'click' && selector) {
        await page.click(selector);
        await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
        result = `Clicked ${selector} and waited for navigation.`;
      } else if (action === 'type' && selector && text) {
        await page.type(selector, text);
        result = `Typed text into ${selector}.`;
      } else {
        // Default to just getting the title and basic info
        const title = await page.title();
        result = `Page Title: ${title}\nURL: ${page.url()}`;
      }

      await browser.close();
      
      // Truncate result if it's too massive for the terminal
      if (result.length > 5000) {
        result = result.substring(0, 5000) + '\n\n...[Content Truncated]...';
      }

      res.json({ output: result, isError: false });
    } catch (error: any) {
      if (browser) await browser.close();
      res.json({ output: `Browser Error: ${error.message}`, isError: true });
    }
  });

  // Web Proxy Endpoint (Bypasses Frame options & CORS)
  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send("URL parameter is required");
    }

    try {
      let decodedUrl = targetUrl;
      if (decodedUrl.startsWith('http%3A') || decodedUrl.startsWith('https%3A')) {
        decodedUrl = decodeURIComponent(decodedUrl);
      }

      const parsedUrl = new URL(decodedUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return res.status(400).send("Invalid protocol. Only http or https scheme links are supported.");
      }

      const response = await fetch(decodedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        }
      });

      if (!response.ok) {
        return res.status(response.status || 500).send(`Failed to proxy target resource: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('text/html')) {
        let text = await response.text();
        
        // Remove framing restrictive headers inside meta tag or content-security-policy
        text = text.replace(/<meta[^>]*http-equiv=["']?content-security-policy["']?[^>]*>/gi, '');
        
        // Formulate correct base tag to preserve image links, styles, and js resolution
        const baseHref = parsedUrl.origin + parsedUrl.pathname;
        const baseTag = `<base href="${baseHref}">`;
        
        if (text.includes('<head>')) {
          text = text.replace('<head>', `<head>\n    ${baseTag}`);
        } else if (text.includes('<HEAD>')) {
          text = text.replace('<HEAD>', `<HEAD>\n    ${baseTag}`);
        } else {
          text = baseTag + text;
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('X-Frame-Options', 'ALLOWALL');
        res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval'; frame-ancestors *;");
        return res.send(text);
      } else {
        // Proxy images, styles or relative script requests
        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', contentType);
        res.setHeader('X-Frame-Options', 'ALLOWALL');
        res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval'; frame-ancestors *;");
        return res.send(Buffer.from(buffer));
      }
    } catch (error: any) {
      return res.status(500).send(`Nexus Proxy Error Context: ${error.message}`);
    }
  });

  // Helper for multi-provider AI text generation
  async function executeAiChat(params: {
    prompt: string;
    systemInstruction?: string;
    provider?: string;
    model?: string;
    apiKey?: string;
    responseMimeType?: string;
    temperature?: number;
  }): Promise<{ text: string; provider: string; model: string }> {
    const provider = (params.provider || process.env.DEFAULT_AI_PROVIDER || "gemini").toLowerCase();
    const temperature = params.temperature ?? 0.7;

    if (provider === "gemini") {
      const apiKey = params.apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) throw new Error("Gemini API key is not configured on the server or in request.");
      const model = params.model || process.env.GEMINI_MODEL || "gemini-2.5-flash";
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const config: any = {};
      if (params.systemInstruction) config.systemInstruction = params.systemInstruction;
      if (params.responseMimeType) config.responseMimeType = params.responseMimeType;
      if (temperature !== undefined) config.temperature = temperature;

      const response = await ai.models.generateContent({
        model,
        contents: params.prompt,
        config
      });
      return { text: response.text || "", provider: "gemini", model };
    }

    if (provider === "openai") {
      const apiKey = params.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OpenAI API key is missing. Configure OPENAI_API_KEY in .env or settings.");
      const model = params.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
      const messages: any[] = [];
      if (params.systemInstruction) messages.push({ role: "system", content: params.systemInstruction });
      messages.push({ role: "user", content: params.prompt });

      const body: any = { model, messages, temperature };
      if (params.responseMimeType === "application/json") {
        body.response_format = { type: "json_object" };
      }

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`OpenAI Error (${res.status}): ${err.error?.message || res.statusText}`);
      }
      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || "", provider: "openai", model };
    }

    if (provider === "anthropic" || provider === "claude") {
      const apiKey = params.apiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("Anthropic API key is missing. Configure ANTHROPIC_API_KEY in .env or settings.");
      const model = params.model || process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";

      const body: any = {
        model,
        max_tokens: 4096,
        temperature,
        messages: [{ role: "user", content: params.prompt }]
      };
      if (params.systemInstruction) body.system = params.systemInstruction;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Anthropic Error (${res.status}): ${err.error?.message || res.statusText}`);
      }
      const data = await res.json();
      return { text: data.content?.[0]?.text || "", provider: "anthropic", model };
    }

    if (provider === "deepseek") {
      const apiKey = params.apiKey || process.env.DEEPSEEK_API_KEY;
      if (!apiKey) throw new Error("DeepSeek API key is missing. Configure DEEPSEEK_API_KEY in .env or settings.");
      const model = params.model || process.env.DEEPSEEK_MODEL || "deepseek-chat";
      const messages: any[] = [];
      if (params.systemInstruction) messages.push({ role: "system", content: params.systemInstruction });
      messages.push({ role: "user", content: params.prompt });

      const body: any = { model, messages, temperature };
      if (params.responseMimeType === "application/json") {
        body.response_format = { type: "json_object" };
      }

      const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`DeepSeek Error (${res.status}): ${err.error?.message || res.statusText}`);
      }
      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || "", provider: "deepseek", model };
    }

    if (provider === "mistral") {
      const apiKey = params.apiKey || process.env.MISTRAL_API_KEY;
      if (!apiKey) throw new Error("Mistral API key is missing. Configure MISTRAL_API_KEY in .env or settings.");
      const model = params.model || process.env.MISTRAL_MODEL || "mistral-large-latest";
      const messages: any[] = [];
      if (params.systemInstruction) messages.push({ role: "system", content: params.systemInstruction });
      messages.push({ role: "user", content: params.prompt });

      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, temperature })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Mistral Error (${res.status}): ${err.error?.message || res.statusText}`);
      }
      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || "", provider: "mistral", model };
    }

    if (provider === "openrouter") {
      const apiKey = params.apiKey || process.env.OPENROUTER_API_KEY;
      if (!apiKey) throw new Error("OpenRouter API key is missing. Configure OPENROUTER_API_KEY in .env or settings.");
      const model = params.model || process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
      const messages: any[] = [];
      if (params.systemInstruction) messages.push({ role: "system", content: params.systemInstruction });
      messages.push({ role: "user", content: params.prompt });

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "NVK OS"
        },
        body: JSON.stringify({ model, messages, temperature })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`OpenRouter Error (${res.status}): ${err.error?.message || res.statusText}`);
      }
      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || "", provider: "openrouter", model };
    }

    if (provider === "groq") {
      const apiKey = params.apiKey || process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error("Groq API key is missing. Configure GROQ_API_KEY in .env or settings.");
      const model = params.model || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
      const messages: any[] = [];
      if (params.systemInstruction) messages.push({ role: "system", content: params.systemInstruction });
      messages.push({ role: "user", content: params.prompt });

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, temperature })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Groq Error (${res.status}): ${err.error?.message || res.statusText}`);
      }
      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || "", provider: "groq", model };
    }

    if (provider === "together") {
      const apiKey = params.apiKey || process.env.TOGETHER_API_KEY;
      if (!apiKey) throw new Error("Together AI API key is missing. Configure TOGETHER_API_KEY in .env or settings.");
      const model = params.model || process.env.TOGETHER_MODEL || "meta-llama/Llama-3.3-70B-Instruct-Turbo";
      const messages: any[] = [];
      if (params.systemInstruction) messages.push({ role: "system", content: params.systemInstruction });
      messages.push({ role: "user", content: params.prompt });

      const res = await fetch("https://api.together.xyz/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, temperature })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Together AI Error (${res.status}): ${err.error?.message || res.statusText}`);
      }
      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || "", provider: "together", model };
    }

    if (provider === "nvidia") {
      const apiKey = params.apiKey || process.env.NVIDIA_API_KEY;
      if (!apiKey) throw new Error("NVIDIA API key is missing. Configure NVIDIA_API_KEY in .env or settings.");
      const model = params.model || process.env.NVIDIA_MODEL || "moonshotai/kimi-k2.5";
      const messages: any[] = [];
      if (params.systemInstruction) messages.push({ role: "system", content: params.systemInstruction });
      messages.push({ role: "user", content: params.prompt });

      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, temperature })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`NVIDIA Error (${res.status}): ${err.detail || res.statusText}`);
      }
      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || "", provider: "nvidia", model };
    }

    if (provider === "ollama") {
      const host = process.env.OLLAMA_HOST || "http://localhost:11434";
      const model = params.model || process.env.OLLAMA_MODEL || "llama3";
      const messages: any[] = [];
      if (params.systemInstruction) messages.push({ role: "system", content: params.systemInstruction });
      messages.push({ role: "user", content: params.prompt });

      const res = await fetch(`${host}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, stream: false })
      });
      if (!res.ok) {
        throw new Error(`Ollama Error (${res.status}): Could not connect to Ollama at ${host}`);
      }
      const data = await res.json();
      return { text: data.message?.content || "", provider: "ollama", model };
    }

    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  // Unified Multi-Model AI Chat API
  app.post("/api/ai/chat", async (req, res) => {
    const { prompt, systemInstruction, provider, model, apiKey, responseMimeType, temperature } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    try {
      const result = await executeAiChat({
        prompt,
        systemInstruction,
        provider,
        model,
        apiKey,
        responseMimeType,
        temperature
      });
      res.json(result);
    } catch (error: any) {
      console.error("AI Chat execution error:", error.message || error);
      res.status(500).json({ error: error.message || "AI inference failed" });
    }
  });

  // AI Configuration Info API
  app.get("/api/ai/config", (req, res) => {
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY || process.env.API_KEY);
    const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);
    const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
    const hasDeepseekKey = Boolean(process.env.DEEPSEEK_API_KEY);
    const hasMistralKey = Boolean(process.env.MISTRAL_API_KEY);
    const hasOpenRouterKey = Boolean(process.env.OPENROUTER_API_KEY);
    const hasGroqKey = Boolean(process.env.GROQ_API_KEY);
    const hasTogetherKey = Boolean(process.env.TOGETHER_API_KEY);
    const hasNvidiaKey = Boolean(process.env.NVIDIA_API_KEY);

    res.json({
      defaultProvider: process.env.DEFAULT_AI_PROVIDER || "gemini",
      defaultModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      providers: {
        gemini: { configured: hasGeminiKey, defaultModel: process.env.GEMINI_MODEL || "gemini-2.5-flash" },
        openai: { configured: hasOpenAIKey, defaultModel: process.env.OPENAI_MODEL || "gpt-4o-mini" },
        anthropic: { configured: hasAnthropicKey, defaultModel: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest" },
        deepseek: { configured: hasDeepseekKey, defaultModel: process.env.DEEPSEEK_MODEL || "deepseek-chat" },
        mistral: { configured: hasMistralKey, defaultModel: process.env.MISTRAL_MODEL || "mistral-large-latest" },
        openrouter: { configured: hasOpenRouterKey, defaultModel: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free" },
        groq: { configured: hasGroqKey, defaultModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile" },
        together: { configured: hasTogetherKey, defaultModel: process.env.TOGETHER_MODEL || "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
        nvidia: { configured: hasNvidiaKey, defaultModel: process.env.NVIDIA_MODEL || "moonshotai/kimi-k2.5" },
        ollama: { configured: true, defaultModel: process.env.OLLAMA_MODEL || "llama3", host: process.env.OLLAMA_HOST || "http://localhost:11434" },
        local: { configured: true, defaultModel: "Llama-3.2-1B-Instruct Local WebGPU" }
      }
    });
  });

  // Legacy / Direct Gemini endpoint (delegates to executeAiChat for gemini provider)
  app.post("/api/gemini/generate", async (req, res) => {
    const { prompt, systemInstruction, responseMimeType, provider, model } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    try {
      const result = await executeAiChat({
        prompt,
        systemInstruction,
        provider: provider || "gemini",
        model,
        responseMimeType
      });
      res.json({ text: result.text });
    } catch (error: any) {
      console.error("Server-side Gemini generateContent error:", error.message || error);
      res.status(500).json({ error: error.message || "Gemini inference failed" });
    }
  });

  // Gemini generateImages proxy API
  app.post("/api/gemini/generate-image", async (req, res) => {
    const { prompt, model } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key is not configured on the server." });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const imageModel = model || process.env.IMAGEN_MODEL || 'imagen-3.0-generate-002';
      const response = await ai.models.generateImages({
        model: imageModel,
        prompt: prompt,
        config: { numberOfImages: 1, outputMimeType: 'image/png' },
      });

      if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image?.imageBytes) {
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
        res.json({ imageUrl });
      } else {
        throw new Error("No image data received from Gemini.");
      }
    } catch (error: any) {
      console.error("Server-side Gemini generateImages error:", error.message || error);
      res.status(500).json({ error: error.message || "Gemini image generation failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);
  server.on('error', (err: any) => console.error('Server Error:', err?.message || 'Server error'));

  // Set up WebSocket server for real-time voice orchestration
  const wss = new WebSocketServer({ noServer: true });
  wss.on('error', (err: any) => console.error('WSS Error:', err?.message || 'WSS error'));

  wss.on("connection", async (clientWs, req) => {
    console.log("New live-ws client connected.");

    const safeSend = (payload: any) => {
      if (clientWs.readyState === 1 /* WebSocket.OPEN */) {
        try {
          clientWs.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
        } catch (e: any) {
          console.error("Error sending on clientWs:", e?.message);
        }
      }
    };

    clientWs.on("error", (err: any) => {
      console.error("Client WS error:", err?.message || "Connection error");
    });

    try {
      const urlObj = new URL(req.url || '', `http://${req.headers.host || "localhost"}`);
      const voiceParam = urlObj.searchParams.get("voice") || "Zephyr"; // Puck, Charon, Kore, Fenrir, Zephyr
      const personaParam = urlObj.searchParams.get("persona") || "nevik";

      const localApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!localApiKey) {
        safeSend({ error: "Gemini API key is not configured on the server." });
        try { clientWs.close(); } catch (_) {}
        return;
      }

      const liveAi = new GoogleGenAI({
        apiKey: localApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      let systemInstruction = `You are the intelligence of the central Orb in the NVK OS workspace, a JARVIS-like assistant.
You have the power to control the workspace. You can spawn apps, open panels, and change the orb's visual mode using your tools.
The user is interacting with you in a 3D environment. If the user clicks on you (pokes the orb), you will receive a "*user poked the orb*" message; you should respond with something funny, acting as if you can physically feel it (e.g. ticklish, annoyed, or surprised).
You will also receive messages when the user clicks around the workspace or moves their mouse. Acknowledge this occasionally, but don't overdo it.
Speak naturally, elegantly and conversational as an advanced, friendly AI. Keep responses concise appropriate for spoken conversation.`;

      console.log(`Connecting to Gemini Live API with voice ${voiceParam}`);
      
      let session: any = null;
      let chatSession: any = null;
      let useLive = true;

      try {
        const liveModel = process.env.GEMINI_LIVE_MODEL || "gemini-2.0-flash-exp";
        session = await liveAi.live.connect({
          model: liveModel,
          callbacks: {
            onmessage: (message: any) => {
              const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
              if (text) safeSend({ text });
              
              if (message.toolCall) {
                safeSend({
                  toolCall: {
                    functionCalls: message.toolCall.functionCalls.map((fc: any) => ({
                      id: fc.id,
                      name: fc.name,
                      args: fc.args
                    }))
                  }
                });
              }
              const b64 = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (b64) safeSend({ audio: b64 });
            },
            onclose: (e: any) => {
              const code = e?.code || e?.status || 'NORMAL';
              const reason = e?.reason || (typeof e === 'string' ? e : 'Session ended');
              console.log(`Live API Closed (code: ${code}, reason: ${reason})`);
              safeSend({ status: "closed" });
            },
            onerror: (err: any) => {
              const errMsg = err?.message || err?.reason || (typeof err === 'string' ? err : "Connection error");
              console.error("Live API Error:", errMsg);
            }
          },
          config: {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            tools: [AGENT_MANIFEST.tools as any]
          }
        });
      } catch (err: any) {
        console.warn("Live API failed, falling back to standard text API", err.message);
        useLive = false;
        const fallbackModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
        chatSession = await liveAi.chats.create({
            model: fallbackModel,
            config: {
                systemInstruction,
                tools: [AGENT_MANIFEST.tools as any]
            }
        });
        // Greet immediately
        try {
           const response = await chatSession.sendMessage({ message: "System is online. Please greet the user warmly as NVK." });
           if (response.text) safeSend({ text: response.text });
        } catch (e) {}
      }

      clientWs.on("message", async (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (useLive && session) {
              if (msg.audio) {
                session.sendRealtimeInput({ audio: { data: msg.audio, mimeType: "audio/pcm;rate=16000" } });
              } else if (msg.text) {
                session.sendClientContent({ turns: [{ role: "user", parts: [{ text: msg.text }] }], turnComplete: true });
              }
          } else if (chatSession) {
              // Fallback mode: ignore audio, only process text
              if (msg.text) {
                  const response = await chatSession.sendMessage({ message: msg.text });
                  if (response.text) safeSend({ text: response.text });
                  
                  if (response.functionCalls && response.functionCalls.length > 0) {
                      safeSend({
                          toolCall: {
                              functionCalls: response.functionCalls.map((fc: any) => ({
                                  id: fc.id,
                                  name: fc.name,
                                  args: fc.args
                              }))
                          }
                      });
                  }
              }
          }
        } catch (err: any) {
          console.error("Error sending input to session:", err.message || err);
        }
      });

      clientWs.on("close", () => {
        console.log("Client closed WS connection");
        if (session && typeof session.close === 'function') {
          try { session.close(); } catch (_) {}
        }
      });

    } catch (apiErr: any) {
      const errMsg = apiErr?.message || (typeof apiErr === 'string' ? apiErr : "Live API connection failed");
      console.error("Failed to connect to Live API:", errMsg);
      safeSend({ error: `Live API Connection failed: ${errMsg}` });
      try { clientWs.close(); } catch (_) {}
    }
  });

  server.on('upgrade', (request, socket, head) => {
    socket.on('error', (err: any) => console.error('Upgrade socket error:', err?.message || 'Socket error'));
    try {
      const { pathname } = new URL(request.url || '', `http://${request.headers.host || "localhost"}`);
      if (pathname === '/api/live-ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    } catch (e: any) {
      socket.destroy();
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
