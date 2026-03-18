import React, { useState, useEffect } from 'react';
import { browserService } from '../services/browserService';
import { webAssistService } from '../services/webAssistService';
import { vectorDbService } from '../services/vectorDbService';
import { Globe, ExternalLink, Loader2, BookOpen, Search, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface WebBrowserProps {
  url: string;
  onNavigate?: (url: string) => void;
}

interface PageContent {
  title: string;
  content: string;
  url: string;
  fetchedAt: number;
}

export function WebBrowser({ url, onNavigate }: WebBrowserProps) {
  const [addressInput, setAddressInput] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [browserError, setBrowserError] = useState<string | null>(null);

  useEffect(() => {
    if (url && url !== 'amo://dashboard') {
      navigateTo(url);
    }
  }, [url]);

  const navigateTo = async (targetUrl: string) => {
    const resolvedUrl = resolveUrl(targetUrl);
    if (!resolvedUrl) return;

    setCurrentUrl(resolvedUrl);
    setAddressInput(resolvedUrl);
    setPageContent(null);
    setIsLoading(true);
    setBrowserError(null);

    // Open in actual browser with error handling
    const browserOpened = await browserService.open(resolvedUrl);
    
    if (browserOpened) {
      setIsBrowserOpen(true);
      console.info('[WebBrowser] Browser opened successfully for:', resolvedUrl);
    } else {
      setIsBrowserOpen(false);
      setBrowserError('Failed to open browser. Please check your browser settings and try again.');
      console.warn('[WebBrowser] Failed to open browser for:', resolvedUrl);
    }

    // Fetch content for reading/knowledge
    fetchPageContent(resolvedUrl);
    onNavigate?.(resolvedUrl);
  };

  const fetchPageContent = async (targetUrl: string) => {
    try {
      const content = await webAssistService.fetchPage(targetUrl, 3000);
      if (content) {
        setPageContent({
          title: extractTitle(targetUrl),
          content,
          url: targetUrl,
          fetchedAt: Date.now(),
        });
      }
    } catch (error) {
      console.warn('Failed to fetch page content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    await navigateTo(searchUrl);
  };

  const saveToKnowledge = async () => {
    if (!pageContent) return;

    try {
      await vectorDbService.addDocument({
        id: `web:${Date.now()}`,
        documentId: `web:${Date.now()}`,
        documentName: `Web: ${pageContent.title}`,
        content: `[Imported from Web Browser]\nURL: ${pageContent.url}\n\n${pageContent.content}`,
        metadata: { 
          assetKind: 'dataset', 
          source: 'web-browser', 
          importedAt: Date.now(),
          url: pageContent.url
        },
      });
    } catch (error) {
      console.error('Failed to save to knowledge:', error);
    }
  };

  const closeBrowser = async () => {
    const closed = await browserService.close();
    if (closed) {
      setIsBrowserOpen(false);
      console.info('[WebBrowser] Browser closed successfully');
    } else {
      console.warn('[WebBrowser] Failed to close browser');
    }
  };

  return (
    <div className="flex flex-col h-full rounded-[1.75rem] overflow-hidden border border-white/10 glass-panel">
      {/* Navigation Bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-black/30 shrink-0">
        <Globe className="w-3.5 h-3.5 text-white/25 shrink-0" />
        <input
          type="text"
          value={addressInput}
          onChange={e => setAddressInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && addressInput.trim()) {
              const isSearch = !addressInput.includes('.') && addressInput.length > 2;
              if (isSearch) {
                handleSearch(addressInput);
              } else {
                navigateTo(addressInput);
              }
            }
          }}
          placeholder="Enter URL or search query..."
          className="flex-1 bg-transparent text-xs text-white/70 placeholder:text-white/25 outline-none"
        />
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 text-white/25 animate-spin shrink-0" />
        ) : (
          <button
            onClick={() => {
              const isSearch = !addressInput.includes('.') && addressInput.length > 2;
              if (isSearch) {
                handleSearch(addressInput);
              } else {
                navigateTo(addressInput);
              }
            }}
            className="text-[10px] text-white/30 hover:text-white/70 px-2 py-0.5 border border-white/10 rounded transition-all shrink-0"
          >
            Go
          </button>
        )}
        {isBrowserOpen && (
          <button
            onClick={closeBrowser}
            className="text-[10px] text-red-400/70 hover:text-red-400 px-2 py-0.5 border border-red-500/30 rounded transition-all shrink-0"
          >
            Close
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {currentUrl && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-white/10 bg-white/[0.03]">
            <ExternalLink className="w-3.5 h-3.5 text-[#ff4e00] shrink-0" />
            <span className="text-xs text-white/60 truncate flex-1">{currentUrl}</span>
            <button
              onClick={() => navigateTo(currentUrl)}
              className="text-[10px] text-[#ff4e00]/70 hover:text-[#ff4e00] transition-colors shrink-0"
            >
              Reopen ↗
            </button>
          </div>
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

        {pageContent && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white/80 leading-snug">
                {pageContent.title}
              </h3>
              <button
                onClick={saveToKnowledge}
                className="flex items-center gap-1 text-[10px] text-white/50 hover:text-white/80 transition-colors"
              >
                <BookOpen className="w-3 h-3" />
                Save
              </button>
            </div>
            <div className="text-[11px] text-white/45 leading-relaxed max-h-64 overflow-y-auto custom-scrollbar">
              {pageContent.content}
            </div>
          </div>
        )}

        {!currentUrl && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-6">
            <Globe className="w-12 h-12 text-white/10" />
            <div className="text-center">
              <p className="text-white/20 text-xs leading-relaxed mb-4">
                Web pages open in your device browser.
                Enter a URL or search above to get started.
              </p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                {[
                  { label: 'Google Search', action: 'search', query: 'latest news' },
                  { label: 'GitHub', url: 'https://github.com' },
                  { label: 'Wikipedia', url: 'https://en.m.wikipedia.org' },
                  { label: 'Stack Overflow', url: 'https://stackoverflow.com' },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => {
                      if ('action' in item) {
                        handleSearch(item.query || '');
                      } else {
                        navigateTo(item.url);
                      }
                    }}
                    className="px-3 py-2 rounded-xl border border-white/10 text-xs text-white/50 hover:text-white/80 hover:border-white/20 transition-all flex items-center justify-center gap-1"
                  >
                    {'action' in item && <Search className="w-3 h-3" />}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
            <p className="text-white/20 text-xs">Loading page content...</p>
          </div>
        )}
      </div>
    </div>
  );
}

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

function extractTitle(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '').charAt(0).toUpperCase() + domain.slice(1);
  } catch {
    return 'Web Page';
  }
}
