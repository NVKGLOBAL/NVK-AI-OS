/**
 * Retest #14 orb fix test (2026-11-23) — the two orb failures found live
 * on build index-5ux59jmo.js, diagnosed by a live browser inspection
 * (2026-11-23 21:48–22:02 PT).
 *
 * Source-pinned test — no server, no DOM, no model. The orb is a three.js
 * scene, so the fix is pinned by reading the source (the live end-to-end
 * — the orb visible in both modes — is verified by a live browser retest,
 * not here).
 *
 * Failure 1 — Universe mode (the DEFAULT mode, HolographicCore): the
 * centre was a hollow dotted particle ring with a black interior. Root
 * cause: the mode switch in CodexOrbSystem had NO case for
 * HolographicCore, so the mode group stayed empty and addInvisibleCore()
 * never ran in the mode the app opens in. The only "orb" was the shader
 * mesh (IcosahedronGeometry with a torus fragment shader) whose centre is
 * black by design. Proven live: switching to FLAMECORE (EntropicStorm)
 * showed a bright solid green sphere; back to OriginState (HolographicCore)
 * the centre was black again. Fix: a HolographicCore case that calls
 * addInvisibleCore() — the bright sphere (radius 1.5) sits inside the
 * torus ring (radius 2.8).
 *
 * Failure 2 — Split mode: the "LIVE 3D SPATIAL STAGE" was completely empty
 * dark navy, no orb, no 3D scene at all. Root cause: JarvisDesktop3D's
 * root div was className "fixed inset-0 z-0" — viewport-fixed, so its
 * canvas and HUD were positioned relative to the viewport and sat behind
 * the opaque app chrome instead of inside the 32vh stage (App.tsx line
 * ~2034: the stage div is `relative` + `overflow-hidden`, and
 * JarvisDesktop3D is rendered inside it). Fix: the root div is now
 * "absolute inset-0 z-0" so it fills the stage container.
 *
 * Run: npx tsx services/os_ret14_orb_fix_test.ts
 * (also wired into `npm test`.)
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
  const jarvis = read('components/three/JarvisDesktop3D.tsx');

  console.log('Ret14 failure 1 — HolographicCore (the default mode) gets a bright core:');
  check(
    'the mode switch has a HolographicCore case',
    /case OrbMode\.HolographicCore:/.test(orb),
  );
  const holoCase = orb.slice(orb.indexOf('case OrbMode.HolographicCore:'));
  check(
    'the HolographicCore case calls addInvisibleCore()',
    /addInvisibleCore\(\);/.test(holoCase.slice(0, 600)),
  );
  check(
    'addInvisibleCore still builds the bright sphere (not an invisible one)',
    /SphereGeometry\(1\.5, 32, 32\)/.test(orb) &&
      /MeshBasicMaterial/.test(orb) &&
      /0x00ffb3/.test(orb) &&
      /name = 'core_orb'/.test(orb),
  );
  check(
    'the default orb objects are still only visible in HolographicCore',
    /defaultOrbObjectsRef\.current\.visible = orbMode === OrbMode\.HolographicCore/.test(orb),
  );

  console.log('Ret14 failure 2 — Split mode stage fills its container:');
  check(
    'JarvisDesktop3D root is absolute (fills the relative stage), not fixed (viewport)',
    /className="absolute inset-0 z-0 bg-slate-950 select-none pointer-events-auto"/.test(jarvis) &&
      !/className="fixed inset-0 z-0 bg-slate-950 select-none pointer-events-auto"/.test(jarvis),
  );
  check(
    'the Split stage container is relative + overflow-hidden (the absolute root fills it)',
    /h-\[32vh\] min-h-\[220px\] max-h-\[360px\] w-full relative border-b border-cyan-500\/20 bg-black shrink-0 overflow-hidden/.test(read('App.tsx')),
  );
  check(
    'JarvisDesktop3D is rendered inside the Split stage (not at the app root)',
    read('App.tsx').indexOf('<JarvisDesktop3D') > read('App.tsx').indexOf('h-[32vh]'),
  );
  check(
    'the AgentCore is still rendered at size 2.5 in Split mode',
    /size=\{2\.5\}/.test(jarvis),
  );

  console.log(failures === 0 ? 'All ret14 orb checks passed.' : `${failures} check(s) failed.`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
