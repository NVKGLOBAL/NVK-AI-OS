/**
 * Capability milestone test (matrix item 2, 2026-11-27).
 *
 * The old evidence test passed "structurally" by construction (design
 * spec D9 calls it test theater): it never executed a matrix capability
 * end to end. This test proves the pipeline for real, following the
 * Agent's milestone-10 pattern (2+2 -> 4):
 *
 *   registry lookup of calculation.math (BOTH adapters resolve the same
 *   canonical entry) -> execute(2+2) -> result 4 -> evidence recorded
 *   (result evidence + a hashed SovereignLedger entry + ACTION_STARTED /
 *   ACTION_COMPLETED events), through THREE paths: the runtime entry
 *   directly, the audited services path (executeWithAudit), and the
 *   runtime ExecutionEngine plan path.
 *
 * Two controls prove it is not theater: an unparseable question throws
 * instead of producing a number (the old code "computed" everything to
 * 10), and a different expression (3*7) computes 21, not 4.
 *
 * No server, no DOM, no model, no network: calculation is local and the
 * ledger is in-memory under Node.
 *
 * Run: npx tsx src/nvk/capabilities/capability_milestone_test.ts
 * (coordinator wires it into `npm test`.)
 */
import { capabilityRegistry as runtimeRegistry } from './CapabilityRegistry';
import { capabilityRegistry as servicesRegistry } from '../../../services/CapabilityRegistry';
import { unifiedCapabilityRegistry } from './CanonicalCapabilityRegistry';
import { sovereignLedger } from '../../../services/SovereignLedger';
import { eventBus } from '../../../services/EventBus';
import { executionEngine } from '../runtime/ExecutionEngine';
import { TaskGraph } from '../planning/TaskGraph';
import type { NVKEvent } from '../../../types';

function fail(message: string): never {
  throw new Error(message);
}

function parseResultNumber(result: string): number {
  const m = /^Result:\s*(-?[\d.]+)\s*$/.exec((result || '').trim());
  if (!m) fail(`Expected a "Result: <number>" string, got: ${JSON.stringify(result)}`);
  return Number(m![1]);
}

async function runTests() {
  // 0. Both adapters resolve the same canonical entry.
  console.log('Milestone 0: registry lookup (both adapters, one truth)...');
  const runtimeCap = runtimeRegistry.getCapability('calculation.math');
  const servicesCap = servicesRegistry.get('calculation.math');
  const canonicalCap = unifiedCapabilityRegistry.get('calculation.math');
  if (!runtimeCap) fail('runtime registry has no calculation.math');
  if (!servicesCap) fail('services registry has no calculation.math');
  if (!canonicalCap) fail('canonical registry has no calculation.math');
  if (runtimeCap.id !== 'calculation.math' || servicesCap.id !== 'calculation.math') {
    fail('adapters disagree on the calculation.math id');
  }
  if (canonicalCap.id !== runtimeCap.id) fail('runtime adapter does not resolve the canonical entry');
  console.log('  Lookup OK: calculation.math in runtime + services + canonical registries.');

  // 1. Direct execute through the runtime entry: 2+2 -> 4, with evidence.
  console.log('Milestone 1: direct execute 2+2 via the runtime entry...');
  const out: any = await runtimeCap.execute({ query: '2+2' });
  if (out.result !== 'Result: 4') fail(`Expected result "Result: 4", got ${JSON.stringify(out.result)}`);
  if (out.message !== 'Computed locally: 4') fail(`Expected message "Computed locally: 4", got ${JSON.stringify(out.message)}`);
  if (out.verified !== true) fail('calculation.math result should be verified: true');
  if (parseResultNumber(out.result) !== 4) fail('Parsed result value is not 4');
  if (!Array.isArray(out.evidence) || out.evidence.length === 0) {
    fail('calculation.math returned no evidence — a claimed action needs a receipt');
  }
  const calcEvidence = out.evidence[0];
  if (calcEvidence.reference !== 'calculation:2+2') {
    fail(`Evidence reference should cite the real expression, got ${JSON.stringify(calcEvidence.reference)}`);
  }
  if (calcEvidence.metadata?.value !== 4) fail('Evidence metadata should carry value 4');
  console.log(`  Direct execute OK: ${out.result} (evidence ${calcEvidence.reference}).`);

  // 2. Controls: unparseable input throws; a different expression computes.
  console.log('Milestone 2: controls (unparseable throws, 3*7 computes 21)...');
  let threw = false;
  try {
    await runtimeCap.execute({ query: 'what is the meaning of life' });
  } catch (e: any) {
    threw = true;
    if (!/Calculation unavailable/.test(e.message)) fail(`Wrong error for unparseable input: ${e.message}`);
  }
  if (!threw) fail('Unparseable input should throw, not produce a number (old code "computed" everything to 10)');
  const other: any = await runtimeCap.execute({ query: '3*7' });
  if (parseResultNumber(other.result) !== 21) fail(`Expected 3*7 = 21, got ${JSON.stringify(other.result)}`);
  console.log('  Controls OK: unparseable throws, 3*7 = 21.');

  // 3. Audited services path: executeWithAudit -> success + ledger + events.
  console.log('Milestone 3: audited path (executeWithAudit 2+2)...');
  const events: NVKEvent[] = [];
  eventBus.subscribe((e) => events.push(e));
  const ledgerBefore = sovereignLedger.getEntries().length;
  const eventsBefore = events.length;
  const audited = await servicesRegistry.executeWithAudit('calculation.math', { query: '2+2' }, {});
  if (audited.success !== true) fail(`Audited 2+2 should succeed, got error: ${audited.error || 'none'}`);
  if ((audited.output as any)?.result !== 'Result: 4') {
    fail(`Audited output should carry "Result: 4", got ${JSON.stringify(audited.output)}`);
  }
  if (!Array.isArray(audited.evidence) || audited.evidence.length === 0) {
    fail('Audited result carries no evidence');
  }
  const ledgerAfter = sovereignLedger.getEntries();
  if (ledgerAfter.length !== ledgerBefore + 1) {
    fail(`Expected exactly 1 new ledger entry, got ${ledgerAfter.length - ledgerBefore}`);
  }
  const entry = ledgerAfter[ledgerAfter.length - 1];
  if (entry.capabilityId !== 'calculation.math') fail(`Ledger entry capabilityId should be calculation.math, got ${entry.capabilityId}`);
  if (entry.authorization !== 'auto_approved') fail(`Ledger entry authorization should be auto_approved, got ${entry.authorization}`);
  if (!/^[0-9a-f]{64}$/.test(entry.entryHash)) fail(`Ledger entry has no valid SHA-256 hash: ${entry.entryHash}`);
  if (!/^[0-9a-f]{64}$/.test(entry.previousHash)) fail('Ledger entry has no valid previous hash — the chain is broken');
  const runEvents = events.slice(eventsBefore).map((e) => e.type);
  const startedIdx = runEvents.indexOf('ACTION_STARTED');
  const completedIdx = runEvents.indexOf('ACTION_COMPLETED');
  if (startedIdx === -1) fail('ACTION_STARTED was not published for the audited run');
  if (completedIdx === -1) fail('ACTION_COMPLETED was not published for the audited run');
  if (completedIdx < startedIdx) fail(`ACTION_COMPLETED arrived before ACTION_STARTED (${runEvents.join(' -> ')})`);
  console.log(`  Audited OK: ledger entry ${entry.id} hash ${entry.entryHash.slice(0, 16)}…, events ${runEvents.join(' -> ')}.`);

  // 4. Runtime engine path: ExecutionEngine plan with a calculation node.
  console.log('Milestone 4: engine path (ExecutionEngine plan, 2+2 node)...');
  const ledgerBeforeEngine = sovereignLedger.getEntries().length;
  const graph = new TaskGraph('milestone-2plus2');
  graph.addNode({
    id: 'n1',
    objective: 'milestone 2+2',
    capability: 'calculation.math',
    dependencies: [],
    status: 'pending',
    input: { query: '2+2' }
  });
  const eng = await executionEngine.executePlan(graph, {});
  if (eng.error) fail(`Engine plan should succeed, got error: ${eng.error.message || eng.error}`);
  if ((eng.result as any)?.result !== 'Result: 4') {
    fail(`Engine result should be "Result: 4", got ${JSON.stringify(eng.result)}`);
  }
  if (parseResultNumber((eng.result as any).result) !== 4) fail('Engine result value is not 4');
  if (!Array.isArray(eng.evidence) || eng.evidence.length === 0) fail('Engine run returned no evidence');
  if (graph.getNode('n1')?.status !== 'complete') fail(`Engine node should be complete, got ${graph.getNode('n1')?.status}`);
  const ledgerAfterEngine = sovereignLedger.getEntries();
  if (ledgerAfterEngine.length !== ledgerBeforeEngine + 1) {
    fail(`Engine run should append exactly 1 ledger entry, got ${ledgerAfterEngine.length - ledgerBeforeEngine}`);
  }
  const engineEntry = ledgerAfterEngine[ledgerAfterEngine.length - 1];
  if (engineEntry.capabilityId !== 'calculation.math') {
    fail(`Engine ledger entry capabilityId should be calculation.math, got ${engineEntry.capabilityId}`);
  }
  console.log(`  Engine OK: node complete, ledger entry ${engineEntry.id}, evidence ${eng.evidence.length} item(s).`);

  console.log('All milestone tests passed (lookup -> execute 2+2 -> 4 -> evidence recorded, three paths).');
}

runTests().catch((err) => {
  console.error('Milestone test FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
