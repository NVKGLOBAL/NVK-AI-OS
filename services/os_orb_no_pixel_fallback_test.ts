/**
 * Orb no-pixel-fallback + console-reachability regression tests
 * (round-3 fix, 2026-11-27).
 *
 * Corrected diagnosis (phone retest 2026-11-27, 14:00–14:06 PT, his
 * iPhone): the pixel-sampling approach itself is broken on iOS
 * WKWebView. The real 3D lattice DOES render on every fresh load
 * (animated green wireframe spheres/particles, camera drifting) — then
 * falls back within ~10–60s with the SAME reason, and RETRY brings it
 * back immediately. RETRY never re-created the stage (it only hides
 * the fallback overlay), so the canvas was rendering while the sampler
 * reported black: readPixels returns black on this browser while the
 * scene renders (preserveDrawingBuffer:false). The round-3 premise
 * (drawImage was the problem, readPixels would fix it) was wrong for
 * this browser.
 *
 * These tests pin the fix and the three further phone-retest defects:
 *   1. Visibly rendering must never trigger the fallback — no pixel
 *      sampling anywhere in the failure path; only real failures
 *      (shader error, context loss, render throw) fall back, and the
 *      reason mechanism stays.
 *   2. Focus NVK stays reachable while the console is expanded —
 *      the HUD hides then (round-3 overlap fix, kept), so the console
 *      header carries its own Focus button.
 *   3. The expand chevron stays reachable — the mobile sheet backdrop
 *      (z-1140, above the z-1095 console) must dismiss on tap, and
 *      expansion must not depend on click delivery alone.
 *   4. The Lattice Manager overlay panel is opaque.
 *   5. The minimized-bar placeholder actually fits.
 *
 * Run: npx tsx services/os_orb_no_pixel_fallback_test.ts
 * (coordinator wires it into `npm test` at integration.)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
  const orb = read('components/CodexOrbSystem.tsx');
  const layer = read('components/spatial/NVKCommandLayer.tsx');
  const manager = read('components/PanelManager.tsx');
  const pinned = read('components/PinnedPanel.tsx');

  // --- 1. No pixel sampling anywhere in the failure path. ---
  check(
    'stage never calls readPixels',
    !orb.includes('gl.readPixels('),
    '',
  );
  check(
    'stage has no pixel probe function',
    !orb.includes('probeCanvasBlack(') && !orb.includes('const probeCanvasBlack'),
    '',
  );
  check(
    'stage does not consult the watchdog decision',
    !orb.includes('decideWatchdogSample') && !orb.includes("from '../lib/orbWatchdog'"),
    '',
  );
  check(
    'stage has no pixel-probe refs left',
    !orb.includes('blackProbe') && !orb.includes('blackComposerDropped') && !orb.includes('drop-composer'),
    '',
  );

  // --- 2. Real failures still fall back, with the reason kept. ---
  check('stage hooks shader compile errors', orb.includes('onShaderError'), '');
  check('stage hooks context loss', orb.includes('webglcontextlost'), '');
  check(
    'shader error falls back with a diagnosable reason',
    orb.includes('Shader compile error') && orb.includes('setBlackFallbackReason(reason)'),
    '',
  );
  check(
    'fallback view shows the reason',
    orb.includes('blackFallbackReason') && orb.includes('Reason: {blackFallbackReason}'),
    '',
  );
  check(
    'exactly one fallback trigger remains, and it is the shader-error hook',
    orb.split('setBlackFallback(true)').length - 1 === 1 &&
      orb.indexOf('setBlackFallback(true)') > orb.indexOf('onShaderError'),
    '',
  );

  // --- 3. RETRY only hides the fallback (reveals the live canvas). ---
  check(
    'RETRY does not re-initialize the stage',
    orb.includes('No re-initialization happens here') && !orb.includes('blackProbeArmedAtRef'),
    '',
  );

  // --- 4. Focus NVK reachable while the console is expanded. ---
  check(
    'console header carries a Focus button',
    layer.includes("Focus NVK — centre the orb") && layer.includes("nvk-focus-orb"),
    '',
  );
  check(
    'stage runs the same Focus routine on nvk-focus-orb',
    orb.includes("window.addEventListener('nvk-focus-orb'") && orb.includes('const focusNvk = useCallback'),
    '',
  );
  check(
    'HUD still hides while the console is expanded (no overlap regression)',
    orb.includes('consoleExpanded') && orb.includes("'hidden'"),
    '',
  );
  check(
    'console collapse button still exists as the plain collapse path',
    layer.includes('Collapse Console'),
    '',
  );

  // --- 5. Expand chevron reachable: backdrop dismisses + pointerdown. ---
  check(
    'mobile sheet backdrop is iOS-clickable (cursor:pointer)',
    pinned.includes('z-[1140] cursor-pointer'),
    '',
  );
  check(
    'chevron expands on pointerdown as well as click',
    layer.includes('onPointerDown={() => setIsMinimized(false)}'),
    '',
  );
  check(
    'tapping the composer to type expands the console',
    layer.includes('onPointerDown={() => { if (isMinimized) setIsMinimized(false); }}'),
    '',
  );

  // --- 6. Lattice Manager overlay panel is opaque. ---
  check(
    'Lattice panel container is solid (no translucency)',
    manager.includes('bg-slate-950 border border-slate-800/80') && !manager.includes('bg-slate-950/90 backdrop-blur-xl'),
    '',
  );
  check(
    'Lattice panel inner blocks are solid',
    !manager.includes('bg-slate-950/50') && !manager.includes('bg-slate-900/60') && !manager.includes('bg-slate-900/40'),
    '',
  );

  // --- 7. Minimized-bar placeholder actually fits. ---
  check(
    'minimized placeholder is the short Ask NVK…',
    layer.includes("isMobile && isMinimized ? 'Ask NVK…'"),
    '',
  );
  check(
    'old clipped minimized placeholder is gone',
    !layer.includes("isMobile && isMinimized ? 'Ask NVK anything…'"),
    '',
  );

  console.log(failures === 0 ? 'All orb no-pixel-fallback checks passed.' : `${failures} check(s) failed.`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
