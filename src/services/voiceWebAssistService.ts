/**
 * Voice Web Assist Service
 * Orchestrates voice input → web search → voice output workflow
 * Supports both cloud and local models for result processing
 */

import { webSearchService, shouldUseWebSearch, type WebSearchResult } from './webSearchService';
import { webAssistService } from './webAssistService';
import { voicePersonaService } from './voicePersonaService';
import { nativeOfflineLlmService } from './nativeOfflineLlmService';

/**
 * Voice query intent classification
 */
export type VoiceWebQueryIntent =
  | 'web-search'
  | 'current-news'
  | 'quick-lookup'
  | 'definition'
  | 'latest-info'
  | 'comparison'
  | 'how-to'
  | 'product-info';

/**
 * Analysis of voice query to determine web search strategy
 */
export interface VoiceWebQueryAnalysis {
  query: string;
  intent: VoiceWebQueryIntent;
  confidence: number; // 0-1 how sure we are
  resultCountHint: 'brief' | 'detailed' | 'comprehensive';
  timelineHint: 'current' | 'recent' | 'any';
  shouldSearch: boolean;
  reason: string;
}

/**
 * Voice-optimized search result with spoken metadata
 */
export interface VoiceWebResult {
  title: string;
  snippet: string;
  url: string;
  ordinality: number; // 1, 2, 3...
  voiceSnippet: string; // Conversational version without URL
  domain: string; // Extracted and cleaned (e.g., "TechCrunch")
  readingTime: number; // Estimated seconds for voice
}

/**
 * Full response from voice web assist
 */
export interface VoiceWebAssistResponse {
  originalQuery: string;
  processedQuery: string;
  queryAnalysis: VoiceWebQueryAnalysis;
  results: VoiceWebResult[];
  formattedResults: string; // For chat display (includes URLs)
  voiceSummary: string; // Sentence-chunked, voice-optimized
  confidence: number; // Overall confidence 0-1
  processingTime: number; // ms
  timestamp: number;
  usedLocalModel: boolean;
  modelUsed?: string;
}

/**
 * Voice command for browsing through results
 */
export interface VoiceWebCommand {
  action: 'read' | 'open' | 'save' | 'search';
  targetIndex?: number; // Result index (0-based)
  targetUrl?: string;
  maxChars?: number; // For page read
}

// Session cache for voice web results (30 minute TTL)
const resultCache = new Map<
  string,
  {
    response: VoiceWebAssistResponse;
    timestamp: number;
  }
>();

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Clear session cache
 */
function clearCache(): void {
  resultCache.clear();
}

/**
 * Check if cached result is still valid
 */
function getCachedResult(
  query: string
): VoiceWebAssistResponse | null {
  const cached = resultCache.get(query);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL) {
    resultCache.delete(query);
    return null;
  }

  return cached.response;
}

/**
 * Analyze voice query to determine search intent and strategy
 */
function analyzeVoiceQuery(query: string): VoiceWebQueryAnalysis {
  const lowerQuery = query.toLowerCase();

  // Determine intent
  let intent: VoiceWebQueryIntent = 'web-search';
  let resultCountHint: 'brief' | 'detailed' | 'comprehensive' = 'detailed';
  let timelineHint: 'current' | 'recent' | 'any' = 'any';

  if (
    lowerQuery.includes('latest') ||
    lowerQuery.includes('today') ||
    lowerQuery.includes('now') ||
    lowerQuery.includes('current')
  ) {
    intent = 'current-news';
    timelineHint = 'current';
    resultCountHint = 'brief';
  } else if (
    lowerQuery.includes('how to') ||
    lowerQuery.includes('how do i') ||
    lowerQuery.includes('steps to')
  ) {
    intent = 'how-to';
    resultCountHint = 'detailed';
  } else if (
    lowerQuery.includes('what is') ||
    lowerQuery.includes('define') ||
    lowerQuery.includes('meaning')
  ) {
    intent = 'definition';
    resultCountHint = 'brief';
  } else if (
    lowerQuery.includes('compare') ||
    lowerQuery.includes('difference') ||
    lowerQuery.includes('vs') ||
    lowerQuery.includes('versus')
  ) {
    intent = 'comparison';
    resultCountHint = 'comprehensive';
  } else if (
    lowerQuery.includes('price') ||
    lowerQuery.includes('buy') ||
    lowerQuery.includes('where to get') ||
    lowerQuery.includes('product')
  ) {
    intent = 'product-info';
    resultCountHint = 'detailed';
  }

  const shouldSearch = shouldUseWebSearch(query);
  const confidence = shouldSearch ? 0.85 : 0.3;
  const reason = shouldSearch
    ? 'Query matches web search patterns'
    : 'Query appears to be conversational';

  return {
    query,
    intent,
    confidence,
    resultCountHint,
    timelineHint,
    shouldSearch,
    reason,
  };
}

/**
 * Convert ordinal number to words (1 -> "First", 2 -> "Second", etc.)
 */
function ordinalize(n: number): string {
  const ordinals = [
    'First',
    'Second',
    'Third',
    'Fourth',
    'Fifth',
    'Sixth',
    'Seventh',
    'Eighth',
    'Ninth',
    'Tenth',
  ];
  return ordinals[n - 1] || `${n}th`;
}

/**
 * Extract domain from URL and clean it
 * Example: "https://www.techcrunch.com/article" -> "TechCrunch"
 */
function extractDomain(urlString: string): string {
  try {
    const url = new URL(urlString);
    let domain = url.hostname.replace('www.', '');

    // Convert domain to title case
    return domain
      .split('.')
      [0] // Get subdomain (e.g., "techcrunch" from "techcrunch.com")
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  } catch {
    return 'Web';
  }
}

/**
 * Format search results for voice output
 * Removes URLs, uses natural language instead
 */
function formatResultsForVoice(results: VoiceWebResult[]): string {
  if (results.length === 0) return 'No results found.';

  // Create natural summary
  const persona = voicePersonaService.getActivePersona();
  const preamble =
    persona.id === 'casual'
      ? "Here's what I found."
      : persona.id === 'witty'
        ? 'Found some interesting stuff.'
        : persona.id === 'educational'
          ? 'Let me share what the web has to say.'
          : persona.id === 'creative'
            ? 'Here are some insights from across the web.'
            : 'Found the following information.';

  const snippets = results
    .map((result) => `${ordinalize(result.ordinality)}, from ${result.domain}: ${result.voiceSnippet}`)
    .join(' ');

  return `${preamble} ${snippets}`;
}

/**
 * Generate a concise voice-ready summary from search results
 * Best for when we want to read just a quick answer aloud
 */
function generateVoiceSummary(results: VoiceWebResult[]): string {
  if (results.length === 0) return 'Sorry, I could not find any results for that.';

  const first = results[0];
  const persona = voicePersonaService.getActivePersona();

  // Persona-specific intro
  let intro = '';
  switch (persona.id) {
    case 'casual':
      intro = `Here's the top result: `;
      break;
    case 'witty':
      intro = `The best I found was this: `;
      break;
    case 'educational':
      intro = `The most relevant result tells us: `;
      break;
    case 'creative':
      intro = `Found this fascinating: `;
      break;
    default:
      intro = `The primary source indicates: `;
  }

  // Combine intro + first result snippet + optional second mention
  let summary = `${intro}${first.voiceSnippet}`;

  if (results.length > 1) {
    const second = results[1];
    summary += ` Additionally, ${second.domain} notes: ${second.voiceSnippet}`;
  }

  return summary;
}

/**
 * Convert raw search results to voice-optimized format
 */
function convertToVoiceResults(webResults: any[]): VoiceWebResult[] {
  return webResults.map((result, index) => {
    const domain = extractDomain(result.url);
    const ordinality = index + 1;

    // Voice snippet: natural language version of snippet without URLs
    const voiceSnippet = result.snippet
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/\[.*?\]\(.*?\)/g, '') // Remove markdown links
      .trim();

    // Estimate reading time (rough: ~150 words per minute)
    const wordCount = voiceSnippet.split(/\s+/).length;
    const readingTime = Math.ceil((wordCount / 150) * 60);

    return {
      title: result.title,
      snippet: result.snippet,
      url: result.url,
      ordinality,
      voiceSnippet,
      domain,
      readingTime,
    };
  });
}

/**
 * Main voice web assist function
 * Performs web search and returns voice-optimized results
 */
export async function assistWithVoice(
  query: string,
  options?: {
    timeout?: number;
    maxResults?: number;
    speakResults?: boolean;
    verbose?: boolean;
  }
): Promise<VoiceWebAssistResponse> {
  const startTime = Date.now();
  const timeout = options?.timeout ?? 8000;
  const maxResults = options?.maxResults ?? 3;
  const verbose = options?.verbose ?? false;

  // Check cache first
  const cached = getCachedResult(query);
  if (cached) {
    if (verbose) console.log('[VoiceWebAssist] Using cached results for:', query);
    return cached;
  }

  // Analyze query
  const queryAnalysis = analyzeVoiceQuery(query);

  if (verbose) {
    console.log('[VoiceWebAssist] Query analysis:', queryAnalysis);
  }

  // If analysis suggests we shouldn't search, return early
  if (!queryAnalysis.shouldSearch) {
    console.warn('[VoiceWebAssist] Query not suitable for web search:', query);
    return {
      originalQuery: query,
      processedQuery: query,
      queryAnalysis,
      results: [],
      formattedResults: '',
      voiceSummary: 'I could not determine what to search for. Please rephrase your question.',
      confidence: 0.3,
      processingTime: Date.now() - startTime,
      timestamp: Date.now(),
      usedLocalModel: false,
    };
  }

  try {
    // Perform web search with timeout
    const searchPromise = webSearchService.search(
      queryAnalysis.query,
      maxResults
    );

    const searchResults = (await Promise.race([
      searchPromise,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Web search timeout')),
          timeout
        )
      ),
    ])) as WebSearchResult[];

    if (!searchResults || searchResults.length === 0) {
      console.warn('[VoiceWebAssist] No search results found for:', query);
      return {
        originalQuery: query,
        processedQuery: queryAnalysis.query,
        queryAnalysis,
        results: [],
        formattedResults: '',
        voiceSummary: 'No results found for that search.',
        confidence: 0.5,
        processingTime: Date.now() - startTime,
        timestamp: Date.now(),
        usedLocalModel: false,
      };
    }

    // Convert to voice-optimized format
    const voiceResults = convertToVoiceResults(searchResults);

    // Generate formatted output for display and voice
    const formattedResults = webSearchService.formatResults(searchResults);
    const voiceSummary = generateVoiceSummary(voiceResults);

    const response: VoiceWebAssistResponse = {
      originalQuery: query,
      processedQuery: queryAnalysis.query,
      queryAnalysis,
      results: voiceResults,
      formattedResults,
      voiceSummary,
      confidence: 0.9,
      processingTime: Date.now() - startTime,
      timestamp: Date.now(),
      usedLocalModel: false,
    };

    // Cache the result
    resultCache.set(query, {
      response,
      timestamp: Date.now(),
    });

    if (verbose) {
      console.log('[VoiceWebAssist] Complete response:', response);
    }

    return response;
  } catch (error) {
    console.error('[VoiceWebAssist] Error during web search:', error);

    // Try fallback: use local model to generate a response
    console.log('[VoiceWebAssist] Attempting local model fallback...');

    try {
      const fallbackResponse = await generateLocalModelFallback(
        query,
        queryAnalysis,
        timeout
      );
      return fallbackResponse;
    } catch (fallbackError) {
      console.error('[VoiceWebAssist] Fallback also failed:', fallbackError);

      return {
        originalQuery: query,
        processedQuery: queryAnalysis.query,
        queryAnalysis,
        results: [],
        formattedResults: '',
        voiceSummary: 'I had trouble searching the web. Please try again or rephrase your question.',
        confidence: 0.1,
        processingTime: Date.now() - startTime,
        timestamp: Date.now(),
        usedLocalModel: false,
      };
    }
  }
}

/**
 * Fallback: Use local model to generate a helpful response when web search fails
 */
async function generateLocalModelFallback(
  query: string,
  analysis: VoiceWebQueryAnalysis,
  timeout: number
): Promise<VoiceWebAssistResponse> {
  const startTime = Date.now();

  try {
    const status = await nativeOfflineLlmService.getStatus();

    if (!status?.runtimeReady || !status?.activeModel) {
      throw new Error('Local model not available');
    }

    // Create a focused prompt for local model
    const systemPrompt = `You are Amo, a helpful assistant. The user asked a question that requires current information from the web, but web search failed. 
Provide a helpful, concise response based on your training knowledge. Be honest about knowledge cutoff dates.
Your response should be 1-2 sentences, conversational and natural for text-to-speech.`;

    const userPrompt = `User asked: "${query}"
Intent: ${analysis.intent}
Please provide a helpful response based on your knowledge.`;

    const generatePromise = nativeOfflineLlmService.generate({
      prompt: `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`,
      temperature: 0.7,
      max_tokens: 256,
    });

    const result = await Promise.race([
      generatePromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Local model timeout')), timeout)
      ),
    ]);

    const generatedText = (result as any)?.text?.trim() || '';

    if (generatedText) {
      return {
        originalQuery: query,
        processedQuery: query,
        queryAnalysis: analysis,
        results: [],
        formattedResults: `[Local Model Response]\n${generatedText}`,
        voiceSummary: generatedText,
        confidence: 0.6,
        processingTime: Date.now() - startTime,
        timestamp: Date.now(),
        usedLocalModel: true,
        modelUsed: status.activeModel?.displayName || 'Unknown',
      };
    }

    throw new Error('No response from local model');
  } catch (error) {
    console.error('[VoiceWebAssist] Local model fallback failed:', error);
    throw error;
  }
}

/**
 * Fetch and read a specific result by URL
 */
export async function readResultUrl(
  url: string,
  maxChars: number = 4000
): Promise<string> {
  try {
    const pageContent = await webAssistService.fetchPage(url, maxChars);
    if (!pageContent) {
      return 'Could not fetch that page.';
    }
    return pageContent;
  } catch (error) {
    console.error('[VoiceWebAssist] Error reading URL:', error);
    return 'Had trouble reading that page. Please try again.';
  }
}

/**
 * Interactive result browsing by index
 */
export function getResultForVoiceReading(
  response: VoiceWebAssistResponse,
  index: number
): string {
  if (index < 0 || index >= response.results.length) {
    return `That result doesn't exist. I found ${response.results.length} results.`;
  }

  const result = response.results[index];
  const persona = voicePersonaService.getActivePersona();

  let intro = '';
  switch (persona.id) {
    case 'casual':
      intro = `Here's the ${ordinalize(result.ordinality).toLowerCase()} result from ${result.domain}: `;
      break;
    case 'witty':
      intro = `Diving into result number ${result.ordinality}: `;
      break;
    case 'educational':
      intro = `Let me read the ${ordinalize(result.ordinality).toLowerCase()} result to you: `;
      break;
    default:
      intro = `Result ${result.ordinality}: `;
  }

  return `${intro}${result.voiceSnippet}`;
}

/**
 * Export the public API
 */
export const voiceWebAssistService = {
  assistWithVoice,
  readResultUrl,
  getResultForVoiceReading,
  clearCache,
  getCachedResult,
};
