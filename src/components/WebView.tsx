import React, { useEffect } from 'react';
import { browserService } from '../services/browserService';
import { Globe } from 'lucide-react';

interface WebViewProps {
  url: string;
  onNavigate?: (url: string) => void;
}

export function WebView({ url, onNavigate }: WebViewProps) {
  useEffect(() => {
    if (!url || url === 'amo://dashboard') return;
    void browserService.open(url).then(() => {
      onNavigate?.(url);
    });
  }, [url]);

  const handleManualOpen = async (inputUrl: string) => {
    const normalized = /^https?:\/\//i.test(inputUrl)
      ? inputUrl
      : `https://${inputUrl}`;
    await browserService.open(normalized);
    onNavigate?.(normalized);
  };

  return (
    <div className="flex flex-col h-full rounded-[1.75rem] overflow-hidden border border-white/10 glass-panel">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const input = (e.currentTarget.elements.namedItem('url') as HTMLInputElement).value;
          if (input) void handleManualOpen(input);
        }}
        className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-black/30 shrink-0"
      >
        <Globe className="w-3.5 h-3.5 text-white/25 shrink-0" />
        <input
          name="url"
          type="text"
          placeholder="Enter URL or search..."
          defaultValue={url.startsWith('amo://') ? '' : url}
          className="flex-1 bg-transparent text-xs text-white/70 placeholder:text-white/25 outline-none"
        />
        <button
          type="submit"
          className="text-[10px] text-white/30 hover:text-white/70 px-2 py-0.5 border border-white/10 rounded transition-all"
        >
          Go
        </button>
      </form>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <Globe className="w-10 h-10 text-white/10" />
        <p className="text-white/25 text-xs text-center leading-relaxed">
          Pages open in your Android browser.{'\n'}
          Enter a URL above or ask Amo to search.
        </p>
        <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
          {[
            { label: 'RNZ News', url: 'https://www.rnz.co.nz' },
            { label: 'Google', url: 'https://www.google.com' },
            { label: 'GitHub', url: 'https://github.com' },
            { label: 'Wikipedia', url: 'https://en.m.wikipedia.org' },
          ].map(item => (
            <button
              key={item.url}
              onClick={() => void browserService.open(item.url)}
              className="px-3 py-2 rounded-xl border border-white/10 text-xs text-white/50 hover:text-white/80 hover:border-white/20 transition-all"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
