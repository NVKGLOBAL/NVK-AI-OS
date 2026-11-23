/**
 * Axiom → panel mapping test (orb-click fix, 2026-11-23).
 *
 * Pure-module test — no server, no DOM, no model. Verifies the contract
 * the orb's tap path depends on: every axiom label resolves to a real
 * PANEL_DEFINITIONS id, unknown labels resolve to undefined, and the
 * axiom tap tolerance is sane (bigger than a node, far smaller than the
 * orbit, so it can never steal a core-orb tap).
 *
 * Run: npx tsx services/axiom_panel_mapping_test.ts
 * (also wired into `npm test`, first — it needs no server).
 */
import { AXIOM_PANEL_MAP, resolveAxiomPanelId, AXIOM_TAP_TOLERANCE_UNITS } from '../lib/axiomPanelMapping';
import { PANEL_DEFINITIONS } from '../constants';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) {
    console.log(`  PASS ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name} ${detail}`);
  }
};

const EXPECTED: Record<string, string> = {
  Network: 'EmergentLogicWeb',
  Security: 'TraitGatePanel',
  'Data Streams': 'CosmicResonanceDashboardPanel',
  Archive: 'DriftArchivePanel',
  Analytics: 'EntropyDiagnosticsPanel',
  Status: 'SystemHealthPanel',
};

console.log('Axiom → panel mapping:');
for (const [label, panelId] of Object.entries(EXPECTED)) {
  check(`axiom '${label}' resolves to '${panelId}'`, resolveAxiomPanelId(label) === panelId);
  check(`panel '${panelId}' exists in PANEL_DEFINITIONS`, PANEL_DEFINITIONS.some((p) => p.id === panelId));
}
check('mapping covers exactly 6 axioms', Object.keys(AXIOM_PANEL_MAP).length === 6);
check("unknown axiom label resolves to undefined", resolveAxiomPanelId('Kindness Protocol') === undefined);
check('empty label resolves to undefined', resolveAxiomPanelId('') === undefined);

console.log('Axiom tap tolerance:');
check('tolerance > node radius (0.8)', AXIOM_TAP_TOLERANCE_UNITS > 0.8);
check('tolerance < orbit radius (15)', AXIOM_TAP_TOLERANCE_UNITS < 15);
check('tolerance < core-orb proximity fallback (6.5)', AXIOM_TAP_TOLERANCE_UNITS < 6.5);

if (failures > 0) {
  console.error(`Axiom mapping test FAILED: ${failures} failure(s)`);
  process.exit(1);
}
console.log('Axiom mapping test PASSED');
