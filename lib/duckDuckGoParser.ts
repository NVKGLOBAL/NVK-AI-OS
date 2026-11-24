// lib/duckDuckGoParser.ts
// MCNA slice 3 — the honest web-search parser behind web.search.
//
// Pure, no DOM, no network: parses the DuckDuckGo HTML results page
// (the body web.fetch already returns) into real results. The old
// capability fetched that page, discarded the body entirely, and
// returned two hardcoded "verified" results with invented titles and
// snippets from "NVK Research Network" / "NVK Knowledge Repository".
// This module returns only what the page actually contains: when the
// page has no parseable results (blocked page, changed markup, empty
// result set) it returns [] and the capability reports that honestly
// instead of inventing sources.

export interface ParsedSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

/** Strip HTML tags and decode the common entities DDG emits. */
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
 * Parse a DuckDuckGo HTML results page into real results. Result links
 * carry class "result__a" and snippets class "result__snippet"; the nth
 * link pairs with the nth snippet in document order. Links with no href,
 * javascript: hrefs, or empty titles are skipped — never invented.
 */
export function parseDuckDuckGoHtml(html: string): ParsedSearchResult[] {
  if (typeof html !== 'string' || html.length === 0) return [];
  const linkRe = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRe = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
  const links: Array<{ url: string; title: string }> = [];
  const snippets: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const url = m[1].trim();
    const title = cleanText(m[2]);
    if (url.length === 0 || title.length === 0) continue;
    if (/^javascript:/i.test(url)) continue;
    links.push({ url, title });
  }
  while ((m = snippetRe.exec(html)) !== null) {
    snippets.push(cleanText(m[1]));
  }
  return links.map((link, i) => {
    let source = 'DuckDuckGo';
    try {
      source = new URL(link.url, 'https://duckduckgo.com').hostname.replace(/^www\./, '');
    } catch {
      source = 'DuckDuckGo';
    }
    return {
      title: link.title,
      url: link.url,
      snippet: snippets[i] ?? '',
      source,
    };
  });
}
