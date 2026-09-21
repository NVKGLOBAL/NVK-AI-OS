# NVK OS — Execution Kernel Documentation

## Overview
The NVK Execution Kernel (`/src/nvk/runtime/ExecutionKernel.ts`) is the central orchestrator for all tool and capability executions across the operating environment.

## Responsibilities
1. **Capability Validation**: Ensures the requested capability exists and is registered in the live capability registry.
2. **Permission Check**: Verifies whether the capability requires explicit authorization or user confirmation.
3. **Context Initialization**: Creates an immutable `ExecutionContext` containing deadlines, resource limits, and telemetry IDs.
4. **Execution & Timeout**: Enforces CPU timeouts and captures stdout/stderr or execution outputs.
5. **Postcondition Verification**: Invokes the capability's verification hook (`verify()`).
6. **Evidence Recording**: Writes cryptographic or observational evidence records to the `EvidenceStore`.
