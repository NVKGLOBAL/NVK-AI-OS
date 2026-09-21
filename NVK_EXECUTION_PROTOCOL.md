# NVK OS — Execution Protocol (OMEGA 2.1)

## The NVK Execution Lifecycle

Every user request follows an uncompromised path from intent to verified evidence:

1. **User Intent**: Natural language prompt received at the Command Layer.
2. **Intent Classification**: Evaluated by `IntentEngine` to determine exact capability mapping (e.g. math calculation vs. research vs. software creation).
3. **Task Planning**: `Planner` builds a `TaskGraph` with explicit dependencies.
4. **Capability Resolution**: `CapabilityRegistry` verifies whether the required capability is `available: true`. If unavailable, execution halts with a truthful capability error (`CAPABILITY_UNAVAILABLE`).
5. **Execution**: The `ExecutionEngine` runs the capability executor.
6. **Postcondition Verification**: `cap.verify()` validates that output invariants hold true.
7. **Evidence Recording**: `EvidenceStore` records immutable proof of execution.
8. **Artifact Registration**: Generated documents or code workspaces are registered in `ArtifactRegistry`.
