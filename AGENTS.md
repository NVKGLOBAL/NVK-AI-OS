# NVK 3D OS

## POST-AUDIT ENGINEERING HARDENING & CAPABILITY EXPANSION

### Version 2.1 — Build From Existing Architecture

---

# 0. MISSION

The existing NVK 3D OS has passed its architectural audit.
The system already contains local inference, Node backend, real filesystem, etc.
DO NOT REBUILD THE FOUNDATION.
AUDIT → HARDEN → CONNECT → EXPAND → VERIFY

---

# 1. ABSOLUTE CONSTRAINT
NO GEMINI RUNTIME DEPENDENCY.
Gemini may be used as a coding assistant, but must not become part of the shipped runtime.

---

# 2. PRESERVE CURRENT WORKING COMPONENTS
Preserve LocalLLMContext, Action Engine, Server, Orb, Terminal, File System, Browser.

---

# 3. CAPABILITY GRAPH
Create an explicit capability registry. Every capability must have an explicit definition.

---

# 4. CAPABILITY CONTRACT
```ts
interface NVKCapability {
  id: string
  name: string
  description: string
  category: "intelligence" | "filesystem" | "terminal" | "web" | "application" | "creation" | "workflow"
  available(): Promise<boolean>
  requiresConfirmation: boolean
  execute(input: unknown, context: NVKExecutionContext): Promise<NVKCapabilityResult>
}
```

---

# 5. EVIDENCE SYSTEM
When NVK says it did something, it must provide evidence.
```ts
type NVKEvidence = {
  type: "file_created" | "file_modified" | "command_executed" | "web_response" | "application_spawned" | "artifact_created"
  timestamp: number
  reference?: string
  metadata?: Record<string, unknown>
}
```

---

# 6. ORB MUST REFLECT REAL EXECUTION
The Orb subscribes to the NVK EVENT BUS. No fake animation loops.

---

# 7. WEB CAPABILITY
Change "UNRESTRICTED WEB BROWSING" to "CONNECTED WEB ACCESS".
Proxy handles web access where permitted.

---

# 8. TERMINAL SECURITY
Safe vs Dangerous commands. Dangerous commands require confirmation.

---

# 9. CONTINUOUS TASK ENGINE
Real task tracking with statuses: QUEUED, RUNNING, COMPLETED, etc.

---

# 10. PRODUCT LANGUAGE
Use:
"AI you own."
"Local-first intelligence."
"Your data stays with you by default."
"Tell NVK what you want to accomplish."

