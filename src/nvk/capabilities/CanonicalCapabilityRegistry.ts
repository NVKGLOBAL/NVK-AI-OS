/**
 * Canonical capability registry — the ONE source of truth (matrix program, 2026-11-27).
 *
 * The two registries held three different truths:
 *   - services/CapabilityRegistry.ts: 5 caps (filesystem.read/write,
 *     terminal.execute, web.fetch, system.diagnostics), audited execution
 *     through the SovereignLedger;
 *   - src/nvk/capabilities/CapabilityRegistry.ts: 10 caps, the runtime
 *     engine's view (calculation.math, web.search, documents.create, ...);
 *   - NVK_CAPABILITY_MATRIX.json: a static claim of 8 rows, one of which
 *     (reasoning.analysis) existed nowhere else.
 * This module owns ALL registrations. Both historic modules are thin
 * adapters over the same singleton (see toServicesCapability /
 * toRuntimeCapability), so every existing import site keeps working with
 * no App.tsx change, and a capability registered through either adapter
 * is visible through both.
 *
 * Two shapes, one entry: the services shape has available() as an async
 * function and execute() returning NVKCapabilityResult; the runtime shape
 * has available as a plain boolean and execute() returning its own
 * result object ({result, verified, evidence, ...}). A canonical entry
 * stores available as a boolean plus an optional async availableCheck,
 * and execute() returning the capability's own result. The adapters
 * project each entry into the shape their callers expect; executeWithAudit
 * normalises any result into NVKCapabilityResult (success = raw.success
 * ?? raw.verified) so the TaskEngine's success branch works for runtime
 * capabilities too.
 *
 * Collision resolved: filesystem.write existed in both registries. The
 * canonical entry is the SERVICES implementation (real POST to
 * /api/fs/write, requiresConfirmation: true) — the runtime one only
 * wrote an in-memory artifact and claimed "created and verified in
 * workspace", the same fixed-template pattern the design doc flags.
 * The runtime in-memory version is NOT re-registered.
 *
 * Preserved verbatim from Worker B (items 4–5, 2026-11-27): the rewired
 * web.search execute (lib/webSearch.ts — direct CORS APIs from the
 * browser, proxy fallback only with the dev server) and the rewired
 * documents.create execute (services/DocumentStore.ts — Dexie
 * persistence, real input only, fixed template deleted, verify reads
 * back from the store). Do not revert these to the old implementations.
 *
 * Added by this module: reasoning.analysis (lib/reasoning — real
 * Tree-of-Thought engine, injectable LLM caller, honest refusal with
 * no model connected) and evidence on calculation.math (it previously
 * returned no evidence at all).
 */
import { nvkEventBus } from '../events/NVKEventBus';
import { artifactRegistry } from '../artifacts/ArtifactRegistry';
import { sovereignLedger } from '../../../services/SovereignLedger';
import { eventBus } from '../../../services/EventBus';
import { evaluateMathExpression } from '../../../lib/mathEvaluator';
import { searchWeb } from '../../../lib/webSearch';
import { documentStore } from '../../../services/DocumentStore';
import { runReasoningAnalysis, isReasoningLLMConnected } from '../../../lib/reasoning/reasoningService';
import type {
  NVKCapability as ServicesCapability,
  NVKCapabilityResult,
  NVKExecutionContext,
  NVKEvidence,
  NVKRiskLevel
} from '../../../types';
import type { NVKCapability as RuntimeCapability } from '../types';

export type CanonicalCategory =
  | 'intelligence'
  | 'filesystem'
  | 'terminal'
  | 'web'
  | 'application'
  | 'creation'
  | 'workflow';

/**
 * A capability registration, in either historic shape or the canonical
 * one. `available` as a boolean is the runtime shape; as an async
 * function it is the services shape (kept as availableCheck). An
 * explicit availableCheck refines a static `available: true` — used by
 * reasoning.analysis, which is wired but needs a connected model to run.
 */
export interface CapabilityRegistrationInput {
  id: string;
  name: string;
  description: string;
  category: CanonicalCategory;
  available: boolean | (() => Promise<boolean>);
  availableCheck?: () => Promise<boolean>;
  requiresConfirmation?: boolean;
  requiresPermission?: boolean;
  executor?: string;
  verificationMethod?: string;
  riskLevel?: NVKRiskLevel;
  inputSchema?: unknown;
  outputSchema?: unknown;
  execute: (input: any, context?: any) => Promise<any>;
  verify?: (input: any, result: any) => Promise<boolean>;
  emitEvidence?: (result: any, context?: any) => NVKEvidence | NVKEvidence[];
  /** Why the capability is unavailable (shown in discovery + matrix). */
  reason?: string;
  unavailableReason?: string;
}

/** The stored, normalised form of a capability. */
export interface CanonicalCapability {
  id: string;
  name: string;
  description: string;
  category: CanonicalCategory;
  /** Static wired truth (what the matrix JSON mirrors). */
  available: boolean;
  /** Optional dynamic refinement of `available` (e.g. a model connected). */
  availableCheck?: () => Promise<boolean>;
  requiresConfirmation: boolean;
  requiresPermission: boolean;
  executor: string;
  verificationMethod?: string;
  riskLevel: NVKRiskLevel;
  inputSchema?: unknown;
  outputSchema?: unknown;
  execute: (input: any, context?: any) => Promise<any>;
  verify?: (input: any, result: any) => Promise<boolean>;
  emitEvidence?: (result: any, context?: any) => NVKEvidence | NVKEvidence[];
  unavailableReason?: string;
}

function normalize(def: CapabilityRegistrationInput): CanonicalCapability {
  const availableIsFn = typeof def.available === 'function';
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    category: def.category,
    // Inline typeof: narrowing through the boolean above does not apply
    // to the property access, and tsc rejects the union here.
    available: typeof def.available === 'function' ? true : def.available,
    availableCheck: def.availableCheck ?? (availableIsFn ? (def.available as () => Promise<boolean>) : undefined),
    requiresConfirmation: def.requiresConfirmation ?? false,
    requiresPermission: def.requiresPermission ?? false,
    executor: def.executor ?? '',
    verificationMethod: def.verificationMethod,
    riskLevel: def.riskLevel ?? 'safe',
    inputSchema: def.inputSchema,
    outputSchema: def.outputSchema,
    execute: def.execute,
    verify: def.verify,
    emitEvidence: def.emitEvidence,
    unavailableReason: def.unavailableReason ?? def.reason
  };
}

/**
 * Normalise any capability result into NVKCapabilityResult, the shape
 * the TaskEngine and the ledger require. Services capabilities already
 * return it and pass through untouched. Runtime capabilities return
 * {result, message, verified, evidence, ...}: success is their
 * `verified` flag, the whole object becomes `output`, and their
 * evidence array is carried over. A result with neither success nor
 * verified is a failure with a synthesised reason — never a silent pass.
 */
export function toServicesResult(raw: any, cap: CanonicalCapability): NVKCapabilityResult {
  if (
    raw !== null &&
    typeof raw === 'object' &&
    typeof raw.success === 'boolean' &&
    typeof raw.capabilityId === 'string'
  ) {
    return raw as NVKCapabilityResult;
  }
  const success = raw?.success === true || (raw?.success === undefined && raw?.verified === true);
  return {
    success,
    capabilityId: cap.id,
    output: raw,
    error:
      typeof raw?.error === 'string'
        ? raw.error
        : !success
          ? typeof raw?.result === 'string'
            ? raw.result
            : `Capability "${cap.name}" did not complete successfully.`
          : undefined,
    evidence: Array.isArray(raw?.evidence) ? raw.evidence : []
  };
}

export class UnifiedCapabilityRegistry {
  private capabilities = new Map<string, CanonicalCapability>();
  /** Ids registered by this module itself — the shipped truth. Later
   * runtime registrations (e.g. test-only caps) are visible but not shipped. */
  private shippedIds = new Set<string>();

  register(def: CapabilityRegistrationInput, shipped = false): void {
    const entry = normalize(def);
    this.capabilities.set(entry.id, entry);
    if (shipped) this.shippedIds.add(entry.id);
  }

  get(id: string): CanonicalCapability | undefined {
    return this.capabilities.get(id);
  }

  getCapability(id: string): CanonicalCapability | undefined {
    return this.capabilities.get(id);
  }

  getAll(): CanonicalCapability[] {
    return Array.from(this.capabilities.values());
  }

  /** Entries registered by this module — the shipped truth the matrix JSON mirrors. */
  getShipped(): CanonicalCapability[] {
    return this.getAll().filter((c) => this.shippedIds.has(c.id));
  }

  /** Live availability: static truth refined by the dynamic check, if any. */
  async isAvailable(id: string): Promise<boolean> {
    const cap = this.capabilities.get(id);
    if (!cap) return false;
    if (!cap.available) return false;
    if (cap.availableCheck) return await cap.availableCheck();
    return true;
  }

  async getAvailable(): Promise<CanonicalCapability[]> {
    const available: CanonicalCapability[] = [];
    for (const cap of this.capabilities.values()) {
      if (await this.isAvailable(cap.id)) available.push(cap);
    }
    return available;
  }

  /**
   * Audited Execution Pipeline (moved verbatim from services/
   * CapabilityRegistry.ts, 2026-11-22):
   * Capability Request -> Authorization/HITL Guard -> Execution ->
   * Result -> Cryptographic Evidence -> Sovereign Ledger.
   * The one change: results are normalised via toServicesResult so
   * runtime capabilities (verified-flag results) flow through the same
   * audit path as services capabilities.
   */
  async executeWithAudit(
    capabilityId: string,
    input: unknown,
    context: NVKExecutionContext = {}
  ): Promise<NVKCapabilityResult> {
    const cap = this.capabilities.get(capabilityId);
    if (!cap) {
      // A1 (2026-11-22): nothing executed here, so no ledger entry is
      // written — a ledger append would stamp an authorization claim
      // ('auto_approved') for an execution that never happened.
      return {
        success: false,
        capabilityId,
        error: `Capability "${capabilityId}" not found in sovereign registry.`
      };
    }

    // Availability Check (static truth + dynamic check, e.g. a model connected)
    const isAvailable = await this.isAvailable(capabilityId);
    if (!isAvailable) {
      // A1 (2026-11-22): same as above — the capability did not run, so
      // no ledger entry and no authorization claim.
      return {
        success: false,
        capabilityId,
        error: `Capability "${cap.name}" is currently unavailable or offline.`
      };
    }

    // Human-in-the-Loop (HITL) Authorization Guard
    if (cap.requiresConfirmation && !context.confirmedByUser) {
      const blockedRes: NVKCapabilityResult = {
        success: false,
        capabilityId,
        error: `Action blocked: "${cap.name}" requires explicit Human-in-the-Loop (HITL) authorization.`
      };
      await sovereignLedger.append({
        capabilityId,
        authorization: 'hitl_rejected',
        riskLevel: cap.riskLevel,
        result: blockedRes,
        input
      });
      eventBus.publish({
        type: 'ACTION_FAILED',
        actionId: `act-${Date.now()}`,
        error: `User confirmation required for ${cap.name}`
      });
      return blockedRes;
    }

    // Authorized execution
    const authState = cap.requiresConfirmation ? 'hitl_confirmed' : 'auto_approved';
    eventBus.publish({
      type: 'ACTION_STARTED',
      actionId: `act-${Date.now()}`,
      description: `Executing ${cap.name}`
    });

    try {
      const raw = await cap.execute(input, context);
      const result = toServicesResult(raw, cap);

      // Generate supplementary evidence if defined on the contract
      if (cap.emitEvidence) {
        const extraEv = cap.emitEvidence(result, context);
        const extraList = Array.isArray(extraEv) ? extraEv : [extraEv];
        result.evidence = [...(result.evidence || []), ...extraList];
      }

      // Record in sovereign immutable ledger
      await sovereignLedger.append({
        capabilityId,
        authorization: authState,
        riskLevel: cap.riskLevel,
        result,
        input
      });

      if (result.success) {
        eventBus.publish({
          type: 'ACTION_COMPLETED',
          actionId: `act-${Date.now()}`
        });
      } else {
        eventBus.publish({
          type: 'ACTION_FAILED',
          actionId: `act-${Date.now()}`,
          error: result.error || 'Execution failed'
        });
      }

      return result;
    } catch (err: any) {
      const errRes: NVKCapabilityResult = {
        success: false,
        capabilityId,
        error: err.message || 'Unknown runtime capability failure.'
      };
      await sovereignLedger.append({
        capabilityId,
        authorization: authState,
        riskLevel: cap.riskLevel,
        result: errRes,
        input
      });
      eventBus.publish({
        type: 'ACTION_FAILED',
        actionId: `act-${Date.now()}`,
        error: errRes.error
      });
      return errRes;
    }
  }
}

export const unifiedCapabilityRegistry = new UnifiedCapabilityRegistry();

/**
 * Project a canonical entry into the services shape
 * (types.ts NVKCapability): available() as an async function, execute()
 * returning NVKCapabilityResult.
 */
export function toServicesCapability(cap: CanonicalCapability): ServicesCapability {
  return {
    id: cap.id,
    name: cap.name,
    description: cap.description,
    category: cap.category,
    riskLevel: cap.riskLevel,
    inputSchema: cap.inputSchema as ServicesCapability['inputSchema'],
    outputSchema: cap.outputSchema as ServicesCapability['outputSchema'],
    available: async () => unifiedCapabilityRegistry.isAvailable(cap.id),
    requiresConfirmation: cap.requiresConfirmation,
    execute: async (input: unknown, context: NVKExecutionContext) =>
      toServicesResult(await cap.execute(input, context), cap),
    emitEvidence: cap.emitEvidence
      ? (result: NVKCapabilityResult, context: NVKExecutionContext) => cap.emitEvidence!(result, context)
      : undefined
  };
}

/** Runtime shape (src/nvk/types.ts NVKCapability) plus the reason + schemas the adapters carry. */
export type RuntimeCapabilityView = RuntimeCapability & {
  inputSchema?: unknown;
  outputSchema?: unknown;
  reason?: string;
};

/**
 * Project a canonical entry into the runtime shape: available as a
 * plain boolean, execute() returning the capability's own result
 * object, verify() passed through.
 */
export function toRuntimeCapability(cap: CanonicalCapability): RuntimeCapabilityView {
  return {
    id: cap.id,
    name: cap.name,
    description: cap.description,
    category: cap.category,
    available: cap.available,
    executor: cap.executor,
    requiresPermission: cap.requiresPermission,
    requiresConfirmation: cap.requiresConfirmation,
    verificationMethod: cap.verificationMethod,
    inputSchema: cap.inputSchema,
    outputSchema: cap.outputSchema,
    execute: (input: any) => cap.execute(input),
    verify: cap.verify,
    reason: cap.unavailableReason
  };
}

// ============================================================
// Registrations — the shipped truth (15 capabilities).
// Every register() here passes shipped=true, so getShipped() and the
// matrix test see exactly this set.
// ============================================================

// ------------------------------------------------------------
// A. Server-backed capabilities (from services/CapabilityRegistry.ts)
// ------------------------------------------------------------

// A1. Filesystem: Read File
unifiedCapabilityRegistry.register(
  {
    id: 'filesystem.read',
    name: 'Read Local File',
    description: 'Read the text contents of a file from the sovereign workspace.',
    category: 'filesystem',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Relative path of file to read', required: true }
      },
      required: ['filename']
    },
    outputSchema: {
      type: 'string',
      properties: {
        content: { type: 'string', description: 'Raw text content of the file' }
      }
    },
    available: async () => true,
    requiresConfirmation: false,
    execute: async (input: any, context: NVKExecutionContext): Promise<NVKCapabilityResult> => {
      try {
        const filename = typeof input === 'string' ? input : input.filename;
        const res = await fetch(`/api/fs/download/${filename}`);
        if (!res.ok) throw new Error(`Failed to read file: ${filename}`);
        const content = await res.text();
        return {
          success: true,
          capabilityId: 'filesystem.read',
          output: content,
          evidence: [
            {
              type: 'file_modified',
              timestamp: Date.now(),
              reference: filename,
              metadata: { sizeBytes: content.length }
            }
          ]
        };
      } catch (e: any) {
        return { success: false, capabilityId: 'filesystem.read', error: e.message };
      }
    },
    emitEvidence: (result, ctx) => ({
      type: 'file_modified',
      timestamp: Date.now(),
      reference: result.capabilityId
    })
  },
  true
);

// A2. Filesystem: Write File — the SERVICES implementation is the
// canonical one (real POST to /api/fs/write, requires confirmation).
// The old runtime entry of the same id only wrote an in-memory artifact
// and claimed "created and verified in workspace"; it is not registered.
unifiedCapabilityRegistry.register(
  {
    id: 'filesystem.write',
    name: 'Write Local File',
    description: 'Write content to a file in the sovereign workspace.',
    category: 'filesystem',
    riskLevel: 'moderate',
    inputSchema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Target file path', required: true },
        content: { type: 'string', description: 'Content to write', required: true }
      },
      required: ['filename', 'content']
    },
    outputSchema: {
      type: 'object',
      properties: {
        written: { type: 'boolean', description: 'Whether the write succeeded' }
      }
    },
    available: async () => true,
    requiresConfirmation: true,
    execute: async (input: any, context: NVKExecutionContext): Promise<NVKCapabilityResult> => {
      try {
        const res = await fetch('/api/fs/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input)
        });
        if (!res.ok) throw new Error('Failed to write file');
        return {
          success: true,
          capabilityId: 'filesystem.write',
          output: { filename: input.filename, size: (input.content || '').length },
          evidence: [
            {
              type: 'file_created',
              timestamp: Date.now(),
              reference: input.filename,
              metadata: { sizeBytes: (input.content || '').length }
            }
          ]
        };
      } catch (e: any) {
        return { success: false, capabilityId: 'filesystem.write', error: e.message };
      }
    }
  },
  true
);

// A3. Terminal: Execute Safe Shell Command
unifiedCapabilityRegistry.register(
  {
    id: 'terminal.execute',
    name: 'Execute Shell Command',
    description: 'Run an audited command in the containerized host environment.',
    category: 'terminal',
    riskLevel: 'high',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command string to execute', required: true }
      },
      required: ['command']
    },
    outputSchema: {
      type: 'object',
      properties: {
        output: { type: 'string', description: 'Standard output/error stream' }
      }
    },
    available: async () => true,
    requiresConfirmation: true,
    execute: async (input: any, context: NVKExecutionContext): Promise<NVKCapabilityResult> => {
      try {
        const cmd = typeof input === 'string' ? input : input.command;
        const res = await fetch('/api/terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd })
        });
        const data = await res.json();
        return {
          success: !data.isError,
          capabilityId: 'terminal.execute',
          output: data.output,
          evidence: [
            {
              type: 'command_executed',
              timestamp: Date.now(),
              reference: cmd,
              metadata: { exitCode: data.isError ? 1 : 0 }
            }
          ]
        };
      } catch (e: any) {
        return { success: false, capabilityId: 'terminal.execute', error: e.message };
      }
    }
  },
  true
);

// A4. Web: Connected Web Access
unifiedCapabilityRegistry.register(
  {
    id: 'web.fetch',
    name: 'Connected Web Access',
    description: 'Fetch real-time web content and research data via sovereign proxy.',
    category: 'web',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Target URL to fetch', required: true }
      },
      required: ['url']
    },
    outputSchema: {
      type: 'string',
      properties: {
        content: { type: 'string', description: 'Fetched document body' }
      }
    },
    available: async () => true,
    requiresConfirmation: false,
    execute: async (input: any, context: NVKExecutionContext): Promise<NVKCapabilityResult> => {
      try {
        const url = typeof input === 'string' ? input : input.url;
        const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error(`Proxy error fetching ${url}`);
        const content = await res.text();
        return {
          success: true,
          capabilityId: 'web.fetch',
          output: content,
          evidence: [
            {
              type: 'web_response',
              timestamp: Date.now(),
              reference: url,
              metadata: { responseLength: content.length }
            }
          ]
        };
      } catch (e: any) {
        return { success: false, capabilityId: 'web.fetch', error: e.message };
      }
    }
  },
  true
);

// A5. System: Sovereign Diagnostics
unifiedCapabilityRegistry.register(
  {
    id: 'system.diagnostics',
    name: 'System Diagnostics',
    description: 'Audit hardware acceleration, WebGPU availability, and runtime telemetry.',
    category: 'workflow',
    riskLevel: 'safe',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    outputSchema: {
      type: 'object',
      properties: {
        webgpuAvailable: { type: 'boolean' },
        hardwareConcurrency: { type: 'number' },
        memoryHeapLimit: { type: 'number' }
      }
    },
    available: async () => true,
    requiresConfirmation: false,
    execute: async (): Promise<NVKCapabilityResult> => {
      const hasWebGPU = typeof navigator !== 'undefined' && !!(navigator as any).gpu;
      const concurrency = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
      const memory =
        typeof performance !== 'undefined' && (performance as any).memory
          ? {
              usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
              totalJSHeapSize: (performance as any).memory.totalJSHeapSize
            }
          : null;

      const data = {
        webgpuAvailable: hasWebGPU,
        hardwareConcurrency: concurrency,
        memory,
        runtime: 'NVK-OS-R8 Sovereign Edition'
      };

      return {
        success: true,
        capabilityId: 'system.diagnostics',
        output: data,
        evidence: [
          {
            type: 'artifact_created',
            timestamp: Date.now(),
            reference: 'system-telemetry-snapshot',
            metadata: data
          }
        ]
      };
    }
  },
  true
);

// ------------------------------------------------------------
// B. Runtime capabilities (from src/nvk/capabilities/CapabilityRegistry.ts)
// ------------------------------------------------------------

// B1. Capability Discovery
unifiedCapabilityRegistry.register(
  {
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
      const all = unifiedCapabilityRegistry.getAll();
      const availableNow: string[] = [];
      const unavailable: string[] = [];
      for (const c of all) {
        // Live availability, not just the static flag: a wired
        // capability whose dependency is missing (e.g. reasoning with
        // no model connected) lists as unavailable, with its reason.
        const live = await unifiedCapabilityRegistry.isAvailable(c.id);
        if (live) availableNow.push(`• ${c.name} (${c.id})`);
        else unavailable.push(`• ${c.name} (${c.id}) - Unavailable: ${c.unavailableReason || 'Not connected'}`);
      }

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
  },
  true
);

// B2. Calculation Capability (Deterministic)
// Evidence ADDED 2026-11-27 (matrix item 2): this capability previously
// returned no evidence at all, so a milestone run had nothing to cite.
// The evidence cites the real expression and value — the ledger entry
// is the record, this is the receipt inside the result.
unifiedCapabilityRegistry.register(
  {
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
        verified: true,
        evidence: [
          {
            type: 'artifact_created',
            timestamp: Date.now(),
            reference: `calculation:${evaluated.expression}`,
            metadata: { expression: evaluated.expression, value: evaluated.value }
          }
        ]
      };
    },
    verify: async (input, result) => !!result && typeof result.result === 'string' && result.result.startsWith('Result: ')
  },
  true
);

// B3. Deep Reasoning — NEW (matrix item 1, 2026-11-27).
// The matrix claimed this true while it existed ONLY in the JSON: zero
// registrations, routes, or tests. The engine itself is real —
// lib/reasoning/ReasoningCore.ts (TreeOfThoughtReasoner +
// SelfReflectiveAgent), already driven by the AdvancedReasoningPanel
// with the real local-model caller. This registers it with a real
// execute path (lib/reasoning/reasoningService.ts) and evidence.
// Static available: true (wired, like web.search/documents.create).
// Live availability is gated by availableCheck: no language model
// connected → isAvailable false, executeWithAudit refuses, and a direct
// execute throws REASONING_LLM_NOT_CONNECTED — never canned text.
// Production wiring still open: the panel must hand its generateText to
// setReasoningLLMCaller (2 lines, coordinator follow-up).
unifiedCapabilityRegistry.register(
  {
    id: 'reasoning.analysis',
    name: 'Deep Reasoning',
    description:
      'Tree-of-Thought analysis and self-reflective synthesis over a connected language model (local-first intelligence).',
    category: 'intelligence',
    available: true,
    availableCheck: async () => isReasoningLLMConnected(),
    executor: 'local.reasoning',
    requiresPermission: false,
    requiresConfirmation: false,
    verificationMethod: 'reasoning_check',
    riskLevel: 'safe',
    inputSchema: {
      type: 'object',
      properties: {
        problem: { type: 'string', description: 'The problem to reason about', required: true },
        mode: { type: 'string', description: "'tree' (default) or 'reflection'" }
      },
      required: ['problem']
    },
    execute: async (input) => runReasoningAnalysis(input ?? {}),
    verify: async (_input, result) =>
      !!result &&
      typeof result.finalAnswer === 'string' &&
      result.finalAnswer.length > 0 &&
      typeof result.confidence === 'number' &&
      result.confidence >= 0 &&
      result.confidence <= 1,
    reason: 'No language model connected — load a local model to enable reasoning'
  },
  true
);

// B4. Local Image Generation (NOT AVAILABLE — corrected 2026-11-22)
// The old entry claimed available: true and generated a canned SVG with a
// fake model name ("nvk-diffusion-v1") and a "VERIFIED" label. No image
// model is connected. This now matches NVK_CAPABILITY_MATRIX.json
// (available: false — "Not connected") and throws like email.send.
unifiedCapabilityRegistry.register(
  {
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
    verify: async () => false,
    reason: 'Not connected'
  },
  true
);

// B5. Application Launch (NOT AVAILABLE — corrected 2026-11-22)
// The old entry claimed available: true and fabricated a random PID plus a
// "successfully launched and verified by NVK process manager" message. The
// browser sandbox cannot launch native applications. This now matches
// NVK_CAPABILITY_MATRIX.json (available: false — "Browser sandbox
// restriction") and throws like email.send.
unifiedCapabilityRegistry.register(
  {
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
    verify: async () => false,
    reason: 'Browser sandbox restriction'
  },
  true
);

// B6. Email Dispatch (Deliberately unavailable)
unifiedCapabilityRegistry.register(
  {
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
    verify: async () => false,
    reason: 'Not connected'
  },
  true
);

// B7. Messaging (Deliberately unavailable)
unifiedCapabilityRegistry.register(
  {
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
    verify: async () => false,
    reason: 'Not connected'
  },
  true
);

// B8. Software Generation (Chess game, etc.)
unifiedCapabilityRegistry.register(
  {
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
        evidence: [{ type: 'artifact_created', timestamp: Date.now(), reference: artifactId, metadata: { topic } }],
        verified: true
      };
    },
    verify: async (input, result) => !!result && !!result.artifactId
  },
  true
);

// B9. Web Search — client-side, works on the SHIPPED static deploy
// (matrix item 4, 2026-11-27 — Worker B rewiring, PRESERVED verbatim).
// The old implementation delegated to web.fetch, which calls the
// same-origin /api/proxy — there is no server on GitHub Pages, so every
// search failed live. This calls lib/webSearch.searchWeb, which queries
// CORS-enabled public search APIs (DuckDuckGo Instant Answer, Wikipedia)
// directly from the browser with no key and no server, and only falls
// back to the /api/proxy HTML scrape when the local dev server is
// running. On failure (no network, no results) it reports the reason
// honestly — never canned results.
unifiedCapabilityRegistry.register(
  {
    id: 'web.search',
    name: 'Web Search',
    description:
      'Search the web for real information with normalized output — direct from the browser via CORS-enabled public search APIs, no server or key required',
    category: 'web',
    available: true,
    executor: 'local.webSearch',
    requiresPermission: false,
    requiresConfirmation: false,
    verificationMethod: 'http_status_check',
    execute: async (input) => {
      const query = input?.query || input?.objective || 'NVK Global';
      const outcome = await searchWeb(query);
      const reference = `web.search:${query} [${outcome.sourcesUsed.join(', ') || 'no source returned results'}]`;
      if (outcome.results.length === 0) {
        return {
          results: [],
          evidence: [
            {
              type: 'web_response',
              timestamp: Date.now(),
              reference,
              metadata: { query, count: 0, proxyUsed: outcome.proxyUsed }
            }
          ],
          result: outcome.reason,
          verified: false
        };
      }

      return {
        results: outcome.results,
        evidence: [
          {
            type: 'web_response',
            timestamp: Date.now(),
            reference,
            metadata: { query, count: outcome.results.length, proxyUsed: outcome.proxyUsed }
          }
        ],
        result: `Web research completed for query: "${query}". Found ${outcome.results.length} real sources via ${outcome.sourcesUsed.join(', ')}.`,
        verified: true
      };
    },
    // An honest empty result still verifies: the capability searched and
    // reported the outcome truthfully. Only a missing/malformed results
    // array fails verification.
    verify: async (input, result) => !!result && Array.isArray(result.results)
  },
  true
);

// B10. Create Document / Artifact — persisted, from REAL input
// (matrix item 5, 2026-11-27 — Worker B rewiring, PRESERVED verbatim).
// The old implementation built every document from a fixed template
// ("Generated by NVK Global Intelligence. - Executive Summary - Market
// Analysis - Strategic Recommendations") and kept it only in the
// in-memory artifact Map — nothing survived a reload, nothing could be
// downloaded. A document is now created ONLY from the caller's real
// input (title + content and/or real slides); missing content is an
// honest error, never a template. The created document is persisted in
// IndexedDB via DocumentStore (Dexie, the established storage pattern
// — see db.ts) with an in-memory fallback when IndexedDB is unavailable,
// and the result carries the download payload (filename, MIME type) so
// the panel can offer a real Blob download.
unifiedCapabilityRegistry.register(
  {
    id: 'documents.create',
    name: 'Create Document',
    description:
      'Create a document or pitch deck from real input and persist it locally (IndexedDB) with a downloadable file',
    category: 'creation',
    available: true,
    executor: 'documentStore.create',
    requiresPermission: false,
    requiresConfirmation: false,
    verificationMethod: 'artifact_existence_check',
    execute: async (input) => {
      const title = ((input?.title || input?.topic || input?.objective || '') as string).trim();
      const content = (input?.content ?? input?.body ?? input?.text ?? '') as string;
      const slides = Array.isArray(input?.slides) ? input.slides : undefined;
      const type = input?.type === 'pitch_deck' ? 'pitch_deck' : 'document';
      if (title.length === 0) {
        throw new Error('DOCUMENT_TITLE_REQUIRED: a document needs a title — none was provided.');
      }
      if (content.trim().length === 0 && (!slides || slides.length === 0)) {
        throw new Error(
          'DOCUMENT_CONTENT_REQUIRED: a document needs real content (content/body/text) or real slides — none was provided, and no template is substituted.'
        );
      }

      const doc = await documentStore.createDocument({ title, type, content, slides });

      artifactRegistry.createArtifact({
        id: doc.id,
        title: doc.title,
        type: 'document',
        createdAt: new Date(doc.createdAt).toISOString(),
        taskId: 'current',
        status: 'created',
        content: doc.content
      });
      nvkEventBus.publish({ type: 'artifact.created', artifactId: doc.id });

      return {
        artifactId: doc.id,
        documentId: doc.id,
        download: {
          filename: `${doc.title.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'document'}.md`,
          mimeType: 'text/markdown'
        },
        message: `Document "${doc.title}" created and saved locally — it persists across reloads and can be downloaded.`,
        evidence: [
          {
            type: 'artifact_created',
            timestamp: Date.now(),
            reference: doc.id,
            metadata: { title: doc.title, type: doc.type, persisted: true }
          }
        ],
        verified: true
      };
    },
    verify: async (input, result) => {
      if (!result || !result.artifactId) return false;
      // Verify against the persistent store, not just the in-memory map:
      // a document that did not persist is not a verified creation.
      const stored = await documentStore.getDocument(result.artifactId);
      return stored !== undefined;
    }
  },
  true
);
