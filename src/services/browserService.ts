import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export const browserService = {
  async open(url: string): Promise<boolean> {
    const resolved = resolveUrl(url);
    if (!resolved) return false;

    try {
      if (Capacitor.isNativePlatform()) {
        // Try Capacitor Browser first
        try {
          await Browser.open({
            url: resolved,
            presentationStyle: 'popover',
            toolbarColor: '#050505',
          });
          console.info('[BrowserService] Opened URL in Capacitor browser:', resolved);
          return true;
        } catch (capacitorError) {
          console.warn('[BrowserService] Capacitor browser failed, falling back to window.open:', capacitorError);
          // Fallback to window.open if Capacitor fails
          return this.openInWindow(resolved);
        }
      } else {
        // Web platform - use window.open
        return this.openInWindow(resolved);
      }
    } catch (error) {
      console.error('[BrowserService] Failed to open browser:', error);
      return false;
    }
  },

  openInWindow(url: string): boolean {
    try {
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      
      // Check if window was actually opened (not blocked by popup blocker)
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        console.warn('[BrowserService] Popup blocker detected, trying alternative method');
        // Try alternative method - direct location change
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return true;
      }
      
      console.info('[BrowserService] Opened URL in new window:', url);
      return true;
    } catch (error) {
      console.error('[BrowserService] Failed to open window:', error);
      return false;
    }
  },

  async openSearch(query: string): Promise<boolean> {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    return await this.open(searchUrl);
  },

  async close(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        await Browser.close();
        console.info('[BrowserService] Closed Capacitor browser');
        return true;
      }
      return true; // Nothing to close on web platform
    } catch (error) {
      console.error('[BrowserService] Failed to close browser:', error);
      return false;
    }
  },

  // Check if browser opening is supported
  isSupported(): boolean {
    if (Capacitor.isNativePlatform()) {
      return true; // Capacitor Browser plugin is available
    } else {
      return typeof window !== 'undefined' && typeof window.open === 'function';
    }
  }
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
