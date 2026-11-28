/**
 * Registry-facing reasoning service (capability-matrix program, 2026-11-27).
 *
 * VERDICT on lib/reasoning/ReasoningCore.ts: REAL, not a shell. The
 * TreeOfThoughtReasoner genuinely branches, scores, prunes and synthesises
 * (expandTree / evaluateThought / calculateConfidence / best-path select),
 * and the SelfReflectiveAgent genuinely critiques and refines in a loop.
 * The only referencer, AdvancedReasoningPanel, already drives both with
 * the real local-model caller (LocalLLMContext.generateText) and gates on
 * a model being loaded. What was missing was never the engine — it was
 * a registry entry, an execute path, and evidence. This module is that
 * path: it runs the same classes the panel runs, behind an injectable
 * LLM caller.
 *
 * The caller is injectable because the registry is not React: the panel
 * owns the model (LocalLLMContext) and is the production caller source.
 * Until the panel (or another owner of a model) calls
 * setReasoningLLMCaller(generateText), execute fails HONESTLY with
 * REASONING_LLM_NOT_CONNECTED — never with canned text. Tests inject a
 * deterministic stub caller and prove the full pipeline.
 *
 * ContinualLearningSystem is deliberately NOT run here: it writes to
 * Dexie (browser IndexedDB) and belongs to the panel session, where it
 * already runs. A registry execute path must work headless.
 */
import { TreeOfThoughtReasoner, SelfReflectiveAgent } from './ReasoningCore';
import type { NVKEvidence } from '../../types';

export type ReasoningLLMCaller = (prompt: string, systemPrompt?: string) => Promise<string | null>;

// Module-level holder for the production caller. The panel owns the
// model; this is the seam where it hands its generateText over.
// Default null = no model connected = honest refusal, never a fake.
let injectedCaller: ReasoningLLMCaller | null = null;

export function setReasoningLLMCaller(caller: ReasoningLLMCaller | null): void {
  injectedCaller = caller;
}

export function getReasoningLLMCaller(): ReasoningLLMCaller | null {
  return injectedCaller;
}

export function isReasoningLLMConnected(): boolean {
  return injectedCaller !== null;
}

export type ReasoningMode = 'tree' | 'reflection';

export interface ReasoningAnalysisInput {
  problem?: string;
  query?: string;
  objective?: string;
  mode?: ReasoningMode;
}

export interface ReasoningAnalysisResult {
  mode: ReasoningMode;
  problem: string;
  finalAnswer: string;
  confidence: number;
  reasoning?: string[];
  steps?: number;
  iterations?: number;
  critique?: unknown;
  verified: true;
  evidence: NVKEvidence[];
}

/**
 * Run a real reasoning pass: Tree-of-Thought by default, self-reflection
 * when mode is 'reflection'. Throws REASONING_LLM_NOT_CONNECTED when no
 * caller is injected, and REASONING_NO_PROBLEM when there is nothing to
 * reason about. Returns the synthesised answer plus confidence, the
 * trace, and evidence for the ledger.
 */
export async function runReasoningAnalysis(
  input: ReasoningAnalysisInput,
  callerOverride?: ReasoningLLMCaller
): Promise<ReasoningAnalysisResult> {
  const problem = input?.problem || input?.query || input?.objective || '';
  if (!problem.trim()) {
    throw new Error('REASONING_NO_PROBLEM: reasoning.analysis needs a problem to reason about.');
  }
  const caller = callerOverride ?? injectedCaller;
  if (!caller) {
    throw new Error(
      'REASONING_LLM_NOT_CONNECTED: No language model is connected for reasoning — load a local model or connect Ollama/cloud, then retry. The Tree-of-Thought engine is registered but has no model to reason with.'
    );
  }
  const mode: ReasoningMode = input?.mode === 'reflection' ? 'reflection' : 'tree';
  const runId = `reasoning-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  if (mode === 'tree') {
    const reasoner = new TreeOfThoughtReasoner(caller);
    const path = await reasoner.solve(problem);
    return {
      mode,
      problem,
      finalAnswer: path.finalAnswer,
      confidence: path.totalConfidence,
      reasoning: path.reasoning,
      steps: path.nodes.length,
      verified: true,
      evidence: [
        {
          type: 'artifact_created',
          timestamp: Date.now(),
          reference: runId,
          metadata: {
            mode,
            engine: 'tree-of-thought',
            confidence: path.totalConfidence,
            steps: path.nodes.length,
            problem: problem.slice(0, 120)
          }
        }
      ]
    };
  }

  const reflector = new SelfReflectiveAgent(caller);
  const reflection = await reflector.generateWithReflection(problem);
  return {
    mode,
    problem,
    finalAnswer: reflection.improvedResponse,
    confidence: reflection.confidence,
    iterations: reflection.iterations,
    critique: reflection.critique,
    verified: true,
    evidence: [
      {
        type: 'artifact_created',
        timestamp: Date.now(),
        reference: runId,
        metadata: {
          mode,
          engine: 'self-reflection',
          confidence: reflection.confidence,
          iterations: reflection.iterations,
          problem: problem.slice(0, 120)
        }
      }
    ]
  };
}
