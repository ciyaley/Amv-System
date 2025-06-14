/**
 * Search Engine - Main Search Interface
 * Orchestrates text analysis, TF-IDF vectorization, and result processing
 */

import type { MemoData } from '../../app/types/tools';
import type { SearchResult } from '../../app/types/search';
import { TextAnalyzer } from './text-analyzer';
import { TFIDFVectorizer } from './tfidf-vectorizer';

export interface SearchFilter {
  sourceType?: 'authenticated' | 'guest';
  tags?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  } | {
    start: string;
    end: string;
  };
  minScore?: number;
}

export interface SearchOptions {
  filters?: SearchFilter;
  limit?: number;
  includeHighlights?: boolean;
  sortBy?: 'relevance' | 'date' | 'title';
}

export class SearchEngine {
  private textAnalyzer: TextAnalyzer;
  private vectorizer: TFIDFVectorizer;
  private lastIndexedMemoCount: number = 0;

  constructor() {
    this.textAnalyzer = new TextAnalyzer();
    this.vectorizer = new TFIDFVectorizer();
  }

  /**
   * 基本検索
   */
  public search(
    query: string, 
    memos: MemoData[], 
    options: SearchOptions = {}
  ): SearchResult[] {
    const { filters, limit = 50, includeHighlights = true, sortBy = 'relevance' } = options;

    if (!query.trim() || memos.length === 0) {
      return [];
    }

    // インデックス更新判定
    if (this.needsReindexing(memos)) {
      this.vectorizer.buildIndex(memos);
      this.lastIndexedMemoCount = memos.length;
    }

    // クエリ処理
    const queryTokens = this.textAnalyzer.getFilteredTokens(query.toLowerCase());
    const queryVector = this.vectorizer.createQueryVector(queryTokens);

    const results: SearchResult[] = [];

    for (const memo of memos) {
      // フィルタリング
      if (!this.passesFilters(memo, filters)) {
        continue;
      }

      const documentVector = this.vectorizer.getDocumentVector(memo.id);
      if (!documentVector) continue;

      // スコア計算
      const scoreResult = this.vectorizer.calculateRelevanceScore(memo, queryTokens, queryVector, documentVector);
      
      if (scoreResult.total > (filters?.minScore || 0.01)) {
        const result: SearchResult = {
          id: memo.id,
          memo,
          score: scoreResult.total,
          highlightedTitle: memo.title,
          highlightedText: memo.text || memo.content || '',
          matchedTerms: queryTokens
        };

        if (includeHighlights) {
          (result as any).highlights = this.generateHighlights(memo, queryTokens);
          (result as any).relevanceFactors = scoreResult.factors;
        }

        results.push(result);
      }
    }

    // ソート
    return this.sortResults(results, sortBy).slice(0, limit);
  }

  /**
   * 類似メモ検索（More Like This）
   */
  public findSimilar(
    targetMemo: MemoData, 
    memos: MemoData[], 
    options: SearchOptions = {}
  ): SearchResult[] {
    const { limit = 10 } = options;

    if (this.needsReindexing(memos)) {
      this.vectorizer.buildIndex(memos);
      this.lastIndexedMemoCount = memos.length;
    }

    const similarities = this.vectorizer.findSimilarDocuments(targetMemo.id, 0.1);

    return similarities
      .slice(0, limit)
      .map(({ id, similarity }) => {
        const memo = memos.find(m => m.id === id);
        if (!memo) throw new Error(`Memo not found: ${id}`);

        return {
          id: memo.id,
          memo,
          score: similarity,
          highlightedTitle: memo.title,
          highlightedText: memo.text || memo.content || '',
          matchedTerms: [],
          highlights: [],
          relevanceFactors: {
            titleMatch: 0,
            contentMatch: similarity,
            tagMatch: 0,
            tfIdfScore: similarity,
            recencyBoost: 0
          }
        };
      });
  }

  /**
   * オートコンプリート候補生成
   */
  public getAutocompleteSuggestions(
    partialQuery: string, 
    memos: MemoData[], 
    limit: number = 5
  ): string[] {
    if (!partialQuery.trim()) return [];

    const suggestions = new Set<string>();
    const lowerQuery = partialQuery.toLowerCase();

    for (const memo of memos) {
      // タイトルから候補抽出
      const titleTokens = this.textAnalyzer.getFilteredTokens(memo.title);
      for (const token of titleTokens) {
        if (token.startsWith(lowerQuery) && token.length > lowerQuery.length) {
          suggestions.add(token);
        }
      }

      // タグから候補抽出
      if (memo.tags) {
        for (const tag of memo.tags) {
          if (tag.toLowerCase().startsWith(lowerQuery)) {
            suggestions.add(tag);
          }
        }
      }
    }

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * 検索統計情報
   */
  public getSearchStats(memos: MemoData[]): {
    totalDocuments: number;
    vocabularySize: number;
    averageDocumentLength: number;
    topTerms: Array<{ term: string; frequency: number }>;
  } {
    if (this.needsReindexing(memos)) {
      this.vectorizer.buildIndex(memos);
      this.lastIndexedMemoCount = memos.length;
    }

    const indexStats = this.vectorizer.getIndexStats();
    
    // 全文書の用語頻度計算
    const globalTermFreq = new Map<string, number>();
    for (const memo of memos) {
      const tokens = this.textAnalyzer.getFilteredTokens(
        `${memo.title} ${memo.text || memo.content || ''}`
      );
      for (const token of tokens) {
        globalTermFreq.set(token, (globalTermFreq.get(token) || 0) + 1);
      }
    }

    const topTerms = Array.from(globalTermFreq.entries())
      .map(([term, frequency]) => ({ term, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);

    return {
      totalDocuments: indexStats.documentCount,
      vocabularySize: indexStats.vocabularySize,
      averageDocumentLength: indexStats.averageDocumentLength,
      topTerms
    };
  }

  /**
   * インデックス再構築の必要性判定
   */
  private needsReindexing(memos: MemoData[]): boolean {
    return this.lastIndexedMemoCount !== memos.length;
  }

  /**
   * フィルタリング処理
   */
  private passesFilters(memo: MemoData, filters?: SearchFilter): boolean {
    if (!filters) return true;

    // タグフィルタ
    if (filters.tags && filters.tags.length > 0) {
      const memoTags = memo.tags || [];
      const hasRequiredTag = filters.tags.some(filterTag => 
        memoTags.some(memoTag => memoTag.toLowerCase().includes(filterTag.toLowerCase()))
      );
      if (!hasRequiredTag) return false;
    }

    // 日付フィルタ
    if (filters.dateRange) {
      const memoDate = new Date(memo.updatedAt || memo.createdAt || '');
      
      if ('from' in filters.dateRange && 'to' in filters.dateRange) {
        if (memoDate < filters.dateRange.from || memoDate > filters.dateRange.to) {
          return false;
        }
      } else if ('start' in filters.dateRange && 'end' in filters.dateRange) {
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        if (memoDate < startDate || memoDate > endDate) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * ハイライト生成
   */
  private generateHighlights(memo: MemoData, queryTokens: string[]): string[] {
    const highlights: string[] = [];
    const content = memo.text || memo.content || '';
    
    for (const token of queryTokens) {
      const regex = new RegExp(`\\b${token}\\b`, 'gi');
      const matches = content.match(regex);
      
      if (matches) {
        // コンテキスト付きハイライト生成
        const contextLength = 50;
        const index = content.toLowerCase().indexOf(token.toLowerCase());
        
        if (index !== -1) {
          const start = Math.max(0, index - contextLength);
          const end = Math.min(content.length, index + token.length + contextLength);
          const context = content.substring(start, end);
          const highlightedContext = context.replace(regex, `<mark>$&</mark>`);
          
          highlights.push(highlightedContext);
        }
      }
    }

    return highlights;
  }

  /**
   * 結果ソート
   */
  private sortResults(results: SearchResult[], sortBy: string): SearchResult[] {
    switch (sortBy) {
      case 'date':
        return results.sort((a, b) => {
          const dateA = new Date(a.memo.updatedAt || a.memo.createdAt || '').getTime();
          const dateB = new Date(b.memo.updatedAt || b.memo.createdAt || '').getTime();
          return dateB - dateA;
        });
      
      case 'title':
        return results.sort((a, b) => a.memo.title.localeCompare(b.memo.title));
      
      case 'relevance':
      default:
        return results.sort((a, b) => b.score - a.score);
    }
  }

  /**
   * 検索エンジンのリセット
   */
  public reset(): void {
    this.vectorizer.clearIndex();
    this.lastIndexedMemoCount = 0;
  }

  /**
   * テキスト解析器の取得（外部操作用）
   */
  public getTextAnalyzer(): TextAnalyzer {
    return this.textAnalyzer;
  }

  /**
   * ベクトル化器の取得（外部操作用）
   */
  public getVectorizer(): TFIDFVectorizer {
    return this.vectorizer;
  }
}