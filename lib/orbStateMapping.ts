// lib/orbStateMapping.ts
// MCNA slice 3 — the orb-state mapping, extracted from App.tsx so it is
// unit-testable in node and shared by App and the tests.
//
// The A3 fix: the orb must show the agent's REAL pipeline states and must
// NEVER be forced CALM after a command. The old App mapping sent every
// completion (runtime COMPLETED, services TASK_COMPLETED /
// ACTION_COMPLETED) to CALM, and NVKCommandLayer then overwrote even
// ERROR with CALM after every run — so a failed command showed the same
// calm orb as a successful one. The new mapping:
//
//   runtime COMPLETED / services TASK_COMPLETED / ACTION_COMPLETED
//     -> COMPLETE (transient; App settles it to IDLE after ~2s)
//   runtime FAILED / services ACTION_FAILED / TASK_FAILED
//     -> ERROR (stays until the next command)
//   runtime WAITING -> WAITING (blocked on the user, e.g. a
//     confirmation is pending — the amber "waiting for you" orb state)
//   runtime IDLE -> IDLE (back to idle)
//
// CALM is never produced by any mapping here. CALM remains a valid
// NVKOrbState value (the orb renders it as its default cyan), but no
// pipeline event and no command-path transition sets it anymore.

import type { NVKOrbState } from '../types';

/** Map a runtime ui.state_changed state to an orb state. Null = no orb change. */
export function mapRuntimeStateToOrbState(state: string): NVKOrbState | null {
  switch (state) {
    case 'THINKING':
    case 'PLANNING':
    case 'SEARCHING':
    case 'RESEARCHING':
    case 'VERIFYING':
      return 'THINKING';
    case 'PROCESSING':
    case 'CREATING':
    case 'EXECUTING':
      return 'ACTING';
    case 'COMPLETED':
      return 'COMPLETE';
    case 'FAILED':
      return 'ERROR';
    case 'WAITING':
      // A real runtime state (NVKEventTypes ui.state_changed): the run
      // is blocked on the user. It maps to the WAITING orb state, not
      // IDLE — collapsing it to IDLE would hide the "waiting for you"
      // signal the orb exists to show.
      return 'WAITING';
    case 'IDLE':
      return 'IDLE';
    default:
      return null;
  }
}

/** Map a services-bus event type to an orb state. Null = no orb change. */
export function mapServicesEventToOrbState(eventType: string): NVKOrbState | null {
  switch (eventType) {
    case 'MODEL_LOADING':
    case 'TASK_STARTED':
    case 'WEB_REQUEST_STARTED':
      return 'THINKING';
    case 'ACTION_STARTED':
      return 'ACTING';
    case 'APP_SPAWNED':
    case 'FILE_CREATED':
      return 'DISCOVERY';
    case 'TASK_VERIFIED':
    case 'ACTION_COMPLETED':
    case 'TASK_COMPLETED':
      return 'COMPLETE';
    case 'ACTION_FAILED':
    case 'TASK_FAILED':
      return 'ERROR';
    default:
      return null;
  }
}

/**
 * The terminal orb state for a finished command run: a successful run
 * shows COMPLETE, a failed run shows ERROR. Never CALM — a failure must
 * be visible on the orb, and a success is a completion, not a calm.
 */
export function resolveTerminalOrbState(status: 'complete' | 'failed'): NVKOrbState {
  return status === 'failed' ? 'ERROR' : 'COMPLETE';
}
