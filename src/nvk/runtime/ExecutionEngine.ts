import { TaskGraph } from '../planning/TaskGraph';
import { capabilityRegistry } from '../capabilities/CapabilityRegistry';
import { nvkEventBus } from '../events/NVKEventBus';
import { evidenceStore } from '../evidence/EvidenceStore';
import { sovereignLedger } from '../../../services/SovereignLedger';

export class ExecutionEngine {
  async executePlan(graph: TaskGraph) {
    let finalResult = null;
    let allEvidence = [];

    for (const node of graph.nodes) {
      nvkEventBus.publish({ type: 'ui.state_changed', state: this.mapCapabilityToUIState(node.capability) });
      nvkEventBus.publish({ type: 'tool.started', tool: node.capability });
      graph.updateNodeStatus(node.id, 'running');
      
      const cap = capabilityRegistry.getCapability(node.capability);
      if (!cap) {
        graph.updateNodeStatus(node.id, 'failed');
        return { error: new Error(`Capability "${node.capability}" is unavailable or not registered.`) };
      }

      if (!cap.available) {
        graph.updateNodeStatus(node.id, 'failed');
        // A1 (2026-11-22): do NOT execute a capability just declared
        // unavailable. Previously this branch ran cap.execute() and only
        // then returned the "unavailable" error.
        return { error: new Error(`Capability "${cap.name}" is currently unavailable.`) };
      }

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
          return { error: new Error(`Verification failed for capability "${cap.name}". Action could not be verified.`) };
        }

        graph.updateNodeStatus(node.id, 'complete', execResult);
        nvkEventBus.publish({ type: 'tool.completed', tool: node.capability, result: execResult });
        finalResult = execResult;

        if (execResult && execResult.evidence) {
          execResult.evidence.forEach((e: any) => evidenceStore.addEvidence(graph.taskId, e));
          allEvidence.push(...execResult.evidence);
        }

        // A4 (2026-11-22): runtime evidence also goes to the hashed
        // SovereignLedger. The in-memory EvidenceStore has no hashing or
        // persistence, so it cannot serve as the audit trail.
        await sovereignLedger.append({
          capabilityId: node.capability,
          authorization: 'auto_approved',
          riskLevel: 'safe',
          result: {
            success: true,
            capabilityId: node.capability,
            output: execResult,
            evidence: Array.isArray(execResult.evidence) ? execResult.evidence : []
          },
          input: node.input
        });
      } catch (e: any) {
        graph.updateNodeStatus(node.id, 'failed');
        nvkEventBus.publish({ type: 'task.failed', taskId: graph.taskId, error: e.message || e });
        return { error: e };
      }
    }
    
    // Return the NVKEvidence the capabilities actually produced — not the
    // in-memory store's contents, which are typed as the store's Evidence
    // (source/claim) while holding NVKEvidence-shaped objects. The store
    // keeps its per-task record above; the return value is the real evidence.
    return { result: finalResult, artifacts: [], evidence: allEvidence };
  }
  
  private mapCapabilityToUIState(capId: string): any {
    if (capId.includes('search') || capId.includes('research')) return 'RESEARCHING';
    if (capId.includes('create') || capId.includes('draft')) return 'CREATING';
    if (capId.includes('launch')) return 'EXECUTING';
    return 'PROCESSING';
  }
}

export const executionEngine = new ExecutionEngine();
