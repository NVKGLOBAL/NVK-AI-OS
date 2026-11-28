// lib/webSearch.ts
// Client-side web search for the SHIPPED deploy (matrix item 4,
// 2026-11-27). The shipped OS is static GitHub Pages — there is NO
// server, so /api/proxy does not exist there and the old DDG HTML scrape
// (html.duckduckgo.com, no Access-Control-Allow-Origin header — verified
// 2026-11-27) cannot run from the browser at all.
//
// This module searches WITHOUT a server and WITHOUT any provider key, by
// calling CORS-enabled public search APIs directly from the browser:
//   1. DuckDuckGo Instant Answer API (api.duckduckgo.com — verified
//      2026-11-27 to return `Access-Control-Allow-Origin: *`). It answers
//      entity/definition queries with a real Abstract + RelatedTopics, but
//      returns EMPTY for most general queries — it is not a general web
//      search, and an empty answer from it is reported as such, never
//      padded with invented results.
//   2. Wikipedia search API (en.wikipedia.org/w/api.php with origin=* —
//      verified 2026-11-27 to return `access-control-allow-origin: *`).
//      Real general search results: title, snippet, page URL.
//   3. Fallback only: the old HTML scrape through the same-origin
//      /api/proxy (local dev server). On the static deploy the proxy
//      404s and the fallback is skipped — the failure is reported
//      honestly with the reason, never with canned results.
//
// Pure module: no DOM, no key, no spend. `fetchImpl` is injectable so
// tests use a mocked fetch and never touch the network. Every source
// failure is caught individually; a total failure returns an empty
// result set with a reason instead of throwing, so the capability can
// format the honest outcome. Nothing here ever invents a result.

import { parseDuckDuckGoHtml } from './duckDuckGoParser';

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface WebSearchOutcome {
  /** Real results only — never invented, never canned. */
  results: WebSearchResult[];
  /** Sources that returned at least one result, in the order tried. */
  sourcesUsed: string[];
  /** True when the dev-server proxy scrape contributed results. */
  proxyUsed: boolean;
  /** Human-readable reason when results is empty (what was tried, why it failed). */
  reason: string;
}

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

const DDG_IA_URL = (query: string) =>
  `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
const WIKIPEDIA_URL = (query: string) =>
  `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=10`;
const DDG_HTML_URL = (query: string) =>
  `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

const SOURCE_TIMEOUT_MS = 8000;

function hostnameOf(url: string, fallback: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return fallback;
  }
}

function cleanText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse a DuckDuckGo Instant Answer JSON body into real results. The
 * Abstract (when present) is one result; RelatedTopics / Results entries
 * with a FirstURL + Text are the rest. Nested topic groups (a Topics
 * array under a group entry) are flattened. Entries without a URL or
 * without text are skipped — never invented.
 */
export function parseDuckDuckGoInstantAnswer(json: unknown): WebSearchResult[] {
  if (typeof json !== 'object' || json === null) return [];
  const body = json as Record<string, unknown>;
  const out: WebSearchResult[] = [];
  const push = (title: string, url: string, snippet: string, source: string) => {
    const t = cleanText(title);
    const u = (url || '').trim();
    if (t.length === 0 || u.length === 0) return;
    if (/^javascript:/i.test(u)) return;
    out.push({ title: t, url: u, snippet: cleanText(snippet), source: hostnameOf(u, source) });
  };

  const abstractText = typeof body.AbstractText === 'string' ? body.AbstractText : '';
  const abstractUrl = typeof body.AbstractURL === 'string' ? body.AbstractURL : '';
  const abstractSource = typeof body.AbstractSource === 'string' && body.AbstractSource.length > 0
    ? body.AbstractSource
    : 'DuckDuckGo';
  if (abstractText.length > 0 && abstractUrl.length > 0) {
    push(abstractText, abstractUrl, abstractText, abstractSource);
  }
  // A bare Answer with no AbstractURL is deliberately NOT a result: a
  // search result must cite a source URL, and an answer string alone
  // has none. It is skipped rather than shown as a sourceless claim.

  const collectTopics = (topics: unknown) => {
    if (!Array.isArray(topics)) return;
    for (const entry of topics) {
      if (typeof entry !== 'object' || entry === null) continue;
      const e = entry as Record<string, unknown>;
      if (Array.isArray(e.Topics)) {
        collectTopics(e.Topics);
        continue;
      }
      if (typeof e.FirstURL === 'string' && typeof e.Text === 'string') {
        push(e.Text, e.FirstURL, e.Text, 'DuckDuckGo');
      }
    }
  };
  collectTopics(body.RelatedTopics);
  collectTopics(body.Results);
  return out;
}

/**
 * Parse a Wikipedia API search JSON body into real results. Each hit
 * becomes a result linking to the article by pageid; the snippet is the
 * API's HTML snippet with tags stripped. No hit, no result.
 */
export function parseWikipediaSearch(json: unknown): WebSearchResult[] {
  if (typeof json !== 'object' || json === null) return [];
  const query = (json as Record<string, unknown>).query;
  if (typeof query !== 'object' || query === null) return [];
  const hits = (query as Record<string, unknown>).search;
  if (!Array.isArray(hits)) return [];
  const out: WebSearchResult[] = [];
  for (const hit of hits) {
    if (typeof hit !== 'object' || hit === null) continue;
    const h = hit as Record<string, unknown>;
    if (typeof h.title !== 'string' || h.title.trim().length === 0) continue;
    if (typeof h.pageid !== 'number') continue;
    out.push({
      title: h.title.trim(),
      url: `https://en.wikipedia.org/?curid=${h.pageid}`,
      snippet: typeof h.snippet === 'string' ? cleanText(h.snippet) : '',
      source: 'en.wikipedia.org',
    });
  }
  return out;
}

async function fetchJson(fetchImpl: FetchFn, url: string): Promise<unknown> {
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${hostnameOf(url, url)}`);
  return res.json();
}

/**
 * Search the web from the browser with no server and no key. Direct
 * CORS-enabled APIs first (DuckDuckGo Instant Answer, then Wikipedia);
 * the dev-server proxy scrape only as a fallback when both direct
 * sources return nothing. Results are de-duplicated by URL. An empty
 * query throws — everything else resolves, with `results: []` + a
 * reason when nothing could be found. Never returns invented results.
 */
export async function searchWeb(
  query: string,
  fetchImpl: FetchFn = globalThis.fetch.bind(globalThis)
): Promise<WebSearchOutcome> {
  const q = (query || '').trim();
  if (q.length === 0) {
    throw new Error('WEB_SEARCH_QUERY_REQUIRED: a search needs a query.');
  }

  const results: WebSearchResult[] = [];
  const sourcesUsed: string[] = [];
  const failures: string[] = [];
  const seen = new Set<string>();
  const addAll = (found: WebSearchResult[], source: string) => {
    let added = 0;
    for (const r of found) {
      if (seen.has(r.url)) continue;
      seen.add(r.url);
      results.push(r);
      added++;
    }
    if (added > 0 && !sourcesUsed.includes(source)) sourcesUsed.push(source);
    return added;
  };

  // Direct source 1 — DuckDuckGo Instant Answer (CORS: *). Entity
  // answers only; empty for most general queries, which is a real
  // outcome, not an error.
  try {
    const ia = await fetchJson(fetchImpl, DDG_IA_URL(q));
    addAll(parseDuckDuckGoInstantAnswer(ia), 'DuckDuckGo Instant Answer');
  } catch (e: any) {
    failures.push(`DuckDuckGo Instant Answer: ${e?.message || String(e)}`);
  }

  // Direct source 2 — Wikipedia search (CORS: * via origin=*). Real
  // general results; tried in parallel with nothing else pending.
  try {
    const wiki = await fetchJson(fetchImpl, WIKIPEDIA_URL(q));
    addAll(parseWikipediaSearch(wiki), 'Wikipedia');
  } catch (e: any) {
    failures.push(`Wikipedia: ${e?.message || String(e)}`);
  }

  // Fallback — the old HTML scrape through the same-origin dev-server
  // proxy. Only when the direct sources found nothing: on the static
  // deploy /api/proxy does not exist (404), so this step fails fast
  // there and the outcome stays honest.
  let proxyUsed = false;
  if (results.length === 0) {
    try {
      const res = await fetchImpl(
        `/api/proxy?url=${encodeURIComponent(DDG_HTML_URL(q))}`,
        { signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS) }
      );
      if (!res.ok) {
        failures.push(`dev-server proxy: HTTP ${res.status} (no server on the static deploy)`);
      } else {
        const html = await res.text();
        const scraped = parseDuckDuckGoHtml(html);
        if (addAll(scraped, 'DuckDuckGo (via dev-server proxy)') > 0) proxyUsed = true;
        else failures.push('dev-server proxy: no parseable results on the page');
      }
    } catch (e: any) {
      failures.push(`dev-server proxy: ${e?.message || String(e)}`);
    }
  }

  if (results.length > 0) {
    return { results, sourcesUsed, proxyUsed, reason: '' };
  }
  return {
    results: [],
    sourcesUsed,
    proxyUsed,
    reason:
      `Web search for "${q}" returned no results. Tried: DuckDuckGo Instant Answer, Wikipedia` +
      `${proxyUsed ? '' : ', dev-server proxy'} — ${failures.length > 0 ? failures.join('; ') : 'all sources returned nothing'}. ` +
      `No results are shown rather than invented ones.`,
  };
}
