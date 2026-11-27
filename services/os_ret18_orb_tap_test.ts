/**
 * Retest #18 orb-tap voice-toggle test (2026-11-24) — the orb tap
 * stopped toggling voice on build index-BrDA2TZm.js (main 400b5b38).
 * The retest tapped the centred orb's centre (x2), the wireframe
 * ellipsoid orb (x2), and a solid orb — none changed the voice
 * control — while the Voice Command button itself worked and canvas
 * taps still focused nodes. Previously (~Nov 23) clicking the centre
 * toggled voice, so this is a regression.
 *
 * Root cause — the ret17 camera fix's tap gate, in
 * components/CodexOrbSystem.tsx:
 *
 *   if (event.target !== renderer.domElement) return;
 *
 * in all four window tap handlers. Before ret17, any window pointerup
 * ran handleTapOrClick's raycast; after ret17, a tap is silently
 * dropped whenever its topmost DOM element is not the WebGL canvas.
 * The orb sits at the centre of the viewport — exactly where DOM
 * overlays live: an open panel's CSS3D div (850x750px,
 * pointerEvents auto — and CSS3D has no depth occlusion against the
 * WebGL canvas, so a panel behind the orb still covers it on screen),
 * a closed panel's orphaned div, the chat console's drag region. Orb
 * taps (centre) hit those; node taps (away from the overlays) hit the
 * canvas and kept working. That is the whole regression: the gate
 * tests target IDENTITY, but a 3D tap is decided by target SEMANTICS.
 *
 * Fix (this round):
 * a. isStageTap(event): a press is a UI press when it lands on (or
 *    inside) an interactive control, or outside the stage container
 *    (HUD column, Following pill, chat console, PinnedPanels, header,
 *    dock are siblings of the mount, not children). Anything else
 *    inside the stage container — the canvas, the CSS3D overlay, a
 *    panel div's non-interactive area, a stale overlay element — is a
 *    3D tap and the raycast decides orb vs node vs nothing. HUD-button
 *    clicks (the ret17 bug) stay excluded: buttons are controls. All
 *    four handlers gate on isStageTap instead of the bare identity
 *    check.
 * b. Panel close removes the orphaned CSS3D element outright
 *    (panelObj.domElement.remove()). three's CSS3DRenderer never
 *    removes the element of an object that leaves the scene
 *    (renderObject only ever appends; display is set to 'none' only
 *    when object.visible === false) — without this, a closed panel's
 *    850x750 pointerEvents:auto div stays in the overlay at its last
 *    transform, invisible content still hit-testable, swallowing taps
 *    meant for the orb behind it.
 *
 * This test pins both halves (source pins), plus a live three.js
 * mechanism check proving the tap classification itself is sound
 * (a centre tap classifies as the core orb across two minutes of
 * axiom orbit; the repro DOES detect the misclassification class —
 * a panel node parked on the centre ray steals the tap), plus a
 * fake-DOM check of the predicate's behaviour (canvas -> tap; panel
 * div background -> tap, raycast decides; any button -> no tap; HUD
 * button / pill / anything outside the mount -> no tap). The live
 * end-to-end — an orb tap toggles voice on the deployed site — is
 * verified by a live browser retest, not here.
 *
 * Run: npx tsx services/os_ret18_orb_tap_test.ts
 * (also wired into `npm test`.)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

async function main(): Promise<void> {
  const orb = read('components/CodexOrbSystem.tsx');
  const app = read('App.tsx');

  console.log('Ret18 fix (a) — the stage-tap predicate replaces the bare canvas-identity gate:');
  check(
    'an isStageTap predicate exists',
    /const isStageTap = \(event: \{ target: EventTarget \| null \}\): boolean => \{/.test(orb),
  );
  check(
    'isStageTap fast-paths a press directly on the WebGL canvas',
    /if \(target === renderer\.domElement\) return true;/.test(orb),
  );
  check(
    'isStageTap rejects presses on interactive controls (buttons, inputs, links, ...)',
    /target\.closest\('button, input, textarea, select, a\[href\], \[role="button"\], \[contenteditable="true"\]'\)/.test(orb),
  );
  check(
    'isStageTap requires the press to be inside the stage container',
    /return !!currentMount && currentMount\.contains\(target\);/.test(orb),
  );
  for (const handler of ['handlePointerDown', 'handlePointerUp', 'handleTouchStart', 'handleTouchEnd']) {
    const start = orb.indexOf(`const ${handler} = `);
    const block = orb.slice(start, orb.indexOf('\n    };', start));
    check(
      `${handler} gates on isStageTap`,
      /if \(!isStageTap\(event\)\) return;/.test(block),
    );
    check(
      `${handler} no longer uses the bare canvas-identity gate`,
      !/event\.target !== renderer\.domElement/.test(block),
    );
  }
  check(
    'no handler in the file still uses the bare canvas-identity gate',
    (orb.match(/event\.target !== renderer\.domElement/g) || []).length === 0,
  );
  check(
    'the core-orb branch still calls the voice toggle',
    /if \(isCoreOrb\) \{[\s\S]{0,900}onCoreOrbClickRef\.current\(\);/.test(orb),
  );
  check(
    'App handleCoreOrbClick still toggles voice listening',
    /const handleCoreOrbClick = useCallback\(\(\) => \{\s*setIsVoiceActive\(prev => !prev\);/.test(app),
  );

  console.log('Ret18 fix (b) — panel close removes the orphaned CSS3D element:');
  const closeLoop = orb.slice(orb.indexOf('currentPanelObjects.forEach((panelObj, nodeId) => {'));
  check(
    'the close loop removes the cssObject from its parent',
    /panelObj\.cssObject\.parent\.remove\(panelObj\.cssObject\);/.test(closeLoop),
  );
  check(
    'the close loop also removes the panel DOM element outright',
    /panelObj\.domElement\.remove\(\);/.test(closeLoop),
  );

  console.log('Ret18 mechanism — tap classification with real three.js (repo three):');
  // Scene matching the live retest #18 state: viewport 1920x998,
  // camera FOV 75 at (0,0,14) looking at the origin, core orb =
  // Icosahedron(5) at the origin, TAB_BROWSER layout (panel node[0]
  // at (0,8,12) with a 4x2 label sprite at y+1.5, other panel nodes
  // hidden at x=1000), 6 axiom nodes (r=0.8) orbiting at radius 15.
  const W = 1920;
  const H = 998;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, W / H, 0.1, 1000);
  camera.position.set(0, 0, 14);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const coreOrb = new THREE.Mesh(
    new THREE.IcosahedronGeometry(5, 15),
    new THREE.MeshBasicMaterial(),
  );
  coreOrb.name = 'core_orb';
  scene.add(coreOrb);
  const axiomGroup = new THREE.Group();
  const axiomNodes: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const n = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 16, 16),
      new THREE.MeshBasicMaterial(),
    );
    n.userData = { type: 'axiom', label: `AX-${i}` };
    axiomGroup.add(n);
    axiomNodes.push(n);
  }
  scene.add(axiomGroup);
  const panelGroup = new THREE.Group();
  const panelNode0 = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.5, 0),
    new THREE.MeshBasicMaterial(),
  );
  panelNode0.userData = { type: 'panel', id: 'node-0' };
  panelNode0.name = 'node-0';
  panelNode0.position.set(0, 8, 12);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
  sprite.position.y = 1.5;
  sprite.scale.set(4, 2, 1);
  panelNode0.add(sprite);
  panelGroup.add(panelNode0);
  scene.add(panelGroup);

  const AXIOM_TAP_TOLERANCE_UNITS = 2.5;
  // The classification half of handleTapOrClick, verbatim in structure
  // (refs null: fresh hover state, as in the retest).
  const classify = (clientX: number, clientY: number, elapsedTime: number): string => {
    axiomNodes.forEach((node, i) => {
      const angle = (i / 6) * Math.PI * 2 + elapsedTime * 0.1;
      node.position.x = 15 * Math.cos(angle);
      node.position.z = 15 * Math.sin(angle);
      node.position.y = Math.sin(angle * 2.5) * 5;
    });
    scene.updateMatrixWorld(true);
    const mouse = new THREE.Vector2((clientX / W) * 2 - 1, -((clientY / H) * 2 - 1));
    const clickRaycaster = new THREE.Raycaster();
    clickRaycaster.setFromCamera(mouse, camera);
    const allNodes = [...axiomGroup.children, ...panelGroup.children];
    const interactables = [...allNodes, coreOrb];
    const intersects = clickRaycaster.intersectObjects(interactables, true);
    let hitTarget: THREE.Object3D | null = null;
    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && obj !== scene) {
        if (obj.name === 'core_orb' || (obj as any).userData?.type === 'panel' || (obj as any).userData?.type === 'axiom') {
          hitTarget = obj;
          break;
        }
        obj = obj.parent;
      }
      if (!hitTarget) hitTarget = intersects[0].object;
    }
    let isCoreOrb = false;
    const targetObj: THREE.Object3D | null = hitTarget;
    if (targetObj) {
      let curr: THREE.Object3D | null = targetObj;
      while (curr) {
        if (curr.name === 'core_orb') { isCoreOrb = true; break; }
        curr = curr.parent;
      }
    }
    let target: THREE.Object3D | null = targetObj;
    if (!isCoreOrb && (!target || ((target as any).userData?.type !== 'axiom' && (target as any).userData?.type !== 'panel'))) {
      const ray = clickRaycaster.ray;
      const tmp = new THREE.Vector3();
      let bestNode: THREE.Object3D | null = null;
      let bestDist = AXIOM_TAP_TOLERANCE_UNITS;
      axiomGroup.children.forEach((child) => {
        child.getWorldPosition(tmp);
        const d = ray.distanceToPoint(tmp);
        if (d < bestDist) { bestDist = d; bestNode = child; }
      });
      if (bestNode) target = bestNode;
    }
    if (!isCoreOrb && (target as any)?.userData?.type !== 'axiom' && (!target || (target as any).userData?.type !== 'panel')) {
      const ray = clickRaycaster.ray;
      const closestPointOnRay = new THREE.Vector3();
      ray.closestPointToPoint(new THREE.Vector3(0, 0, 0), closestPointOnRay);
      if (closestPointOnRay.distanceTo(new THREE.Vector3(0, 0, 0)) < 6.5) isCoreOrb = true;
    }
    if (isCoreOrb) return 'core-orb';
    if (target && (target as any).userData?.type === 'axiom') return 'axiom';
    if (target && (target as any).userData?.type === 'panel') return 'panel';
    return 'none';
  };

  let coreCount = 0;
  let total = 0;
  for (let t = 0; t <= 120; t += 0.5) {
    total++;
    if (classify(972, 513, t) === 'core-orb') coreCount++;
  }
  check(
    'a centre-orb tap classifies as the core orb across 120s of axiom orbit (241 samples)',
    coreCount === total,
    `got ${coreCount}/${total} core-orb`,
  );
  check(
    'a tap at the retest #17 solid-orb spot (1205,425) classifies as the core orb',
    classify(1205, 425, 0) === 'core-orb',
  );
  // Control: the repro DOES detect the misclassification class — a
  // panel node parked on the centre ray steals the tap (the pre-N12
  // bug shape). If this control failed, the sweep above would prove
  // nothing.
  panelNode0.position.set(0, 0, 10);
  check(
    'control: a panel node parked on the centre ray steals the tap (panel, not core-orb)',
    classify(972, 513, 0) === 'panel',
  );
  panelNode0.position.set(0, 8, 12);

  console.log('Ret18 mechanism — the stage-tap predicate on a fake DOM:');
  // Minimal fake DOM: the predicate only uses instanceof Element
  // (guarded by the source pins above), === canvas, closest() and
  // contains(). Mirror its logic here so the behaviour is testable
  // without a browser; the source pins above prove the component's
  // predicate has the same shape.
  class FakeEl {
    tag: string;
    attrs: Record<string, string> = {};
    parent: FakeEl | null = null;
    children: FakeEl[] = [];
    constructor(tag: string, attrs: Record<string, string> = {}) {
      this.tag = tag;
      this.attrs = attrs;
    }
    append(child: FakeEl): FakeEl {
      child.parent = this;
      this.children.push(child);
      return child;
    }
    closest(sel: string): FakeEl | null {
      const parts = sel.split(',').map((s) => s.trim());
      let el: FakeEl | null = this;
      while (el) {
        for (const p of parts) {
          if (p === el.tag) return el;
          const m = /^\[([^\]=]+)(?:="([^"]+)")?\]$/.exec(p);
          if (m && el.attrs[m[1]] !== undefined && (m[2] === undefined || el.attrs[m[1]] === m[2])) return el;
          const am = /^a\[href\]$/.exec(p);
          if (am && el.tag === 'a' && el.attrs.href !== undefined) return el;
        }
        el = el.parent;
      }
      return null;
    }
    contains(other: FakeEl | null): boolean {
      let el = other;
      while (el) {
        if (el === this) return true;
        el = el.parent;
      }
      return false;
    }
  }
  const CONTROL_SEL = 'button, input, textarea, select, a[href], [role="button"], [contenteditable="true"]';
  const isStageTapMirror = (target: FakeEl | null, canvas: FakeEl, mount: FakeEl): boolean => {
    if (!target) return false;
    if (target === canvas) return true;
    if (target.closest(CONTROL_SEL)) return false;
    return mount.contains(target);
  };
  // Stage: mount > [canvas, cssOverlay > panelDiv > [titleBar > button, contentDiv]]
  // HUD button + Following pill live OUTSIDE the mount, as siblings.
  const mount = new FakeEl('div');
  const canvas = mount.append(new FakeEl('canvas'));
  const cssOverlay = mount.append(new FakeEl('div'));
  const panelDiv = cssOverlay.append(new FakeEl('div'));
  const titleBar = panelDiv.append(new FakeEl('div'));
  const panelButton = titleBar.append(new FakeEl('button'));
  const contentDiv = panelDiv.append(new FakeEl('div'));
  const hudButton = new FakeEl('button'); // sibling of mount, not inside it
  const pillDiv = new FakeEl('div'); // Following pill, sibling of mount
  const pillButton = pillDiv.append(new FakeEl('button'));

  check('a press directly on the canvas is a stage tap', isStageTapMirror(canvas, canvas, mount));
  check(
    'a press on a panel div background is a stage tap (the raycast decides orb vs node)',
    isStageTapMirror(panelDiv, canvas, mount) && isStageTapMirror(contentDiv, canvas, mount),
  );
  check(
    'a press on a button inside the panel div is NOT a stage tap',
    !isStageTapMirror(panelButton, canvas, mount),
  );
  check(
    'a press on a HUD button outside the mount is NOT a stage tap (the ret17 bug stays fixed)',
    !isStageTapMirror(hudButton, canvas, mount),
  );
  check(
    'a press on the Following pill outside the mount is NOT a stage tap',
    !isStageTapMirror(pillDiv, canvas, mount) && !isStageTapMirror(pillButton, canvas, mount),
  );
  check('a press with no target is NOT a stage tap', !isStageTapMirror(null, canvas, mount));

  console.log(failures === 0 ? 'All ret18 orb-tap checks passed.' : `${failures} check(s) failed.`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
