/**
 * OS planner honesty test (MCNA slice 7, 2026-11-23).
 *
 * Pure-module test — no server, no DOM, no model, no network. Verifies
 * the two slice-7 planner fixes:
 *   (1) No hardcoded Texas-solar plan: research about Texas/solar/pitch
 *       decks no longer routes to workflow_execution and no longer builds
 *       a fixed "Research commercial solar opportunities in Texas" +
 *       "Create pitch deck artifact for NVK Global" plan. Research goes
 *       to web_research; a pitch deck goes to document_generation.
 *   (2) No default web.search: a greeting ("hello") or an unknown input
 *       no longer gets a fabricated web.search plan. The Planner builds
 *       NO nodes for an intent with no tool, and the runtime turns that
 *       empty plan into `ask` (needs_input) instead of executing a
 *       guessed search.
 *
 * Run: npx tsx services/os_slice7_planner_test.ts
 * (also wired into `npm test` — it needs no server).
 */
import { intentEngine } from '../src/nvk/intent/IntentEngine';
import { planner } from '../src/nvk/planning/Planner';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) {
    console.log(`  PASS ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name} ${detail}`);
  }
};

const planFor = (input: string) => {
  const parsed = intentEngine.classify(input);
  const graph = planner.createPlan(`test-${Date.now()}`, parsed, input);
  return { parsed, graph };
};

// --- 1. No hardcoded Texas-solar plan ---
{
  const { parsed } = planFor('Research commercial solar in Texas');
  check('research about Texas solar classifies as web_research (not workflow_execution)', parsed.intent === 'web_research', `got ${parsed.intent}`);
}
{
  const { parsed, graph } = planFor('Research commercial solar in Texas');
  check('Texas solar research builds a plain web.search plan (1 node, no hardcoded pitch deck)', graph.nodes.length === 1 && graph.nodes[0].capability === 'web.search', `nodes=${graph.nodes.length}`);
  check('no node has the hardcoded Texas solar objective', !graph.nodes.some((n) => n.objective.includes('Texas')), '');
  check('no node has the hardcoded pitch deck topic', !graph.nodes.some((n) => JSON.stringify(n.input).includes('Texas Solar Pitch Deck')), '');
}
{
  const { parsed } = planFor('Create a pitch deck for NVK Global');
  check('a pitch deck classifies as document_generation (not workflow_execution)', parsed.intent === 'document_generation', `got ${parsed.intent}`);
}
{
  const { parsed } = planFor('Research Texas energy policy');
  check('research about Texas classifies as web_research (not workflow_execution)', parsed.intent === 'web_research', `got ${parsed.intent}`);
}

// --- 2. No default web.search for greetings / unknown input ---
{
  const { parsed, graph } = planFor('hello');
  check('greeting classifies as conversation', parsed.intent === 'conversation', `got ${parsed.intent}`);
  check('greeting builds NO plan nodes (no fabricated web.search)', graph.nodes.length === 0, `nodes=${graph.nodes.length}`);
}
{
  const { parsed, graph } = planFor('flibberty gibbet wozzle');
  check('unknown input classifies as unknown (not run_task)', parsed.intent === 'unknown', `got ${parsed.intent}`);
  check('unknown input builds NO plan nodes (ask, not a guessed search)', graph.nodes.length === 0, `nodes=${graph.nodes.length}`);
}
{
  const { parsed, graph } = planFor('What is the meaning of life?');
  check('a general question classifies as unknown', parsed.intent === 'unknown', `got ${parsed.intent}`);
  check('a general question builds NO plan nodes', graph.nodes.length === 0, `nodes=${graph.nodes.length}`);
}

// --- Real intents still build real plans ---
{
  const { parsed, graph } = planFor('search for NVK smartwatch');
  check('a real search still classifies as web_research', parsed.intent === 'web_research', `got ${parsed.intent}`);
  check('a real search still builds 1 web.search node', graph.nodes.length === 1 && graph.nodes[0].capability === 'web.search', `nodes=${graph.nodes.length}`);
}
{
  const { parsed, graph } = planFor('what is 7+8?');
  check('a math question still classifies as calculation', parsed.intent === 'calculation', `got ${parsed.intent}`);
  check('a math question still builds 1 calculation node', graph.nodes.length === 1 && graph.nodes[0].capability === 'calculation.math', `nodes=${graph.nodes.length}`);
}

if (failures > 0) {
  console.error(`\nSlice-7 planner test FAILED (${failures} failure(s)).`);
  process.exit(1);
}
console.log('\nSlice-7 planner test PASSED.');
