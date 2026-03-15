import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Globe, RefreshCw } from 'lucide-react';

import { cn } from '../lib/utils';
import { webSearchService, type WebSearchResult } from '../services/webSearchService';

interface WebViewProps {
  url: string;
  onNavigate?: (url: string) => void;
}

const DASHBOARD_URL = 'amo://dashboard';
const SEARCH_URL_PREFIX = 'amo://search?q=';

function buildDashboardHtml(): string {
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Amo Task Dashboard</title>
      <style>
        :root {
          color-scheme: dark;
          --bg: #050505;
          --panel: rgba(255,255,255,0.04);
          --border: rgba(255,255,255,0.10);
          --text: #f5f5f5;
          --muted: rgba(255,255,255,0.68);
          --accent: #ff4e00;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          min-height: 100vh;
          font-family: Inter, system-ui, sans-serif;
          background:
            radial-gradient(circle at top, rgba(255,78,0,0.16), transparent 38%),
            var(--bg);
          color: var(--text);
          padding: 24px;
        }
        .shell {
          max-width: 960px;
          margin: 0 auto;
          display: grid;
          gap: 16px;
        }
        .hero, .card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 20px;
          backdrop-filter: blur(12px);
        }
        .hero h1 { margin: 0 0 8px; font-size: 28px; }
        .hero p, .card p, .card li { color: var(--muted); line-height: 1.55; }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .chip {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255,78,0,0.14);
          border: 1px solid rgba(255,78,0,0.28);
          color: #ffb08d;
          font-size: 12px;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        ul { margin: 10px 0 0; padding-left: 18px; }
        code {
          background: rgba(255,255,255,0.06);
          padding: 2px 6px;
          border-radius: 8px;
          color: #ffd2bd;
        }
      </style>
    </head>
    <body>
      <div class="shell">
        <section class="hero">
          <div class="chip">Amo Task Dashboard</div>
          <h1>Local-first task environment</h1>
          <p>Amo should answer fast from local knowledge first, switch to terminal for execution work, and use web assist only when the local brain cannot satisfy the request.</p>
        </section>
        <section class="grid">
          <article class="card">
            <h3>Task Mode</h3>
            <p>Use terminal for builds, fixes, file inspection, installs, and multi-step workflows.</p>
            <ul>
              <li>Prefer local context</li>
              <li>Explain briefly, then act</li>
              <li>Verify results before moving on</li>
            </ul>
          </article>
          <article class="card">
            <h3>Clarification</h3>
            <p>If wording is unclear, Amo should say <code>that didn't make sense</code>, <code>sorry can you repeat that?</code>, or <code>did you mean ...?</code>.</p>
          </article>
          <article class="card">
            <h3>Web Assist</h3>
            <p>Use web assist for immediate external facts, live pages, or when a local answer is missing or outdated.</p>
          </article>
        </section>
      </div>
    </body>
  </html>`;
}

function resolveDisplayUrl(url: string): string {
  if (!url) return '';

  if (url === 'amo://dashboard' || url === 'amo://home') return '';

  if (url.startsWith('amo://search?q=')) {
    const raw = url.replace('amo://search?q=', '');
    const query = decodeURIComponent(raw);
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  if (url.startsWith('amo://')) return '';

  if (/^https?:\/\//i.test(url)) return url;

  return `https://${url}`;
}

export const WebView: React.FC<WebViewProps> = ({ url, onNavigate }) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [currentUrl, setCurrentUrl] = useState(resolveDisplayUrl(url));
  const [draftUrl, setDraftUrl] = useState(resolveDisplayUrl(url));
  const [refreshKey, setRefreshKey] = useState(0);
  const [results, setResults] = useState<WebSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [iframeError, setIframeError] = useState<string | null>(null);

  const iframeUrl = useMemo(() => resolveDisplayUrl(currentUrl), [currentUrl]);
  const isDashboard = currentUrl === DASHBOARD_URL;
  const isSearch = currentUrl.startsWith(SEARCH_URL_PREFIX);
  const searchQuery = isSearch ? decodeURIComponent(currentUrl.slice(SEARCH_URL_PREFIX.length)) : '';

  useEffect(() => {
    const normalized = resolveDisplayUrl(url);
    setCurrentUrl(normalized);
    setDraftUrl(normalized);
    setIframeError(null);
    if (normalized && normalized !== currentUrl) {
      onNavigate?.(normalized);
    }
  }, [url]);

  useEffect(() => {
    if (!isSearch || !searchQuery) {
      setResults([]);
      setSearchError('');
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setSearchError('');

    void webSearchService.search(searchQuery, 8)
      .then((nextResults) => {
        if (!cancelled) {
          setResults(nextResults);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSearchError(error instanceof Error ? error.message : 'Search failed');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsSearching(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isSearch, searchQuery, refreshKey]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/30">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] p-3">
        <button
          type="button"
          onClick={() => iframeRef.current?.contentWindow?.history.back()}
          className="rounded-full border border-white/10 p-2 text-white/60 transition hover:text-white hover:border-white/20"
          title="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => iframeRef.current?.contentWindow?.history.forward()}
          className="rounded-full border border-white/10 p-2 text-white/60 transition hover:text-white hover:border-white/20"
          title="Forward"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setRefreshKey((value) => value + 1)}
          className="rounded-full border border-white/10 p-2 text-white/60 transition hover:text-white hover:border-white/20"
          title="Reload"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <form
          className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2"
          onSubmit={(event) => {
            event.preventDefault();
            const normalizedDraft = draftUrl.trim();
            if (/^(search|look up|find|browse)\b/i.test(normalizedDraft)) {
              const query = normalizedDraft.replace(/^(search|look up|find|browse)\b[:\s-]*/i, '').trim();
              setCurrentUrl(`${SEARCH_URL_PREFIX}${encodeURIComponent(query)}`);
              return;
            }
            setCurrentUrl(resolveDisplayUrl(normalizedDraft));
          }}
        >
          <Globe className="h-4 w-4 shrink-0 text-white/45" />
          <input
            value={draftUrl}
            onChange={(event) => setDraftUrl(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
            placeholder="Enter a URL"
          />
        </form>
      </div>
      {isDashboard ? (
        <iframe
          ref={iframeRef}
          key={`dashboard:${refreshKey}`}
          srcDoc={buildDashboardHtml()}
          title="Amo Task Dashboard"
          className={cn('h-full w-full border-0 bg-[#050505]')}
          sandbox="allow-scripts allow-same-origin"
        />
      ) : isSearch ? (
        <div className="h-full overflow-y-auto bg-[#050505] p-4 text-white">
          <div className="mx-auto max-w-4xl space-y-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-white/45">Web Assist</div>
              <h2 className="mt-2 text-xl font-semibold text-white">Search results for {searchQuery}</h2>
              <p className="mt-2 text-sm text-white/58">Amo uses these results when local knowledge is not enough.</p>
            </div>
            {isSearching && <div className="text-sm text-white/60">Searching...</div>}
            {searchError && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{searchError}</div>}
            {!isSearching && !searchError && results.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">No results found.</div>
            )}
            {results.map((result) => (
              <button
                key={result.url}
                type="button"
                onClick={() => {
                  const nextUrl = resolveDisplayUrl(result.url);
                  setCurrentUrl(nextUrl);
                  setDraftUrl(nextUrl);
                }}
                className="block w-full rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-[#ff4e00]/30 hover:bg-white/[0.05]"
              >
                <div className="text-sm font-semibold text-white">{result.title}</div>
                <div className="mt-1 text-xs text-[#ff9a70]">{result.url}</div>
                <div className="mt-2 text-sm leading-relaxed text-white/62">{result.snippet}</div>
              </button>
            ))}
          </div>
        </div>
      ) : iframeError ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[#050505] p-6 text-center">
          <Globe className="h-12 w-12 text-white/20 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Cannot display this page</h3>
          <p className="text-sm text-white/50 mb-4">{iframeError}</p>
          <p className="text-xs text-white/30 mb-4">This website blocks embedding. Try opening in your device browser instead.</p>
          <button
            onClick={() => { setIframeError(null); setRefreshKey(r => r + 1); }}
            className="px-4 py-2 rounded-full border border-[#ff4e00]/30 bg-[#ff4e00]/10 text-[#ff8a5c] text-sm font-medium hover:bg-[#ff4e00]/20 transition-all"
          >
            Try Again
          </button>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          key={`${iframeUrl}:${refreshKey}`}
          src={iframeUrl}
          title="Android WebView"
          className={cn('h-full w-full border-0 bg-white')}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
          onLoad={() => setIframeError(null)}
          onError={() => setIframeError('Failed to load this webpage. The site may be blocking embedded browsers.')}
        />
      )}
    </div>
  );
};
