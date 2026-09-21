import { intentEngine } from '../intent/IntentEngine';
import { planner } from '../planning/Planner';
import { executionEngine } from './ExecutionEngine';
import { nvkEventBus } from '../events/NVKEventBus';
import { artifactRegistry, Artifact } from '../artifacts/ArtifactRegistry';
import { Evidence } from '../evidence/EvidenceStore';

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
  evidence: Evidence[];
}

export class NVKRuntime {
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
        evidence: []
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
        evidence: []
      };
    }
    
    nvkEventBus.publish({ type: 'ui.state_changed', state: 'PLANNING' });
    // 2. Create Plan
    const graph = planner.createPlan(taskId, parsed, req.input);
    
    // 3. Execute with Verification Engine
    const execResult = await executionEngine.executePlan(graph);
    
    if (execResult.error) {
       nvkEventBus.publish({ type: 'ui.state_changed', state: 'FAILED' });
       return {
         taskId,
         intent: parsed.intent,
         status: 'failed',
         message: String(execResult.error.message || execResult.error),
         artifacts: [],
         evidence: []
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
      evidence: execResult.evidence || []
    };
  }
}

export const nvkRuntime = new NVKRuntime();
