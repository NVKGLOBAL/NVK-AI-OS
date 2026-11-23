/**
 * A1 permission-gate test (2026-11-22, A1 follow-up).
 *
 * The gate is the one place where "the agent must not act without consent
 * it can prove" is enforced, so this test executes the refusal path and
 * the grant path for real — a test that passes structurally without
 * exercising the gate does not count.
 *
 * Two layers, both exercised:
 *  - Services layer (TaskEngine -> services CapabilityRegistry): the
 *    TaskEngine bypass (hardcoded confirmedByUser: true) lived here.
 *    filesystem.write is available AND requires confirmation, so it is
 *    the live test capability — no fake capability needed.
 *  - Runtime engine layer (ExecutionEngine.executePlan): the engine guard
 *    blocks requiresConfirmation capabilities on unconfirmed runs. No
 *    runtime capability is both available and confirmation-requiring
 *    today (email.send / messaging.send are available: false), so the
 *    test registers a temporary test-only capability for this process.
 *
 * REQUIRES the server: start it with `npm run dev` (localhost:3000)
 * before `npm test`. If the server is not running, this test FAILS with
 * "server not running" instead of passing vacuously.
 * Override the base with NVK_TEST_API_BASE.
 */
import { eventBus } from './EventBus';
import { taskEngine } from './TaskEngine';
import { sovereignLedger } from './SovereignLedger';
import { executionEngine } from '../src/nvk/runtime/ExecutionEngine';
import { capabilityRegistry as runtimeRegistry } from '../src/nvk/capabilities/CapabilityRegistry';
import { TaskGraph } from '../src/nvk/planning/TaskGraph';
import { NVKEvent } from '../types';

const API_BASE = process.env.NVK_TEST_API_BASE || 'http://127.0.0.1:3000';

// Capabilities use relative /api/* URLs (browser-style). In Node, rewrite
// them to the test API base.
const nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = ((input: any, init?: any) => {
  if (typeof input === 'string' && input.startsWith('/api/')) {
    return nativeFetch(API_BASE + input, init);
  }
  return nativeFetch(input, init);
}) as typeof fetch;

function fail(message: string): never {
  throw new Error(message);
}

async function runTests() {
  // 0. Health check FIRST — never pass structurally when the server is down.
  let health: Response;
  try {
    health = await nativeFetch(`${API_BASE}/api/health`);
  } catch {
    fail('server not running — start it with `npm run dev` before `npm test`');
  }
  if (!health!.ok) {
    fail(`server not running — ${API_BASE}/api/health returned ${health!.status}; start it with \`npm run dev\` before \`npm test\``);
  }
  console.log(`Server healthy at ${API_BASE}.`);

  const events: NVKEvent[] = [];
  eventBus.subscribe(e => events.push(e));

  // ------------------------------------------------------------------
  // 1. Services layer — REFUSAL: filesystem.write without confirmation.
  // ------------------------------------------------------------------
  console.log('Gate 1: filesystem.write via TaskEngine WITHOUT confirmation (must be refused)...');
  const refuseTask = taskEngine.createTask('Gate test — refusal');
  const refuseFilename = `__gate-test-refused-${Date.now()}.txt`;
  const refuseContent = 'This file must never be written.';
  const ledgerBeforeRefusal = sovereignLedger.getEntries().length;

  await taskEngine.runCapability(refuseTask.id, 'filesystem.write', { filename: refuseFilename, content: refuseContent });
  // No options passed: unconfirmed by default. If this completes, the
  // bypass is back — fail loudly.

  const refusedTask = taskEngine.getTask(refuseTask.id);
  if (refusedTask?.status !== 'FAILED') {
    fail(`Unconfirmed filesystem.write should be FAILED, got ${refusedTask?.status}`);
  }
  if (!refusedTask.error || !/confirmation|human-in-the-loop/i.test(refusedTask.error)) {
    fail(`Refusal error should name the confirmation requirement, got: ${refusedTask.error || 'no error recorded'}`);
  }

  // The refusal itself is recorded: exactly one new ledger entry,
  // hitl_rejected, for filesystem.write.
  const ledgerAfterRefusal = sovereignLedger.getEntries();
  if (ledgerAfterRefusal.length !== ledgerBeforeRefusal + 1) {
    fail(`Refusal should append exactly 1 ledger entry, got ${ledgerAfterRefusal.length - ledgerBeforeRefusal}`);
  }
  const refusalEntry = ledgerAfterRefusal[ledgerAfterRefusal.length - 1];
  if (refusalEntry.capabilityId !== 'filesystem.write' || refusalEntry.authorization !== 'hitl_rejected') {
    fail(`Refusal ledger entry should be filesystem.write/hitl_rejected, got ${refusalEntry.capabilityId}/${refusalEntry.authorization}`);
  }
  if (!/^[0-9a-f]{64}$/.test(refusalEntry.entryHash)) {
    fail(`Refusal ledger entry has no valid SHA-256 hash: ${refusalEntry.entryHash}`);
  }

  // The file must NOT exist — the refusal blocked the write.
  const refusedDownload = await nativeFetch(`${API_BASE}/api/fs/download/${encodeURIComponent(refuseFilename)}`);
  if (refusedDownload.ok) {
    fail('Refused write still created the file — the gate did not block execution');
  }
  console.log(`Gate 1 OK: refused, hitl_rejected entry ${refusalEntry.id}, file not written.`);

  // ------------------------------------------------------------------
  // 2. Services layer — GRANT: filesystem.write with a real grant.
  // ------------------------------------------------------------------
  console.log('Gate 2: filesystem.write via TaskEngine WITH confirmation (must run, hitl_confirmed)...');
  const grantTask = taskEngine.createTask('Gate test — grant');
  const grantFilename = `__gate-test-granted-${Date.now()}.txt`;
  const grantContent = `NVK gate test — granted write ${new Date().toISOString()}`;
  const ledgerBeforeGrant = sovereignLedger.getEntries().length;

  await taskEngine.runCapability(grantTask.id, 'filesystem.write', { filename: grantFilename, content: grantContent }, { confirmedByUser: true });

  const grantedTask = taskEngine.getTask(grantTask.id);
  if (grantedTask?.status !== 'COMPLETED') {
    fail(`Confirmed filesystem.write should be COMPLETED, got ${grantedTask?.status}: ${grantedTask?.error || 'no error recorded'}`);
  }

  const ledgerAfterGrant = sovereignLedger.getEntries();
  if (ledgerAfterGrant.length !== ledgerBeforeGrant + 1) {
    fail(`Grant should append exactly 1 ledger entry, got ${ledgerAfterGrant.length - ledgerBeforeGrant}`);
  }
  const grantEntry = ledgerAfterGrant[ledgerAfterGrant.length - 1];
  if (grantEntry.capabilityId !== 'filesystem.write' || grantEntry.authorization !== 'hitl_confirmed') {
    fail(`Grant ledger entry should be filesystem.write/hitl_confirmed, got ${grantEntry.capabilityId}/${grantEntry.authorization}`);
  }

  const grantedDownload = await nativeFetch(`${API_BASE}/api/fs/download/${encodeURIComponent(grantFilename)}`);
  if (!grantedDownload.ok) fail(`Granted write did not create the file (${grantedDownload.status})`);
  if ((await grantedDownload.text()) !== grantContent) fail('Granted write content does not match');
  console.log(`Gate 2 OK: granted, hitl_confirmed entry ${grantEntry.id}, file written.`);

  // Cleanup the granted file.
  const del = await nativeFetch(`${API_BASE}/api/fs/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: grantFilename })
  });
  if (!del.ok) console.warn(`Warning: could not delete temp file ${grantFilename} (${del.status})`);

  // ------------------------------------------------------------------
  // 3. Services layer — CONTROL: a capability that needs NO
  // confirmation still runs unconfirmed, stamped auto_approved.
  // ------------------------------------------------------------------
  console.log('Gate 3: system.diagnostics WITHOUT confirmation (must run, auto_approved)...');
  const diagTask = taskEngine.createTask('Gate test — auto-approved control');
  const ledgerBeforeDiag = sovereignLedger.getEntries().length;

  await taskEngine.runCapability(diagTask.id, 'system.diagnostics', {});

  const diagTaskFinal = taskEngine.getTask(diagTask.id);
  if (diagTaskFinal?.status !== 'COMPLETED') {
    fail(`system.diagnostics should be COMPLETED without confirmation, got ${diagTaskFinal?.status}: ${diagTaskFinal?.error || 'no error recorded'}`);
  }
  const ledgerAfterDiag = sovereignLedger.getEntries();
  if (ledgerAfterDiag.length !== ledgerBeforeDiag + 1) {
    fail(`Diagnostics should append exactly 1 ledger entry, got ${ledgerAfterDiag.length - ledgerBeforeDiag}`);
  }
  const diagEntry = ledgerAfterDiag[ledgerAfterDiag.length - 1];
  if (diagEntry.capabilityId !== 'system.diagnostics' || diagEntry.authorization !== 'auto_approved') {
    fail(`Diagnostics ledger entry should be system.diagnostics/auto_approved, got ${diagEntry.capabilityId}/${diagEntry.authorization}`);
  }
  console.log(`Gate 3 OK: ran unconfirmed, auto_approved entry ${diagEntry.id}.`);

  // ------------------------------------------------------------------
  // 4. Runtime engine layer — refusal + grant on ExecutionEngine.
  // No runtime capability is both available and confirmation-requiring
  // today, so a temporary test-only capability is registered for this
  // process. It is never shipped and never leaves this test.
  // ------------------------------------------------------------------
  console.log('Gate 4: runtime engine guard (test capability, refusal then grant)...');
  runtimeRegistry.register({
    id: 'gate.test',
    name: 'Gate Test Capability',
    description: 'Test-only capability that requires confirmation, for the A1 gate test.',
    category: 'workflow',
    available: true,
    executor: 'gate.test',
    requiresPermission: true,
    requiresConfirmation: true,
    execute: async () => ({
      message: 'gate test executed',
      verified: true,
      evidence: [{ type: 'artifact_created', timestamp: Date.now(), reference: 'gate.test' }]
    }),
    verify: async () => true
  });

  const ledgerBeforeEngineRefusal = sovereignLedger.getEntries().length;
  const refuseGraph = new TaskGraph('gate-engine-refusal');
  refuseGraph.addNode({ id: 'n1', objective: 'gate test refusal', capability: 'gate.test', dependencies: [], status: 'pending', input: {} });
  const engineRefused = await executionEngine.executePlan(refuseGraph, {});
  if (!engineRefused.error || !/requires explicit confirmation/i.test(String(engineRefused.error.message || engineRefused.error))) {
    fail(`Unconfirmed engine run should fail naming the confirmation requirement, got: ${JSON.stringify(engineRefused.error || engineRefused.result || 'no error')}`);
  }
  const ledgerAfterEngineRefusal = sovereignLedger.getEntries();
  if (ledgerAfterEngineRefusal.length !== ledgerBeforeEngineRefusal + 1) {
    fail(`Engine refusal should append exactly 1 ledger entry, got ${ledgerAfterEngineRefusal.length - ledgerBeforeEngineRefusal}`);
  }
  const engineRefusalEntry = ledgerAfterEngineRefusal[ledgerAfterEngineRefusal.length - 1];
  if (engineRefusalEntry.capabilityId !== 'gate.test' || engineRefusalEntry.authorization !== 'hitl_rejected') {
    fail(`Engine refusal entry should be gate.test/hitl_rejected, got ${engineRefusalEntry.capabilityId}/${engineRefusalEntry.authorization}`);
  }
  console.log(`Gate 4a OK: engine refused unconfirmed run, hitl_rejected entry ${engineRefusalEntry.id}.`);

  const ledgerBeforeEngineGrant = sovereignLedger.getEntries().length;
  const grantGraph = new TaskGraph('gate-engine-grant');
  grantGraph.addNode({ id: 'n1', objective: 'gate test grant', capability: 'gate.test', dependencies: [], status: 'pending', input: {} });
  const engineGranted = await executionEngine.executePlan(grantGraph, { confirmedByUser: true, confirmedAt: Date.now() });
  if (engineGranted.error) {
    fail(`Confirmed engine run should succeed, got error: ${engineGranted.error.message || engineGranted.error}`);
  }
  const ledgerAfterEngineGrant = sovereignLedger.getEntries();
  if (ledgerAfterEngineGrant.length !== ledgerBeforeEngineGrant + 1) {
    fail(`Engine grant should append exactly 1 ledger entry, got ${ledgerAfterEngineGrant.length - ledgerBeforeEngineGrant}`);
  }
  const engineGrantEntry = ledgerAfterEngineGrant[ledgerAfterEngineGrant.length - 1];
  if (engineGrantEntry.capabilityId !== 'gate.test' || engineGrantEntry.authorization !== 'hitl_confirmed') {
    fail(`Engine grant entry should be gate.test/hitl_confirmed, got ${engineGrantEntry.capabilityId}/${engineGrantEntry.authorization}`);
  }
  // The grant timestamp must be recorded on the confirmed execution's evidence.
  const grantedAt = (engineGranted.evidence?.[0] as any)?.metadata?.grantedAt;
  if (typeof grantedAt !== 'number') {
    fail('Confirmed engine execution evidence should carry grantedAt');
  }
  console.log(`Gate 4b OK: engine ran confirmed run, hitl_confirmed entry ${engineGrantEntry.id}, grantedAt recorded.`);

  console.log(`All gate tests passed (refusal + grant, services + engine layers, real ledger).`);
}

runTests().catch((err) => {
  console.error('Gate test FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
