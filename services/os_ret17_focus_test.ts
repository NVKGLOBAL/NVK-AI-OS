/**
 * Retest #17 Focus NVK camera test (2026-11-24) — the orb-centring
 * failure found live on build index-sgYcF8O9.js (retest #17, 2026-11-23
 * 23:59 – 2026-11-24 00:02 PT, 1919px, single tab, no scrolling).
 *
 * The panel-close half of the fix WORKED (the centre-covering "NVK
 * System Monitor" panel closed, no "Following:" pill remained). The
 * camera half FAILED: before the click the bright green wireframe orb
 * was fully visible at about x=1310, y=440; after the Focus NVK tween
 * it ended at about x=1745, y=415 — far right edge, right half clipped,
 * ~785px right of viewport centre (960, 499). Focus NVK moved the orb
 * FARTHER from centre, not toward it.
 *
 * Root cause — two compounding defects, both in
 * components/CodexOrbSystem.tsx:
 *
 * 1. The window-level tap handlers fired on HUD-button clicks.
 *    handlePointerDown / handlePointerUp (and the touch equivalents)
 *    are window listeners. React's stopPropagation on the button's
 *    `click` does not stop the native pointerup, and pointerup fires
 *    BEFORE click. So clicking Focus NVK first ran handleTapOrClick
 *    at the button's screen position (bottom-right corner), whose
 *    raycast hit a panel node (nodes carry 4x2 label sprites — big
 *    targets) and started focusOnPanelNode's 1.2s camera tween.
 *    The button's onClick then started Focus NVK's 1.0s tween to the
 *    origin WITHOUT killing the tap's tween.
 * 2. GSAP's default overwrite:false lets two tweens on the same
 *    camera.position / controls.target both write every tick, and the
 *    LONGER one wins the final value once the shorter ends. Focus
 *    NVK's tween won ticks 0–1.0s; the tap's tween then ran unopposed
 *    1.0–1.2s and dragged the camera back to the panel node — a node
 *    left of the origin, so the orb projected far right of centre.
 *    The "Following:" pill still ended cleared, because Focus NVK's
 *    setFollowedNodeId(null) ran AFTER the tap's setFollowedNodeId —
 *    which is why the retest saw no pill despite the camera ending on
 *    a node. The tween destination (0,0,14)/(0,0,0) was never wrong;
 *    the orb really is at the origin. The bug was the tween that
 *    hijacked the camera after it.
 *
 * Fix (this round):
 * a. The tap path is canvas-only: handlePointerDown, handlePointerUp,
 *    handleTouchStart and handleTouchEnd return early unless
 *    event.target === renderer.domElement. A press that starts on a
 *    DOM control is a UI press, not a 3D tap.
 * b. Every camera-tweening action kills in-flight camera tweens first
 *    (gsap.killTweensOf on camera.position + controls.target) and
 *    owns the transition (isTransitioningRef, cleared onComplete):
 *    focusOnPanelNode, Focus NVK, Reset Viewport, recenterTrigger.
 *    The panel-close + follow-clear behaviour of Focus NVK is
 *    unchanged.
 *
 * This test pins both halves: source checks for (a) and (b), plus a
 * live gsap+three mechanism check proving the bug class (overlapping
 * tweens, no kill -> ends on the node) and the fix (kill first ->
 * ends at the origin). The live end-to-end — orb centred after
 * clicking Focus NVK — is verified by a live browser retest, not here.
 *
 * Retest #18 extension (2026-11-24): orb taps stopped toggling voice
 * while the Voice button worked. Pins the two fixes — the isStageTap
 * predicate (a tap on an overlaying panel div still raycasts) and the
 * removal of a closed panel's CSS3D DOM element (three never removes
 * it on scene-removal, so it sat over the centre swallowing taps) —
 * plus the voice-toggle wiring and the raycast geometry that makes
 * the classifier see the orb.
 *
 * Run: npx tsx services/os_ret17_focus_test.ts
 * (also wired into `npm test`.)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
// tsx resolves 'gsap' to its CJS entry, whose named ESM export is not
// visible to Node's loader — load it via require, as the package ships it.
const { gsap } = createRequire(import.meta.url)('gsap') as typeof import('gsap');
import * as THREE from 'three';

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const orb = read('components/CodexOrbSystem.tsx');

  console.log('Ret17 fix (a) — the tap path excludes UI presses:');
  // Retest #18 (2026-11-24) replaced the bare canvas-identity gate
  // (`event.target === renderer.domElement`) with the isStageTap
  // predicate: the bare gate swallowed orb taps whose topmost element
  // was an overlaying panel div. The ret17 requirement is unchanged —
  // a press on a HUD button must not raycast — and is now pinned on
  // the predicate: controls are excluded, the press must be inside the
  // stage container.
  check(
    'an isStageTap predicate exists and rejects presses on interactive controls',
    /const isStageTap = \(event: \{ target: EventTarget \| null \}\): boolean => \{[\s\S]{0,600}target\.closest\('button, input, textarea, select, a\[href\], \[role="button"\], \[contenteditable="true"\]'\)/.test(orb),
  );
  check(
    'isStageTap requires the press to be inside the stage container',
    /return !!currentMount && currentMount\.contains\(target\);/.test(orb),
  );
  check(
    'isStageTap still fast-paths a press directly on the WebGL canvas',
    /if \(target === renderer\.domElement\) return true;/.test(orb),
  );
  for (const handler of ['handlePointerDown', 'handlePointerUp', 'handleTouchStart', 'handleTouchEnd']) {
    const start = orb.indexOf(`const ${handler} = `);
    const block = orb.slice(start, orb.indexOf('\n    };', start));
    check(
      `${handler} gates on isStageTap (not a bare canvas-identity check)`,
      /if \(!isStageTap\(event\)\) return;/.test(block) &&
        !/event\.target !== renderer\.domElement/.test(block),
    );
  }
  check(
    'no tap handler raycasts without the stage-tap gate (handleTapOrClick is only called from the two gated handlers)',
    (orb.match(/handleTapOrClick\(/g) || []).length === 2, // pointerup + touchend
  );

  console.log('Ret17 fix (b) — every camera tween owns the camera:');
  const focusPanel = orb.slice(orb.indexOf('const focusOnPanelNode = useCallback'));
  check(
    'focusOnPanelNode kills in-flight camera tweens before starting its own',
    /gsap\.killTweensOf\(currentCamera\.position\);[\s\S]{0,80}gsap\.killTweensOf\(currentControls\.target\);/.test(focusPanel),
  );

  const focusNvk = orb.slice(orb.indexOf('title="Focus NVK"') - 2200, orb.indexOf('title="Focus NVK"'));
  check(
    'Focus NVK kills in-flight camera tweens before its tween',
    /gsap\.killTweensOf\(cameraRef\.current\.position\);[\s\S]{0,80}gsap\.killTweensOf\(controlsRef\.current\.target\);/.test(focusNvk),
  );
  check(
    'Focus NVK still closes the focused panel and clears the follow lock',
    /const focusedId = focusedNodeIdRef\.current;[\s\S]{0,200}focusedNodeIdRef\.current = null;[\s\S]{0,80}setFollowedNodeId\(null\);[\s\S]{0,80}if \(focusedId\) onClosePanel\(focusedId\);/.test(focusNvk),
  );
  check(
    'Focus NVK still tweens to (0,0,14) looking at the origin',
    /gsap\.to\(cameraRef\.current\.position, \{ x: 0, y: 0, z: 14/.test(focusNvk) &&
      /gsap\.to\(controlsRef\.current\.target, \{ x: 0, y: 0, z: 0/.test(focusNvk),
  );

  const resetVp = orb.slice(orb.indexOf('title="Reset Viewport"') - 1400, orb.indexOf('title="Reset Viewport"'));
  check(
    'Reset Viewport kills in-flight camera tweens before its tween',
    /gsap\.killTweensOf\(cameraRef\.current\.position\);[\s\S]{0,80}gsap\.killTweensOf\(controlsRef\.current\.target\);/.test(resetVp),
  );
  check(
    'Reset Viewport still tweens to (0,0,25) looking at the origin',
    /gsap\.to\(cameraRef\.current\.position, \{ x: 0, y: 0, z: 25/.test(resetVp),
  );

  const recenter = orb.slice(orb.indexOf('if (recenterTrigger > 0 && controlsRef.current'));
  check(
    'the recenterTrigger effect kills in-flight camera tweens before its tween',
    /gsap\.killTweensOf\(cameraRef\.current\.position\);[\s\S]{0,80}gsap\.killTweensOf\(controlsRef\.current\.target\);/.test(recenter.slice(0, 800)),
  );

  console.log('Ret17 mechanism — overlapping gsap camera tweens (repo gsap + three):');
  // A panel node left of the origin, as the retest geometry requires
  // (orb ended far RIGHT of centre => camera ended looking at a node
  // LEFT of the origin).
  const nodePos = new THREE.Vector3(-12, 2, 0);
  const nodeCamPos = nodePos.clone().add(new THREE.Vector3(0, 0, 6.5));

  // Bug sequence: tap tween (1.2s, to the node) then Focus tween
  // (1.0s, to the origin) with no kill — the camera must end on the
  // node, reproducing retest #17.
  const bugPos = nodeCamPos.clone();
  const bugTarget = nodePos.clone();
  gsap.to(bugPos, { x: nodeCamPos.x, y: nodeCamPos.y, z: nodeCamPos.z, duration: 1.2, ease: 'power2.inOut' });
  gsap.to(bugTarget, { x: nodePos.x, y: nodePos.y, z: nodePos.z, duration: 1.2, ease: 'power2.inOut' });
  gsap.to(bugPos, { x: 0, y: 0, z: 14, duration: 1, ease: 'power2.inOut' });
  gsap.to(bugTarget, { x: 0, y: 0, z: 0, duration: 1, ease: 'power2.inOut' });
  await sleep(1600);
  check(
    'without killTweensOf, the longer tap tween wins the final value (camera ends on the node)',
    Math.abs(bugTarget.x - nodePos.x) < 0.01 && Math.abs(bugPos.x - nodeCamPos.x) < 0.01,
    `got camera (${bugPos.toArray().map((v) => v.toFixed(2)).join(', ')}) target (${bugTarget.toArray().map((v) => v.toFixed(2)).join(', ')})`,
  );

  // Fixed sequence: the Focus tween kills the tap tween first.
  const fixPos = nodeCamPos.clone();
  const fixTarget = nodePos.clone();
  gsap.to(fixPos, { x: nodeCamPos.x, y: nodeCamPos.y, z: nodeCamPos.z, duration: 1.2, ease: 'power2.inOut' });
  gsap.to(fixTarget, { x: nodePos.x, y: nodePos.y, z: nodePos.z, duration: 1.2, ease: 'power2.inOut' });
  gsap.killTweensOf(fixPos);
  gsap.killTweensOf(fixTarget);
  gsap.to(fixPos, { x: 0, y: 0, z: 14, duration: 1, ease: 'power2.inOut' });
  gsap.to(fixTarget, { x: 0, y: 0, z: 0, duration: 1, ease: 'power2.inOut' });
  await sleep(1600);
  check(
    'with killTweensOf first, the camera ends at (0,0,14) looking at the origin',
    Math.abs(fixTarget.x) < 0.01 && Math.abs(fixTarget.y) < 0.01 && Math.abs(fixTarget.z) < 0.01 &&
      Math.abs(fixPos.x) < 0.01 && Math.abs(fixPos.y) < 0.01 && Math.abs(fixPos.z - 14) < 0.01,
    `got camera (${fixPos.toArray().map((v) => v.toFixed(2)).join(', ')}) target (${fixTarget.toArray().map((v) => v.toFixed(2)).join(', ')})`,
  );

  console.log('Ret18 orb-tap voice — the orb tap reaches the voice toggle:');
  // Retest #18 (2026-11-24, build index-BrDA2TZm.js): orb taps stopped
  // toggling voice while the Voice Command button worked. Two defects,
  // both in components/CodexOrbSystem.tsx:
  // 1. The ret17 canvas-only gate dropped orb taps whose topmost element
  //    was an overlaying panel div (CSS3D panel, 850x750px,
  //    pointerEvents auto; CSS3D has no depth occlusion, so a panel
  //    behind the orb still covers it on screen). Fixed by the
  //    isStageTap predicate (pinned above): a press is a 3D tap when it
  //    lands inside the stage container and not on a control.
  // 2. three's CSS3DRenderer never removes the DOM element of an object
  //    that leaves the scene, so a closed panel's 850x750
  //    pointerEvents:auto div stayed in the overlay at its last
  //    transform (for a focused panel: frozen over the screen centre),
  //    invisible but still hit-testable, swallowing taps meant for the
  //    orb behind it. Fixed by removing the element outright on close.
  // The voice toggle itself was never broken: App's handleCoreOrbClick
  // toggles the same isVoiceActive state the Voice button uses.
  const coreBranch = orb.slice(orb.indexOf('if (isCoreOrb) {'));
  check(
    'a core-orb tap calls the voice toggle (onCoreOrbClick)',
    /onCoreOrbClickRef\.current\(\);/.test(coreBranch.slice(0, 1200)),
  );
  const panelCleanup = orb.slice(orb.indexOf('currentPanelObjects.forEach((panelObj, nodeId)'));
  check(
    'closing a panel removes its CSS3D DOM element (no orphaned overlay swallowing orb taps)',
    /if \(!openNodeIds\.includes\(nodeId\)\) \{[\s\S]{0,1200}panelObj\.domElement\.remove\(\);/.test(panelCleanup),
  );
  check(
    'the cleanup only touches panels that are no longer open',
    /currentPanelObjects\.forEach\(\(panelObj, nodeId\) => \{[\s\S]{0,120}if \(!openNodeIds\.includes\(nodeId\)\) \{/.test(orb),
  );
  check(
    '3D panel divs keep pointerEvents auto (panels stay interactive; the fix removes the element, not the events)',
    /panelElement\.style\.pointerEvents = 'auto';/.test(orb),
  );
  const app = read('App.tsx');
  check(
    'App wires the orb tap to the voice toggle (same state the Voice button uses)',
    /const handleCoreOrbClick = useCallback\(\(\) => \{\s*setIsVoiceActive\(prev => !prev\);/.test(app) &&
      /onCoreOrbClick=\{handleCoreOrbClick\}/.test(app),
  );

  console.log('Ret18 geometry — the tap classifier sees the orb (repo three):');
  // The classifier's proximity fallback treats a ray passing within 6.5
  // units of the origin as a core-orb tap. The core orb is a radius-5
  // sphere at the origin, so every ray through its visible disc passes
  // within 5 of the origin — inside the fallback — while a ray aimed
  // well outside the disc does not.
  const camPos = new THREE.Vector3(0, 0, 14);
  const rayTo = (p: THREE.Vector3) => {
    const dir = p.clone().sub(camPos).normalize();
    return new THREE.Ray(camPos.clone(), dir);
  };
  const origin = new THREE.Vector3(0, 0, 0);
  const fallback = 6.5;
  check(
    'the proximity fallback threshold in source is 6.5 units',
    /closestPointOnRay\.distanceTo\(new THREE\.Vector3\(0, 0, 0\)\) < 6\.5/.test(orb),
  );
  check(
    'a centre tap passes through the origin (inside the fallback)',
    rayTo(origin).distanceToPoint(origin) < fallback,
  );
  // Silhouette point of a radius-5 sphere as seen from (0,0,14):
  // |p| = 5 and (p - cam) . p = 0 -> p.z = 25/14, p.x = sqrt(25 - p.z^2).
  const silZ = 25 / 14;
  const sil = new THREE.Vector3(Math.sqrt(25 - silZ * silZ), 0, silZ);
  const silDist = rayTo(sil).distanceToPoint(origin);
  check(
    'a tap on the orb rim still passes within the fallback (tangent distance 5 < 6.5)',
    Math.abs(silDist - 5) < 0.01 && silDist < fallback,
    `got ${silDist.toFixed(3)}`,
  );
  check(
    'a tap aimed well outside the orb does NOT fall back to the core',
    rayTo(new THREE.Vector3(12, 8, 0)).distanceToPoint(origin) > fallback,
  );

  console.log(failures === 0 ? 'All ret17 Focus NVK + ret18 orb-tap voice checks passed.' : `${failures} check(s) failed.`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
