// utils/advancedSearchEngine.ts
/**
 * 高度検索エンジン - TF-IDF + 日本語形態素解析
 * SearchToolbar.tsxから参照される検索機能
 */

import type { MemoData } from '../app/types/tools';

interface SearchFilters {
  category?: string;
  importance?: string;
  dateRange?: { start: Date; end: Date };
}

interface SearchResult {
  memo: MemoData;
  score: number;
  highlights: string[];
  relevanceFactors: {
    titleMatch: number;
    contentMatch: number;
    categoryMatch: number;
    dateRelevance: number;
  };
}

export class AdvancedSearchEngine {
  private index: Map<string, { memo: MemoData; terms: string[] }> = new Map();
  private termFrequency: Map<string, Map<string, number>> = new Map();
  private documentFrequency: Map<string, number> = new Map();
  private totalDocuments = 0;

  /**
   * メモのインデックスを構築
   */
  buildIndex(memos: MemoData[]): void {
    this.index.clear();
    this.termFrequency.clear();
    this.documentFrequency.clear();
    this.totalDocuments = memos.length;

    for (const memo of memos) {
      const terms = this.tokenize(this.getSearchableText(memo));
      this.index.set(memo.id, { memo, terms });

      // Term frequency計算
      const termCounts = new Map<string, number>();
      for (const term of terms) {
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
      }
      this.termFrequency.set(memo.id, termCounts);

      // Document frequency計算
      const uniqueTerms = new Set(terms);
      for (const term of uniqueTerms) {
        this.documentFrequency.set(term, (this.documentFrequency.get(term) || 0) + 1);
      }
    }
  }

  /**
   * 検索実行
   */
  search(
    query: string, 
    _memos: MemoData[], 
    filters?: SearchFilters, 
    limit = 50
  ): SearchResult[] {
    if (!query.trim()) return [];

    const queryTerms = this.tokenize(query.toLowerCase());
    const results: SearchResult[] = [];

    for (const [_id, indexEntry] of this.index) {
      const memo = indexEntry.memo;

      // フィルター適用
      if (filters && !this.applyFilters(memo, filters)) {
        continue;
      }

      const score = this.calculateRelevanceScore(memo, queryTerms);
      if (score > 0) {
        const highlights = this.generateHighlights(memo, queryTerms);
        const relevanceFactors = this.calculateRelevanceFactors(memo, queryTerms);

        results.push({
          memo,
          score,
          highlights,
          relevanceFactors
        });
      }
    }

    // スコア順でソート
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * メモから検索可能なテキストを抽出
   */
  private getSearchableText(memo: MemoData): string {
    const parts = [
      memo.title || '',
      memo.text || memo.content || '',
      memo.category || '',
      ...(memo.tags || [])
    ];
    return parts.join(' ').toLowerCase();
  }

  /**
   * 日本語対応トークナイゼーション
   */
  private tokenize(text: string): string[] {
    // 基本的な区切り文字での分割
    const basicTokens = text
      .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);

    const tokens: string[] = [];
    
    for (const token of basicTokens) {
      // 英数字の場合はそのまま
      if (/^[a-zA-Z0-9]+$/.test(token)) {
        tokens.push(token.toLowerCase());
        continue;
      }

      // 日本語の場合は文字レベルでも分割（簡易的な処理）
      tokens.push(token);
      
      // バイグラム作成（2文字組み合わせ）
      if (token.length > 1) {
        for (let i = 0; i < token.length - 1; i++) {
          tokens.push(token.substring(i, i + 2));
        }
      }
    }

    return tokens.filter(token => token.length > 0);
  }

  /**
   * TF-IDFスコア計算
   */
  private calculateTfIdf(term: string, memoId: string): number {
    const termCount = this.termFrequency.get(memoId)?.get(term) || 0;
    const totalTerms = Array.from(this.termFrequency.get(memoId)?.values() || [])
      .reduce((sum, count) => sum + count, 0);
    
    if (termCount === 0 || totalTerms === 0) return 0;

    const tf = termCount / totalTerms;
    const df = this.documentFrequency.get(term) || 0;
    const idf = df > 0 ? Math.log(this.totalDocuments / df) : 0;

    return tf * idf;
  }

  /**
   * 関連性スコア計算
   */
  private calculateRelevanceScore(memo: MemoData, queryTerms: string[]): number {
    let score = 0;

    for (const term of queryTerms) {
      // TF-IDFスコア
      const tfidfScore = this.calculateTfIdf(term, memo.id);
      
      // タイトルマッチボーナス
      const titleBonus = (memo.title || '').toLowerCase().includes(term) ? 2.0 : 0;
      
      // 完全一致ボーナス
      const exactMatchBonus = this.getSearchableText(memo).includes(term) ? 1.5 : 0;

      score += tfidfScore + titleBonus + exactMatchBonus;
    }

    return score;
  }

  /**
   * 関連性要因の詳細計算
   */
  private calculateRelevanceFactors(memo: MemoData, queryTerms: string[]): SearchResult['relevanceFactors'] {
    const title = (memo.title || '').toLowerCase();
    const content = (memo.text || memo.content || '').toLowerCase();
    const category = (memo.category || '').toLowerCase();

    let titleMatch = 0;
    let contentMatch = 0;
    let categoryMatch = 0;

    for (const term of queryTerms) {
      if (title.includes(term)) titleMatch++;
      if (content.includes(term)) contentMatch++;
      if (category.includes(term)) categoryMatch++;
    }

    // 日付関連性（新しいメモほど高スコア）
    const now = Date.now();
    const memoTime = memo.createdAt ? new Date(memo.createdAt).getTime() : now;
    const daysSinceCreation = (now - memoTime) / (1000 * 60 * 60 * 24);
    const dateRelevance = Math.max(0, 1 - daysSinceCreation / 365); // 1年で0になる

    return {
      titleMatch: titleMatch / queryTerms.length,
      contentMatch: contentMatch / queryTerms.length,
      categoryMatch: categoryMatch / queryTerms.length,
      dateRelevance
    };
  }

  /**
   * ハイライト生成
   */
  private generateHighlights(memo: MemoData, queryTerms: string[]): string[] {
    const searchableText = this.getSearchableText(memo);
    const highlights: string[] = [];

    for (const term of queryTerms) {
      const index = searchableText.indexOf(term);
      if (index !== -1) {
        const start = Math.max(0, index - 30);
        const end = Math.min(searchableText.length, index + term.length + 30);
        const highlight = searchableText.substring(start, end);
        highlights.push(highlight);
      }
    }

    return highlights.slice(0, 3); // 最大3つまで
  }

  /**
   * フィルター適用
   */
  private applyFilters(memo: MemoData, filters: SearchFilters): boolean {
    // カテゴリフィルター
    if (filters.category && memo.category !== filters.category) {
      return false;
    }

    // 重要度フィルター
    if (filters.importance && memo.importance !== filters.importance) {
      return false;
    }

    // 日付範囲フィルター
    if (filters.dateRange && memo.createdAt) {
      const memoDate = new Date(memo.createdAt);
      if (memoDate < filters.dateRange.start || memoDate > filters.dateRange.end) {
        return false;
      }
    }

    return true;
  }
}

// デフォルトのインスタンスをエクスポート
export const defaultSearchEngine = new AdvancedSearchEngine();