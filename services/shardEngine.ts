/**
 * Shard synthesis engine (defect 8, 2026-11-22).
 *
 * Turns a user intent into a validated ShardSpec using the LOCAL model only.
 * There is no canned data anywhere in this file: if no model is loaded,
 * generation fails, or the model's JSON fails strict validation, the result
 * is null and the UI must say so honestly ("Shard unavailable — load a local
 * model first"). Nothing here fabricates a shard, a URL, or a result.
 */

export type ShardVariant = 'chart' | 'table' | 'agent-decision' | 'council-brief' | 'text-block';

export const SHARD_VARIANTS: ShardVariant[] = ['text-block', 'chart', 'table', 'agent-decision', 'council-brief'];

export interface ShardSpec {
  variant: ShardVariant;
  title: string;
  summary: string;
  /** Variant payload — see validateShardSpec for the per-variant shape. */
  data: Record<string, unknown>;
  source: 'local-llm';
  generatedAt: number;
}

export type GenerateTextFn = (
  prompt: string,
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number,
  // Slice 4 (memory): bounded prior turns (oldest first). The callee
  // bounds them under a token cap; an empty/omitted history leaves the
  // prompt unchanged.
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
) => Promise<string | null>;

const isNonEmptyString = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max;

const isStringArray = (v: unknown, min: number, max: number, itemMax = 200): v is string[] =>
  Array.isArray(v) && v.length >= min && v.length <= max && v.every(s => isNonEmptyString(s, itemMax));

const isFiniteNumberArray = (v: unknown, min: number, max: number): v is number[] =>
  Array.isArray(v) && v.length >= min && v.length <= max && v.every(n => typeof n === 'number' && Number.isFinite(n));

function validateVariantData(variant: ShardVariant, data: unknown): data is Record<string, unknown> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return false;
  const d = data as Record<string, unknown>;
  switch (variant) {
    case 'chart': {
      if (!isStringArray(d.labels, 2, 24)) return false;
      if (!isFiniteNumberArray(d.values, 2, 24)) return false;
      return (d.labels as string[]).length === (d.values as number[]).length;
    }
    case 'table': {
      if (!isStringArray(d.headers, 1, 8)) return false;
      if (!Array.isArray(d.rows) || d.rows.length > 20) return false;
      const headers = d.headers as string[];
      return d.rows.every(row => Array.isArray(row) && row.length === headers.length && row.every(cell => typeof cell === 'string'));
    }
    case 'agent-decision': {
      if (!isNonEmptyString(d.decision, 500)) return false;
      if (!isNonEmptyString(d.rationale, 2000)) return false;
      if (!Array.isArray(d.options) || d.options.length < 1 || d.options.length > 8) return false;
      return d.options.every(o =>
        typeof o === 'object' && o !== null &&
        isNonEmptyString((o as Record<string, unknown>).label, 200) &&
        isNonEmptyString((o as Record<string, unknown>).detail, 1000)
      );
    }
    case 'council-brief': {
      if (!Array.isArray(d.sections) || d.sections.length < 1 || d.sections.length > 8) return false;
      return d.sections.every(s =>
        typeof s === 'object' && s !== null &&
        isNonEmptyString((s as Record<string, unknown>).heading, 200) &&
        isNonEmptyString((s as Record<string, unknown>).body, 2000)
      );
    }
    case 'text-block': {
      return isNonEmptyString(d.body, 4000);
    }
    default:
      return false;
  }
}

/**
 * Strict validation of a parsed JSON value into a ShardSpec.
 * Returns null on ANY failure — wrong variant, missing/extra keys, wrong
 * types, out-of-range sizes. Never repairs or invents data.
 */
export function validateShardSpec(parsed: unknown, expectedVariant: ShardVariant): ShardSpec | null {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const obj = parsed as Record<string, unknown>;
  // Strict shape: exactly these four keys, no extras.
  const keys = Object.keys(obj).sort();
  if (keys.join(',') !== ['data', 'summary', 'title', 'variant'].sort().join(',')) return null;
  if (obj.variant !== expectedVariant) return null;
  if (!isNonEmptyString(obj.title, 200)) return null;
  if (!isNonEmptyString(obj.summary, 1000)) return null;
  if (!validateVariantData(expectedVariant, obj.data)) return null;
  return {
    variant: expectedVariant,
    title: (obj.title as string).trim(),
    summary: (obj.summary as string).trim(),
    data: obj.data as Record<string, unknown>,
    source: 'local-llm',
    generatedAt: Date.now()
  };
}

const VARIANT_DATA_SHAPE: Record<ShardVariant, string> = {
  chart: '{"labels": string[2..24], "values": number[2..24, same length as labels]}',
  table: '{"headers": string[1..8], "rows": string[][] (each row same length as headers, max 20 rows)}',
  'agent-decision': '{"decision": string, "rationale": string, "options": [{"label": string, "detail": string}] (1..8 options)}',
  'council-brief': '{"sections": [{"heading": string, "body": string}] (1..8 sections)}',
  'text-block': '{"body": string}'
};

/**
 * Synthesize a shard from a user intent via the local model.
 * Returns a validated ShardSpec, or null when no model is loaded,
 * generation fails, the output is not JSON, or validation fails.
 */
export async function synthesizeShard(
  intent: string,
  generateText: GenerateTextFn,
  variant: ShardVariant = 'text-block',
  // Slice 4 (memory): bounded prior turns (oldest first), passed through
  // to generateText so the shard is synthesized with the conversation in
  // view instead of the intent alone.
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<ShardSpec | null> {
  if (!intent.trim()) return null;
  const systemPrompt =
    'You are the NVK shard synthesizer. Respond with ONLY a single JSON object, no markdown fences, no commentary, no extra text. ' +
    `The object must have exactly these keys: variant, title, summary, data. ` +
    `variant must be exactly "${variant}". title is a short title (max 200 chars). summary is one sentence (max 1000 chars). ` +
    `data must match this shape for the variant: ${VARIANT_DATA_SHAPE[variant]}.`;
  let text: string | null;
  try {
    text = await generateText(`Synthesize a shard about: ${intent.trim()}. Variant: ${variant}.`, systemPrompt, 0.3, 1024, history);
  } catch {
    return null;
  }
  if (text === null) return null;
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }
  return validateShardSpec(parsed, variant);
}
