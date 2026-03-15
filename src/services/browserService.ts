import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export const browserService = {
  async open(url: string): Promise<void> {
    const resolved = resolveUrl(url);
    if (!resolved) return;

    if (Capacitor.isNativePlatform()) {
      await Browser.open({
        url: resolved,
        presentationStyle: 'popover',
        toolbarColor: '#050505',
      });
    } else {
      window.open(resolved, '_blank');
    }
  },

  async openSearch(query: string): Promise<void> {
    await this.open(
      `https://www.google.com/search?q=${encodeURIComponent(query)}`
    );
  },

  async close(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Browser.close();
    }
  },
};

function resolveUrl(url: string): string {
  if (!url) return '';
  if (url === 'amo://dashboard' || (url.startsWith('amo://') && !url.includes('search'))) return '';
  if (url.startsWith('amo://search?q=')) {
    const query = decodeURIComponent(url.replace('amo://search?q=', ''));
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}
