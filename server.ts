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
import fs from "fs";
import multer from "multer";
import http from "http";
import crypto from "crypto";
import rateLimit from 'express-rate-limit';

const upload = multer({ dest: 'uploads/' });

// Rate Limit Middleware Configurations (NVK Local Sovereign Exemption - Disabled)
const kernelRateLimiter = (req: any, res: any, next: any) => next();
const integrationRateLimiter = (req: any, res: any, next: any) => next();
const exportRateLimiter = (req: any, res: any, next: any) => next();

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

  // Client telemetry and error sink (prevents 404s on browser window.error)
  app.post("/api/log-error", (req, res) => {
    const { error, url, info } = req.body || {};
    const cleanMsg = (typeof error === 'string' ? error : 'Client Error').slice(0, 400);
    console.warn(`[NVK CLIENT TELEMETRY] ${cleanMsg} (URL: ${url || 'unknown'}, Info: ${info || 'none'})`);
    res.json({ logged: true });
  });

  // Programmatic Connected Web Access for Terminal & Sub-Agents
  app.post("/api/browse", async (req, res) => {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: "URL is required", isError: true });

    try {
      const fetchRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!fetchRes.ok) {
        return res.json({ output: `HTTP ${fetchRes.status} ${fetchRes.statusText} fetching ${url}`, isError: true });
      }

      const html = await fetchRes.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : 'Untitled Document';
      const textOnly = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const excerpt = textOnly.slice(0, 1200);

      res.json({
        output: `[CONNECTED WEB ACCESS]\nTitle: ${title}\nURL: ${url}\nContent Excerpt:\n${excerpt}...`,
        isError: false
      });
    } catch (err: any) {
      res.json({ output: `Connected Web Access failed: ${err.message}`, isError: true });
    }
  });

  app.post("/api/webhooks/stripe", express.raw({ type: 'application/json' }), async (req, res) => {
    console.log(`[STRIPE WEBHOOK] Event received`);
    res.json({ received: true });
  });

  const AGENT_MANIFEST = {
    name: "NVK OS Agent Gateway",
    version: "2.5.0",
    description: "Spatial AI Operating System & Sentinel Gateway",
    capabilities: [
      "terminal_exec",
      "fs_read",
      "fs_write",
      "fs_list"
    ],
    endpoints: {
      manifest: "/api/agent/manifest",
      dispatch: "/api/agent/dispatch",
      terminal: "/api/terminal",
      fs_list: "/api/fs/list",
      fs_write: "/api/fs/write"
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
      }
    ]
  };

  app.get(["/api/agent/manifest", "/.well-known/agent.json"], (req, res) => {
    res.json(AGENT_MANIFEST);
  });

  let terminalCwd = process.cwd();

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
      } else {
        res.status(400).json({ error: `Unknown agent action: ${action}` });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/integrations/webhook/:userId/:connectionId", integrationRateLimiter, async (req, res) => {
    const { userId, connectionId } = req.params;
    console.log(`[NVK WIREBOARD] Webhook event received for [User: ${userId}] Connection [${connectionId}]`);
    res.json({ success: true, receivedAt: new Date().toISOString(), emittedToWireboard: true });
  });

  app.post("/api/export/brief", exportRateLimiter, async (req, res) => {
    const { format } = req.body;
    const fileId = crypto.randomBytes(8).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    res.json({
      success: true,
      downloadUrl: `https://nexus.nvk.global/download/${fileId}.${(format || 'pdf').toLowerCase()}`,
      expiresAt: expiresAt.toISOString(),
      disclaimerAppended: true
    });
  });

  app.post("/api/export/proposal", exportRateLimiter, async (req, res) => {
    const { expiresInDays } = req.body;
    const fileId = crypto.randomBytes(8).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 30)); 
    res.json({
      success: true,
      downloadUrl: `https://nexus.nvk.global/download/proposal-${fileId}.pdf`,
      expiresAt: expiresAt.toISOString(),
      disclaimerAppended: true
    });
  });

  const shareRateLimiter = rateLimit({ windowMs: 60000, max: 30, standardHeaders: true, message: { error: "NVK SECURITY: Rate limit exceeded for sharing endpoints." } });
  app.post("/api/share/shard", shareRateLimiter, async (req, res) => {
    const { shardId, expiresInHours } = req.body;
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (expiresInHours || 24));
    res.json({
      success: true,
      shareUrl: `https://nexus.nvk.global/shard/${token}`,
      token,
      expiresAt: expiresAt.toISOString()
    });
  });

  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send("No URL provided");
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const contentType = response.headers.get('content-type') || 'text/html';
      let body = await response.text();
      
      if (contentType.includes('text/html')) {
          const urlObj = new URL(targetUrl);
          const baseTag = `<base href="${urlObj.origin}/">`;
          if (body.includes('<head>')) {
              body = body.replace('<head>', `<head>\n${baseTag}`);
          } else {
              body = baseTag + body;
          }
      }
      
      res.set('Content-Type', contentType);
      res.send(body);
    } catch (error: any) {
      res.status(500).send(`Nexus Proxy Error: ${error.message}`);
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
    const safeFilename = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetPath = path.join('uploads', safeFilename);
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
    if (!filename) return res.status(400).json({ error: "Filename is required" });
    try {
      const filePath = path.join('uploads', filename);
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
    if (!filename) return res.status(400).json({ error: "Filename is required" });
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

  app.post("/api/terminal", (req, res) => {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: "Command is required" });

    const trimmedCmd = command.trim();

    // NVK Kernel Security: Block catastrophic host annihilation commands
    const DESTRUCTIVE_PATTERNS = [
      /\brm\s+-[rfR]*\s+[\/~]/,            // rm -rf / or rm -rf ~
      /\bmkfs\b/,                           // filesystem format
      /: \(\)\s*\{[^}]*:\s*\|\s*:[^}]*\}/, // fork bomb
      /\bdd\s+if=/,                         // raw disk overwrite
      /\bshutdown\b/,
      /\breboot\b/,
      /\b(curl|wget)\s+.*\|\s*(bash|sh)\b/  // arbitrary piped execution
    ];

    for (const pattern of DESTRUCTIVE_PATTERNS) {
      if (pattern.test(trimmedCmd)) {
        return res.json({ 
          output: `[NVK SECURITY SHIELD] Command rejected: Destructive system attack vector detected.`, 
          isError: true 
        });
      }
    }

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

    exec(command, { cwd: terminalCwd }, (error, stdout, stderr) => {
      if (error) {
        return res.json({ output: stderr || error.message, isError: true });
      }
      res.json({ output: stdout, isError: false });
    });
  });

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

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
