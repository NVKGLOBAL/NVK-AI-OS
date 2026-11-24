/**
 * OS panel bus + command dispatcher test (MCNA slice 3, 2026-11-23).
 *
 * Pure-module test — no server, no DOM, no model. Verifies the contract
 * the voice/text panel-control loop depends on: the bus opens/closes/
 * focuses panels through a bridge, refuses dead/unknown panels honestly
 * (boolean false + a reason in lastError), stores per-panel color/hue
 * and aura state, enumerates all 80 panels with the 7 dead ones
 * labelled, and the deterministic dispatcher resolves the same command
 * set as CODEXA's slice-2 dispatcher (open, turn <color>, mood -> aura;
 * unknown panel/color and Buga refused, never faked).
 *
 * Run: npx tsx services/os_panel_bus_test.ts
 * (also wired into `npm test`, after the existing three — it needs no server).
 */
import {
  registerOsPanelBridge,
  openOsPanel,
  closeOsPanel,
  focusOsPanel,
  setOsPanelProperty,
  setOsAura,
  getOsPanel,
  getOsPanelBusSnapshot,
  listOsPanels,
  resetOsPanelBusStore,
  DEAD_PANEL_IDS,
  DEAD_PANEL_REASONS,
  isOsPanelDead,
} from '../lib/stores/osPanelBusStore';
import { dispatchPanelCommand } from '../services/OsPanelCommandDispatcher';
import { setSeekerAura } from '../services/OsPanelBusService';
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

resetOsPanelBusStore();

// Fake bridge — records what the bus asked App to do.
const bridgeCalls: string[] = [];
registerOsPanelBridge({
  openPanel: (id) => { bridgeCalls.push(`open:${id}`); return true; },
  closePanel: (id) => { bridgeCalls.push(`close:${id}`); return true; },
  focusPanel: (id) => { bridgeCalls.push(`focus:${id}`); return true; },
});

console.log('OS panel bus:');
check('open a live panel succeeds, calls the bridge, and reads back open',
  openOsPanel('FlowerOfLifeEntropyExplorer') === true
  && bridgeCalls.includes('open:FlowerOfLifeEntropyExplorer')
  && getOsPanel('FlowerOfLifeEntropyExplorer')?.open === true);
check('opening the same panel again is a no-op success',
  openOsPanel('FlowerOfLifeEntropyExplorer') === true);
check('open a dead panel is refused honestly (false + a dead reason), bridge not called',
  (() => {
    const ok = openOsPanel('DriftArchivePanel');
    return ok === false
      && /dead/i.test(getOsPanelBusSnapshot().lastError ?? '')
      && !bridgeCalls.includes('open:DriftArchivePanel');
  })());
check('open an unknown panel is refused honestly',
  (() => {
    const ok = openOsPanel('NoSuchPanel');
    return ok === false && /not in the panel catalog/i.test(getOsPanelBusSnapshot().lastError ?? '');
  })());
check('set panel color green stores the name and hue 120',
  (() => {
    const okColor = setOsPanelProperty('FlowerOfLifeEntropyExplorer', 'color', 'green');
    const okHue = setOsPanelProperty('FlowerOfLifeEntropyExplorer', 'hue', 120);
    const props = getOsPanel('FlowerOfLifeEntropyExplorer')?.properties ?? {};
    return okColor === true && okHue === true && props.color === 'green' && props.hue === 120;
  })());
check('set panel color on a dead panel is refused',
  setOsPanelProperty('DriftArchivePanel', 'color', 'green') === false);
check('set seeker aura blue stores mood + hue 210 in the snapshot',
  (() => {
    setOsAura('blue', 'blue', 210, '#3b82f6');
    const aura = getOsPanelBusSnapshot().aura;
    return aura.mood === 'blue' && aura.colorName === 'blue' && aura.hue === 210 && aura.hex === '#3b82f6';
  })());
check('focus calls the bridge',
  focusOsPanel('FlowerOfLifeEntropyExplorer') === true
  && bridgeCalls.includes('focus:FlowerOfLifeEntropyExplorer'));
check('close a panel succeeds, calls the bridge, and reads back closed',
  closeOsPanel('FlowerOfLifeEntropyExplorer') === true
  && bridgeCalls.includes('close:FlowerOfLifeEntropyExplorer')
  && getOsPanel('FlowerOfLifeEntropyExplorer')?.open === false);
check('close an already-closed panel is a no-op success (bridge always succeeds)',
  closeOsPanel('FlowerOfLifeEntropyExplorer') === true);
check('close a dead panel is refused honestly',
  closeOsPanel('DriftArchivePanel') === false);
check('setSeekerAura service writes the same aura state',
  (() => {
    setSeekerAura('happy', 'gold', 45, '#f59e0b');
    const aura = getOsPanelBusSnapshot().aura;
    return aura.mood === 'happy' && aura.hue === 45;
  })());

console.log('OS panel inventory:');
const panels = listOsPanels();
check('listPanels covers all 80 panels in PANEL_DEFINITIONS',
  panels.length === PANEL_DEFINITIONS.length && panels.length === 80,
  `got ${panels.length}, definitions ${PANEL_DEFINITIONS.length}`);
check('exactly 7 dead panels, matching DEAD_PANEL_IDS',
  panels.filter((p) => p.status === 'dead').length === 7
  && DEAD_PANEL_IDS.size === 7
  && [...DEAD_PANEL_IDS].every((id) => isOsPanelDead(id)));
check('every dead panel entry carries a reason in DEAD_PANEL_REASONS',
  panels.filter((p) => p.status === 'dead')
    .every((p) => (DEAD_PANEL_REASONS[p.id] ?? '').length > 0));
check('every dead panel id is a real PANEL_DEFINITIONS id',
  [...DEAD_PANEL_IDS].every((id) => PANEL_DEFINITIONS.some((p) => p.id === id)));

console.log('OS panel command dispatcher:');
resetOsPanelBusStore();
registerOsPanelBridge({
  openPanel: (id) => { bridgeCalls.push(`open:${id}`); return true; },
  closePanel: (id) => { bridgeCalls.push(`close:${id}`); return true; },
  focusPanel: (id) => { bridgeCalls.push(`focus:${id}`); return true; },
});
check('"open the Flower of Life panel" opens it',
  (() => {
    const r = dispatchPanelCommand('open the Flower of Life panel');
    return r.handled === true && r.ok === true
      && getOsPanel('FlowerOfLifeEntropyExplorer')?.open === true
      && /Flower of Life/i.test(r.confirmation ?? '');
  })());
check('"turn it green" colors the focused panel green (hue 120)',
  (() => {
    const r = dispatchPanelCommand('turn it green');
    const props = getOsPanel('FlowerOfLifeEntropyExplorer')?.properties ?? {};
    return r.handled === true && r.ok === true && props.hue === 120 && props.color === 'green';
  })());
check('"I\'m feeling blue today" sets the seeker aura to blue (hue 210)',
  (() => {
    const r = dispatchPanelCommand("I'm feeling blue today");
    const aura = getOsPanelBusSnapshot().aura;
    return r.handled === true && r.ok === true
      && /blue/i.test(r.confirmation ?? '')
      && aura.mood === 'blue' && aura.hue === 210;
  })());
check('unknown panel is refused honestly, never opened',
  (() => {
    const r = dispatchPanelCommand('open the Quantum Widget panel');
    return r.handled === true && r.ok === false && /couldn't find a panel/i.test(r.reason ?? '');
  })());
check('unknown color is refused honestly',
  (() => {
    const r = dispatchPanelCommand('turn the Flower of Life ultraviolet');
    return r.handled === true && r.ok === false && /isn't a color/i.test(r.reason ?? '');
  })());
check('Buga is refused honestly — no Buga panel exists',
  (() => {
    const r = dispatchPanelCommand('open the Buga panel');
    return r.handled === true && r.ok === false && /no Buga panel/i.test(r.reason ?? '');
  })());
check('a dead panel is refused honestly by the dispatcher',
  (() => {
    const r = dispatchPanelCommand('open the Drift Archive panel');
    return r.handled === true && r.ok === false && /dead/i.test(r.reason ?? '');
  })());
check('an ordinary question is not a panel command (falls through to the model)',
  dispatchPanelCommand('what is the weather like today').handled === false);
check('close command works through the dispatcher',
  (() => {
    const r = dispatchPanelCommand('close the Flower of Life panel');
    return r.handled === true && r.ok === true
      && getOsPanel('FlowerOfLifeEntropyExplorer')?.open === false;
  })());

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll OS panel bus + dispatcher checks passed.');
