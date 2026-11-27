/**
 * Deterministic catalog lookup (ported from CODEXA's
 * lib/catalogLookup.ts, option D, 2026-11-27).
 *
 * WHY THIS EXISTS: the OS chat asked "What is the NVK PULSE speaker and
 * how much does it cost?" and answered "I don't have verified details
 * on an NVK PULSE speaker or its pricing." The gateway call carried no
 * product grounding. CODEXA proved the on-device 0.5B model cannot emit
 * "$49.99" at all (7 prompting variants, best $49.95) — so a question
 * about a catalog product's identity or price is answered
 * DETERMINISTICALLY from NVK_CATALOG — name, price, key specs, store
 * link — with NO model call at all. It costs nothing, works offline,
 * and cannot hallucinate a price, because there is no generation step.
 * Everything else goes through the normal brain path unchanged.
 *
 * PULSE RULE (recorded): three products share the PULSE name. A specific
 * qualifier wins — "speaker" answers the $49.99 speaker, "headphones" /
 * "touch" answers the $79.99 headphones, "mirror" answers the $99.99
 * mirror. A bare "PULSE" with a price/identity question lists all three
 * with their prices — never guessed, never silently picked.
 *
 * NON-MATCH RULES (also recorded, all deliberate): bare category words
 * do NOT match — "smartwatch" alone is not TIME MACHINE, bare "kart" /
 * "go-kart" is not KART 200 (the store also sells a KART 125 at $3,594,
 * which is NOT in this catalog), bare "chatbot" is not ChatNVK, bare
 * "core" is not CORE, bare "open" / "charge" / "track" are not products.
 * A message that merely mentions a product without asking about it
 * ("I love my PULSE speaker") does NOT trigger the lookup — it needs a
 * price/identity question cue. All of these fall through to the brain.
 */

import { NVK_CATALOG, NVK_STORE_BASE } from './nvkProductFacts';
import type { NvkCatalogProduct } from './nvkProductFacts';

export interface CatalogLookupResult {
    handled: boolean;
    /** Deterministic factual reply, ready to post as the NVK answer. */
    reply?: string;
    /** The catalog products the reply covers, in catalog order. */
    products?: NvkCatalogProduct[];
    /** True when the question named bare "PULSE" with no qualifier. */
    ambiguousPulse?: boolean;
}

/**
 * A price/identity question cue. The lookup only fires when the user
 * is ASKING about a product — what it is, or what it costs — not when
 * they merely mention one in passing.
 */
const QUESTION_CUE =
    /\b(how much|what(?:'s| is)|costs?|price|pricing|tell me about|describe|buy)\b/i;

function normalize(text: string): string {
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function aliasMatches(normalized: string, alias: string): boolean {
    return new RegExp(`\\b${escapeRegExp(alias)}\\b`).test(normalized);
}

function productLine(p: NvkCatalogProduct): string {
    const spec = p.spec ? ` — ${p.spec}` : '';
    return `- ${p.name} — ${p.price}${spec}. ${NVK_STORE_BASE}${p.slug}`;
}

function formatSingle(p: NvkCatalogProduct): string {
    const spec = p.spec ? ` — ${p.spec}` : '';
    return `The ${p.name} costs ${p.price}${spec}.\nStore: ${NVK_STORE_BASE}${p.slug}`;
}

function formatList(products: NvkCatalogProduct[], ambiguousPulse: boolean): string {
    const header = ambiguousPulse
        ? 'PULSE is three different NVK products — here are all three:'
        : 'Here are the products you asked about:';
    return `${header}\n${products.map(productLine).join('\n')}`;
}

/**
 * Answer a product price/identity question deterministically from the
 * catalog. Returns `{ handled: false }` for everything else — the
 * caller then runs the normal brain path unchanged.
 */
export function answerCatalogQuestion(message: string): CatalogLookupResult {
    const normalized = normalize(message);
    if (!normalized) return { handled: false };
    if (!QUESTION_CUE.test(normalized)) return { handled: false };

    // Specific alias hits first. Aliases are tried longest-first per
    // product so "pulse touch headphones" wins over a shorter hit, and
    // each product is collected at most once.
    const matched: NvkCatalogProduct[] = [];
    for (const product of NVK_CATALOG) {
        const aliases = [...product.aliases].sort((a, b) => b.length - a.length);
        if (aliases.some((a) => aliasMatches(normalized, a))) matched.push(product);
    }

    // Bare "PULSE" with no qualifier: list all three PULSE products
    // rather than guessing which one the seeker means.
    const pulseMatched = matched.filter((p) => p.pulseFamily);
    if (pulseMatched.length === 0 && /\bpulse\b/.test(normalized)) {
        const pulseProducts = NVK_CATALOG.filter((p) => p.pulseFamily);
        return {
            handled: true,
            ambiguousPulse: true,
            products: pulseProducts,
            reply: formatList(pulseProducts, true),
        };
    }

    if (matched.length === 0) return { handled: false };
    if (matched.length === 1) {
        return { handled: true, products: matched, reply: formatSingle(matched[0]) };
    }
    return { handled: true, products: matched, reply: formatList(matched, false) };
}
