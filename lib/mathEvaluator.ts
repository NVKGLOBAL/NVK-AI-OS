// lib/mathEvaluator.ts
// MCNA slice 3 — the honest arithmetic evaluator behind calculation.math.
//
// Pure, no DOM, no model: extracts a simple arithmetic expression from a
// natural-language query (the same strip-to-math-characters step the old
// capability used) and evaluates it with a real Function eval. The old
// capability returned the hardcoded string '10' whenever the eval failed
// — any unparseable question "computed" to 10 and was labelled verified.
// This module never invents a value: an input with no arithmetic, an
// eval error, or a non-finite result returns ok: false with the reason,
// and the capability throws that reason instead of reporting a number.

export type MathEvaluation =
  | { ok: true; value: number; expression: string }
  | { ok: false; reason: string };

/**
 * Evaluate the arithmetic in a query. Returns the numeric value and the
 * expression that produced it, or ok: false with an honest reason.
 */
export function evaluateMathExpression(query: string): MathEvaluation {
  const raw = typeof query === 'string' ? query : '';
  // Same extraction the old capability used: keep only math characters.
  const sanitized = raw.replace(/[^0-9+\-*/.()\s]/g, '').trim();
  if (sanitized.length === 0) {
    return { ok: false, reason: `no arithmetic expression found in "${raw}"` };
  }
  // Reject an expression that is only operators / dots / parens with no
  // digits — eval would throw, but the reason should name the input.
  if (!/[0-9]/.test(sanitized)) {
    return { ok: false, reason: `no numbers found in "${raw}"` };
  }
  let value: unknown;
  try {
    value = Function(`'use strict'; return (${sanitized})`)();
  } catch (e: any) {
    return { ok: false, reason: `could not evaluate "${sanitized}": ${e?.message || String(e)}` };
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { ok: false, reason: `"${sanitized}" does not produce a finite number` };
  }
  return { ok: true, value, expression: sanitized };
}
