/**
 * Registry unification + matrix validation test (matrix item 3, 2026-11-27).
 *
 * The registries held three different truths: services had 5 caps, the
 * runtime had 10 (with a second, in-memory filesystem.write), and the
 * static JSON claimed 8 rows — one of them (reasoning.analysis) existing
 * nowhere else. This test asserts the unification:
 *
 *   (1) ONE source of truth: the services adapter, the runtime adapter
 *       and the canonical registry expose the same capability ids, and
 *       get()/getCapability() resolve the same entry on both sides;
 *   (2) filesystem.write is exactly ONE entry in both adapters, and it
 *       is the real server-backed one (requiresConfirmation: true) — not
 *       the old in-memory artifact version;
 *   (3) the JSON mirrors the registry: every shipped registry capability
 *       appears in NVK_CAPABILITY_MATRIX.json with the same static
 *       `available` flag, and every JSON row appears in the registry
 *       with the same flag; false rows carry reasons on both sides;
 *   (4) the rows this program owns are pinned: reasoning.analysis and
 *       calculation.math are true; web.search and documents.create are
 *       true and UNCHANGED (Worker B's items — the coordinator flips
 *       nothing for them here).
 *
 * Static `available` is what the JSON mirrors (wired truth). Live
 * availability can be stricter — reasoning.analysis is live-available
 * only with a model connected — and is covered by the reasoning test,
 * not this one. Runtime-registered extras (e.g. the gate test's
 * gate.test) are visible in getAll() but are not shipped, so the JSON
 * does not list them; getShipped() is the shipped set.
 *
 * No server, no DOM, no model, no network.
 *
 * Run: npx tsx src/nvk/capabilities/matrix_registry_test.ts
 * (coordinator wires it into `npm test`.)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { capabilityRegistry as runtimeRegistry } from './CapabilityRegistry';
import { capabilityRegistry as servicesRegistry } from '../../../services/CapabilityRegistry';
import { unifiedCapabilityRegistry } from './CanonicalCapabilityRegistry';

function fail(message: string): never {
  throw new Error(message);
}

interface MatrixRow {
  id: string;
  name: string;
  available: boolean;
  reason?: string;
}

async function runTests() {
  // 0. Read the filed matrix.
  const matrixPath = fileURLToPath(new URL('../../../NVK_CAPABILITY_MATRIX.json', import.meta.url));
  const matrix = JSON.parse(readFileSync(matrixPath, 'utf8'));
  if (matrix.matrix_version !== '2.2.0') fail(`Matrix version should be 2.2.0, got ${matrix.matrix_version}`);
  const rows: MatrixRow[] = Object.values(matrix.categories ?? {}).flat() as MatrixRow[];
  const rowById = new Map(rows.map((r) => [r.id, r]));
  if (rowById.size !== rows.length) fail('Matrix JSON has duplicate capability ids');
  console.log(`Matrix file OK: version ${matrix.matrix_version}, ${rows.length} rows.`);

  // 1. One source of truth across both adapters and the canonical registry.
  console.log('Unification 1: one registry, two adapters, same ids...');
  const canonicalIds = unifiedCapabilityRegistry.getAll().map((c) => c.id).sort();
  const runtimeIds = runtimeRegistry.getAll().map((c) => c.id).sort();
  const servicesIds = servicesRegistry.getAll().map((c) => c.id).sort();
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
  if (!same(canonicalIds, runtimeIds)) {
    fail(`Runtime adapter ids differ from canonical: ${JSON.stringify(runtimeIds)} vs ${JSON.stringify(canonicalIds)}`);
  }
  if (!same(canonicalIds, servicesIds)) {
    fail(`Services adapter ids differ from canonical: ${JSON.stringify(servicesIds)} vs ${JSON.stringify(canonicalIds)}`);
  }
  for (const id of canonicalIds) {
    const viaRuntime = runtimeRegistry.getCapability(id);
    const viaServices = servicesRegistry.get(id);
    if (!viaRuntime || !viaServices) fail(`Capability ${id} is not resolvable through both adapters`);
    if (viaRuntime.id !== id || viaServices.id !== id) fail(`Adapters disagree on the id for ${id}`);
    if (viaRuntime.available !== unifiedCapabilityRegistry.get(id)?.available) {
      fail(`Runtime view of ${id} disagrees with canonical static availability`);
    }
  }
  console.log(`  One truth OK: ${canonicalIds.length} capabilities visible identically through both adapters.`);

  // 1b. Runtime-registered extras are visible but not shipped.
  runtimeRegistry.register({
    id: 'matrix.test.tmp',
    name: 'Matrix Test Temp',
    description: 'Test-only capability, never shipped.',
    category: 'workflow',
    available: true,
    executor: 'matrix.test.tmp',
    requiresPermission: false,
    requiresConfirmation: false,
    execute: async () => ({ verified: true }),
    verify: async () => true
  });
  if (!unifiedCapabilityRegistry.get('matrix.test.tmp')) fail('Runtime-registered extra should be visible in the unified registry');
  if (unifiedCapabilityRegistry.getShipped().some((c) => c.id === 'matrix.test.tmp')) {
    fail('Runtime-registered extra must not count as shipped');
  }
  console.log('  Runtime registration OK: extras visible in getAll(), excluded from getShipped().');

  // 2. filesystem.write is ONE entry, and it is the real server-backed one.
  console.log('Unification 2: filesystem.write is one real entry...');
  const fsRuntime = runtimeRegistry.getCapability('filesystem.write');
  const fsServices = servicesRegistry.get('filesystem.write');
  const fsCanonical = unifiedCapabilityRegistry.get('filesystem.write');
  if (!fsRuntime || !fsServices || !fsCanonical) fail('filesystem.write is missing from a registry');
  if (runtimeRegistry.getAll().filter((c) => c.id === 'filesystem.write').length !== 1) {
    fail('Runtime registry holds more than one filesystem.write');
  }
  if (servicesRegistry.getAll().filter((c) => c.id === 'filesystem.write').length !== 1) {
    fail('Services registry holds more than one filesystem.write');
  }
  if (fsRuntime.requiresConfirmation !== true || fsServices.requiresConfirmation !== true) {
    fail('filesystem.write must require confirmation (the real server-backed write) — the in-memory version did not');
  }
  if (fsRuntime.executor !== '') {
    // The canonical entry carries the services executor (empty: the
    // services shape has no executor field); the runtime adapter must
    // not resurrect the artifactRegistry executor of the old duplicate.
    fail(`filesystem.write executor should be the services one (empty), got ${JSON.stringify(fsRuntime.executor)}`);
  }
  console.log('  filesystem.write OK: one entry, requiresConfirmation: true, server-backed.');

  // 3. JSON mirrors the shipped registry, both directions.
  console.log('Unification 3: JSON mirrors the shipped registry...');
  const shipped = unifiedCapabilityRegistry.getShipped();
  if (shipped.length !== rows.length) {
    fail(`Shipped registry has ${shipped.length} capabilities but the JSON has ${rows.length} rows — they must match exactly`);
  }
  for (const cap of shipped) {
    const row = rowById.get(cap.id);
    if (!row) fail(`Shipped capability ${cap.id} is missing from NVK_CAPABILITY_MATRIX.json`);
    if (row.available !== cap.available) {
      fail(`JSON row ${cap.id} says available=${row.available} but the registry says ${cap.available}`);
    }
    if (!cap.available) {
      if (!row.reason || row.reason.length === 0) fail(`JSON row ${cap.id} is false but carries no reason`);
      if (row.reason !== cap.unavailableReason) {
        fail(`JSON reason for ${cap.id} (${JSON.stringify(row.reason)}) does not match the registry reason (${JSON.stringify(cap.unavailableReason)})`);
      }
    }
  }
  for (const row of rows) {
    const cap = shipped.find((c) => c.id === row.id);
    if (!cap) fail(`JSON row ${row.id} has no shipped registry capability behind it`);
    if (row.available !== cap.available) {
      fail(`Registry capability ${row.id} says available=${cap.available} but the JSON says ${row.available}`);
    }
  }
  console.log(`  JSON mirror OK: ${shipped.length} shipped capabilities, ${rows.length} rows, all flags and false-reasons match.`);

  // 4. Pinned rows: reasoning + milestone true; B's rows true and unchanged.
  console.log('Unification 4: pinned rows...');
  const pinned: Array<[string, boolean]> = [
    ['reasoning.analysis', true],
    ['calculation.math', true],
    ['web.search', true],
    ['documents.create', true],
    ['image.generation', false],
    ['application.launch', false],
    ['email.send', false],
    ['messaging.send', false]
  ];
  for (const [id, available] of pinned) {
    const row = rowById.get(id);
    const cap = unifiedCapabilityRegistry.get(id);
    if (!row || !cap) fail(`Pinned capability ${id} is missing from the JSON or the registry`);
    if (row.available !== available) fail(`JSON row ${id} should be available=${available}, got ${row.available}`);
    if (cap.available !== available) fail(`Registry ${id} should be available=${available}, got ${cap.available}`);
  }
  const webRow = rowById.get('web.search')!;
  const docsRow = rowById.get('documents.create')!;
  if (webRow.name !== 'Web Exploration & Fetch') fail('web.search row name changed — B’s rows must stay untouched');
  if (docsRow.name !== 'Document & Pitch Deck Artifacts') fail('documents.create row name changed — B’s rows must stay untouched');
  console.log('  Pinned rows OK: reasoning + milestone true, web.search + documents.create true and unchanged, four false rows false with reasons.');

  console.log('All matrix/registry tests passed (one truth, one filesystem.write, JSON mirrors registry).');
}

runTests().catch((err) => {
  console.error('Matrix/registry test FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
