import { intentEngine } from '../intent/IntentEngine';
import { planner } from '../planning/Planner';
import { executionEngine } from './ExecutionEngine';
import { capabilityRegistry } from '../capabilities/CapabilityRegistry';
import { nvkEventBus } from '../events/NVKEventBus';
import { artifactRegistry, Artifact } from '../artifacts/ArtifactRegistry';
import { sovereignLedger, type SovereignLedgerEntry } from '../../../services/SovereignLedger';
import type { NVKEvidence } from '../../../types';

export interface NVKRequest {
  input: string;
  sessionId: string;
  context?: Record<string, unknown>;
}

export interface NVKResponse {
  taskId: string;
  intent: string;
  status: string;
  message: string;
  artifacts: Artifact[];
  // NVKEvidence (type/timestamp/reference/metadata) — the shape the
  // ExecutionEngine actually returns. Was typed as the in-memory
  // EvidenceStore's Evidence (source/claim), which is not what flows here.
  evidence: NVKEvidence[];
  // Ledger entries written for this run (success and failure alike), so the
  // UI can render a hash the user can match against the real ledger.
  ledgerEntries: SovereignLedgerEntry[];
}

/**
 * A1 (2026-11-22): a plan built WITHOUT executing. The CommandLayer calls
 * this before executing so it can ask the user to confirm any planned
 * capability that requires confirmation. Each step carries the live
 * requiresConfirmation + available flags from the runtime registry.
 */
export interface NVKPlanStep {
  capabilityId: string;
  name: string;
  description: string;
  requiresConfirmation: boolean;
  available: boolean;
  objective: string;
}

export interface NVKPlanPreview {
  intent: string;
  /** Set when the intent needs a missing input before any plan can exist. */
  needsInput?: string;
  steps: NVKPlanStep[];
}

export class NVKRuntime {
  /**
   * Classify the input and build the plan the engine would run, without
   * executing anything. No capability runs, no ledger entry is written.
   */
  preview(input: string): NVKPlanPreview {
    const parsed = intentEngine.classify(input);

    if (parsed.intent === 'open_application' && !parsed.target) {
      return { intent: parsed.intent, needsInput: 'Which application should I open?', steps: [] };
    }
    if (parsed.intent === 'run_task' && !parsed.objective) {
      return { intent: parsed.intent, needsInput: 'What task do you want me to start?', steps: [] };
    }

    const graph = planner.createPlan(`preview-${Date.now()}`, parsed, input);
    // Slice 7: an empty plan means the input has no known tool — ask,
    // never a fabricated plan. The old Planner built a web.search node
    // for any unmatched intent (including greetings); now it builds no
    // nodes, and the preview turns that into a question for the user.
    if (graph.nodes.length === 0) {
      return {
        intent: parsed.intent,
        needsInput: 'I don\'t have a tool for that yet — can you say what you want me to do? (For example: search the web, do a calculation, or open an application.)',
        steps: [],
      };
    }
    const steps: NVKPlanStep[] = graph.nodes.map((node) => {
      const cap = capabilityRegistry.getCapability(node.capability);
      return {
        capabilityId: node.capability,
        name: cap?.name ?? node.capability,
        description: cap?.description ?? '',
        requiresConfirmation: cap?.requiresConfirmation ?? false,
        available: cap?.available ?? false,
        objective: node.objective
      };
    });
    return { intent: parsed.intent, steps };
  }

  /**
   * A1 follow-up (2026-11-22): record a user's DENIAL of a confirmation
   * in the ledger — one hitl_rejected entry per step that required
   * confirmation. Nothing executes here: no capability runs, no plan is
   * executed, no other ledger entry is written. The denial itself is a
   * real audit event (the user was asked and said no), so it belongs in
   * the ledger with the same hashing as any other entry.
   */
  async recordDenial(steps: NVKPlanStep[], input: string): Promise<SovereignLedgerEntry[]> {
    const entries: SovereignLedgerEntry[] = [];
    for (const step of steps) {
      if (!step.requiresConfirmation) continue;
      const entry = await sovereignLedger.append({
        capabilityId: step.capabilityId,
        authorization: 'hitl_rejected',
        riskLevel: 'safe',
        result: {
          success: false,
          capabilityId: step.capabilityId,
          error: `User denied confirmation for "${step.name}" — nothing executed.`,
          evidence: []
        },
        input
      });
      entries.push(entry);
    }
    return entries;
  }

  async execute(req: NVKRequest): Promise<NVKResponse> {
    const taskId = `task-${Date.now()}`;
    
    nvkEventBus.publish({ type: 'ui.state_changed', state: 'THINKING' });
    
    // 1. Detect Intent & Check Parameters
    const parsed = intentEngine.classify(req.input);
    
    // Check missing input / clarification cases
    if (parsed.intent === 'open_application' && !parsed.target) {
      nvkEventBus.publish({ type: 'ui.state_changed', state: 'IDLE' });
      return {
        taskId,
        intent: parsed.intent,
        status: 'needs_input',
        message: 'Which application should I open?',
        artifacts: [],
        evidence: [],
        ledgerEntries: []
      };
    }

    if (parsed.intent === 'run_task' && !parsed.objective) {
      nvkEventBus.publish({ type: 'ui.state_changed', state: 'IDLE' });
      return {
        taskId,
        intent: parsed.intent,
        status: 'needs_input',
        message: 'What task do you want me to start?',
        artifacts: [],
        evidence: [],
        ledgerEntries: []
      };
    }
    
    nvkEventBus.publish({ type: 'ui.state_changed', state: 'PLANNING' });
    // 2. Create Plan
    const graph = planner.createPlan(taskId, parsed, req.input);

    // Slice 7: an empty plan means the input has no known tool — ask,
    // never execute a fabricated plan and claim success. The old Planner
    // built a web.search node for any unmatched intent; now it builds no
    // nodes, and execute returns needs_input here.
    if (graph.nodes.length === 0) {
      nvkEventBus.publish({ type: 'ui.state_changed', state: 'IDLE' });
      return {
        taskId,
        intent: parsed.intent,
        status: 'needs_input',
        message: 'I don\'t have a tool for that yet — can you say what you want me to do? (For example: search the web, do a calculation, or open an application.)',
        artifacts: [],
        evidence: [],
        ledgerEntries: []
      };
    }
    
    // 3. Execute with Verification Engine. The confirmedByUser flag is
    // threaded from the caller's context (A1): it is true ONLY when the
    // user explicitly granted confirmation for this run. Absent or false,
    // the engine blocks any capability that requires confirmation.
    const confirmedByUser = req.context?.confirmedByUser === true;
    const confirmedAt = typeof req.context?.confirmedAt === 'number' ? req.context.confirmedAt : undefined;
    const execResult = await executionEngine.executePlan(graph, { confirmedByUser, confirmedAt });
    
    if (execResult.error) {
       nvkEventBus.publish({ type: 'ui.state_changed', state: 'FAILED' });
       return {
         taskId,
         intent: parsed.intent,
         status: 'failed',
         message: String(execResult.error.message || execResult.error),
         artifacts: [],
         // Failure evidence (including the gate-block record and its ledger
         // hash) flows through so the UI can render it, not just the text.
         evidence: execResult.evidence || [],
         ledgerEntries: execResult.ledgerEntries || []
       };
    }
    
    nvkEventBus.publish({ type: 'ui.state_changed', state: 'COMPLETED' });
    nvkEventBus.publish({ type: 'task.completed', taskId, result: execResult.result });
    
    let message = 'Action executed and verified successfully.';
    if (parsed.intent === 'capability_discovery' && execResult.result?.message) {
      message = execResult.result.message;
    } else if (execResult.result?.message) {
      message = execResult.result.message;
    } else if (execResult.result?.result) {
      message = String(execResult.result.result);
    }

    return {
      taskId,
      intent: parsed.intent,
      status: 'complete',
      message: message,
      artifacts: artifactRegistry.getAllArtifacts().filter(a => a.taskId === 'current' || a.taskId === taskId),
      evidence: execResult.evidence || [],
      ledgerEntries: execResult.ledgerEntries || []
    };
  }
}

export const nvkRuntime = new NVKRuntime();
