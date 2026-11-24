/**
 * OS search + math honesty test (MCNA slice 3 / A2 fix, 2026-11-23).
 *
 * Pure-module test — no server, no DOM, no model, no network. Verifies
 * the two honesty contracts: (1) the DuckDuckGo HTML parser returns the
 * real results from a results page and nothing at all from a block page
 * (no invented sources, no fabricated snippets); (2) the math evaluator
 * computes real arithmetic and fails honestly on non-math input, division
 * by zero, and empty input — it never returns a hardcoded value.
 *
 * Run: npx tsx services/os_search_math_test.ts
 * (also wired into `npm test`, after the existing three — it needs no server).
 */
import { parseDuckDuckGoHtml } from '../lib/duckDuckGoParser';
import { evaluateMathExpression } from '../lib/mathEvaluator';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) {
    console.log(`  PASS ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name} ${detail}`);
  }
};

const RESULTS_FIXTURE = `
<html><body>
  <div class="result">
    <a class="result__a" href="https://example.com/nvk-os">NVK AI OS — official page</a>
    <a class="result__snippet">The NVK AI OS workspace runs local models in the browser.</a>
  </div>
  <div class="result">
    <a class="result__a" href="https://duckduckgo.com/?q=second&amp;ia=web">Second &amp; result</a>
    <a class="result__snippet">A second result with &quot;quoted&quot; text.</a>
  </div>
  <div class="result">
    <a class="result__a">No href here</a>
    <a class="result__snippet">Orphan snippet for a link with no href.</a>
  </div>
</body></html>`;

const BLOCK_PAGE_FIXTURE = `
<html><body>
  <p>Please complete the captcha to continue.</p>
  <p>An error occurred while processing your request.</p>
</body></html>`;

console.log('DuckDuckGo HTML parser:');
check('parses 2 real results from a results page',
  (() => {
    const r = parseDuckDuckGoHtml(RESULTS_FIXTURE);
    return r.length === 2;
  })());
check('first result keeps its real title, URL, snippet, and source',
  (() => {
    const r = parseDuckDuckGoHtml(RESULTS_FIXTURE);
    return r[0].title === 'NVK AI OS — official page'
      && r[0].url === 'https://example.com/nvk-os'
      && r[0].snippet === 'The NVK AI OS workspace runs local models in the browser.'
      && r[0].source === 'example.com';
  })());
check('HTML entities in titles/snippets are decoded, not passed through raw',
  (() => {
    const r = parseDuckDuckGoHtml(RESULTS_FIXTURE);
    return r[1].title === 'Second & result'
      && r[1].snippet === 'A second result with "quoted" text.';
  })());
check('a link with no href is skipped (malformed entry invents nothing)',
  (() => {
    const r = parseDuckDuckGoHtml(RESULTS_FIXTURE);
    return r.every((x) => x.url.length > 0 && x.title.length > 0);
  })());
check('a block/captcha page yields zero results — nothing invented',
  parseDuckDuckGoHtml(BLOCK_PAGE_FIXTURE).length === 0);
check('empty HTML yields zero results',
  parseDuckDuckGoHtml('').length === 0);
check('a page with no result markup yields zero results',
  parseDuckDuckGoHtml('<html><body><p>hello world</p></body></html>').length === 0);

console.log('Math evaluator:');
check("'5+5' computes to 10",
  (() => {
    const r = evaluateMathExpression('5+5');
    return r.ok === true && r.value === 10;
  })());
check("'What is 5+5?' extracts and computes to 10",
  (() => {
    const r = evaluateMathExpression('What is 5+5?');
    return r.ok === true && r.value === 10;
  })());
check("'2 * 3 + 4' computes to 10 (real arithmetic, not a hardcoded 10)",
  (() => {
    const r = evaluateMathExpression('2 * 3 + 4');
    return r.ok === true && r.value === 10;
  })());
check("'7 + 8' computes to 15 — never the old hardcoded 10",
  (() => {
    const r = evaluateMathExpression('7 + 8');
    return r.ok === true && r.value === 15;
  })());
check("'capital of France' fails honestly (no numbers, no invented answer)",
  (() => {
    const r = evaluateMathExpression('capital of France');
    return r.ok === false;
  })());
check("'10/0' fails honestly (non-finite result is not an answer)",
  (() => {
    const r = evaluateMathExpression('10/0');
    return r.ok === false;
  })());
check('empty input fails honestly',
  evaluateMathExpression('').ok === false);
check('a failure result carries a human-readable reason',
  (() => {
    const r = evaluateMathExpression('capital of France');
    return r.ok === false && (r.reason ?? '').length > 0;
  })());

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll OS search + math honesty checks passed.');
