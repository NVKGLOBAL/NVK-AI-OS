// services/osNoModelAnswers.ts
// Retest #12 fix (2026-11-23) — deterministic, model-free answers for the
// chat (NVKCommandLayer) and voice (NVKVoiceOrchestratorPanel) paths.
//
// Root cause of retest #12 item 13: with no model loaded, "what is 7+8?",
// "search the web for the current price of gold" and general Q&A all went
// to the runtime, which could not answer any of them on the static deploy:
//   - math DID compute in the runtime (calculation.math is deterministic),
//     but the reply sat in the chat history, invisible while the console
//     was minimized at narrow widths — the retest saw silence;
//   - web.search runs client-side with no server: it queries
//     CORS-enabled public search APIs (DuckDuckGo Instant Answer,
//     Wikipedia) directly from the browser, with the dev-server proxy
//     scrape only as a fallback — so a search works on the static
//     GitHub Pages deploy too, and a failure names the reason instead
//     of inventing results;
//   - general "what is ...?" questions were misrouted to the calculator by
//     IntentEngine's greedy "what is " rule and failed with "no arithmetic
//     expression found" — a confusing error, not an answer.
//
// The fix is a dispatcher-style intercept, same pattern as slice 3's panel
// dispatcher: deterministic questions are answered here, before the
// runtime, with no model call. Anything this module cannot answer returns
// null/false and falls through to the runtime as before. It never invents
// a value, a result, or a price:
//   - math: only a real arithmetic expression (number-operator-number)
//     that evaluates to a finite number is answered, as "<expr> = <value>".
//     A date ("2026-11-23"), a phone number ("555-1234") or a bare year
//     ("in 2026") is NOT arithmetic — it has words around it or no
//     operator — and falls through.
//   - search: the real web.search capability runs; its real results are
//     shown, or an honest "can't search right now" message names the
//     failure. No results are ever invented.
//   - general Q&A with no model loaded: the caller answers with the
//     honest no-model reply (needsNoModelReply) instead of sending the
//     question to a runtime that can only fail it.

import { evaluateMathExpression } from '../lib/mathEvaluator';
import { intentEngine } from '../src/nvk/intent/IntentEngine';
import { capabilityRegistry } from '../src/nvk/capabilities/CapabilityRegistry';

/** True when the utterance contains real arithmetic: <number> <op> <number>. */
export function hasArithmetic(utterance: string): boolean {
  return /\d+\s*[+\-*/]\s*\d+/.test(utterance);
}

/**
 * Answer a math question deterministically ("what is 7+8?" -> "7+8 = 15"),
 * or null when the utterance is not a math question. Two gates, so a date,
 * a phone number or a year never "computes": either the utterance starts
 * with a math framing (what is / calculate / compute / how much is / solve)
 * plus real arithmetic, or the utterance IS (almost entirely) an arithmetic
 * expression ("7+8?", "2 * 3 + 4"). A failed evaluation returns null — the
 * caller falls through — never a fabricated number.
 */
export function tryAnswerMath(utterance: string): string | null {
  const text = utterance.trim();
  if (text.length === 0) return null;
  if (!hasArithmetic(text)) return null;
  const framed = /^(what is|calculate|compute|how much is|solve)\b/i.test(text);
  const pureExpression = /^[\d\s+\-*/().?]+$/.test(text);
  if (!framed && !pureExpression) return null;
  const evaluated = evaluateMathExpression(text);
  if (evaluated.ok === false) return null;
  return `${evaluated.expression.trim()} = ${evaluated.value}`;
}

/**
 * True when the utterance is a web-search question: it names searching, or
 * asks for a current price / latest information, or the intent engine
 * classifies it as web_research. (A math question is not a search question:
 * "what is 7+8?" classifies as calculation, not web_research.)
 */
export function isSearchQuestion(utterance: string): boolean {
  if (/\b(search|research|find|look up|lookup)\b/i.test(utterance)) return true;
  if (/\b(current price|price of|latest|news about|weather)\b/i.test(utterance)) return true;
  return intentEngine.classify(utterance).intent === 'web_research';
}

export interface SearchAnswer {
  reply: string;
  /** Number of real results shown (0 when the answer is an honest refusal). */
  results: number;
}

/**
 * Run a search question through the real web.search capability and format
 * the honest outcome: real results (title, source, url, snippet) or an
 * honest unavailable message. Never invents a result or a price — an empty
 * result set and a failed fetch both surface as "can't search right now"
 * with the real reason, not silence.
 */
export async function answerSearchQuestion(query: string): Promise<SearchAnswer> {
  const cap = capabilityRegistry.getCapability('web.search');
  if (!cap || !cap.available) {
    return {
      reply: `I can't search the web right now — the web search capability isn't connected. No results are shown rather than invented ones.`,
      results: 0,
    };
  }
  try {
    const out: any = await cap.execute({ query });
    const results = Array.isArray(out?.results) ? out.results : [];
    if (results.length === 0) {
      return {
        reply:
          typeof out?.result === 'string' && out.result.length > 0
            ? out.result
            : `Web search for "${query}" returned no parseable results. No results are shown rather than invented ones.`,
        results: 0,
      };
    }
    const lines = results.slice(0, 5).map(
      (r: any) =>
        `• ${r.title} — ${r.source}\n  ${r.url}${r.snippet ? `\n  ${r.snippet}` : ''}`
    );
    return {
      reply: `Web search for "${query}" — ${results.length} real source${results.length === 1 ? '' : 's'}:\n${lines.join('\n')}`,
      results: results.length,
    };
  } catch (e: any) {
    return {
      reply: `I can't search the web right now — the search failed (${e?.message || String(e)}). No results are shown rather than invented ones.`,
      results: 0,
    };
  }
}

/**
 * True when a general question/conversation has no honest runtime answer
 * without a model: the planner routes it to web.search, which now runs
 * client-side (CORS search APIs, no server needed), so a search question
 * is NOT gated — it is answered by answerSearchQuestion above. Only a
 * general question that is neither search, math, nor a panel command is
 * gated here. Capability discovery and deterministic paths (panel
 * commands, math, search) are NOT gated — they work without a model.
 */
export function needsNoModelReply(intent: string, isModelLoaded: boolean): boolean {
  if (isModelLoaded) return false;
  return intent === 'run_task' || intent === 'conversation';
}

/** The honest no-model reply (same wording as the Logic Core status line). */
export const NO_MODEL_REPLY =
  'No model loaded — hydrate the matrix to begin. I can\'t answer general questions until a model is loaded; load one in the Logic Core and ask again. (Web search and math still work without a model.)';

/**
 * The honest offline reply when the free cloud gateway cannot answer
 * (2026-11-26 fix: the OS chat defaults to the gateway with no local model
 * loaded). The gateway is keyless and shared, so its free capacity can be
 * exhausted (HTTP 429 all_cloud_tiers_exhausted) — that is a capacity
 * limit, not a broken chat, and it is never papered over with a made-up
 * answer. The user retries later or loads a local model to answer on-device.
 */
export const GATEWAY_OFFLINE_REPLY =
  'NVK is offline right now — the free cloud gateway couldn\'t answer (its free capacity is exhausted). Nothing was made up; try again in a little while, or load a local model in the Logic Core to answer on-device.';
