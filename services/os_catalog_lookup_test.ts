/**
 * OS catalog lookup test (fix round, 2026-11-27).
 *
 * Pure-module test — no server, no DOM, no model, no network. Verifies
 * the deterministic catalog lookup ported from CODEXA (option D): a
 * product price/identity question is answered from NVK_CATALOG with no
 * model call, so it cannot hallucinate a price. The live check that
 * motivated this asked "What is the NVK PULSE speaker and how much does
 * it cost?" and got "I don't have verified details" — the lookup must
 * answer $49.99, 360-degree sound, RGB light ring, IPX7, with the
 * store link.
 *
 * Run: npx tsx services/os_catalog_lookup_test.ts
 * (also wired into `npm test`).
 */
import { answerCatalogQuestion } from '../lib/catalogLookup';
import { NVK_CATALOG, NVK_PRODUCT_FACTS } from '../lib/nvkProductFacts';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) {
    console.log(`  PASS ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name} ${detail}`);
  }
};

console.log('Catalog lookup — the live-check question:');
check('PULSE speaker question is handled',
  answerCatalogQuestion('What is the NVK PULSE speaker and how much does it cost?').handled === true);
check('PULSE speaker reply states $49.99',
  (() => {
    const r = answerCatalogQuestion('What is the NVK PULSE speaker and how much does it cost?');
    return (r.reply ?? '').includes('$49.99');
  })());
check('PULSE speaker reply states 360-degree sound, RGB light ring, IPX7',
  (() => {
    const r = answerCatalogQuestion('What is the NVK PULSE speaker and how much does it cost?');
    return (r.reply ?? '').includes('360-degree sound')
      && (r.reply ?? '').includes('RGB light ring')
      && (r.reply ?? '').includes('IPX7');
  })());
check('PULSE speaker reply links the store page',
  (() => {
    const r = answerCatalogQuestion('What is the NVK PULSE speaker and how much does it cost?');
    return (r.reply ?? '').includes('https://nvk.global/products/nvk-pulse-rgb-speaker');
  })());

console.log('Catalog lookup — PULSE disambiguation:');
check('bare "How much is the PULSE?" lists all three, never guesses',
  (() => {
    const r = answerCatalogQuestion('How much is the PULSE?');
    return r.handled === true && r.ambiguousPulse === true
      && (r.products ?? []).length === 3
      && (r.reply ?? '').includes('$49.99')
      && (r.reply ?? '').includes('$79.99')
      && (r.reply ?? '').includes('$99.99');
  })());
check('"pulse headphones" answers the $79.99 headphones, not the speaker',
  (() => {
    const r = answerCatalogQuestion('How much are the pulse headphones?');
    return r.handled === true && (r.reply ?? '').includes('$79.99')
      && !(r.reply ?? '').includes('$49.99');
  })());
check('"pulse mirror" answers the $99.99 mirror',
  (() => {
    const r = answerCatalogQuestion('What is the pulse mirror and how much does it cost?');
    return r.handled === true && (r.reply ?? '').includes('$99.99');
  })());

console.log('Catalog lookup — other products and non-matches:');
check('KART 200 answers $1,859',
  (() => {
    const r = answerCatalogQuestion('How much is the KART 200?');
    return r.handled === true && (r.reply ?? '').includes('$1,859');
  })());
check('TIME MACHINE answers $299',
  (() => {
    const r = answerCatalogQuestion('What is the NVK Time Machine and how much does it cost?');
    return r.handled === true && (r.reply ?? '').includes('$299');
  })());
check('a mere mention with no question cue is NOT handled ("I love my PULSE speaker")',
  answerCatalogQuestion('I love my PULSE speaker').handled === false);
check('"What is 2+2?" is NOT handled (no product)',
  answerCatalogQuestion('What is 2+2?').handled === false);
check('bare "smartwatch" is NOT TIME MACHINE',
  answerCatalogQuestion('How much is the smartwatch?').handled === false);
check('bare "kart" is NOT KART 200',
  answerCatalogQuestion('How much is the kart?').handled === false);
check('an unlisted product is NOT handled',
  answerCatalogQuestion('How much is the NVK jetpack?').handled === false);
check('empty input is NOT handled',
  answerCatalogQuestion('').handled === false);

console.log('Product facts block:');
check('facts block contains $49.99 and the PULSE disambiguation note',
  NVK_PRODUCT_FACTS.includes('$49.99') && NVK_PRODUCT_FACTS.includes('three different products share the PULSE name'));
check('catalog holds 16 products',
  NVK_CATALOG.length === 16);
check('every catalog price starts with $',
  NVK_CATALOG.every((p) => p.price.startsWith('$')));

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll OS catalog lookup checks passed.');
