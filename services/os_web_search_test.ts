/**
 * OS web search test (matrix item 4, 2026-11-27).
 *
 * Pure-module test — no server, no DOM, no model, no live network: every
 * fetch is a mock. Verifies the client-side search contract:
 *   (1) the DuckDuckGo Instant Answer parser returns the real Abstract +
 *       RelatedTopics and nothing else (no invented results);
 *   (2) the Wikipedia parser returns real hits with HTML stripped from
 *       snippets and real article URLs;
 *   (3) searchWeb tries the CORS-enabled direct APIs first and only
 *       falls back to the dev-server proxy scrape when they return
 *       nothing — the proxy is never called when a direct source answers;
 *   (4) total failure (direct sources down, proxy 404 as on the static
 *       deploy) yields an empty result set with an honest reason, never
 *       canned results;
 *   (5) the real web.search capability returns real results through the
 *       same path, and fails honestly when the network fails.
 *
 * Run: npx tsx services/os_web_search_test.ts
 * (coordinator wires it into `npm test`; it needs no server).
 */
import { parseDuckDuckGoInstantAnswer, parseWikipediaSearch, searchWeb } from '../lib/webSearch';
import { capabilityRegistry } from '../src/nvk/capabilities/CapabilityRegistry';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) {
    console.log(`  PASS ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name} ${detail}`);
  }
};

const DDG_IA_FIXTURE = {
  Abstract: 'Albert Einstein was a German-born theoretical physicist.',
  AbstractText: 'Albert Einstein was a German-born theoretical physicist.',
  AbstractURL: 'https://en.wikipedia.org/wiki/Albert_Einstein',
  AbstractSource: 'Wikipedia',
  Answer: '',
  RelatedTopics: [
    { FirstURL: 'https://en.wikipedia.org/wiki/Theory_of_relativity', Text: 'Theory of relativity - a theory by Albert Einstein' },
    {
      Name: 'People',
      Topics: [
        { FirstURL: 'https://en.wikipedia.org/wiki/Niels_Bohr', Text: 'Niels Bohr - Danish physicist' },
      ],
    },
    { FirstURL: '', Text: 'A topic with no URL is skipped' },
  ],
  Results: [],
};

const DDG_IA_EMPTY = {
  Abstract: '', AbstractText: '', AbstractURL: '', AbstractSource: '',
  Answer: '', RelatedTopics: [], Results: [],
};

const WIKI_FIXTURE = {
  query: {
    search: [
      { title: 'NVK', pageid: 5809172, snippet: '<span class="searchmatch">NVK</span> may refer to: Narvik Airport' },
      { title: 'Nvk Global', pageid: 999, snippet: 'A second <span class="searchmatch">hit</span> with markup.' },
    ],
  },
};

const WIKI_EMPTY = { query: { search: [] } };

const DDG_HTML_FIXTURE = `
<html><body>
  <div class="result">
    <a class="result__a" href="https://example.com/proxy-hit">Proxy hit — real page</a>
    <a class="result__snippet">Found only through the dev-server proxy.</a>
  </div>
</body></html>`;

const BLOCK_PAGE = `<html><body><p>Please complete the captcha to continue.</p></body></html>`;

const jsonResponse = (body: unknown) => ({
  ok: true, status: 200,
  json: async () => body,
  text: async () => JSON.stringify(body),
});
const textResponse = (body: string) => ({
  ok: true, status: 200,
  json: async () => { throw new Error('not JSON'); },
  text: async () => body,
});
const errorResponse = (status: number) => ({
  ok: false, status,
  json: async () => ({}),
  text: async () => '',
});

type MockFetch = (url: string, init?: unknown) => Promise<any>;

/** Route mock fetches by URL; record every call for ordering assertions. */
function routingMock(routes: Array<{ match: (url: string) => boolean; respond: (url: string) => any | Promise<any> }>, calls: string[]): MockFetch {
  return async (url: string) => {
    calls.push(url);
    for (const route of routes) {
      if (route.match(url)) return route.respond(url);
    }
    throw new Error(`unexpected fetch: ${url}`);
  };
}

console.log('DuckDuckGo Instant Answer parser:');
check('parses the Abstract as a real result with its real source URL',
  (() => {
    const r = parseDuckDuckGoInstantAnswer(DDG_IA_FIXTURE);
    return r.length === 3
      && r[0].title === 'Albert Einstein was a German-born theoretical physicist.'
      && r[0].url === 'https://en.wikipedia.org/wiki/Albert_Einstein'
      && r[0].source === 'en.wikipedia.org';
  })());
check('flattens nested RelatedTopics groups into results',
  (() => {
    const r = parseDuckDuckGoInstantAnswer(DDG_IA_FIXTURE);
    return r.some((x) => x.title.startsWith('Niels Bohr') && x.url === 'https://en.wikipedia.org/wiki/Niels_Bohr');
  })());
check('a topic with no URL is skipped — nothing invented',
  (() => {
    const r = parseDuckDuckGoInstantAnswer(DDG_IA_FIXTURE);
    return r.every((x) => x.url.length > 0 && x.title.length > 0);
  })());
check('an empty Instant Answer body yields zero results',
  parseDuckDuckGoInstantAnswer(DDG_IA_EMPTY).length === 0);
check('a bare Answer with no source URL is not a result (no sourceless claim)',
  parseDuckDuckGoInstantAnswer({ Answer: '42', RelatedTopics: [], Results: [] }).length === 0);
check('non-object input yields zero results',
  parseDuckDuckGoInstantAnswer(null).length === 0 && parseDuckDuckGoInstantAnswer('nope').length === 0);

console.log('Wikipedia parser:');
check('parses real hits with real article URLs',
  (() => {
    const r = parseWikipediaSearch(WIKI_FIXTURE);
    return r.length === 2
      && r[0].title === 'NVK'
      && r[0].url === 'https://en.wikipedia.org/?curid=5809172'
      && r[0].source === 'en.wikipedia.org';
  })());
check('HTML tags are stripped from snippets, not passed through raw',
  (() => {
    const r = parseWikipediaSearch(WIKI_FIXTURE);
    return r[0].snippet === 'NVK may refer to: Narvik Airport'
      && r[1].snippet === 'A second hit with markup.';
  })());
check('an empty Wikipedia result set yields zero results',
  parseWikipediaSearch(WIKI_EMPTY).length === 0);

console.log('searchWeb orchestration (mocked fetch):');
{
  // Direct source answers: Wikipedia returns hits, DDG IA is empty.
  // The proxy must NOT be called at all.
  const calls: string[] = [];
  const mock = routingMock([
    { match: (u) => u.includes('api.duckduckgo.com'), respond: () => jsonResponse(DDG_IA_EMPTY) },
    { match: (u) => u.includes('en.wikipedia.org'), respond: () => jsonResponse(WIKI_FIXTURE) },
    { match: (u) => u.includes('/api/proxy'), respond: () => textResponse(DDG_HTML_FIXTURE) },
  ], calls);
  const out = await searchWeb('NVK', mock as any);
  check('Wikipedia hits are returned when DDG Instant Answer is empty',
    out.results.length === 2 && out.results[0].title === 'NVK');
  check('the dev-server proxy is NOT called when a direct source answers',
    !calls.some((u) => u.includes('/api/proxy')), JSON.stringify(calls));
  check('sourcesUsed names the source that actually answered',
    out.sourcesUsed.includes('Wikipedia') && !out.proxyUsed);
}
{
  // DDG Instant Answer answers: proxy is not called.
  const calls: string[] = [];
  const mock = routingMock([
    { match: (u) => u.includes('api.duckduckgo.com'), respond: () => jsonResponse(DDG_IA_FIXTURE) },
    { match: (u) => u.includes('en.wikipedia.org'), respond: () => jsonResponse(WIKI_EMPTY) },
    { match: (u) => u.includes('/api/proxy'), respond: () => textResponse(DDG_HTML_FIXTURE) },
  ], calls);
  const out = await searchWeb('Albert Einstein', mock as any);
  check('DuckDuckGo Instant Answer results are returned with real URLs',
    out.results.length === 3 && out.results[0].url === 'https://en.wikipedia.org/wiki/Albert_Einstein');
  check('proxy not called when the Instant Answer source answers',
    !calls.some((u) => u.includes('/api/proxy')));
}
{
  // Both direct sources return nothing: the proxy scrape is the fallback.
  const calls: string[] = [];
  const mock = routingMock([
    { match: (u) => u.includes('api.duckduckgo.com'), respond: () => jsonResponse(DDG_IA_EMPTY) },
    { match: (u) => u.includes('en.wikipedia.org'), respond: () => jsonResponse(WIKI_EMPTY) },
    { match: (u) => u.includes('/api/proxy'), respond: () => textResponse(DDG_HTML_FIXTURE) },
  ], calls);
  const out = await searchWeb('proxy fallback query', mock as any);
  check('proxy scrape results are used only when both direct sources are empty',
    out.results.length === 1 && out.results[0].title === 'Proxy hit — real page' && out.proxyUsed === true);
}
{
  // Total failure: direct sources throw, proxy 404s (the static deploy).
  const calls: string[] = [];
  const mock = routingMock([
    { match: (u) => u.includes('api.duckduckgo.com'), respond: () => { throw new Error('network down'); } },
    { match: (u) => u.includes('en.wikipedia.org'), respond: () => { throw new Error('network down'); } },
    { match: (u) => u.includes('/api/proxy'), respond: () => errorResponse(404) },
  ], calls);
  const out = await searchWeb('anything', mock as any);
  check('total failure yields zero results — nothing invented',
    out.results.length === 0);
  check('total failure names the tried sources and the reason',
    out.reason.includes('DuckDuckGo Instant Answer') && out.reason.includes('Wikipedia') && out.reason.length > 0,
    out.reason);
}
{
  // Direct sources empty, proxy returns a block page: zero results.
  const calls: string[] = [];
  const mock = routingMock([
    { match: (u) => u.includes('api.duckduckgo.com'), respond: () => jsonResponse(DDG_IA_EMPTY) },
    { match: (u) => u.includes('en.wikipedia.org'), respond: () => jsonResponse(WIKI_EMPTY) },
    { match: (u) => u.includes('/api/proxy'), respond: () => textResponse(BLOCK_PAGE) },
  ], calls);
  const out = await searchWeb('blocked query', mock as any);
  check('a block page through the proxy yields zero results, not invented ones',
    out.results.length === 0 && out.reason.length > 0);
}
{
  // De-duplication: the same URL from both direct sources counts once.
  const calls: string[] = [];
  const mock = routingMock([
    { match: (u) => u.includes('api.duckduckgo.com'), respond: () => jsonResponse(DDG_IA_FIXTURE) },
    { match: (u) => u.includes('en.wikipedia.org'), respond: () => jsonResponse({
      query: { search: [{ title: 'Albert Einstein', pageid: 736, snippet: 'German-born theoretical physicist' }] },
    }) },
  ], calls);
  const out = await searchWeb('Albert Einstein', mock as any);
  check('the same URL from two sources is de-duplicated',
    out.results.length === 4 && new Set(out.results.map((r) => r.url)).size === 4,
    `got ${out.results.length}: ${JSON.stringify(out.results.map((r) => r.url))}`);
}
{
  let threw = false;
  try {
    await searchWeb('   ', async () => { throw new Error('must not fetch'); });
  } catch (e: any) {
    threw = /QUERY_REQUIRED/.test(e?.message || '');
  }
  check('an empty query throws instead of fetching or inventing', threw);
}

console.log('web.search capability (mocked global fetch):');
{
  const nativeFetch = globalThis.fetch;
  const calls: string[] = [];
  (globalThis as any).fetch = routingMock([
    { match: (u) => u.includes('api.duckduckgo.com'), respond: () => jsonResponse(DDG_IA_EMPTY) },
    { match: (u) => u.includes('en.wikipedia.org'), respond: () => jsonResponse(WIKI_FIXTURE) },
    { match: (u) => u.includes('/api/proxy'), respond: () => textResponse(DDG_HTML_FIXTURE) },
  ], calls);
  try {
    const cap = capabilityRegistry.getCapability('web.search');
    check('web.search is registered and available', !!cap && cap.available === true);
    const out: any = await cap!.execute({ query: 'NVK' });
    check('capability returns real results from the direct API',
      Array.isArray(out.results) && out.results.length === 2 && out.results[0].url.includes('wikipedia.org'),
      JSON.stringify(out).slice(0, 300));
    check('capability result is verified with web_response evidence',
      out.verified === true
      && Array.isArray(out.evidence)
      && out.evidence[0]?.type === 'web_response');
    check('capability never calls the proxy when a direct source answers',
      !calls.some((u) => u.includes('/api/proxy')));
    check('capability verify() accepts a real result set',
      (await cap!.verify!({ query: 'NVK' }, out)) === true);
  } finally {
    globalThis.fetch = nativeFetch;
  }
}
{
  const nativeFetch = globalThis.fetch;
  (globalThis as any).fetch = async () => { throw new Error('offline'); };
  try {
    const cap = capabilityRegistry.getCapability('web.search');
    const out: any = await cap!.execute({ query: 'NVK' });
    check('capability fails honestly when every source is unreachable',
      Array.isArray(out.results) && out.results.length === 0 && out.verified === false
      && typeof out.result === 'string' && out.result.length > 0
      && !/https?:\/\/\S+/.test(out.result.replace(/DuckDuckGo|Wikipedia/g, '')),
      JSON.stringify(out.result));
  } finally {
    globalThis.fetch = nativeFetch;
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll OS web search checks passed.');
