import { TaskGraph } from '../planning/TaskGraph';
import { capabilityRegistry } from '../capabilities/CapabilityRegistry';
import { nvkEventBus } from '../events/NVKEventBus';
import { evidenceStore } from '../evidence/EvidenceStore';
import { sovereignLedger, SovereignLedgerEntry } from '../../../services/SovereignLedger';
import type { NVKEvidence } from '../../../types';

export interface ExecutionOptions {
  /**
   * True only when the user explicitly granted confirmation for this run
   * (e.g. by tapping Grant in the CommandLayer confirm dialog). Defaults
   * to false: an unconfirmed run must never execute a capability that
   * requires confirmation. A1 (2026-11-22).
   */
  confirmedByUser?: boolean;
  /** Wall-clock ms of the user's grant, when one happened. Recorded in evidence metadata. */
  confirmedAt?: number;
}

export class ExecutionEngine {
  async executePlan(graph: TaskGraph, options: ExecutionOptions = {}) {
    const confirmedByUser = options.confirmedByUser === true;
    let finalResult = null;
    const allEvidence: NVKEvidence[] = [];
    const ledgerEntries: SovereignLedgerEntry[] = [];

    // Failure evidence: a record of a blocked/failed attempt. It carries
    // the ledger hash when a ledger entry was written for the attempt.
    // (NVKEvidenceType has no failure variant and types.ts is out of scope
    // for this fix, so the failure is marked in metadata, not the type.)
    const failureEvidence = (capabilityId: string, error: string, entry?: SovereignLedgerEntry): NVKEvidence => ({
      type: 'artifact_created',
      timestamp: Date.now(),
      reference: capabilityId,
      metadata: {
        failure: true,
        error,
        ...(entry ? { ledgerHash: entry.entryHash, ledgerEntryId: entry.id } : {})
      }
    });

    for (const node of graph.nodes) {
      nvkEventBus.publish({ type: 'ui.state_changed', state: this.mapCapabilityToUIState(node.capability) });
      nvkEventBus.publish({ type: 'tool.started', tool: node.capability });
      graph.updateNodeStatus(node.id, 'running');
      
      const cap = capabilityRegistry.getCapability(node.capability);
      if (!cap) {
        graph.updateNodeStatus(node.id, 'failed');
        // Nothing executed and no capability exists: no ledger entry, so no
        // authorization claim is stamped for a non-execution.
        return {
          error: new Error(`Capability "${node.capability}" is unavailable or not registered.`),
          evidence: [] as NVKEvidence[],
          ledgerEntries
        };
      }

      if (!cap.available) {
        graph.updateNodeStatus(node.id, 'failed');
        // A1 (2026-11-22): do NOT execute a capability just declared
        // unavailable. Previously this branch ran cap.execute() and only
        // then returned the "unavailable" error. No ledger entry: nothing
        // executed, so no authorization claim may be stamped.
        return {
          error: new Error(`Capability "${cap.name}" is currently unavailable.`),
          evidence: [] as NVKEvidence[],
          ledgerEntries
        };
      }

      // A1 (2026-11-22) — Human-in-the-Loop gate, engine layer. A
      // capability that requires confirmation must NEVER execute on an
      // unconfirmed run. The attempt is recorded as hitl_rejected, the
      // node fails, and the error names the confirmation requirement.
      if (cap.requiresConfirmation && !confirmedByUser) {
        graph.updateNodeStatus(node.id, 'failed');
        const message = `Action blocked: "${cap.name}" requires explicit confirmation before it can run.`;
        const entry = await sovereignLedger.append({
          capabilityId: node.capability,
          authorization: 'hitl_rejected',
          riskLevel: 'safe',
          result: {
            success: false,
            capabilityId: node.capability,
            error: message,
            evidence: []
          },
          input: node.input
        });
        ledgerEntries.push(entry);
        nvkEventBus.publish({ type: 'task.failed', taskId: graph.taskId, error: message });
        return {
          error: new Error(message),
          evidence: [failureEvidence(node.capability, message, entry)],
          ledgerEntries
        };
      }

      // 'hitl_confirmed' is stamped ONLY for capabilities that require
      // confirmation and ran on a confirmed run. Everything else that
      // genuinely needs no confirmation is 'auto_approved'. Never the
      // reverse, never a blanket default.
      const authorization = cap.requiresConfirmation ? 'hitl_confirmed' : 'auto_approved';

      try {
        // 1. Execute
        const execResult = await cap.execute(node.input);
        
        // 2. Verify (Verification Engine)
        let verified = true;
        if (cap.verify) {
          verified = await cap.verify(node.input, execResult);
        }

        if (!verified) {
          graph.updateNodeStatus(node.id, 'failed');
          const message = `Verification failed for capability "${cap.name}". Action could not be verified.`;
          const entry = await sovereignLedger.append({
            capabilityId: node.capability,
            authorization,
            riskLevel: 'safe',
            result: {
              success: false,
              capabilityId: node.capability,
              error: message,
              evidence: Array.isArray(execResult.evidence) ? execResult.evidence : []
            },
            input: node.input
          });
          ledgerEntries.push(entry);
          nvkEventBus.publish({ type: 'task.failed', taskId: graph.taskId, error: message });
          return {
            error: new Error(message),
            evidence: [failureEvidence(node.capability, message, entry)],
            ledgerEntries
          };
        }

        graph.updateNodeStatus(node.id, 'complete', execResult);
        nvkEventBus.publish({ type: 'tool.completed', tool: node.capability, result: execResult });
        finalResult = execResult;

        const ledgerEvidence: NVKEvidence[] = (Array.isArray(execResult.evidence) ? execResult.evidence : []).map((e: any) => ({
          ...e,
          // Record the grant timestamp on confirmed executions, so the
          // ledger entry carries when the user actually granted.
          metadata: {
            ...(e.metadata || {}),
            ...(confirmedByUser && cap.requiresConfirmation
              ? { grantedAt: options.confirmedAt ?? Date.now() }
              : {})
          }
        }));
        if (execResult && execResult.evidence) {
          execResult.evidence.forEach((e: any) => evidenceStore.addEvidence(graph.taskId, e));
        }

        // A4 (2026-11-22): runtime evidence also goes to the hashed
        // SovereignLedger. The in-memory EvidenceStore has no hashing or
        // persistence, so it cannot serve as the audit trail. The returned
        // entry's hash is attached to each evidence item's metadata so the
        // UI can show a short hash the user can match against the ledger.
        const entry = await sovereignLedger.append({
          capabilityId: node.capability,
          authorization,
          riskLevel: 'safe',
          result: {
            success: true,
            capabilityId: node.capability,
            output: execResult,
            evidence: ledgerEvidence
          },
          input: node.input
        });
        ledgerEntries.push(entry);
        ledgerEvidence.forEach((e) => {
          e.metadata = {
            ...(e.metadata || {}),
            ledgerHash: entry.entryHash,
            ledgerEntryId: entry.id
          };
        });
        allEvidence.push(...ledgerEvidence);
      } catch (e: any) {
        graph.updateNodeStatus(node.id, 'failed');
        const message = e.message || String(e);
        // Execution was attempted and failed: record the failure in the
        // ledger with the same authorization the attempt ran under.
        const entry = await sovereignLedger.append({
          capabilityId: node.capability,
          authorization,
          riskLevel: 'safe',
          result: {
            success: false,
            capabilityId: node.capability,
            error: message,
            evidence: []
          },
          input: node.input
        });
        ledgerEntries.push(entry);
        nvkEventBus.publish({ type: 'task.failed', taskId: graph.taskId, error: message });
        return {
          error: e,
          evidence: [failureEvidence(node.capability, message, entry)],
          ledgerEntries
        };
      }
    }
    
    // Return the NVKEvidence the capabilities actually produced — not the
    // in-memory store's contents, which are typed as the store's Evidence
    // (source/claim) while holding NVKEvidence-shaped objects. The store
    // keeps its per-task record above; the return value is the real evidence.
    return { result: finalResult, artifacts: [], evidence: allEvidence, ledgerEntries };
  }
  
  private mapCapabilityToUIState(capId: string): any {
    if (capId.includes('search') || capId.includes('research')) return 'RESEARCHING';
    if (capId.includes('create') || capId.includes('draft')) return 'CREATING';
    if (capId.includes('launch')) return 'EXECUTING';
    return 'PROCESSING';
  }
}

export const executionEngine = new ExecutionEngine();
