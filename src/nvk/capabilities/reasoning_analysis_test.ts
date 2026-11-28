/**
 * Reasoning analysis test (matrix item 1, 2026-11-27).
 *
 * VERDICT: lib/reasoning/ReasoningCore.ts is REAL. TreeOfThoughtReasoner
 * genuinely branches, scores, prunes and synthesises; SelfReflectiveAgent
 * genuinely critiques and refines. The gap was only registration: the
 * matrix claimed reasoning.analysis true while it existed nowhere else.
 * This test proves the registered capability end to end with a
 * deterministic stub LLM caller (no model, no network, no key):
 *
 *   (A) the engine computes: different evaluation scores produce a
 *       different tree shape AND a different confidence — nothing is
 *       hardcoded;
 *   (B) the reflection loop critiques, improves, and stops on confidence;
 *   (C) the registered reasoning.analysis executes through the runtime
 *       entry AND the audited services path, with evidence + a hashed
 *       ledger entry, in both tree and reflection modes;
 *   (D) with no model connected it fails HONESTLY (audit refuses as
 *       unavailable with no ledger entry; direct execute throws
 *       REASONING_LLM_NOT_CONNECTED) — never canned text.
 *
 * The stub caller stands in for the local model. In production the
 * AdvancedReasoningPanel hands its real generateText to
 * setReasoningLLMCaller (coordinator follow-up, 2 lines).
 *
 * No server, no DOM, no model, no network.
 *
 * Run: npx tsx src/nvk/capabilities/reasoning_analysis_test.ts
 * (coordinator wires it into `npm test`.)
 */
import { TreeOfThoughtReasoner, SelfReflectiveAgent } from '../../../lib/reasoning/ReasoningCore';
import {
  setReasoningLLMCaller,
  isReasoningLLMConnected,
  type ReasoningLLMCaller
} from '../../../lib/reasoning/reasoningService';
import { capabilityRegistry as runtimeRegistry } from './CapabilityRegistry';
import { capabilityRegistry as servicesRegistry } from '../../../services/CapabilityRegistry';
import { unifiedCapabilityRegistry } from './CanonicalCapabilityRegistry';
import { sovereignLedger } from '../../../services/SovereignLedger';

function fail(message: string): never {
  throw new Error(message);
}

function approx(actual: number, expected: number, tolerance = 0.01): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

/**
 * Deterministic stub for the LLM caller. Step generation always returns
 * the same three branches; evaluation returns the given scores, so the
 * tree shape and the confidence are functions of those scores; synthesis
 * returns a fixed answer; the critique is harsh on a first draft and
 * clean once the response was improved, so the reflection loop runs
 * exactly two iterations.
 */
function makeStubCaller(evalScores: { correctness: number; completeness: number; coherence: number }): ReasoningLLMCaller {
  return async (prompt: string): Promise<string | null> => {
    if (prompt.includes('different possible next logical steps')) {
      return JSON.stringify([
        { content: 'Add 2 and 2 to get 4', state: 'sum=4' },
        { content: 'Count two apples plus two apples to get four apples', state: 'count=4' },
        { content: 'Multiply 2 by 2 to get 4', state: 'product=4' }
      ]);
    }
    if (prompt.includes('Rate from 0.0 to 1.0')) {
      return JSON.stringify(evalScores);
    }
    if (prompt.includes('Provide a clear, concise final answer')) {
      return 'The answer is 4: two plus two equals four.';
    }
    if (prompt.includes('Provide a comprehensive, well-reasoned response')) {
      return 'Initial draft: two plus two is four.';
    }
    if (prompt.includes('Analyze this response critically')) {
      if (prompt.includes('Improved:')) {
        return JSON.stringify({ strengths: ['clear'], weaknesses: [], errors: [], improvements: [] });
      }
      return JSON.stringify({
        strengths: ['correct arithmetic'],
        weaknesses: ['brief', 'unclear'],
        errors: ['wrong sign'],
        improvements: ['show working']
      });
    }
    if (prompt.includes('Generate an improved response')) {
      return 'Improved: two plus two equals four, because addition combines the quantities.';
    }
    return null;
  };
}

const STRONG_EVAL = { correctness: 0.9, completeness: 0.8, coherence: 0.9 }; // per-node confidence 0.87
const WEAK_EVAL = { correctness: 0.6, completeness: 0.6, coherence: 0.6 }; // per-node confidence 0.60

async function runTests() {
  const stub = makeStubCaller(STRONG_EVAL);

  // A. The engine computes: strong scores branch deep with high confidence.
  console.log('Reasoning A: Tree-of-Thought computes from evaluation scores...');
  const reasoner = new TreeOfThoughtReasoner(stub);
  const path = await reasoner.solve('What is 2+2?');
  if (path.nodes.length !== 4) fail(`Strong-score tree should reach depth 3 (4 nodes), got ${path.nodes.length}`);
  if (path.reasoning.length !== 4) fail(`Reasoning trace should have 4 steps, got ${path.reasoning.length}`);
  // Root confidence is 0 (never evaluated); three scored nodes at 0.87.
  if (!approx(path.totalConfidence, 0.6525)) {
    fail(`Total confidence should be ~(0 + 0.87*3)/4 = 0.6525, got ${path.totalConfidence}`);
  }
  if (!path.finalAnswer.includes('4')) fail(`Final answer should contain 4, got ${JSON.stringify(path.finalAnswer)}`);
  console.log(`  Strong-score tree OK: ${path.nodes.length} nodes, confidence ${path.totalConfidence.toFixed(4)}, answer "${path.finalAnswer}".`);

  // A2. Weak scores change the tree shape AND the confidence — proof
  // the numbers are computed, not constants. (0.60 is kept but NOT
  // expanded: expansion needs confidence > 0.6.)
  const weakReasoner = new TreeOfThoughtReasoner(makeStubCaller(WEAK_EVAL));
  const weakPath = await weakReasoner.solve('What is 2+2?');
  if (weakPath.nodes.length !== 2) fail(`Weak-score tree should stop at depth 1 (2 nodes), got ${weakPath.nodes.length}`);
  if (!approx(weakPath.totalConfidence, 0.3)) {
    fail(`Weak total confidence should be ~(0 + 0.60)/2 = 0.30, got ${weakPath.totalConfidence}`);
  }
  if (approx(weakPath.totalConfidence, path.totalConfidence)) fail('Weak and strong runs must not share a confidence');
  console.log(`  Weak-score tree OK: ${weakPath.nodes.length} nodes, confidence ${weakPath.totalConfidence.toFixed(4)} — shape and score both move with the evaluations.`);

  // B. The reflection loop critiques, improves, and stops on confidence.
  console.log('Reasoning B: self-reflection loop (critique -> improve -> stop)...');
  const reflector = new SelfReflectiveAgent(stub);
  const reflection = await reflector.generateWithReflection('What is 2+2?');
  if (reflection.iterations !== 2) fail(`Reflection should run 2 iterations (harsh critique, then clean), got ${reflection.iterations}`);
  if (reflection.confidence !== 1.0) fail(`Reflection confidence should be 1.0 after the clean critique, got ${reflection.confidence}`);
  if (!reflection.improvedResponse.includes('Improved:')) {
    fail(`Improved response should be the refined text, got ${JSON.stringify(reflection.improvedResponse)}`);
  }
  if (!Array.isArray(reflection.critique.strengths) || reflection.critique.strengths.length === 0) {
    fail('Reflection critique should carry strengths');
  }
  console.log(`  Reflection OK: ${reflection.iterations} iterations, confidence ${reflection.confidence}, improved response recorded.`);

  // C. The registered capability executes — runtime entry + audited path.
  console.log('Reasoning C: registered reasoning.analysis executes (tree + reflection)...');
  const runtimeCap = runtimeRegistry.getCapability('reasoning.analysis');
  const servicesCap = servicesRegistry.get('reasoning.analysis');
  if (!runtimeCap) fail('runtime registry has no reasoning.analysis — the false claim is not fixed');
  if (!servicesCap) fail('services registry has no reasoning.analysis — registries are not unified');
  if (runtimeCap.available !== true) fail('reasoning.analysis should be statically available (wired)');
  if (runtimeCap.id !== 'reasoning.analysis' || servicesCap.id !== 'reasoning.analysis') {
    fail('adapters disagree on the reasoning.analysis id');
  }

  setReasoningLLMCaller(stub);
  try {
    if (!isReasoningLLMConnected()) fail('isReasoningLLMConnected should be true after injecting the stub caller');
    if (!(await unifiedCapabilityRegistry.isAvailable('reasoning.analysis'))) {
      fail('reasoning.analysis should be live-available with a caller connected');
    }

    const treeResult: any = await runtimeCap.execute({ problem: 'What is 2+2?' });
    if (!treeResult.finalAnswer?.includes('4')) fail(`Tree result should answer 4, got ${JSON.stringify(treeResult.finalAnswer)}`);
    if (!approx(treeResult.confidence, 0.6525)) fail(`Tree confidence should be ~0.6525, got ${treeResult.confidence}`);
    if (treeResult.verified !== true) fail('Tree result should be verified: true');
    if (!Array.isArray(treeResult.evidence) || treeResult.evidence.length === 0) {
      fail('Tree result carries no evidence');
    }
    if (!String(treeResult.evidence[0].reference || '').startsWith('reasoning-')) {
      fail(`Evidence reference should identify the run, got ${JSON.stringify(treeResult.evidence[0].reference)}`);
    }
    if (treeResult.evidence[0].metadata?.engine !== 'tree-of-thought') {
      fail('Tree evidence should name the tree-of-thought engine');
    }
    if (!(await runtimeCap.verify!({ problem: 'What is 2+2?' }, treeResult))) {
      fail('verify() should accept the tree result');
    }
    if (await runtimeCap.verify!({}, { finalAnswer: '', confidence: 2 })) {
      fail('verify() should reject an empty answer with confidence 2');
    }
    console.log(`  Tree execute OK: "${treeResult.finalAnswer}" (confidence ${treeResult.confidence.toFixed(4)}, evidence ${treeResult.evidence[0].reference}).`);

    const reflectionResult: any = await runtimeCap.execute({ problem: 'What is 2+2?', mode: 'reflection' });
    if (!reflectionResult.finalAnswer?.includes('Improved:')) {
      fail(`Reflection result should be the improved text, got ${JSON.stringify(reflectionResult.finalAnswer)}`);
    }
    if (reflectionResult.iterations !== 2) fail(`Reflection result should record 2 iterations, got ${reflectionResult.iterations}`);
    console.log('  Reflection execute OK via the same registered entry.');

    const ledgerBefore = sovereignLedger.getEntries().length;
    const audited = await servicesRegistry.executeWithAudit('reasoning.analysis', { problem: 'What is 2+2?' }, {});
    if (audited.success !== true) fail(`Audited reasoning should succeed, got error: ${audited.error || 'none'}`);
    if (!(audited.output as any)?.finalAnswer?.includes('4')) {
      fail(`Audited output should carry the answer, got ${JSON.stringify(audited.output)}`);
    }
    const ledgerAfter = sovereignLedger.getEntries();
    if (ledgerAfter.length !== ledgerBefore + 1) {
      fail(`Audited reasoning should append exactly 1 ledger entry, got ${ledgerAfter.length - ledgerBefore}`);
    }
    const entry = ledgerAfter[ledgerAfter.length - 1];
    if (entry.capabilityId !== 'reasoning.analysis') fail(`Ledger entry should be reasoning.analysis, got ${entry.capabilityId}`);
    if (entry.authorization !== 'auto_approved') fail(`Ledger entry should be auto_approved, got ${entry.authorization}`);
    if (!/^[0-9a-f]{64}$/.test(entry.entryHash)) fail(`Ledger entry has no valid SHA-256 hash: ${entry.entryHash}`);
    console.log(`  Audited OK: ledger entry ${entry.id} hash ${entry.entryHash.slice(0, 16)}….`);
  } finally {
    setReasoningLLMCaller(null);
  }

  // D. Honest failure with no model connected — never canned text.
  console.log('Reasoning D: honest failure with no model connected...');
  if (isReasoningLLMConnected()) fail('caller should be cleared after the finally block');
  if (await unifiedCapabilityRegistry.isAvailable('reasoning.analysis')) {
    fail('reasoning.analysis should NOT be live-available with no caller');
  }
  const ledgerBeforeRefusal = sovereignLedger.getEntries().length;
  const refused = await servicesRegistry.executeWithAudit('reasoning.analysis', { problem: 'What is 2+2?' }, {});
  if (refused.success !== false) fail('Audited reasoning with no model should fail, not succeed');
  if (!/unavailable or offline/i.test(refused.error || '')) {
    fail(`Refusal should name unavailability, got: ${refused.error || 'no error'}`);
  }
  if (sovereignLedger.getEntries().length !== ledgerBeforeRefusal) {
    fail('Refused reasoning must not append a ledger entry (A1: nothing executed)');
  }
  let threw = false;
  try {
    await runtimeCap.execute({ problem: 'What is 2+2?' });
  } catch (e: any) {
    threw = true;
    if (!/REASONING_LLM_NOT_CONNECTED/.test(e.message)) {
      fail(`Direct execute should throw REASONING_LLM_NOT_CONNECTED, got: ${e.message}`);
    }
    if (!/load a local model/i.test(e.message)) fail('Refusal should name the fix (load a local model)');
  }
  if (!threw) fail('Direct execute with no model should throw, not invent an answer');
  console.log('  Honest failure OK: audit refuses without a ledger entry, direct execute throws REASONING_LLM_NOT_CONNECTED.');

  console.log('All reasoning tests passed (real engine, registered, executed, evidenced, honest without a model).');
}

runTests().catch((err) => {
  console.error('Reasoning test FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
