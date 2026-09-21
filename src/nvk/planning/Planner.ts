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
    } else if (intent === 'workflow_execution') {
      const n1 = `node-${Date.now()}-1`;
      const n2 = `node-${Date.now()}-2`;
      graph.addNode({
        id: n1,
        objective: 'Research commercial solar opportunities in Texas',
        capability: 'web.search',
        dependencies: [],
        status: 'pending',
        input: { query: parsed.objective || prompt }
      });
      graph.addNode({
        id: n2,
        objective: 'Create pitch deck artifact for NVK Global',
        capability: 'documents.create',
        dependencies: [n1],
        status: 'pending',
        input: { topic: 'NVK Global Texas Solar Pitch Deck' }
      });
    } else {
      graph.addNode({
        id: `node-${Date.now()}-1`,
        objective: parsed.objective || prompt || 'Execute task',
        capability: 'web.search',
        dependencies: [],
        status: 'pending',
        input: { query: parsed.objective || prompt }
      });
    }

    nvkEventBus.publish({ type: 'plan.created', taskId, steps: graph.nodes });
    return graph;
  }
}

export const planner = new Planner();
