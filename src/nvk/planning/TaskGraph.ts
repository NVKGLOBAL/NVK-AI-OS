import { Evidence } from '../evidence/EvidenceStore';

export interface TaskNode {
  id: string;
  objective: string;
  capability: string;
  dependencies: string[];
  status: "pending" | "running" | "complete" | "failed";
  input: unknown;
  output?: unknown;
  evidence?: Evidence[];
}

export class TaskGraph {
  nodes: TaskNode[] = [];
  taskId: string;

  constructor(taskId: string) {
    this.taskId = taskId;
  }

  addNode(node: TaskNode) {
    this.nodes.push(node);
  }

  getNode(id: string) {
    return this.nodes.find(n => n.id === id);
  }

  updateNodeStatus(id: string, status: "pending" | "running" | "complete" | "failed", output?: unknown) {
    const node = this.getNode(id);
    if (node) {
      node.status = status;
      if (output !== undefined) node.output = output;
    }
  }
}
