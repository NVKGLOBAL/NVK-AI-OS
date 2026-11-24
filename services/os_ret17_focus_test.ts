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

  console.log('Ret17 fix (a) — the tap path is canvas-only:');
  for (const handler of ['handlePointerDown', 'handlePointerUp', 'handleTouchStart', 'handleTouchEnd']) {
    const start = orb.indexOf(`const ${handler} = `);
    const block = orb.slice(start, orb.indexOf('\n    };', start));
    check(
      `${handler} returns early unless the event target is the WebGL canvas`,
      /if \(event\.target !== renderer\.domElement\) return;/.test(block),
    );
  }
  check(
    'no tap handler raycasts without the canvas gate (handleTapOrClick is only called from the two gated handlers)',
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

  console.log(failures === 0 ? 'All ret17 Focus NVK checks passed.' : `${failures} check(s) failed.`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
