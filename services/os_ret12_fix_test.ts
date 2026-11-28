/**
 * Retest #12 fix test (2026-11-23) — the two slice-3 failures found live
 * on build index-6P4l32iw.js, plus the no-model honesty contract.
 *
 * Pure-module test — no server, no DOM, no model. (The search check runs
 * the real web.search capability, which now searches client-side via
 * CORS-enabled public APIs — in node with network it may return real
 * results, without network it fails honestly; the test asserts the
 * honest contract, not a specific outcome: real results with real
 * titles/urls, or an honest unavailable message. Never silence, never
 * a fabricated price.)
 *
 * Failure 1 — "turn the Flower of Life green/blue/red" did nothing live:
 * the dispatcher + bus were fine (verified here with the exact typed
 * commands), but the Flower panel's DEFAULT mode is Recursive, whose draw
 * path (drawRecursivePolygons + drawBackground) never read accentHue, so
 * the canvas was pixel-identical; and at the retest's 750px viewport the
 * console starts minimized, hiding the dispatcher's confirmation. The
 * visual fix threads accentHue into the background + recursive polygons
 * (verified by build + the prop derivation asserted here); the visibility
 * fix auto-expands the console on a new NVK reply.
 *
 * Failure 2 — math/search/general Q&A gave silence with no model loaded:
 * the math intercept answers deterministically, the search intercept runs
 * the real capability or says honestly that search is unavailable, and a
 * general question with no model loaded gets the honest no-model reply.
 * IntentEngine no longer routes "what is the capital of France?" to the
 * calculator.
 *
 * Run: npx tsx services/os_ret12_fix_test.ts
 * (also wired into `npm test`, after the slice-3 suites.)
 */
import {
  registerOsPanelBridge,
  getOsPanel,
  getOsPanelBusSnapshot,
  getFlowerAccentHue,
  resetOsPanelBusStore,
} from '../lib/stores/osPanelBusStore';
import { dispatchPanelCommand } from './OsPanelCommandDispatcher';
import {
  tryAnswerMath,
  isSearchQuestion,
  answerSearchQuestion,
  needsNoModelReply,
  NO_MODEL_REPLY,
} from './osNoModelAnswers';
import { intentEngine } from '../src/nvk/intent/IntentEngine';

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
  // Fake bridge — records what the bus asked App to do.
  resetOsPanelBusStore();
  registerOsPanelBridge({
    openPanel: () => true,
    closePanel: () => true,
    focusPanel: () => true,
  });

  console.log('Ret12 failure 1 — exact color commands through the dispatcher:');
  for (const [cmd, hue, color] of [
    ['turn the Flower of Life green', 120, 'green'],
    ['turn the Flower of Life blue', 210, 'blue'],
    ['turn the Flower of Life red', 0, 'red'],
  ] as const) {
    resetOsPanelBusStore();
    registerOsPanelBridge({ openPanel: () => true, closePanel: () => true, focusPanel: () => true });
    const opened = dispatchPanelCommand('open the Flower of Life panel');
    const r = dispatchPanelCommand(cmd);
    const props = getOsPanel('FlowerOfLifeEntropyExplorer')?.properties ?? {};
    const accentHue = getFlowerAccentHue(getOsPanelBusSnapshot().panelProperties);
    check(`"${cmd}" is handled, ok, and confirms the color`,
      opened.handled === true && opened.ok === true
      && r.handled === true && r.ok === true
      && (r.confirmation ?? '').toLowerCase().includes(color));
    check(`"${cmd}" sets the bus hue to ${hue} AND the Flower panel receives accentHue ${hue}`,
      props.hue === hue && accentHue === hue);
  }
  check('no color set yet -> the Flower panel receives accentHue null (own hue, unchanged)',
    (() => {
      resetOsPanelBusStore();
      return getFlowerAccentHue(getOsPanelBusSnapshot().panelProperties) === null;
    })());
  check('a non-numeric stored hue is never passed to the panel',
    getFlowerAccentHue({ FlowerOfLifeEntropyExplorer: { hue: 'green' } }) === null);

  console.log('Ret12 failure 2 — math answers deterministically, no model:');
  check('"what is 7+8?" answers "7+8 = 15"',
    tryAnswerMath('what is 7+8?') === '7+8 = 15');
  check('a bare expression "7+8" answers the same',
    tryAnswerMath('7+8') === '7+8 = 15');
  check('"2 * 3 + 4" computes to 10 (real arithmetic)',
    tryAnswerMath('2 * 3 + 4') === '2 * 3 + 4 = 10');
  check('"what is the capital of France?" is not math (no invented number)',
    tryAnswerMath('what is the capital of France?') === null);
  check('a date is not math ("The meeting is 2026-11-23" -> null)',
    tryAnswerMath('The meeting is 2026-11-23') === null);
  check('a phone number is not math ("call me at 555-1234" -> null)',
    tryAnswerMath('call me at 555-1234') === null);
  check('a bare year is not math ("what is the price of gold in 2026?" -> null)',
    tryAnswerMath('what is the price of gold in 2026?') === null);
  check('a search question is not math',
    tryAnswerMath('search the web for the current price of gold') === null);

  console.log('Ret12 failure 2 — search detection:');
  check('"search the web for the current price of gold" is a search question',
    isSearchQuestion('search the web for the current price of gold') === true);
  check('"what is the current price of gold?" is a search question',
    isSearchQuestion('what is the current price of gold?') === true);
  check('"Research NVK Global" is a search question',
    isSearchQuestion('Research NVK Global') === true);
  check('"what is 7+8?" is not a search question',
    isSearchQuestion('what is 7+8?') === false);
  check('"open the Flower of Life panel" is not a search question',
    isSearchQuestion('open the Flower of Life panel') === false);

  console.log('Ret12 failure 2 — IntentEngine no longer misroutes general questions:');
  check('"what is the capital of France?" is not a calculation',
    intentEngine.classify('what is the capital of France?').intent !== 'calculation');
  check('"what is 7+8?" is still a calculation',
    intentEngine.classify('what is 7+8?').intent === 'calculation');
  check('"5+5" is still a calculation',
    intentEngine.classify('5+5').intent === 'calculation');
  check('"call 555-1234" is not a calculation',
    intentEngine.classify('call 555-1234').intent !== 'calculation');

  console.log('Ret12 failure 2 — no-model gate for general Q&A:');
  check('a general question with no model loaded needs the honest reply',
    needsNoModelReply('run_task', false) === true);
  check('a greeting with no model loaded needs the honest reply',
    needsNoModelReply('conversation', false) === true);
  check('capability discovery is NOT gated (works without a model)',
    needsNoModelReply('capability_discovery', false) === false);
  check('nothing is gated once a model is loaded',
    needsNoModelReply('run_task', true) === false);
  check('the no-model reply names hydrating the matrix',
    /hydrate the matrix/i.test(NO_MODEL_REPLY));

  console.log('Ret12 failure 2 — search answers honestly (real results or refusal, never silence):');
  const search = await answerSearchQuestion('search the web for the current price of gold');
  check('a search question always gets a non-empty reply',
    typeof search.reply === 'string' && search.reply.length > 0, JSON.stringify(search.reply));
  check('the reply is either real results or an honest unavailable message — never a fabrication',
    (() => {
      if (search.results > 0) return /real source/i.test(search.reply) && search.reply.includes('http');
      return /can't search|no parseable results/i.test(search.reply);
    })(), JSON.stringify(search.reply));
  check('an unavailable search never invents a price',
    search.results === 0 ? !/\$\d+/.test(search.reply) : true, JSON.stringify(search.reply));

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll OS retest-12 fix checks passed.');
}

main().catch((e) => {
  console.error('Ret12 test crashed:', e?.message ?? String(e));
  process.exit(1);
});
