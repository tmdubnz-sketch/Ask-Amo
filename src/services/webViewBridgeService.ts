import { webAssistService } from './webAssistService';
import { vectorDbService } from './vectorDbService';

export interface WebPageSnapshot {
  url: string;
  title: string;
  content: string;
  fetchedAt: number;
}

const pageCache = new Map<string, WebPageSnapshot>();
let currentUrl = '';

export const webViewBridgeService = {
  onNavigate(url: string): void {
    currentUrl = url;
    console.info('[WebViewBridge] Navigated to:', url);
  },

  getCurrentUrl(): string {
    return currentUrl;
  },

  async readCurrentPage(maxChars = 2500): Promise<WebPageSnapshot | null> {
    if (!currentUrl || currentUrl.startsWith('amo://')) {
      return null;
    }

    const cached = pageCache.get(currentUrl);
    if (cached && Date.now() - cached.fetchedAt < 60000) {
      return cached;
    }

    try {
      const content = await webAssistService.fetchPage(currentUrl, maxChars);
      if (!content) return null;

      const snapshot: WebPageSnapshot = {
        url: currentUrl,
        title: currentUrl,
        content,
        fetchedAt: Date.now(),
      };
      pageCache.set(currentUrl, snapshot);
      return snapshot;
    } catch (err) {
      console.warn('[WebViewBridge] Failed to read page:', err);
      return null;
    }
  },

  formatForContext(snapshot: WebPageSnapshot, maxChars = 2000): string {
    const lines = [
      `[Page: ${snapshot.url}]`,
      snapshot.content.slice(0, maxChars),
    ];
    return lines.join('\n');
  },

  async importCurrentPageToKnowledge(): Promise<string> {
    if (!currentUrl || currentUrl.startsWith('amo://')) {
      return 'No web page is currently loaded.';
    }

    try {
      const content = await webAssistService.fetchPage(currentUrl, 6000);
      if (!content) {
        return 'Failed to fetch the page content.';
      }

      const docId = `webview:${currentUrl}`;
      await vectorDbService.addDocument({
        id: docId,
        documentId: docId,
        documentName: `WebPage: ${currentUrl}`,
        content: `[Imported from WebView]\nURL: ${currentUrl}\n\n${content}`,
        metadata: { assetKind: 'dataset', source: 'webview', importedAt: Date.now() },
      });

      return `Saved this page to your knowledge brain.`;
    } catch (err) {
      console.warn('[WebViewBridge] Import failed:', err);
      return 'Failed to import the page.';
    }
  },

  async getCurrentPageContent(url: string): Promise<string | null> {
    if (!url) return null;

    const cached = pageCache.get(url);
    if (cached && Date.now() - cached.fetchedAt < 60000) {
      return cached.content;
    }

    try {
      const content = await webAssistService.fetchPage(url, 4000);
      if (!content) return null;

      const snapshot: WebPageSnapshot = {
        url,
        title: url,
        content,
        fetchedAt: Date.now(),
      };
      pageCache.set(url, snapshot);
      return content;
    } catch (err) {
      console.warn('[WebViewBridge] Failed to fetch page:', err);
      return null;
    }
  },

  async importPageToKnowledge(url: string): Promise<boolean> {
    if (!url) return false;

    try {
      const content = await webAssistService.fetchPage(url, 6000);
      if (!content) return false;

      const docId = `webview:${url}`;
      await vectorDbService.addDocument({
        id: docId,
        documentId: docId,
        documentName: `WebPage: ${url}`,
        content: `[Imported from WebView]\nURL: ${url}\n\n${content}`,
        metadata: { assetKind: 'dataset', source: 'webview', importedAt: Date.now() },
      });

      console.info('[WebViewBridge] Imported page to knowledge:', url);
      return true;
    } catch (err) {
      console.warn('[WebViewBridge] Failed to import page:', err);
      return false;
    }
  },

  async searchAndRead(query: string): Promise<string | null> {
    try {
      const results = await webAssistService.resolve(query, 3);
      if (!results) return null;

      const lines = results.split('\n').filter(l => l.startsWith('URL:'));
      if (lines.length === 0) return results;

      const firstUrl = lines[0].replace('URL: ', '').trim();
      const content = await this.getCurrentPageContent(firstUrl);

      if (content) {
        return `[Search: ${query}]\n\n${results}\n\n[Page Content from ${firstUrl}]\n${content}`;
      }

      return results;
    } catch (err) {
      console.warn('[WebViewBridge] Search and read failed:', err);
      return null;
    }
  },

  clearCache(): void {
    pageCache.clear();
  },
};
