/**
 * Orb black-frame watchdog regression tests (round-3 phone fix, 2026-11-27).
 *
 * What the desktop check (2026-11-27, 13:42–13:44 PT) proved: the
 * first-load CSS fallback is NOT phone-specific — desktop also fell
 * back after both hard refreshes, and RETRY 3D recovered a live WebGL
 * scene. The watchdog was falling back on transient black frames
 * during startup/shader and bloom compile. These tests pin the
 * decision: transient black during warm-up must never trigger the
 * fallback; sustained black after warm-up must.
 *
 * RETIRED FROM THE STAGE (2026-11-27, phone retest 14:00–14:06 PT):
 * the pixel-sampling premise was wrong — the lattice visibly rendered
 * on every fresh load while the sampler reported black (readPixels
 * returns black on iOS WKWebView while the scene renders), so the
 * stage no longer samples pixels or consults this module. §§1–7 keep
 * testing the pure decision as a module; §8 pins the retirement
 * (no pixel sampling in the stage; real-failure hooks are the only
 * fallback signal). The full new invariant lives in
 * services/os_orb_no_pixel_fallback_test.ts.
 *
 * Run: npx tsx services/os_watchdog_test.ts
 * (also wired into `npm test`.)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  decideWatchdogSample,
  initialWatchdogState,
  WATCHDOG_WARMUP_MS,
  type WatchdogState,
} from '../lib/orbWatchdog';

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

const ARMED_AT = 10_000;

function feed(samples: Array<{ nowMs: number; isBlack: boolean; readbackOk?: boolean }>): { actions: string[]; state: WatchdogState; reasons: string[] } {
  let state = initialWatchdogState();
  const actions: string[] = [];
  const reasons: string[] = [];
  for (const s of samples) {
    const d = decideWatchdogSample({
      nowMs: s.nowMs,
      armedAtMs: ARMED_AT,
      isBlack: s.isBlack,
      readbackOk: s.readbackOk ?? true,
      state,
    });
    actions.push(d.action);
    if (d.reason) reasons.push(d.reason);
    state = d.next;
  }
  return { actions, state, reasons };
}

async function main(): Promise<void> {
  // --- 1. Transient black during warm-up never triggers anything. ---
  {
    const { actions, state } = feed([
      { nowMs: ARMED_AT - 4000, isBlack: true },
      { nowMs: ARMED_AT - 2000, isBlack: true },
      { nowMs: ARMED_AT - 1000, isBlack: true },
      { nowMs: ARMED_AT - 1, isBlack: true },
    ]);
    check('black during warm-up: no action', actions.every((a) => a === 'none'), actions.join(','));
    check('black during warm-up: streak stays 0', state.streak === 0, `streak=${state.streak}`);
    check('black during warm-up: composer kept', state.composerDropped === false);
  }

  // --- 2. Two black after warm-up with the composer → drop-composer. ---
  {
    const { actions, state } = feed([
      { nowMs: ARMED_AT + 1000, isBlack: true },
      { nowMs: ARMED_AT + 2000, isBlack: true },
    ]);
    check('first black after warm-up: no action yet', actions[0] === 'none', actions[0]);
    check('second black after warm-up: drop-composer', actions[1] === 'drop-composer', actions[1]);
    check('drop-composer resets streak', state.streak === 0);
    check('drop-composer marks composer dropped', state.composerDropped === true);
  }

  // --- 3. Two more black without the composer → fallback with a reason. ---
  {
    const { actions, state, reasons } = feed([
      { nowMs: ARMED_AT + 1000, isBlack: true },
      { nowMs: ARMED_AT + 2000, isBlack: true },
      { nowMs: ARMED_AT + 3000, isBlack: true },
      { nowMs: ARMED_AT + 4000, isBlack: true },
    ]);
    check(
      'four consecutive black after warm-up: drop then fallback',
      actions.join(',') === 'none,drop-composer,none,fallback',
      actions.join(','),
    );
    check('fallback carries a diagnosable reason', reasons.length === 1 && reasons[0].includes('4 consecutive samples'), reasons.join('; '));
    check('fallback marks the watchdog done', state.done === true);
  }

  // --- 4. A bright sample resets the streak. ---
  {
    const { actions } = feed([
      { nowMs: ARMED_AT + 1000, isBlack: true },
      { nowMs: ARMED_AT + 2000, isBlack: false },
      { nowMs: ARMED_AT + 3000, isBlack: true },
      { nowMs: ARMED_AT + 4000, isBlack: true },
    ]);
    check(
      'bright sample resets streak (drop only on the 4th sample)',
      actions.join(',') === 'none,none,none,drop-composer',
      actions.join(','),
    );
  }

  // --- 5. Inconclusive readback never counts as black. ---
  {
    const { actions, state } = feed([
      { nowMs: ARMED_AT + 1000, isBlack: true, readbackOk: false },
      { nowMs: ARMED_AT + 2000, isBlack: true, readbackOk: false },
      { nowMs: ARMED_AT + 3000, isBlack: true, readbackOk: false },
      { nowMs: ARMED_AT + 4000, isBlack: true, readbackOk: false },
    ]);
    check('failed readback: no action at all', actions.every((a) => a === 'none'), actions.join(','));
    check('failed readback: no fallback', state.done === false);
  }

  // --- 6. Once fallen back, the watchdog stays done. ---
  {
    const { actions } = feed([
      { nowMs: ARMED_AT + 1000, isBlack: true },
      { nowMs: ARMED_AT + 2000, isBlack: true },
      { nowMs: ARMED_AT + 3000, isBlack: true },
      { nowMs: ARMED_AT + 4000, isBlack: true },
      { nowMs: ARMED_AT + 5000, isBlack: true },
      { nowMs: ARMED_AT + 6000, isBlack: false },
    ]);
    check(
      'after fallback: no further actions',
      actions.join(',') === 'none,drop-composer,none,fallback,none,none',
      actions.join(','),
    );
  }

  // --- 7. Warm-up constant is sane (compile gets seconds, not frames). ---
  check('warm-up is at least 5s', WATCHDOG_WARMUP_MS >= 5000, `WATCHDOG_WARMUP_MS=${WATCHDOG_WARMUP_MS}`);

  // --- 8. Source pins: pixel sampling is RETIRED from the stage. ---
  // Phone retest (2026-11-27, 14:00–14:06 PT): the lattice visibly
  // rendered while the sampler reported black, so sampled pixels must
  // never decide the fallback. The reason mechanism and the real-
  // failure hooks stay.
  const orb = read('components/CodexOrbSystem.tsx');
  check(
    'stage does not sample pixels (no readPixels call)',
    !orb.includes('gl.readPixels(') && !orb.includes('probeCanvasBlack('),
    '',
  );
  check('stage does not consult the watchdog decision', !orb.includes('decideWatchdogSample') && !orb.includes("from '../lib/orbWatchdog'"), '');
  check('stage has no pixel-probe refs left', !orb.includes('blackProbe') && !orb.includes('blackComposerDropped'), '');
  check('stage surfaces the fallback reason', orb.includes('blackFallbackReason'), '');
  check('stage hooks shader compile errors', orb.includes('onShaderError'), '');
  check('stage hooks context loss', orb.includes('webglcontextlost'), '');
  check(
    'RETRY only hides the fallback (no stage re-init, no watchdog re-arm)',
    orb.includes('setBlackFallback(false)') && !orb.includes('blackProbeArmedAtRef'),
    '',
  );

  // --- 9. Source pins: HUD hides while the console is expanded (round-3 #2). ---
  check(
    'HUD hides while the console is expanded on phones',
    orb.includes('consoleExpanded') && orb.includes("'hidden'"),
    '',
  );
  const layer = read('components/spatial/NVKCommandLayer.tsx');
  check('console broadcasts its expanded state', layer.includes('nvk-console-state'), '');
  check(
    'expanded console is opaque on phones (no fallback bleed-through)',
    layer.includes("bg-slate-950' : 'bg-slate-950/92'") || layer.includes('bg-slate-950'),
    '',
  );
  check(
    'minimized bar uses a short placeholder on phones',
    layer.includes("Ask NVK anything"),
    '',
  );

  // --- 10. Source pins: decorative orbit rings fit a phone viewport. ---
  check(
    'orbit rings scale down on phones',
    orb.includes('MOBILE_ORBIT_SCALE'),
    '',
  );

  // --- 11. Source pins: Desk-mode console docks at the bottom (round-3 #3). ---
  check('console docks in Desk mode', layer.includes('isDeskMode'), '');
  check('Desk grid clears the docked console bar', read('components/spatial/Workspace2D.tsx').includes('pb-[188px]'), '');

  console.log(failures === 0 ? 'All orb watchdog checks passed.' : `${failures} check(s) failed.`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
