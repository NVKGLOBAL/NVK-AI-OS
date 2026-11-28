/**
 * Evidence-through-the-ledger tests (matrix program, 2026-11-27 — item 8).
 *
 * The runtime used to write evidence to two stores: the hashed
 * SovereignLedger AND an unhashed in-memory Map (EvidenceStore). The Map
 * is retired — EvidenceStore.ts is now a thin adapter over the ledger.
 *
 * 1. Evidence written via the runtime path (EvidenceStore adapter) is
 *    hashed (entryHash present, non-empty), persisted, and readable back
 *    by taskId with its ledger hash attached.
 * 2. The chain re-verifies: sovereignLedger.verifyChain() passes on the
 *    entries written, and FAILS when an entry is tampered with.
 * 3. Source pins: no Map remains in EvidenceStore.ts; ExecutionEngine no
 *    longer imports or writes to the old store and stamps the taskId into
 *    ledger evidence metadata.
 *
 * Run: npx tsx services/os_evidence_ledger_test.ts
 * (NOT yet wired into `npm test` — the coordinator wires it at integration.)
 * Note: the ledger persists to localStorage in a browser; under node
 * (tsx) localStorage is absent, so persistence here is the in-memory
 * chain + the persist() no-op guard — the hashed + re-verifiable claims
 * are what this file proves. Browser persistence is the ledger's
 * pre-existing localStorage path, unchanged by this item.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evidenceStore } from '../src/nvk/evidence/EvidenceStore';
import { sovereignLedger } from './SovereignLedger';

const ROOT = join(import.meta.dirname, '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) {
    console.log(`  PASS ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name} ${detail}`);
  }
};

async function main() {
  console.log('Evidence-through-the-ledger tests (item 8):');
  const taskId = `test-task-${Date.now()}`;
  const before = sovereignLedger.getEntries().length;

  // --- 1. Write via the runtime path, read back hashed + persisted. ---
  const entry = await evidenceStore.addEvidence(taskId, {
    source: 'os_evidence_ledger_test',
    title: '2+2 milestone',
    retrievedAt: new Date().toISOString(),
    claim: 'calculation 2+2 = 4',
  });
  check('ledger entry written with a real hash', typeof entry.entryHash === 'string' && entry.entryHash.length >= 16, entry.entryHash);
  check('ledger entry links to the previous hash', entry.previousHash.length >= 16);
  check('ledger grew by exactly one entry', sovereignLedger.getEntries().length === before + 1);

  const back = evidenceStore.getEvidenceForTask(taskId);
  check('evidence reads back by taskId', back.length === 1, `got ${back.length}`);
  check(
    'read-back item carries its ledger hash + entry id',
    (back[0]?.metadata as Record<string, unknown> | undefined)?.ledgerHash === entry.entryHash &&
      (back[0]?.metadata as Record<string, unknown> | undefined)?.ledgerEntryId === entry.id,
  );
  check(
    'read-back item keeps its claim',
    (back[0]?.metadata as Record<string, unknown> | undefined)?.claim === 'calculation 2+2 = 4',
  );
  check('another task reads back nothing', evidenceStore.getEvidenceForTask(`${taskId}-other`).length === 0);

  // A second write for the same task appends a second hashed entry.
  await evidenceStore.addEvidence(taskId, {
    source: 'os_evidence_ledger_test',
    retrievedAt: new Date().toISOString(),
    claim: 'second item same task',
  });
  check('second write for the same task reads back as two items', evidenceStore.getEvidenceForTask(taskId).length === 2);

  // --- 2. The chain re-verifies — and detects tampering. ---
  const ok = await sovereignLedger.verifyChain();
  check('chain verifies after the writes', ok.valid && ok.brokenAt === -1, JSON.stringify(ok));

  const entries = sovereignLedger.getEntries();
  const last = entries[entries.length - 1];
  const savedSummary = last.inputSummary;
  (last as { inputSummary: string }).inputSummary = 'TAMPERED';
  const tampered = await sovereignLedger.verifyChain();
  check('chain FAILS after tampering, naming the broken entry', !tampered.valid && tampered.brokenAt === entries.length - 1, JSON.stringify(tampered));
  (last as { inputSummary: string }).inputSummary = savedSummary;
  const restored = await sovereignLedger.verifyChain();
  check('chain verifies again after the tamper is undone', restored.valid);

  // --- 3. Source pins: the unhashed Map is gone. ---
  const storeSrc = read('src/nvk/evidence/EvidenceStore.ts');
  check('EvidenceStore has no Map left', !storeSrc.includes('new Map') && !storeSrc.includes('evidenceByTask'));
  check('EvidenceStore delegates to the SovereignLedger', storeSrc.includes('sovereignLedger.append'));
  const engineSrc = read('src/nvk/runtime/ExecutionEngine.ts');
  check('ExecutionEngine no longer imports the old store', !engineSrc.includes('evidenceStore'));
  check('ExecutionEngine no longer writes to the old store', !engineSrc.includes('addEvidence('));
  check(
    'ExecutionEngine stamps taskId into ledger evidence metadata',
    engineSrc.includes('taskId: graph.taskId'),
  );

  console.log(failures === 0 ? 'All evidence-ledger checks passed.' : `${failures} check(s) failed.`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
