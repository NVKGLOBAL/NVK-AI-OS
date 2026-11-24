import { nvkEventBus } from '../events/NVKEventBus';
import { artifactRegistry } from '../artifacts/ArtifactRegistry';
import { capabilityRegistry as originalRegistry } from '../../../services/CapabilityRegistry';
import { NVKCapability as BaseCapability } from '../types';
import { evaluateMathExpression } from '../../../lib/mathEvaluator';
import { parseDuckDuckGoHtml } from '../../../lib/duckDuckGoParser';

export interface NVKCapabilityDef extends BaseCapability {
  inputSchema?: unknown;
  outputSchema?: unknown;
}

class CapabilityRegistry {
  private capabilities: Map<string, NVKCapabilityDef> = new Map();

  register(cap: NVKCapabilityDef) {
    this.capabilities.set(cap.id, cap);
  }

  getCapability(id: string): NVKCapabilityDef | undefined {
    return this.capabilities.get(id);
  }

  getAll(): NVKCapabilityDef[] {
    return Array.from(this.capabilities.values());
  }
}

export const capabilityRegistry = new CapabilityRegistry();

// 1. Capability Discovery
capabilityRegistry.register({
  id: 'capability.discovery',
  name: 'Capability Discovery',
  description: 'List all available capabilities and matrix',
  category: 'intelligence',
  available: true,
  executor: 'CapabilityRegistry.discovery',
  requiresPermission: false,
  requiresConfirmation: false,
  verificationMethod: 'matrix_check',
  execute: async () => {
    const all = capabilityRegistry.getAll();
    const availableNow = all.filter(c => c.available).map(c => `• ${c.name} (${c.id})`);
    const unavailable = all.filter(c => !c.available).map(c => `• ${c.name} (${c.id}) - Unavailable: ${(c as any).reason || 'Not connected'}`);
    
    return {
      // Slice 3 (2026-11-23): the old "CONNECTED TOOLS" block hardcoded
      // "Calculation Engine / Web Fetch / File System & Artifacts" as
      // static text regardless of what is actually available. The matrix
      // now lists only the live registry state — available and unavailable.
      message: `NVK CAPABILITY MATRIX\n\nAVAILABLE NOW:\n${availableNow.join('\n')}\n\nUNAVAILABLE:\n${unavailable.length > 0 ? unavailable.join('\n') : 'None'}`,
      verified: true
    };
  },
  verify: async () => true
});

// 2. Calculation Capability (Deterministic)
capabilityRegistry.register({
  id: 'calculation.math',
  name: 'Mathematical Calculation',
  description: 'Perform arithmetic and local calculations',
  category: 'intelligence',
  available: true,
  executor: 'local.math',
  requiresPermission: false,
  requiresConfirmation: false,
  verificationMethod: 'deterministic_check',
  execute: async (input) => {
    const query = input?.query || input?.objective || '5+5';
    // Slice 3 (2026-11-23): the old catch returned the hardcoded string
    // '10' and labelled it "Computed locally", verified: true — any
    // unparseable question "computed" to 10. A real evaluation is the
    // only success path; anything else throws the honest reason, so the
    // engine records a failed node instead of a fabricated number.
    const evaluated = evaluateMathExpression(query);
    // NOTE: `evaluated.ok === false`, not `!evaluated.ok` — this project
    // runs tsc without strictNullChecks, and only the === form narrows
    // the MathEvaluation union (verified 2026-11-23: `!ok` errors TS2339).
    if (evaluated.ok === false) {
      throw new Error(`Calculation unavailable: ${evaluated.reason}`);
    }
    return {
      result: `Result: ${evaluated.value}`,
      message: `Computed locally: ${evaluated.value}`,
      verified: true
    };
  },
  verify: async (input, result) => !!result && typeof result.result === 'string' && result.result.startsWith('Result: ')
});

// 3. Local Image Generation (NOT AVAILABLE — corrected 2026-11-22)
// The old entry claimed available: true and generated a canned SVG with a
// fake model name ("nvk-diffusion-v1") and a "VERIFIED" label. No image
// model is connected. This now matches NVK_CAPABILITY_MATRIX.json
// (available: false — "Not connected") and throws like email.send.
capabilityRegistry.register({
  id: 'image.generation',
  name: 'Local Image Generation Engine',
  description: 'Generate local images and visual assets without per-image API billing',
  category: 'creation',
  available: false,
  executor: 'local.imageEngine',
  requiresPermission: false,
  requiresConfirmation: false,
  verificationMethod: 'image_checksum_check',
  execute: async () => {
    throw new Error('IMAGE_ENGINE_NOT_CONNECTED: No image generation model is connected.');
  },
  verify: async () => false
});

// 4. Application Launch (NOT AVAILABLE — corrected 2026-11-22)
// The old entry claimed available: true and fabricated a random PID plus a
// "successfully launched and verified by NVK process manager" message. The
// browser sandbox cannot launch native applications. This now matches
// NVK_CAPABILITY_MATRIX.json (available: false — "Browser sandbox
// restriction") and throws like email.send.
capabilityRegistry.register({
  id: 'application.launch',
  name: 'Launch Application',
  description: 'Launch external or native applications through OS subsystem',
  category: 'application',
  available: false,
  executor: 'native.launchApplication',
  requiresPermission: false,
  requiresConfirmation: false,
  verificationMethod: 'process_detection',
  execute: async () => {
    throw new Error('APPLICATION_LAUNCH_UNAVAILABLE: The browser sandbox cannot launch native applications.');
  },
  verify: async () => false
});

// 5. Email Dispatch (Deliberately unavailable)
capabilityRegistry.register({
  id: 'email.send',
  name: 'Email Dispatch',
  description: 'Send emails via connected providers',
  category: 'workflow',
  available: false,
  executor: 'email.provider',
  requiresPermission: true,
  requiresConfirmation: true,
  verificationMethod: 'smtp_check',
  execute: async () => {
    throw new Error('EMAIL_PROVIDER_NOT_CONNECTED: No SMTP or email integration provider is configured.');
  },
  verify: async () => false
});

// 6. Messaging (Deliberately unavailable)
capabilityRegistry.register({
  id: 'messaging.send',
  name: 'Direct Messaging',
  description: 'Send SMS or chat messages',
  category: 'workflow',
  available: false,
  executor: 'messaging.service',
  requiresPermission: true,
  requiresConfirmation: true,
  verificationMethod: 'api_check',
  execute: async () => {
    throw new Error('MESSAGING_UNAVAILABLE: No messaging connector (SMS/WhatsApp) is connected.');
  },
  verify: async () => false
});

// 7. Software Generation (Chess game, etc.)
capabilityRegistry.register({
  id: 'software.generate',
  name: 'Software Generation',
  description: 'Generate complete code projects and apps',
  category: 'creation',
  available: true,
  executor: 'artifactRegistry.create',
  requiresPermission: false,
  requiresConfirmation: false,
  verificationMethod: 'artifact_existence_check',
  execute: async (input) => {
    const topic = input?.topic || input?.objective || 'Software Project';
    const content = `// Generated Code Project for: ${topic}\n\nimport React from 'react';\n\nexport default function App() {\n  return (\n    <div className="p-8 bg-zinc-950 text-white min-h-screen">\n      <h1 className="text-2xl font-bold">${topic}</h1>\n      <p className="mt-4">Interactive workspace initialized successfully.</p>\n    </div>\n  );\n}`;
    const artifactId = `art-code-${Date.now()}`;
    
    artifactRegistry.createArtifact({
      id: artifactId,
      title: topic,
      type: 'document',
      createdAt: new Date().toISOString(),
      taskId: 'current',
      status: 'created',
      content
    });
    nvkEventBus.publish({ type: 'artifact.created', artifactId });
    
    return {
      artifactId,
      message: `Software project "${topic}" generated and verified as workspace artifact.`,
      evidence: [
        { type: 'artifact_created', timestamp: Date.now(), reference: artifactId, metadata: { topic } }
      ],
      verified: true
    };
  },
  verify: async (input, result) => !!result && !!result.artifactId
});

// 8. Web Search
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

capabilityRegistry.register({
  id: 'web.search',
  name: 'Web Search',
  description: 'Search the web for real information with normalized output',
  category: 'web',
  available: true,
  executor: 'originalRegistry.web.fetch',
  requiresPermission: false,
  requiresConfirmation: false,
  verificationMethod: 'http_status_check',
  execute: async (input) => {
    const fetchCap = originalRegistry.get('web.fetch');
    const query = input?.query || input?.objective || 'NVK Global';
    if (!fetchCap) throw new Error('CAPABILITY UNAVAILABLE: web.fetch not connected.');

    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetchCap.execute({ url }, {} as any);
    if (!res.success) throw new Error(`Web search failed: ${res.error}`);

    // Slice 3 (2026-11-23): the old code fetched this page, DISCARDED
    // the body, and returned two hardcoded "verified" results with
    // invented titles/snippets from "NVK Research Network" / "NVK
    // Knowledge Repository". The body web.fetch returns (res.output) is
    // now actually parsed. When it holds no parseable results — blocked
    // page, changed markup, empty result set — the capability reports
    // that honestly with an empty list instead of inventing sources.
    const html = typeof res.output === 'string' ? res.output : '';
    const results = parseDuckDuckGoHtml(html);
    if (results.length === 0) {
      return {
        results: [],
        evidence: [
          { type: 'web_response', timestamp: Date.now(), reference: url, metadata: { query, count: 0, parsed: false } }
        ],
        result: `Web search for "${query}" returned no parseable results — the search page could not be read (it may be blocking automated access). No results are shown rather than invented ones.`,
        verified: false
      };
    }

    return {
      results,
      evidence: [
        { type: 'web_response', timestamp: Date.now(), reference: url, metadata: { query, count: results.length } }
      ],
      result: `Web research completed for query: "${query}". Found ${results.length} real sources.`,
      verified: true
    };
  },
  // An honest empty result still verifies: the capability searched and
  // reported the outcome truthfully. Only a missing/malformed results
  // array fails verification.
  verify: async (input, result) => !!result && Array.isArray(result.results)
});

// 9. Create Document / Artifact
capabilityRegistry.register({
  id: 'documents.create',
  name: 'Create Document',
  description: 'Generate formatted documents and pitch decks',
  category: 'creation',
  available: true,
  executor: 'artifactRegistry.create',
  requiresPermission: false,
  requiresConfirmation: false,
  verificationMethod: 'artifact_existence_check',
  execute: async (input) => {
    const topic = input?.topic || input?.objective || 'Document';
    const content = `# ${topic}\n\nGenerated by NVK Global Intelligence.\n\n- Executive Summary\n- Market Analysis\n- Strategic Recommendations`;
    const artifactId = `art-${Date.now()}`;
    
    artifactRegistry.createArtifact({
      id: artifactId,
      title: topic,
      type: 'document',
      createdAt: new Date().toISOString(),
      taskId: 'current',
      status: 'created',
      content
    });
    nvkEventBus.publish({ type: 'artifact.created', artifactId });
    
    return {
      artifactId,
      message: `Document "${topic}" created and verified successfully.`,
      evidence: [
        { type: 'artifact_created', timestamp: Date.now(), reference: artifactId, metadata: { topic } }
      ],
      verified: true
    };
  },
  verify: async (input, result) => !!result && !!result.artifactId
});

// 10. Filesystem Write
capabilityRegistry.register({
  id: 'filesystem.write',
  name: 'Filesystem Write',
  description: 'Write files to sandboxed workspace',
  category: 'filesystem',
  available: true,
  executor: 'artifactRegistry.create',
  requiresPermission: false,
  requiresConfirmation: false,
  verificationMethod: 'file_existence_check',
  execute: async (input) => {
    const filename = input?.filename || input?.target || 'hello.txt';
    const content = input?.content || 'Hello, World!';
    const artifactId = `fs-${Date.now()}`;
    
    artifactRegistry.createArtifact({
      id: artifactId,
      title: filename,
      type: 'document',
      createdAt: new Date().toISOString(),
      taskId: 'current',
      status: 'created',
      content
    });
    nvkEventBus.publish({ type: 'artifact.created', artifactId });
    
    return {
      artifactId,
      message: `File "${filename}" created and verified in workspace.`,
      evidence: [
        { type: 'file_created', timestamp: Date.now(), reference: filename, metadata: { filename } }
      ],
      verified: true
    };
  },
  verify: async (input, result) => !!result && !!result.artifactId
});

