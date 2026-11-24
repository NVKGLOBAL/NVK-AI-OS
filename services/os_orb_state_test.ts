/**
 * OS orb state mapping test (MCNA slice 3 / A3 fix, 2026-11-23).
 *
 * Pure-module test — no server, no DOM, no model. Verifies the contract
 * the orb's real-state wiring depends on: every runtime state
 * (NVKEventTypes ui.state_changed) and every services event (NVKEvent)
 * maps to a real orb state (working, thinking, verifying, done, failed),
 * and NO runtime state or services event ever maps to CALM — the orb is
 * never forced calm after a command, including a failure. A completed
 * run maps to COMPLETE (transient; App settles it to IDLE after ~2s), a
 * failed run maps to ERROR, and a runtime WAITING state (blocked on the
 * user) maps to the WAITING orb state, not IDLE.
 *
 * Run: npx tsx services/os_orb_state_test.ts
 * (also wired into `npm test`, after the existing three — it needs no server).
 */
import {
  mapRuntimeStateToOrbState,
  mapServicesEventToOrbState,
  resolveTerminalOrbState,
} from '../lib/orbStateMapping';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) {
    console.log(`  PASS ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name} ${detail}`);
  }
};

// The full runtime state union (src/nvk/events/NVKEventTypes.ts).
const RUNTIME_STATES = [
  'IDLE', 'THINKING', 'PLANNING', 'SEARCHING', 'RESEARCHING', 'PROCESSING',
  'CREATING', 'EXECUTING', 'VERIFYING', 'COMPLETED', 'FAILED', 'WAITING',
] as const;

// The full services event union (types.ts NVKEvent).
const SERVICES_EVENTS = [
  'TASK_STARTED', 'MODEL_LOADING', 'ACTION_STARTED', 'ACTION_COMPLETED',
  'ACTION_FAILED', 'APP_SPAWNED', 'WEB_REQUEST_STARTED', 'FILE_CREATED',
  'TASK_VERIFIED', 'TASK_COMPLETED', 'TASK_FAILED',
] as const;

console.log('Runtime state → orb state:');
check('COMPLETED → COMPLETE (done, never CALM)',
  mapRuntimeStateToOrbState('COMPLETED') === 'COMPLETE');
check('FAILED → ERROR (a failed command shows a failed orb state)',
  mapRuntimeStateToOrbState('FAILED') === 'ERROR');
check('WAITING → WAITING (blocked on the user — the amber waiting state, not IDLE)',
  mapRuntimeStateToOrbState('WAITING') === 'WAITING');
check('IDLE → IDLE',
  mapRuntimeStateToOrbState('IDLE') === 'IDLE');
check('THINKING → THINKING',
  mapRuntimeStateToOrbState('THINKING') === 'THINKING');
check('PLANNING / SEARCHING / RESEARCHING / VERIFYING → THINKING',
  mapRuntimeStateToOrbState('PLANNING') === 'THINKING'
  && mapRuntimeStateToOrbState('SEARCHING') === 'THINKING'
  && mapRuntimeStateToOrbState('RESEARCHING') === 'THINKING'
  && mapRuntimeStateToOrbState('VERIFYING') === 'THINKING');
check('PROCESSING / CREATING / EXECUTING → ACTING',
  mapRuntimeStateToOrbState('PROCESSING') === 'ACTING'
  && mapRuntimeStateToOrbState('CREATING') === 'ACTING'
  && mapRuntimeStateToOrbState('EXECUTING') === 'ACTING');
check('an unknown runtime state maps to nothing (keeps the current orb state)',
  mapRuntimeStateToOrbState('BOGUS_STATE') === null);
check('every real runtime state maps to a real orb state (never null)',
  RUNTIME_STATES.every((s) => mapRuntimeStateToOrbState(s) !== null));
check('no runtime state maps to CALM',
  RUNTIME_STATES.every((s) => mapRuntimeStateToOrbState(s) !== 'CALM'));

console.log('Services event → orb state:');
check('TASK_COMPLETED / ACTION_COMPLETED / TASK_VERIFIED → COMPLETE',
  mapServicesEventToOrbState('TASK_COMPLETED') === 'COMPLETE'
  && mapServicesEventToOrbState('ACTION_COMPLETED') === 'COMPLETE'
  && mapServicesEventToOrbState('TASK_VERIFIED') === 'COMPLETE');
check('TASK_FAILED / ACTION_FAILED → ERROR',
  mapServicesEventToOrbState('TASK_FAILED') === 'ERROR'
  && mapServicesEventToOrbState('ACTION_FAILED') === 'ERROR');
check('MODEL_LOADING / TASK_STARTED / WEB_REQUEST_STARTED → THINKING',
  mapServicesEventToOrbState('MODEL_LOADING') === 'THINKING'
  && mapServicesEventToOrbState('TASK_STARTED') === 'THINKING'
  && mapServicesEventToOrbState('WEB_REQUEST_STARTED') === 'THINKING');
check('ACTION_STARTED → ACTING',
  mapServicesEventToOrbState('ACTION_STARTED') === 'ACTING');
check('APP_SPAWNED / FILE_CREATED → DISCOVERY',
  mapServicesEventToOrbState('APP_SPAWNED') === 'DISCOVERY'
  && mapServicesEventToOrbState('FILE_CREATED') === 'DISCOVERY');
check('an unknown event maps to nothing',
  mapServicesEventToOrbState('BOGUS_EVENT') === null);
check('every real services event maps to a real orb state (never null)',
  SERVICES_EVENTS.every((e) => mapServicesEventToOrbState(e) !== null));
check('no services event maps to CALM',
  SERVICES_EVENTS.every((e) => mapServicesEventToOrbState(e) !== 'CALM'));

console.log('Terminal (command-path) orb state:');
check("'complete' → COMPLETE",
  resolveTerminalOrbState('complete') === 'COMPLETE');
check("'failed' → ERROR (a failed command shows a failed orb state)",
  resolveTerminalOrbState('failed') === 'ERROR');
check('a terminal state never resolves to CALM',
  (['complete', 'failed'] as const)
    .every((s) => resolveTerminalOrbState(s) !== 'CALM'));

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll OS orb state checks passed.');
