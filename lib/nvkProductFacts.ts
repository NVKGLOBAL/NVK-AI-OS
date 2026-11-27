/**
 * NVK store catalog — the SINGLE source of truth for product facts
 * in the OS (ported from CODEXA's lib/nvkProductFacts.ts, option D,
 * 2026-11-27 — keep the two in sync by hand when a price changes).
 *
 * WHY THIS EXISTS HERE: the live OS chat asked "What is the NVK PULSE
 * speaker and how much does it cost?" and answered "I don't have
 * verified details on an NVK PULSE speaker or its pricing." The OS
 * gateway call carried NO product grounding — the only "PULSE" hits in
 * the source were flavor text in two unrelated panels. CODEXA fixed
 * this exact problem twice: fix round 1 appended a facts block to the
 * system instruction, then option D answered product questions
 * DETERMINISTICALLY from this catalog (lib/catalogLookup.ts) because
 * the on-device 0.5B model was PROVEN unable to emit "$49.99" at all
 * (7 prompting variants, best $49.95). The OS ports both halves: the
 * facts block reaches the gateway/local brain via the chat system
 * instruction, and the lookup answers product questions with no model
 * call at all — no cost, works offline, cannot hallucinate a price.
 *
 * Source: the live store catalog
 * (~/workspace/storefront-transformation/site/data/products.json,
 * 70 products, verified 2026-11-27). Every name, price, slug, and spec
 * below is copied from that catalog. NOTHING here is invented: no
 * battery-life, Bluetooth, or other spec beyond what the catalog itself
 * states, and Tier A "being prepared" machines (no checkout) and the
 * sold-out NOMAD are deliberately absent — nothing here may quote a
 * price for a product that cannot be bought.
 *
 * Keep the facts block SHORT on purpose (~1,100 chars, ~275 tokens):
 * the on-device model has a small context window and the persona already
 * takes several hundred tokens. If the catalog changes, update this file
 * and its tests together — the tests pin every price.
 */

export interface NvkCatalogProduct {
    /** Display name, exactly as printed in answers. */
    name: string;
    /** Price exactly as printed, e.g. "$49.99". */
    price: string;
    /** Short spec line from the live catalog; '' when the catalog gives none. */
    spec: string;
    /** Store slug — the product page is https://nvk.global/products/<slug>. */
    slug: string;
    /** Lowercase phrases that identify this product in a question. */
    aliases: string[];
    /** True when the product also appears in the short NVK_PRODUCT_FACTS block. */
    inFactsBlock: boolean;
    /** True for the three products that share the PULSE name. */
    pulseFamily: boolean;
}

export const NVK_CATALOG: NvkCatalogProduct[] = [
    {
        name: 'NVK PULSE portable RGB speaker',
        price: '$49.99',
        spec: '360-degree sound, RGB light ring, IPX7 waterproof',
        slug: 'nvk-pulse-rgb-speaker',
        aliases: ['pulse rgb speaker', 'pulse portable rgb speaker', 'nvk pulse speaker', 'pulse speaker'],
        inFactsBlock: true,
        pulseFamily: true,
    },
    {
        name: 'NVK TIME MACHINE smartwatch',
        price: '$299',
        spec: 'AI flagship smartwatch',
        slug: 'nvk-time-machine',
        aliases: ['time machine smartwatch', 'nvk time machine', 'time machine'],
        inFactsBlock: true,
        pulseFamily: false,
    },
    {
        name: 'NVK HELIOS power station',
        price: '$999.99',
        spec: '1024Wh LiFePO4, 1600W AC output',
        slug: 'nvk-helios-power-station',
        aliases: ['helios power station', 'nvk helios', 'helios'],
        inFactsBlock: true,
        pulseFamily: false,
    },
    {
        name: 'NVK EMBER 200W solar station',
        price: '$699.99',
        spec: '240Wh, fold-out solar panel',
        slug: 'nvk-ember-200w-solar-station',
        aliases: ['ember 200w solar station', 'ember solar station', 'nvk ember', 'ember'],
        inFactsBlock: true,
        pulseFamily: false,
    },
    {
        name: 'NVK SPARK 100W solar station',
        price: '$419.99',
        spec: '76.8Wh LiFePO4, fold-out solar panel',
        slug: 'nvk-spark-100w-solar-station',
        aliases: ['spark 100w solar station', 'spark solar station', 'nvk spark', 'spark'],
        inFactsBlock: true,
        pulseFamily: false,
    },
    {
        name: 'NVK CORE portable power station',
        price: '$299',
        spec: 'LiFePO4, pure sine wave',
        slug: 'nvk-core-portable-power-station',
        aliases: ['core portable power station', 'core power station', 'nvk core'],
        inFactsBlock: true,
        pulseFamily: false,
    },
    {
        name: 'NVK PULSE Touch Headphones',
        price: '$79.99',
        spec: 'over-ear Bluetooth, noise cancelling, touch control',
        slug: 'nvk-pulse-touch-headphones',
        aliases: ['pulse touch headphones', 'nvk pulse touch headphones', 'pulse headphones', 'touch headphones'],
        inFactsBlock: true,
        pulseFamily: true,
    },
    {
        name: 'NVK CHATBOT ChatNVK',
        price: '$149.99',
        spec: 'on-device AI companion hardware (not a web chat app)',
        slug: 'nvk-chatbot-chatnvk',
        aliases: ['chatnvk', 'nvk chatbot'],
        inFactsBlock: true,
        pulseFamily: false,
    },
    {
        name: 'NVK ORB AI Companion',
        price: '$99.99',
        spec: 'smart AI sphere, 360-degree audio',
        slug: 'nvk-orb-ai-companion',
        aliases: ['orb ai companion', 'nvk orb', 'ai companion'],
        inFactsBlock: true,
        pulseFamily: false,
    },
    {
        name: 'NVK CHARGE Dock',
        price: '$129.99',
        spec: '3-in-1 Qi2 magnetic charging station',
        slug: 'nvk-charge-dock',
        aliases: ['charge dock', 'nvk charge'],
        inFactsBlock: true,
        pulseFamily: false,
    },
    {
        name: 'NVK OPEN Earbuds',
        price: '$79.99',
        spec: 'open-ear clip earbuds',
        slug: 'nvk-open-earbuds',
        aliases: ['open earbuds', 'nvk open'],
        inFactsBlock: true,
        pulseFamily: false,
    },
    {
        name: 'NVK MAGNET Qi2 Power Bank',
        price: '$79.99',
        spec: '10,000mAh magnetic power bank',
        slug: 'nvk-magnet-qi2-power-bank',
        aliases: ['magnet qi2 power bank', 'magnet power bank', 'nvk magnet', 'magnet'],
        inFactsBlock: true,
        pulseFamily: false,
    },
    {
        name: 'NVK TRACK Tag 4-pack',
        price: '$59.99',
        spec: 'Bluetooth finder tags (Apple / Google Find My)',
        slug: 'nvk-track-tag',
        aliases: ['track tag', 'nvk track', 'tracker', 'finder tags'],
        inFactsBlock: true,
        pulseFamily: false,
    },
    {
        name: 'NVK AURA Light',
        price: '$99.99',
        spec: 'smart RGBIC light bar kit',
        slug: 'nvk-aura-light',
        aliases: ['aura light', 'nvk aura', 'aura'],
        inFactsBlock: true,
        pulseFamily: false,
    },
    {
        name: 'NVK KART 200 go-kart',
        price: '$1,859',
        spec: 'gas go-kart',
        slug: 'nvk-kart-200',
        aliases: ['kart 200', 'nvk kart 200'],
        inFactsBlock: true,
        pulseFamily: false,
    },
    {
        name: 'NVK PULSE Smart Desktop Mirror',
        price: '$99.99',
        spec: '',
        slug: 'nvk-pulse-smart-desktop-mirror',
        aliases: ['pulse smart desktop mirror', 'pulse mirror', 'smart desktop mirror', 'desktop mirror'],
        inFactsBlock: false,
        pulseFamily: true,
    },
];

/** Store base URL for product pages. */
export const NVK_STORE_BASE = 'https://nvk.global/products/';

const FACTS_HEADER =
    'NVK store facts — use ONLY these when asked about NVK products (live at nvk.global). Prices are real; never invent a price. If a product is not listed here, say you do not have its price.';
const FACTS_NOTE =
    'Note: three different products share the PULSE name — the PULSE speaker is the $49.99 one, the PULSE Touch Headphones are $79.99, the PULSE Smart Desktop Mirror is $99.99. Never mix them up.';

/**
 * The short facts block appended to the OS chat system instruction in
 * NVKCommandLayer (askBrain), so it reaches EVERY answering engine —
 * the free cloud gateway, a local workstation model, and the on-device
 * WebGPU model.
 *
 * Derived from NVK_CATALOG (same names, prices, and specs, same order)
 * so the block can never drift from the lookup. The PULSE mirror is not
 * a bullet here — it lives only in the disambiguation note, exactly as
 * in CODEXA.
 */
export const NVK_PRODUCT_FACTS = [
    FACTS_HEADER,
    ...NVK_CATALOG.filter((p) => p.inFactsBlock).map(
        (p) => `- ${p.name} — ${p.price} — ${p.spec}.`,
    ),
    FACTS_NOTE,
].join('\n');
