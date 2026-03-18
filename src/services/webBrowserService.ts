import { webAssistService } from './webAssistService';
import { vectorDbService } from './vectorDbService';
import { createError, ERROR_CODES, logError } from './errorHandlingService';

export interface WebPage {
  url: string;
  title: string;
  content: string;
  fetchedAt: number;
}

export interface SearchResult {
  query: string;
  results: string;
  urls: string[];
}

const pageCache = new Map<string, WebPage>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const webBrowserService = {
  /**
   * Search the web and return formatted results
   */
  async search(query: string, resultCount = 5): Promise<SearchResult | null> {
    try {
      const results = await webAssistService.resolve(query, resultCount);
      if (!results) return null;

      // Extract URLs from results
      const urlMatches = results.match(/URL:\s*(https?:\/\/[^\s]+)/g) || [];
      const urls = urlMatches.map(match => match.replace('URL: ', '').trim());

      return {
        query,
        results,
        urls,
      };
    } catch (error) {
      logError('WebBrowserService', error, `Search query: ${query}`);
      return null;
    }
  },

  /**
   * Fetch page content with caching
   */
  async fetchPage(url: string, maxChars = 3000): Promise<WebPage | null> {
    if (!url) return null;

    const cached = pageCache.get(url);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return cached;
    }

    try {
      const content = await webAssistService.fetchPage(url, maxChars);
      if (!content) return null;

      const page: WebPage = {
        url,
        title: this.extractTitle(url),
        content,
        fetchedAt: Date.now(),
      };

      pageCache.set(url, page);
      return page;
    } catch (error) {
      logError('WebBrowserService', error, `Fetch page: ${url}`);
      return null;
    }
  },

  /**
   * Search and read the first result
   */
  async searchAndRead(query: string): Promise<string | null> {
    try {
      const searchResult = await this.search(query, 3);
      if (!searchResult || searchResult.urls.length === 0) {
        return searchResult?.results || null;
      }

      const firstUrl = searchResult.urls[0];
      const page = await this.fetchPage(firstUrl);

      if (page) {
        return `[Search: ${query}]\n\n${searchResult.results}\n\n[Page Content from ${page.title}]\n${page.content}`;
      }

      return searchResult.results;
    } catch (error) {
      logError('WebBrowserService', error, `Search and read: ${query}`);
      return null;
    }
  },

  /**
   * Save page to knowledge base
   */
  async saveToKnowledge(url: string, customTitle?: string): Promise<boolean> {
    try {
      const page = await this.fetchPage(url, 6000);
      if (!page) return false;

      await vectorDbService.addDocument({
        id: `web:${Date.now()}`,
        documentId: `web:${Date.now()}`,
        documentName: `Web: ${customTitle || page.title}`,
        content: `[Imported from Web Browser]\nURL: ${page.url}\n\n${page.content}`,
        metadata: { 
          assetKind: 'dataset', 
          source: 'web-browser', 
          importedAt: Date.now(),
          url: page.url
        },
      });

      return true;
    } catch (error) {
      logError('WebBrowserService', error, `Save to knowledge: ${url}`);
      return false;
    }
  },

  /**
   * Format page content for context
   */
  formatForContext(page: WebPage, maxChars = 2000): string {
    return `[Page: ${page.title} - ${page.url}]\n${page.content.slice(0, maxChars)}`;
  },

  /**
   * Get cached page if available
   */
  getCachedPage(url: string): WebPage | null {
    const cached = pageCache.get(url);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return cached;
    }
    return null;
  },

  /**
   * Clear cache
   */
  clearCache(): void {
    pageCache.clear();
  },

  /**
   * Extract title from URL
   */
  extractTitle(url: string): string {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      const path = urlObj.pathname;
      
      // Use domain as title, add path if it's meaningful
      if (path === '/' || path === '') {
        return domain.charAt(0).toUpperCase() + domain.slice(1);
      }
      
      const pathPart = path.split('/').pop()?.replace(/[-_]/g, ' ');
      if (pathPart && pathPart.length > 2) {
        return `${domain.charAt(0).toUpperCase() + domain.slice(1)} - ${pathPart.charAt(0).toUpperCase() + pathPart.slice(1)}`;
      }
      
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    } catch {
      return 'Web Page';
    }
  },

  /**
   * Resolve URL (search, amo://, etc.)
   */
  resolveUrl(url: string): string {
    if (!url) return '';
    if (url === 'amo://dashboard') return '';
    
    if (url.startsWith('amo://search?q=')) {
      const query = decodeURIComponent(url.replace('amo://search?q=', ''));
      return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
    
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
  },

  /**
   * Check if URL is valid
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; oldest: number | null; newest: number | null } {
    if (pageCache.size === 0) {
      return { size: 0, oldest: null, newest: null };
    }

    const entries = Array.from(pageCache.values());
    const timestamps = entries.map(e => e.fetchedAt);
    
    return {
      size: pageCache.size,
      oldest: Math.min(...timestamps),
      newest: Math.max(...timestamps),
    };
  },
};
