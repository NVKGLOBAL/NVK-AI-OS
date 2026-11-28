/**
 * OS console-position clamp test (fix round, 2026-11-27).
 *
 * Desktop check 2026-11-27 17:12–17:22 PT: after a Desk → Universe /
 * Split switch the console header rendered clipped above the viewport,
 * "Reset to Top-Left" unreachable. Cause: the floating top comes from
 * the persisted `nvk_command_layer_pos` value, which was applied
 * verbatim — any stale, negative, or out-of-range value saved by an
 * older drag (or a drag on a differently-sized viewport) put the card's
 * top above the screen, and no code path ever re-checked it. The fix
 * clamps the stored value on load and whenever the console returns to
 * floating mode (clampConsolePosition, lib/mobileWorkspace.ts).
 *
 * Pure-module test — no DOM, no React. Run:
 * npx tsx services/os_console_position_test.ts (also wired into `npm test`).
 */
import { clampConsolePosition } from '../lib/mobileWorkspace';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) {
    console.log(`  PASS ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name} ${detail}`);
  }
};

console.log('Console position clamp — the clipped-header repro:');
check('negative top is clamped to 10 (header stays on screen)',
  clampConsolePosition({ x: 24, y: -20 }, { width: 1920, height: 1000 }).y === 10);
check('negative left is clamped to 10',
  clampConsolePosition({ x: -50, y: 24 }, { width: 1920, height: 1000 }).x === 10);
check('top beyond the viewport is clamped to height-100',
  clampConsolePosition({ x: 24, y: 5000 }, { width: 1920, height: 1000 }).y === 900);
check('left beyond the viewport is clamped to width-320',
  clampConsolePosition({ x: 5000, y: 24 }, { width: 1920, height: 1000 }).x === 1600);
check('non-finite values fall back to the top-left default',
  (() => {
    const p = clampConsolePosition({ x: NaN, y: Infinity }, { width: 1920, height: 1000 });
    return p.x === 24 && p.y === 24;
  })());
check('a valid in-bounds position passes through unchanged',
  (() => {
    const p = clampConsolePosition({ x: 24, y: 24 }, { width: 1920, height: 1000 });
    return p.x === 24 && p.y === 24;
  })());
check('a tiny viewport never produces a negative bound',
  (() => {
    const p = clampConsolePosition({ x: 24, y: 24 }, { width: 300, height: 200 });
    return p.x === 10 && p.y === 24;
  })());

if (failures > 0) {
  console.error(`os_console_position_test: ${failures} failure(s)`);
  process.exit(1);
}
console.log('os_console_position_test: all checks passed');
