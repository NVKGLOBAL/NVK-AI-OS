/**
 * Mobile-first redesign tests (2026-11-27) — NvK: "full screen 3d
 * experience it is supposed to be - mobile optimized."
 *
 * Pins the redesign's decisions in lib/mobileWorkspace (pure, no DOM)
 * plus source pins for the component changes, so a later edit can't
 * silently reintroduce the split-mode trap or the heavy phone chrome.
 *
 * What the phone diagnosis (2026-11-27, 10:29–10:46 PT) established:
 * the stage is black on his iPhone while the render loop runs at
 * 60 FPS; stale cache ruled out (live bundle index-DhEfXOrH.js);
 * stuck-in-split ruled out (log: "restored: immersive"). Prime
 * suspect is the bloom composer painting black silently on iOS, and
 * the orb may also be covered by the central panel — so the
 * chrome-strip is an orb-visibility fix too, not just cosmetics.
 *
 * Run: npx tsx services/os_mobile_redesign_test.ts
 * (also wired into `npm test`.)
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  resolveWorkspaceMode,
  effectiveWorkspaceMode,
  latestLiveEventLine,
  shouldAutofocusInput,
  MOBILE_HINT_TEXT,
  MOBILE_HINT_DISMISSED_KEY,
} from '../lib/mobileWorkspace';

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

async function main(): Promise<void> {
  // --- 1. Mobile default mode: a phone ALWAYS opens immersive. ---
  check(
    'mobile + saved split opens immersive (the split trap)',
    resolveWorkspaceMode(true, 'split', false) === 'immersive',
  );
  check(
    'mobile + saved grid opens immersive',
    resolveWorkspaceMode(true, 'grid', false) === 'immersive',
  );
  check(
    'mobile + saved 2d opens immersive (a saved crash-escape does not stick)',
    resolveWorkspaceMode(true, '2d', false) === 'immersive',
  );
  check(
    'mobile + legacy 3d opens immersive',
    resolveWorkspaceMode(true, '3d', false) === 'immersive',
  );
  check(
    'mobile + no saved mode opens immersive',
    resolveWorkspaceMode(true, null, false) === 'immersive',
  );
  check(
    'mobile + saved split + open panels still opens immersive',
    resolveWorkspaceMode(true, 'split', true) === 'immersive',
  );

  // --- 2. Desktop: the saved mode is preserved (one-time migration,
  // not a wipe), R11-3 kept. ---
  check(
    'desktop + saved split stays split',
    resolveWorkspaceMode(false, 'split', false) === 'split',
  );
  check(
    'desktop + saved grid + open panels opens immersive (R11-3)',
    resolveWorkspaceMode(false, 'grid', true) === 'immersive',
  );
  check(
    'desktop + saved grid + no panels stays grid',
    resolveWorkspaceMode(false, 'grid', false) === 'grid',
  );
  check(
    'desktop + saved 2d + no panels stays 2d',
    resolveWorkspaceMode(false, '2d', false) === '2d',
  );
  check(
    'desktop + legacy 3d migrates to immersive',
    resolveWorkspaceMode(false, '3d', false) === 'immersive',
  );
  check(
    'desktop + unknown saved mode falls back to immersive',
    resolveWorkspaceMode(false, 'banana', false) === 'immersive',
  );

  // --- 3. Effective mode at render time: '2d' is the only mobile
  // escape hatch (WebGL crash cascade), everything else immersive. ---
  check(
    'effective: mobile + split renders immersive',
    effectiveWorkspaceMode(true, 'split') === 'immersive',
  );
  check(
    'effective: mobile + grid renders immersive',
    effectiveWorkspaceMode(true, 'grid') === 'immersive',
  );
  check(
    'effective: mobile + 2d renders 2d (crash escape hatch)',
    effectiveWorkspaceMode(true, '2d') === '2d',
  );
  check(
    'effective: desktop + split renders split',
    effectiveWorkspaceMode(false, 'split') === 'split',
  );

  // --- 4. Live feed one-line overlay: latest event only, honest empty. ---
  check(
    'feed overlay empty state is honest, never a fake event',
    latestLiveEventLine([]) === 'Nothing yet — ask NVK something',
  );
  check(
    'feed overlay shows the latest event in the one-line format',
    latestLiveEventLine([{ time: '10:18:32', text: 'Done: Answered product question' }])
      === '10:18:32 · Done: Answered product question',
  );
  check(
    'feed overlay takes the LAST event when several exist',
    latestLiveEventLine([
      { time: '10:18:30', text: 'Done: Asked NVK something' },
      { time: '10:18:32', text: 'Done: Answered product question' },
    ]) === '10:18:32 · Done: Answered product question',
  );

  // --- 5. Autofocus gate: never on touch (iOS keyboard pop). ---
  check(
    'no autofocus on a coarse pointer (touch)',
    shouldAutofocusInput(true) === false,
  );
  check(
    'autofocus stays on a fine pointer (desktop)',
    shouldAutofocusInput(false) === true,
  );

  // --- 6. Hint persistence key is the existing tour key. ---
  check(
    'mobile hint persists in the existing nvk_tutorial_completed key',
    MOBILE_HINT_DISMISSED_KEY === 'nvk_tutorial_completed',
  );
  check(
    'mobile hint text is the briefed copy',
    MOBILE_HINT_TEXT === 'Tap the orb to talk — ask anything, no download needed',
  );

  // --- 7. Service worker cache version bumped (stale-cache hygiene). ---
  const sw = read('public/sw.js');
  check(
    'SW CACHE_NAME is v2.3',
    sw.includes("CACHE_NAME = 'nvk-sovereign-v2.3'"),
  );
  check(
    'SW CACHE_NAME v2.2 is gone',
    !sw.includes('nvk-sovereign-v2.2'),
  );

  // --- 8. Source pins: viewport, height, overscroll. ---
  const app = read('App.tsx');
  check(
    'App root uses h-dvh (iOS Safari collapsing chrome)',
    app.includes('className="app-container w-full h-dvh'),
  );
  check(
    'App resolves the mode through lib/mobileWorkspace',
    app.includes('resolveWorkspaceMode(isMobile, saved, persistedClusterHasOpenPanels())'),
  );
  check(
    'App renders the effective mode, not the persisted one',
    app.includes('effectiveWorkspaceMode === ') && app.includes('workspaceMode={effectiveWorkspaceMode}'),
  );
  const indexHtml = read('index.html');
  check(
    'index.html viewport has viewport-fit=cover (real safe-area insets)',
    indexHtml.includes('viewport-fit=cover'),
  );
  const css = read('index.css');
  check(
    'body has overscroll-behavior: none (app feel)',
    css.includes('overscroll-behavior: none'),
  );

  // --- 9. Source pins: header, dock, composer, panels, tutorial. ---
  const header = read('components/Header.tsx');
  check(
    'Header has the mobile compact bar (logo + wordmark + one menu button)',
    header.includes('aria-label="Open menu"') && header.includes('Mobile-first redesign'),
  );
  check(
    'Header menu sheet is a bottom sheet',
    header.includes('max-h-[82dvh]') && header.includes('fixed inset-x-0 bottom-0 z-[1300]'),
  );
  const dock = read('components/Dock.tsx');
  check(
    'Dock renders one Apps button on mobile (no 12-icon row)',
    dock.includes('Apps — open the panel picker') && dock.includes('ri-apps-2-fill'),
  );
  check(
    'Dock mobile button sits top-right below the header, not over the orb',
    dock.includes("top: 'calc(108px + env(safe-area-inset-top, 0px))'"),
  );
  const layer = read('components/spatial/NVKCommandLayer.tsx');
  check(
    'Composer floats just above the safe-area inset on mobile (no 128px dock clearance)',
    layer.includes("bottom: 'calc(8px + env(safe-area-inset-bottom, 0px))'"),
  );
  check(
    'Composer uses the one-line feed overlay (latest event only)',
    layer.includes('latestLiveEventLine(liveEvents)'),
  );
  check(
    'Composer autofocus is gated on non-touch',
    layer.includes('shouldAutofocusInput(isCoarsePointer)'),
  );
  check(
    'Composer expanded view is a sheet on mobile',
    layer.includes("max-h-[82dvh] overflow-y-auto") && layer.includes('max-h-[46dvh]'),
  );
  check(
    'Composer collapsed bar has an expand chevron',
    layer.includes('ChevronUp') && layer.includes('aria-label="Expand console"'),
  );
  check(
    'Composer collapsed-by-default on mobile is still the width-based default',
    layer.includes('return window.innerWidth < 768;'),
  );
  const panel = read('components/PinnedPanel.tsx');
  check(
    'Panels are bottom sheets on mobile',
    panel.includes('max-h-[82dvh]') && panel.includes('fixed inset-x-0 bottom-0 z-[1150]'),
  );
  check(
    'Panels have a swipe-down dismiss on mobile',
    panel.includes('handleSheetTouchStart') && panel.includes('sheetDragY > 90'),
  );
  check(
    'Minimized panels render nothing on mobile (restored via Apps picker)',
    panel.includes('if (isMinimized) return null;'),
  );
  const tutorial = read('components/TutorialOverlay.tsx');
  check(
    'Tutorial renders one hint pill on mobile, not the 3-step tour',
    tutorial.includes('MOBILE_HINT_TEXT') && tutorial.includes('if (isMobile) {'),
  );
  check(
    'Tutorial hint dismissal uses the existing key',
    tutorial.includes('MOBILE_HINT_DISMISSED_KEY'),
  );

  // --- 10. Source pins: black-orb hardening (bloom composer probe). ---
  const orb = read('components/CodexOrbSystem.tsx');
  check(
    'Orb has the silent-black probe (center-pixel read)',
    orb.includes('isCanvasBlack') && orb.includes('drawImage(canvas, w / 2 - 4, h / 2 - 4, 8, 8, 0, 0, 8, 8)'),
  );
  check(
    'Orb drops the bloom composer when the canvas is black with it active',
    orb.includes('composerDisabled = true') && orb.includes('Canvas is black with the bloom composer active'),
  );
  check(
    'Orb surfaces the fallback when still black without the composer',
    orb.includes('Canvas is still black without the composer'),
  );
  check(
    'Fallback view shows a visible CSS orb, never a void',
    orb.includes('CSS orb fallback') && orb.includes('radial-gradient(circle_at_35%_35%'),
  );
  check(
    'Orb shader is untouched (no speculative rewrite)',
    !orb.includes('blackProbeShader') && orb.includes('alphaVal'),
  );

  // --- 11. The 5 files deleted locally but still on main: nothing
  // imports them (report only — delete nothing). ---
  const deletedFive = [
    'components/spatial/HUD.tsx',
    'components/spatial/Orbit.tsx',
    'components/ui/FlightController.tsx',
    'components/ui/OmniWheel.tsx',
    'services/nvkActionEngine.ts',
  ];
  for (const f of deletedFive) {
    check(
      `${f} does not exist in the working copy`,
      !existsSync(join(ROOT, f)),
    );
  }
  const importScan = [app, read('constants.ts'), read('types.ts'), orb].join('\n');
  check(
    'no source file imports any of the 5 deleted files',
    !/(spatial\/HUD|spatial\/Orbit|ui\/FlightController|ui\/OmniWheel|nvkActionEngine)['"]/.test(importScan)
      && !/from ['"][^'"]*nvkActionEngine/.test(importScan),
  );

  console.log(failures === 0 ? 'All mobile-first redesign checks passed.' : `${failures} check(s) failed.`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
