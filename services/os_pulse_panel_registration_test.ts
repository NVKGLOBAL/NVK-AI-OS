/**
 * OS PULSE / panel-registration pin test (fix round, 2026-11-27).
 *
 * Desktop check 2026-11-27 17:12–17:22 PT reported "PULSE PANEL +
 * ACTIVITY FEED NEVER LOADED". Investigation pinned the facts:
 *
 * - There is NO PULSE panel in this codebase — not in
 *   PANEL_DEFINITIONS, not in PanelManager, not in either deployed
 *   bundle (round 3 index-4sniP5GB.js or Matrix index-BYBNZRgD.js),
 *   and no "System activity feed" / "2.4k OPS" / "Synced N seconds
 *   ago" string exists anywhere in the source. The 17:12 sighting
 *   matches nothing this app can render and cannot be reproduced from
 *   this codebase; the two Dock crashes (#300/#310) then interrupted
 *   the session twice, which is the reproducible breakage.
 * - The registry unification (CanonicalCapabilityRegistry) is about
 *   CAPABILITIES, not panels. Panel registration is PANEL_DEFINITIONS
 *   (constants.ts) + App's panel switch — both byte-identical to round
 *   3 (0 diff lines), as is the ⌘K search (OmniSearchModal, 0 diff).
 * - The money surface is the console's deterministic catalog lookup,
 *   not a panel: "What is the NVK PULSE speaker?" answers $49.99
 *   (covered in depth by os_catalog_lookup_test.ts; pinned here too).
 * - ⌘K "PULSE" matching only "Glyph Visualization" is CORRECT: its
 *   description is "Detailed visualization of a single glyph pulse."
 *   — the word "pulse" in the description, not a missing panel.
 * - The activity feed (console liveEvents) renders an always-visible
 *   honest empty state ("Nothing yet — ask NVK something.") and only
 *   fills on real bus events; an idle session showing the empty state
 *   is by design, never fabricated activity.
 *
 * This test pins those facts so a future round cannot regress them
 * into a phantom panel or a broken lookup. Pure-module test — no DOM,
 * no model, no network. Run:
 * npx tsx services/os_pulse_panel_registration_test.ts
 * (also wired into `npm test`).
 */
import { PANEL_DEFINITIONS } from '../constants';
import { answerCatalogQuestion } from '../lib/catalogLookup';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) {
    console.log(`  PASS ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name} ${detail}`);
  }
};

console.log('PULSE / panel registration — the 17:12 PT report, pinned:');
const pulseMatches = PANEL_DEFINITIONS.filter(
  (p) => /pulse/i.test(p.id) || /pulse/i.test(p.name) || /pulse/i.test(p.description)
);
check('no PULSE panel exists by design (only Glyph Visualization matches "pulse", via its description)',
  pulseMatches.length === 1 && pulseMatches[0].id === 'GlyphVisualizationPanel',
  `matched: ${pulseMatches.map((p) => p.id).join(', ') || 'none'}`);
check('NVK System Monitor is registered (one of the 2 nodes the check saw)',
  PANEL_DEFINITIONS.some((p) => p.id === 'SystemMonitorPanel'));
check('Trait Gates are registered (the other node the check saw)',
  PANEL_DEFINITIONS.some((p) => p.id === 'TraitGatePanel' || p.id === 'TraitGateLock'));

console.log('PULSE money surface — the catalog lookup still answers:');
check('PULSE speaker question answers $49.99',
  (() => {
    const r = answerCatalogQuestion('What is the NVK PULSE speaker and how much does it cost?');
    return r.handled === true && (r.reply ?? '').includes('$49.99');
  })());
check('PULSE speaker reply links the store page',
  (() => {
    const r = answerCatalogQuestion('What is the NVK PULSE speaker and how much does it cost?');
    return (r.reply ?? '').includes('https://nvk.global/products/nvk-pulse-rgb-speaker');
  })());

if (failures > 0) {
  console.error(`os_pulse_panel_registration_test: ${failures} failure(s)`);
  process.exit(1);
}
console.log('os_pulse_panel_registration_test: all checks passed');
