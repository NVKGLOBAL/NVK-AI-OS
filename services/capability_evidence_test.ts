/**
 * Capability evidence test (rewritten 2026-11-22, defect 9.6).
 *
 * The old test only verified structure and printed "All tests passed
 * structurally" — it never executed anything. This test executes a REAL
 * filesystem.write through the TaskEngine against the running server and
 * asserts the full chain: TASK_STARTED → TASK_COMPLETED events, the file
 * actually written with the right content, and a SovereignLedger entry with
 * a hash.
 *
 * REQUIRES the server: start it with `npm run dev` (localhost:3000) before
 * `npm test`. If the server is not running, this test FAILS with
 * "server not running" instead of passing vacuously.
 * Override the base with NVK_TEST_API_BASE.
 */
import { eventBus } from './EventBus';
import { taskEngine } from './TaskEngine';
import { capabilityRegistry } from './CapabilityRegistry';
import { sovereignLedger } from './SovereignLedger';
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

  // 1. Task creation (status QUEUED; TASK_STARTED is published at creation —
  // cosmetic quirk A5, noted, not blocking).
  console.log('Testing Task Creation...');
  const task = taskEngine.createTask('Test File System Write');
  if (task.status !== 'QUEUED') {
    fail('Task should be QUEUED');
  }

  // 2. Capability availability.
  console.log('Testing Capability Registry - Available check...');
  const available = await capabilityRegistry.getAvailable();
  if (!available.find(c => c.id === 'filesystem.write')) {
    fail('filesystem.write capability should be available');
  }

  // 3. REAL execution: write a temp file through the TaskEngine.
  // A1 follow-up (2026-11-22): filesystem.write requires confirmation,
  // so the test passes an explicit grant — the same grant a user tapping
  // Confirm in the CommandLayer would give. The old code passed because
  // TaskEngine hardcoded confirmedByUser: true; that bypass is closed.
  const filename = `__evidence-test-${Date.now()}.txt`;
  const content = `NVK evidence test — ${new Date().toISOString()}\nIf you can read this, the write really happened.`;
  const ledgerBefore = sovereignLedger.getEntries().length;

  console.log('Testing Write Capability execution via TaskEngine (real write, real grant)...');
  await taskEngine.runCapability(task.id, 'filesystem.write', { filename, content }, { confirmedByUser: true });

  const finalTask = taskEngine.getTask(task.id);
  if (finalTask?.status !== 'COMPLETED') {
    fail(`Task should be COMPLETED, got ${finalTask?.status}: ${finalTask?.error || 'no error recorded'}`);
  }

  // 4. Event order: TASK_STARTED then TASK_COMPLETED for this task.
  const taskEvents = events.filter(e => (e as any).taskId === task.id).map(e => e.type);
  const startedIdx = taskEvents.indexOf('TASK_STARTED');
  const completedIdx = taskEvents.indexOf('TASK_COMPLETED');
  if (startedIdx === -1) fail('TASK_STARTED event was not published for the task');
  if (completedIdx === -1) fail('TASK_COMPLETED event was not published for the task');
  if (completedIdx < startedIdx) fail(`TASK_COMPLETED arrived before TASK_STARTED (${taskEvents.join(' -> ')})`);
  console.log(`Event order OK: ${taskEvents.join(' -> ')}`);

  // 5. The file really exists with the right content (via the download endpoint).
  const download = await nativeFetch(`${API_BASE}/api/fs/download/${encodeURIComponent(filename)}`);
  if (!download.ok) fail(`Written file could not be downloaded (${download.status})`);
  const downloaded = await download.text();
  if (downloaded !== content) fail('Downloaded file content does not match what was written');

  // 6. A ledger entry was appended with a hash.
  const ledgerAfter = sovereignLedger.getEntries();
  if (ledgerAfter.length !== ledgerBefore + 1) {
    fail(`Expected exactly 1 new ledger entry, got ${ledgerAfter.length - ledgerBefore}`);
  }
  const entry = ledgerAfter[ledgerAfter.length - 1];
  if (entry.capabilityId !== 'filesystem.write') {
    fail(`Ledger entry capabilityId should be filesystem.write, got ${entry.capabilityId}`);
  }
  // A1 follow-up (2026-11-22): the write ran on a real grant, so the
  // ledger must stamp hitl_confirmed — never auto_approved for a
  // capability that requires confirmation.
  if (entry.authorization !== 'hitl_confirmed') {
    fail(`Ledger entry authorization should be hitl_confirmed (real grant), got ${entry.authorization}`);
  }
  if (!/^[0-9a-f]{64}$/.test(entry.entryHash)) {
    fail(`Ledger entry has no valid SHA-256 hash: ${entry.entryHash}`);
  }
  if (!entry.previousHash || entry.previousHash.length !== 64) {
    fail('Ledger entry has no valid previous hash — the chain is broken');
  }
  console.log(`Ledger OK: entry ${entry.id} hash ${entry.entryHash.slice(0, 16)}…`);

  // 7. Cleanup: delete the temp file.
  const del = await nativeFetch(`${API_BASE}/api/fs/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename })
  });
  if (!del.ok) console.warn(`Warning: could not delete temp file ${filename} (${del.status})`);

  console.log('All evidence tests passed (real execution, real events, real ledger).');
}

runTests().catch((err) => {
  console.error('Evidence test FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
