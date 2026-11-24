import { TaskGraph } from './TaskGraph';
import { nvkEventBus } from '../events/NVKEventBus';
import { ParsedIntent } from '../intent/IntentEngine';

export class Planner {
  createPlan(taskId: string, parsed: ParsedIntent, prompt: string): TaskGraph {
    const graph = new TaskGraph(taskId);
    const intent = parsed.intent;
    
    if (intent === 'capability_discovery') {
      graph.addNode({
        id: `node-${Date.now()}-1`,
        objective: 'Discover available capabilities',
        capability: 'capability.discovery',
        dependencies: [],
        status: 'pending',
        input: {}
      });
    } else if (intent === 'calculation') {
      graph.addNode({
        id: `node-${Date.now()}-1`,
        objective: `Calculate: ${parsed.objective || prompt}`,
        capability: 'calculation.math',
        dependencies: [],
        status: 'pending',
        input: { query: parsed.objective || prompt }
      });
    } else if (intent === 'image_generation') {
      graph.addNode({
        id: `node-${Date.now()}-1`,
        objective: `Generate image: ${parsed.objective || prompt}`,
        capability: 'image.generation',
        dependencies: [],
        status: 'pending',
        input: { prompt: parsed.objective || prompt }
      });
    } else if (intent === 'open_application') {
      graph.addNode({
        id: `node-${Date.now()}-1`,
        objective: `Launch application: ${parsed.target || 'unknown'}`,
        capability: 'application.launch',
        dependencies: [],
        status: 'pending',
        input: { target: parsed.target }
      });
    } else if (intent === 'email_dispatch') {
      graph.addNode({
        id: `node-${Date.now()}-1`,
        objective: `Send email: ${parsed.objective || prompt}`,
        capability: 'email.send',
        dependencies: [],
        status: 'pending',
        input: { objective: parsed.objective || prompt }
      });
    } else if (intent === 'messaging') {
      graph.addNode({
        id: `node-${Date.now()}-1`,
        objective: `Send message: ${parsed.objective || prompt}`,
        capability: 'messaging.send',
        dependencies: [],
        status: 'pending',
        input: { objective: parsed.objective || prompt }
      });
    } else if (intent === 'software_generation') {
      graph.addNode({
        id: `node-${Date.now()}-1`,
        objective: `Generate software project: ${parsed.objective || prompt}`,
        capability: 'software.generate',
        dependencies: [],
        status: 'pending',
        input: { topic: parsed.objective || prompt }
      });
    } else if (intent === 'web_research') {
      graph.addNode({
        id: `node-${Date.now()}-1`,
        objective: 'Search the web for information',
        capability: 'web.search',
        dependencies: [],
        status: 'pending',
        input: { query: parsed.objective || prompt }
      });
    } else if (intent === 'document_generation') {
      graph.addNode({
        id: `node-${Date.now()}-1`,
        objective: 'Create document artifact',
        capability: 'documents.create',
        dependencies: [],
        status: 'pending',
        input: { topic: parsed.objective || prompt }
      });
    }
    // Slice 7: the hardcoded Texas-solar plan is removed. The old
    // workflow_execution branch built a fixed "Research commercial solar
    // opportunities in Texas" + "Create pitch deck artifact for NVK
    // Global" plan for ANY input routed there — a fabricated plan. There
    // is no generic workflow engine, so workflow_execution builds no
    // plan (it falls through to the empty-plan case below).
    //
    // Slice 7: the catch-all default web.search is removed. The old
    // final `else` turned ANY unmatched intent (conversation, run_task,
    // unknown — including a greeting like "hello") into a web.search
    // plan — a fabricated plan for an input nobody understood. An intent
    // with no plan now builds NO nodes (an empty plan). The runtime
    // turns an empty plan into `ask` (it asks the user what they want)
    // instead of executing a guessed search.
    else if (
      intent === 'conversation' ||
      intent === 'run_task' ||
      intent === 'unknown' ||
      intent === 'workflow_execution'
    ) {
      // No plan. Intentionally empty — the runtime asks.
    }

    nvkEventBus.publish({ type: 'plan.created', taskId, steps: graph.nodes });
    return graph;
  }
}

export const planner = new Planner();
