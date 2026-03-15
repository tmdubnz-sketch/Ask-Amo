export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface WebPageSnapshot {
  title: string;
  url: string;
  text: string;
}

function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ');
}

/**
 * Strips conversational filler to create a focused keyword-based search query.
 */
function refineSearchQuery(query: string): string {
  let q = query.toLowerCase();
  
  const prefixes = [
    'search for info on',
    'search for information on',
    'search info on',
    'search for',
    'look up info on',
    'look up information on',
    'look up',
    'tell me about',
    'what is',
    'who is',
    'where is',
    'find out about',
    'find out',
    'give me info on',
    'can you find',
    'i want to know about',
    'latest news on',
    'latest info on',
  ];

  for (const prefix of prefixes) {
    if (q.startsWith(prefix)) {
      q = q.slice(prefix.length).trim();
      break;
    }
  }

  // Remove common punctuation and trailing markers
  q = q.replace(/[?.!]+$/, '').trim();

  return q || query;
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function stripHtml(html: string): string {
  if (typeof DOMParser === 'undefined') {
    return html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  doc.querySelectorAll('script, style, noscript').forEach((node) => node.remove());

  const title = doc.querySelector('title')?.textContent?.trim();
  const bodyText = doc.body?.textContent || doc.documentElement?.textContent || '';
  const normalizedText = bodyText.replace(/\s+/g, ' ').trim();

  return [title, normalizedText].filter(Boolean).join('\n\n').trim();
}

export function shouldUseWebSearch(query: string): boolean {
   const normalized = normalizeQuery(query).toLowerCase();
   if (!normalized) {
     return false;
   }
 
   if (/https?:\/\/|www\./i.test(normalized)) {
     return true;
   }
 
    // Negative triggers: words/phrases that should NEVER trigger a web search
    const negativeTriggers = [
      'how are you',
      'howsit',
      'how u',
      'how is it going',
      'sup',
      'kia ora',
      'hello',
      'hi ',
      'hey ',
      'hey bro',
      'hey there',
      'yo',
      'settings',
      'change model',
      'who are you',
      'what are you',
      'your name',
      'good morning',
      'good afternoon',
      'good evening',
      'thanks',
      'thank you',
      'nice to meet you',
      'pleased to meet you',
    ];
 
   // Check for exact matches or start-of-string matches for short triggers
   // to avoid false positives from substring matching
   for (const trigger of negativeTriggers) {
     // For triggers ending with space, check if query starts with them
     if (trigger.endsWith(' ')) {
       if (normalized.startsWith(trigger)) {
         return false;
       }
     } 
     // For single word triggers, check for word boundaries
     else if (trigger.split(' ').length === 1) {
       // Check if it's a complete word (start, end, or surrounded by spaces/punctuation)
       if (normalized === trigger || 
           normalized.startsWith(trigger + ' ') || 
           normalized.endsWith(' ' + trigger) ||
           normalized.includes(' ' + trigger + ' ') ||
           normalized.startsWith(trigger + '.') ||
           normalized.startsWith(trigger + '?') ||
           normalized.startsWith(trigger + '!')) {
         return false;
       }
     }
     // For multi-word phrases, check for exact or contained match
     else {
       if (normalized.includes(trigger)) {
         return false;
       }
     }
   }

  const triggers = [
    'search',
    'look up',
    'find out',
    'latest',
    'today',
    'current',
    'news',
    'what happened',
    'website',
    'link',
    'who is',
    'where is',
    'where are',
    'when did',
    'why does',
    'how to',
    'how do',
    'tell me about',
    'do you know',
    'prompt help',
    'prompt guide',
    'how to respond',
    'prompt engineering',
    'conversation example',
    'learn prompting',
  ];

  const explicitWebIntent = /\b(search|look up|browse|latest|current|news|website|link|online|web)\b/.test(normalized);

  return explicitWebIntent || triggers.some((trigger) => normalized.includes(trigger));
}

export class WebSearchService {
  private readonly SEARXNG_INSTANCES = [
    'https://searx.be',
    'https://searxng.site',
    'https://search.mdosch.de',
    'https://searx.tiekoetter.com',
    'https://searx.work',
    'https://priv.au',
    'https://search.ononoki.org',
    'https://searx.xyz',
    'https://searx.sethforprivacy.com',
  ];

  async search(query: string, maxResults = 5): Promise<WebSearchResult[]> {
    const rawNormalized = normalizeQuery(query);
    const searchKeyword = refineSearchQuery(rawNormalized);
    
    if (!searchKeyword) {
      return [];
    }

    console.info('[AskAmo] WebSearchService: Refined query:', { original: rawNormalized, refined: searchKeyword });

    const results: WebSearchResult[] = [];
    
    // 1. Parallelize DuckDuckGo and Wikipedia for basic info
    const [ddgResults, wikiResults] = await Promise.all([
      this.searchDuckDuckGo(searchKeyword, maxResults),
      this.searchWikipedia(searchKeyword, maxResults)
    ]);

    results.push(...ddgResults);

    for (const wikiRes of wikiResults) {
      if (results.length >= maxResults) break;
      if (!results.some(r => r.url === wikiRes.url)) {
        results.push(wikiRes);
      }
    }

    // 2. Fallback to SearXNG if we have fewer than 3 results
    if (results.length < 3) {
      for (const instance of this.SEARXNG_INSTANCES) {
        if (results.length >= maxResults) break;
        
        try {
          const searxRes = await this.searchSearXNG(instance, searchKeyword, maxResults);
          if (searxRes.length > 0) {
            for (const res of searxRes) {
              if (results.length >= maxResults) break;
              if (!results.some(r => r.url === res.url)) {
                results.push(res);
              }
            }
            if (results.length >= 3) break;
          }
        } catch (err) {
          console.warn(`SearXNG instance ${instance} failed, trying next...`);
        }
      }
    }

    const trimmedResults = results.slice(0, maxResults);
    if (trimmedResults.length > 0) {
      return trimmedResults;
    }

    return [
      {
        title: `Search Google for ${searchKeyword}`,
        snippet: `Live web snippets were unavailable, so use this direct Google search for immediate results about ${searchKeyword}.`,
        url: `https://www.google.com/search?q=${encodeURIComponent(searchKeyword)}`,
      },
      {
        title: `Search Brave for ${searchKeyword}`,
        snippet: `Fallback live search link for ${searchKeyword}.`,
        url: `https://search.brave.com/search?q=${encodeURIComponent(searchKeyword)}`,
      },
      {
        title: `Search Bing for ${searchKeyword}`,
        snippet: `Alternative fallback live search link for ${searchKeyword}.`,
        url: `https://www.bing.com/search?q=${encodeURIComponent(searchKeyword)}`,
      },
    ].slice(0, maxResults);
  }

  private async searchDuckDuckGo(query: string, maxResults: number): Promise<WebSearchResult[]> {
    const results: WebSearchResult[] = [];
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(ddgUrl, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (response.ok) {
        const data = await response.json();
        if (data.AbstractText) {
          results.push({
            title: data.Heading || query,
            snippet: data.AbstractText,
            url: data.AbstractURL || '',
          });
        }

        const related = Array.isArray(data.RelatedTopics) ? data.RelatedTopics : [];
        for (const topic of related) {
          if (results.length >= maxResults) break;
          if (topic && typeof topic.Text === 'string') {
            results.push({
              title: topic.FirstURL || topic.Text.slice(0, 72),
              snippet: topic.Text,
              url: topic.FirstURL || '',
            });
          }
        }
      }
    } catch (err) {
      clearTimeout(timeout);
      console.warn('DuckDuckGo search failed.', err);
    }
    return results;
  }

  private async searchWikipedia(query: string, maxResults: number): Promise<WebSearchResult[]> {
    const results: WebSearchResult[] = [];
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=${maxResults}&namespace=0&format=json&origin=*`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(wikiUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        const wikiData = await response.json();
        const titles = wikiData[1] || [];
        const snippets = wikiData[2] || [];
        const urls = wikiData[3] || [];

        for (let i = 0; i < titles.length; i++) {
          if (results.length >= maxResults) break;
          results.push({
            title: titles[i],
            snippet: snippets[i] || `Wikipedia article for ${titles[i]}`,
            url: urls[i]
          });
        }
      }
    } catch (err) {
      clearTimeout(timeout);
      console.warn('Wikipedia search failed.', err);
    }
    return results;
  }

  private async searchSearXNG(instance: string, query: string, maxResults: number): Promise<WebSearchResult[]> {
    const results: WebSearchResult[] = [];
    const searxUrl = `${instance}/search?q=${encodeURIComponent(query)}&format=json`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(searxUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      const searxResults = data.results || [];
      for (const res of searxResults) {
        if (results.length >= maxResults) break;
        results.push({
          title: res.title,
          snippet: res.content || res.snippet || '',
          url: res.url
        });
      }
    }
    return results;
  }

  getManualSearchLinks(query: string): string {
    const encoded = encodeURIComponent(query);
    return `
Would you like to search online manually?
- [Search Google](https://www.google.com/search?q=${encoded})
- [Search Bing](https://www.bing.com/search?q=${encoded})
- [Search Brave](https://search.brave.com/search?q=${encoded})
- [Search Reddit](https://www.reddit.com/search/?q=${encoded})
    `.trim();
  }

  formatResults(results: WebSearchResult[]): string {
    return results
      .map((res) => `Source: ${res.title}\nURL: ${res.url}\nContent: ${res.snippet}`)
      .join('\n\n');
  }

  async readPage(url: string, maxChars = 2000): Promise<WebPageSnapshot> {
    const normalizedUrl = normalizeUrl(url);
    const response = await fetch(normalizedUrl);

    if (!response.ok) {
      throw new Error(`Failed to read page: ${response.status}`);
    }

    const html = await response.text();
    const text = stripHtml(html).slice(0, maxChars).trim();

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch?.[1]?.replace(/\s+/g, ' ').trim() || url;

    return {
      title,
      url: normalizedUrl,
      text,
    };
  }

  formatPageSnapshot(snapshot: WebPageSnapshot): string {
    return `Page: ${snapshot.title}\nURL: ${snapshot.url}\n\n${snapshot.text}`;
  }
}

export const webSearchService = new WebSearchService();
