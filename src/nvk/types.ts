export interface NVKAction {
  id: string;
  type:
    | "open_application"
    | "create_document"
    | "search_web"
    | "navigate"
    | "send_message"
    | "run_task"
    | "generate_artifact"
    | "capability_discovery"
    | "unknown";
  target?: string;
  parameters?: Record<string, unknown>;
  status:
    | "planned"
    | "executing"
    | "success"
    | "failed"
    | "blocked"
    | "needs_input";
  result?: unknown;
  error?: string;
  verification?: {
    status: "verified" | "unverified" | "failed";
    evidence?: unknown;
  };
}

export interface NVKTask {
  id: string;
  objective: string;
  status:
    | "created"
    | "planning"
    | "executing"
    | "paused"
    | "completed"
    | "failed"
    | "blocked"
    | "needs_input";
  steps: NVKAction[];
  currentStep?: string;
  createdAt: string;
  completedAt?: string;
}

export interface NVKCapability {
  id: string;
  name: string;
  description: string;
  category: "intelligence" | "filesystem" | "terminal" | "web" | "application" | "creation" | "workflow";
  available: boolean;
  executor: string;
  requiresPermission: boolean;
  requiresConfirmation: boolean;
  verificationMethod?: string;
  execute: (input: any) => Promise<any>;
  verify?: (input: any, result: any) => Promise<boolean>;
}

export type NVKEvidence = {
  type: "file_created" | "file_modified" | "command_executed" | "web_response" | "application_spawned" | "artifact_created";
  timestamp: number;
  reference?: string;
  metadata?: Record<string, unknown>;
};
