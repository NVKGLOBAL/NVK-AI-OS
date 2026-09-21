export type NVKEvent =
  | { type: "intent.detected"; intent: string; prompt: string }
  | { type: "plan.created"; taskId: string; steps: any[] }
  | { type: "tool.started"; tool: string }
  | { type: "tool.completed"; tool: string; result: unknown }
  | { type: "artifact.created"; artifactId: string }
  | { type: "task.completed"; taskId: string; result: unknown }
  | { type: "task.failed"; taskId: string; error: unknown }
  | { type: "ui.state_changed"; state: "IDLE" | "THINKING" | "PLANNING" | "SEARCHING" | "RESEARCHING" | "PROCESSING" | "CREATING" | "VERIFYING" | "COMPLETED" | "FAILED" | "WAITING" };
