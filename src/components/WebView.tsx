import React, { useState, useEffect } from 'react';
import { browserService } from '../services/browserService';
import { webViewBridgeService } from '../services/webViewBridgeService';
import { webAssistService } from '../services/webAssistService';
import { vectorDbService } from '../services/vectorDbService';
import { Globe, ExternalLink, Loader2, BookOpen, Search, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

function resolveUrl(url: string): string {
  if (!url) return '';
  if (url === 'amo://dashboard') return '';
  if (url.startsWith('amo://search?q=')) {
    const query = decodeURIComponent(url.replace('amo://search?q=', ''));
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

interface WebViewProps {
  url: string;
  onNavigate?: (url: string) => void;
}

export function WebView({ url, onNavigate }: WebViewProps) {
  const [addressInput, setAddressInput] = useState('');
  const [fetchedContent, setFetchedContent] = useState<{
    title: string;
    text: string;
    url: string;
  } | null>(null);
  const [currentDisplayUrl, setCurrentDisplayUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [browserError, setBrowserError] = useState<string | null>(null);

  const navigateTo = async (targetUrl: string) => {
    const resolved = resolveUrl(targetUrl);
    if (!resolved) return;

    setCurrentDisplayUrl(resolved);
    setAddressInput(resolved);
    setBrowserError(null);

    // Open in actual browser with error handling
    const browserOpened = await browserService.open(resolved);
    
    if (browserOpened) {
      console.info('[WebView] Browser opened successfully for:', resolved);
    } else {
      setBrowserError('Failed to open browser. Please check your browser settings and try again.');
      console.warn('[WebView] Failed to open browser for:', resolved);
    }

    webViewBridgeService.onNavigate(resolved);
    onNavigate?.(resolved);
  };

  useEffect(() => {
    if (!url || url === 'amo://dashboard') return;

    const isSearch = url.startsWith('amo://search?q=');
    const query = isSearch
      ? decodeURIComponent(url.replace('amo://search?q=', ''))
      : null;
    const resolvedUrl = isSearch
      ? `https://www.google.com/search?q=${encodeURI(query!)}`
      : /^https?:\/\//i.test(url) ? url : `https://${url}`;

    navigateTo(resolvedUrl);

    if (!isSearch) {
      setIsFetching(true);
      webViewBridgeService.readCurrentPage(2000)
        .then(snapshot => {
          if (snapshot) setFetchedContent({ title: snapshot.title, text: snapshot.content, url: snapshot.url });
        })
        .catch(() => {})
        .finally(() => setIsFetching(false));
    }
  }, [url]);

  const handleGo = async (input: string) => {
    const normalized = /^https?:\/\//i.test(input.trim())
      ? input.trim()
      : `https://${input.trim()}`;
    setCurrentDisplayUrl(normalized);
    setAddressInput(normalized);
    setFetchedContent(null);
    setIsFetching(true);
    setBrowserError(null);

    // Open in actual browser with error handling
    const browserOpened = await browserService.open(normalized);
    
    if (browserOpened) {
      console.info('[WebView] Browser opened successfully for:', normalized);
    } else {
      setBrowserError('Failed to open browser. Please check your browser settings and try again.');
      console.warn('[WebView] Failed to open browser for:', normalized);
    }

    webViewBridgeService.onNavigate(normalized);
    onNavigate?.(normalized);

    webViewBridgeService.readCurrentPage(2000)
      .then(snapshot => { if (snapshot) setFetchedContent({ title: snapshot.title, text: snapshot.content, url: snapshot.url }); })
      .catch(() => {})
      .finally(() => setIsFetching(false));
  };

  return (
    <div className="flex flex-col h-full rounded-[1.75rem] overflow-hidden border border-white/10 glass-panel">

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (addressInput.trim()) void handleGo(addressInput);
        }}
        className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-black/30 shrink-0"
      >
        <Globe className="w-3.5 h-3.5 text-white/25 shrink-0" />
        <input
          type="text"
          value={addressInput}
          onChange={e => setAddressInput(e.target.value)}
          placeholder="Enter URL or search..."
          className="flex-1 bg-transparent text-xs text-white/70 placeholder:text-white/25 outline-none"
        />
        {isFetching
          ? <Loader2 className="w-3.5 h-3.5 text-white/25 animate-spin shrink-0" />
          : <button type="submit" className="text-[10px] text-white/30 hover:text-white/70 px-2 py-0.5 border border-white/10 rounded transition-all shrink-0">Go</button>
        }
      </form>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">

        {currentDisplayUrl && (
          <button
            onClick={() => void browserService.open(currentDisplayUrl)}
            className="w-full flex items-center gap-2 p-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all text-left"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#ff4e00] shrink-0" />
            <span className="text-xs text-white/60 truncate">{currentDisplayUrl}</span>
          </button>
        )}

        {browserError && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/5">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="text-xs text-red-300 flex-1">{browserError}</span>
            <button
              onClick={() => setBrowserError(null)}
              className="text-[10px] text-red-400/70 hover:text-red-400 transition-colors shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {fetchedContent && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
            <div className="text-xs font-semibold text-white/80 leading-snug">
              {fetchedContent.title}
            </div>
            <div className="text-[11px] text-white/45 leading-relaxed line-clamp-6">
              {fetchedContent.text}
            </div>
            <button
              onClick={() => void browserService.open(fetchedContent.url)}
              className="text-[10px] text-[#ff4e00]/70 hover:text-[#ff4e00] transition-colors"
            >
              Open in browser ↗
            </button>
          </div>
        )}

        {!currentDisplayUrl && !isFetching && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Globe className="w-8 h-8 text-white/10" />
            <p className="text-white/20 text-xs text-center leading-relaxed">
              Pages open in Android browser.
              Ask Amo to search or enter a URL above.
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
              {[
                { label: 'RNZ News',   url: 'https://www.rnz.co.nz' },
                { label: 'Google',     url: 'https://www.google.com' },
                { label: 'GitHub',     url: 'https://github.com' },
                { label: 'Wikipedia',  url: 'https://en.m.wikipedia.org' },
              ].map(item => (
                <button
                  key={item.url}
                  onClick={() => void handleGo(item.url)}
                  className="px-3 py-2 rounded-xl border border-white/10 text-xs text-white/50 hover:text-white/80 hover:border-white/20 transition-all"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
