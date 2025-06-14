/**
 * Search Module - Unified Exports
 * Modular search engine with TF-IDF and TinySegmenter
 */

// Core Classes
export { TextAnalyzer } from './text-analyzer';
export { TFIDFVectorizer } from './tfidf-vectorizer';
export { SearchEngine } from './search-engine';

// Types
export type { TokenAnalysis } from './text-analyzer';
export type { DocumentVector, RelevanceScore } from './tfidf-vectorizer';
export type { SearchFilter, SearchOptions } from './search-engine';

// Create singleton instance for backwards compatibility
import { SearchEngine } from './search-engine';
export const searchEngine = new SearchEngine();

// Advanced Search Engine class for direct import compatibility
export class AdvancedSearchEngine extends SearchEngine {
  constructor() {
    super();
  }

  // Add any legacy methods that might be expected
  public tokenize(text: string): string[] {
    return this.getTextAnalyzer().getFilteredTokens(text);
  }

  public buildIndex(memos: Array<{ id: string; text?: string; content?: string; title?: string }>): void {
    this.getVectorizer().buildIndex(memos as any);
  }
}

// Module metadata
export const SEARCH_MODULE_INFO = {
  version: '2.0.0',
  architecture: 'Modular Search Engine',
  modules: [
    'text-analyzer.ts (Japanese/English tokenization)',
    'tfidf-vectorizer.ts (TF-IDF computation)',
    'search-engine.ts (main interface)',
    'index.ts (unified exports)'
  ],
  features: [
    'TinySegmenter integration',
    'TF-IDF vectorization',
    'Cosine similarity',
    'Multi-language support',
    'Auto-completion',
    'More-like-this search'
  ],
  originalFileSize: '604 lines → 4 modular files',
  performance: 'Optimized for large document collections'
} as const;