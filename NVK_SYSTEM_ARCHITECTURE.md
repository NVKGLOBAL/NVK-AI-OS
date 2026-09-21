# NVK OS — System Architecture (OMEGA 2.1)

## Architectural Overview

NVK OS is an agentic AI operating environment designed for local-first intelligence, deterministic execution, and strict verification.

### Core Architecture Layers
1. **Intent Engine (`/src/nvk/intent/IntentEngine.ts`)**: Classifies natural language prompts into precise operational intents without falling back incorrectly to web search.
2. **Task Planner (`/src/nvk/planning/Planner.ts`)**: Decomposes intents into structured dependency task graphs (DAGs).
3. **Capability Registry (`/src/nvk/capabilities/CapabilityRegistry.ts`)**: Serves as the single source of truth for all available, degraded, and unavailable system capabilities.
4. **Execution Engine (`/src/nvk/runtime/ExecutionEngine.ts`)**: Executes capabilities through an event-driven execution bus, verifying postconditions and recording immutable evidence.
5. **Evidence Store (`/src/nvk/evidence/EvidenceStore.ts`)**: Captures cryptographic and observational evidence for every executed task.
6. **Artifact Registry (`/src/nvk/artifacts/ArtifactRegistry.ts`)**: Manages generated documents, code projects, and workspace files.
