// utils/searchEngine.ts
import TinySegmenter from 'tiny-segmenter';
import { MemoData } from '../app/types/tools';

// 日本語形態素解析器のインスタンス
const segmenter = new TinySegmenter();

// ストップワードリスト（検索対象から除外する語）
const STOP_WORDS = new Set([
  'の', 'に', 'は', 'を', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ', 'ある', 'いる', 'する', 'です', 'ます',
  'だ', 'である', 'た', 'な', 'ない', 'なる', 'この', 'その', 'あの', 'どの', 'これ', 'それ', 'あれ', 'どれ',
  'ここ', 'そこ', 'あそこ', 'どこ', 'こう', 'そう', 'ああ', 'どう', 'から', 'まで', 'より', 'へ', 'など',
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it',
  'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with'
]);

// TF-IDF計算のためのドキュメント情報
interface DocumentInfo {
  id: string;
  tokens: string[];
  tf: Map<string, number>;
  length: number;
}

// Use unified SearchResult from types/search.ts
import type { SearchResult } from '../app/types/search';

interface TfIdfResult {
  token: string;
  tf: number;
  idf: number;
  tfidf: number;
}

class SearchEngine {
  private documents: Map<string, DocumentInfo> = new Map();
  private idfCache: Map<string, number> = new Map();
  private vocabulary: Set<string> = new Set();
  
  /**
   * テキストを形態素解析してトークン化
   */
  private tokenize(text: string): string[] {
    if (!text) return [];
    
    // 日本語と英語の混在テキストを処理
    const tokens: string[] = [];
    
    // 英語部分とその他を分離
    const parts = text.split(/([a-zA-Z]+)/);
    
    for (const part of parts) {
      if (/^[a-zA-Z]+$/.test(part)) {
        // 英語部分はそのまま小文字化
        tokens.push(part.toLowerCase());
      } else if (part.trim()) {
        // 日本語部分はTinySegmenterで形態素解析
        const segmented = segmenter.segment(part);
        tokens.push(...segmented.filter((token: string) => token.trim().length > 0));
      }
    }
    
    // ストップワード除去と正規化
    return tokens
      .map(token => token.toLowerCase().trim())
      .filter(token => 
        token.length > 0 && 
        !STOP_WORDS.has(token) &&
        !/^[0-9\s\p{P}]+$/u.test(token) // 数字と記号のみの語を除外
      );
  }

  /**
   * Term Frequency (TF) を計算
   */
  private calculateTF(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    const totalTokens = tokens.length;
    
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }
    
    // 正規化 (頻度 / 総トークン数)
    for (const [token, count] of tf.entries()) {
      tf.set(token, count / totalTokens);
    }
    
    return tf;
  }

  /**
   * Inverse Document Frequency (IDF) を計算
   */
  private calculateIDF(token: string): number {
    if (this.idfCache.has(token)) {
      return this.idfCache.get(token)!;
    }
    
    const totalDocs = this.documents.size;
    let docsWithToken = 0;
    
    for (const doc of this.documents.values()) {
      if (doc.tf.has(token)) {
        docsWithToken++;
      }
    }
    
    // IDF = log(総ドキュメント数 / (該当語を含むドキュメント数 + 1))
    const idf = Math.log(totalDocs / (docsWithToken + 1)) + 1;
    this.idfCache.set(token, idf);
    
    return idf;
  }

  /**
   * メモをインデックスに追加
   */
  public indexMemo(memo: MemoData): void {
    // メモのテキスト内容を結合
    const content = [memo.title, memo.text].filter(Boolean).join(' ');
    const tokens = this.tokenize(content);
    
    // 語彙に追加
    tokens.forEach(token => this.vocabulary.add(token));
    
    // ドキュメント情報を作成
    const docInfo: DocumentInfo = {
      id: memo.id,
      tokens,
      tf: this.calculateTF(tokens),
      length: tokens.length
    };
    
    this.documents.set(memo.id, docInfo);
    
    // IDFキャッシュをクリア（新しい文書が追加されたため）
    this.idfCache.clear();
  }

  /**
   * メモをインデックスから削除
   */
  public removeFromIndex(memoId: string): void {
    this.documents.delete(memoId);
    this.idfCache.clear();
  }

  /**
   * インデックスを完全にクリア
   */
  public clearIndex(): void {
    this.documents.clear();
    this.idfCache.clear();
    this.vocabulary.clear();
  }

  /**
   * 複数のメモを一括でインデックス化
   */
  public indexMemos(memos: MemoData[]): void {
    this.clearIndex();
    memos.forEach(memo => this.indexMemo(memo));
  }

  /**
   * TF-IDFスコアを計算
   */
  private calculateTfIdf(queryTokens: string[], docId: string): TfIdfResult[] {
    const doc = this.documents.get(docId);
    if (!doc) return [];
    
    const results: TfIdfResult[] = [];
    
    for (const token of queryTokens) {
      const tf = doc.tf.get(token) || 0;
      const idf = this.calculateIDF(token);
      const tfidf = tf * idf;
      
      if (tf > 0) {
        results.push({ token, tf, idf, tfidf });
      }
    }
    
    return results;
  }

  /**
   * メイン検索機能（TF-IDF + 日本語形態素解析）
   */
  public search(query: string, memos: MemoData[], options: {
    maxResults?: number;
    minScore?: number;
    includeHidden?: boolean;
  } = {}): SearchResult[] {
    if (!query.trim()) return [];
    
    const { maxResults = 50, minScore = 0.01, includeHidden = false } = options;
    const trimmedQuery = query.trim();
    
    // 非常に短いクエリ（1文字）の場合はファジー検索を使用
    if (trimmedQuery.length === 1) {
      return this.fuzzySearch(query, memos, {
        maxResults,
        threshold: 0.1
      });
    }
    
    // クエリをトークン化
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) {
      // トークン化に失敗した場合はファジー検索にフォールバック
      return this.fuzzySearch(query, memos, {
        maxResults,
        threshold: 0.1
      });
    }
    
    // 検索対象のメモをフィルタリング
    const targetMemos = includeHidden 
      ? memos 
      : memos.filter(memo => memo.visible !== false);
    
    const searchResults: SearchResult[] = [];
    
    for (const memo of targetMemos) {
      // ドキュメントがインデックスされていない場合は一時的にインデックス化
      if (!this.documents.has(memo.id)) {
        this.indexMemo(memo);
      }
      
      // TF-IDFスコアを計算
      const tfidfResults = this.calculateTfIdf(queryTokens, memo.id);
      
      if (tfidfResults.length === 0) continue;
      
      // 総合スコアを計算（TF-IDF値の合計 + クエリカバレッジボーナス）
      const totalScore = tfidfResults.reduce((sum, result) => sum + result.tfidf, 0);
      const coverageBonus = tfidfResults.length / queryTokens.length; // クエリの何割をカバーしているか
      const finalScore = totalScore * (1 + coverageBonus);
      
      if (finalScore >= minScore) {
        // ハイライト対象の語を抽出
        const highlights = tfidfResults
          .sort((a, b) => b.tfidf - a.tfidf)
          .slice(0, 3)
          .map(result => result.token);
        
        searchResults.push({
          id: memo.id,
          memo,
          score: finalScore,
          highlightedTitle: memo.title,
          highlightedText: memo.text || memo.content || '',
          matchedTerms: highlights,
          // highlights
        });
      }
    }
    
    // スコア順でソート
    searchResults.sort((a, b) => b.score - a.score);
    
    return searchResults.slice(0, maxResults);
  }

  /**
   * ファジー検索（部分一致・曖昧一致）
   */
  public fuzzySearch(query: string, memos: MemoData[], options: {
    maxResults?: number;
    threshold?: number;
  } = {}): SearchResult[] {
    const { maxResults = 20, threshold = 0.3 } = options;
    
    if (!query.trim()) return [];
    
    const results: SearchResult[] = [];
    const normalizedQuery = query.toLowerCase();
    
    for (const memo of memos) {
      if (memo.visible === false) continue;
      
      const content = [memo.title, memo.text].filter(Boolean).join(' ').toLowerCase();
      
      // 部分一致スコア
      let score = 0;
      const highlights: string[] = [];
      
      // 完全一致
      if (content.includes(normalizedQuery)) {
        score += 1.0;
        highlights.push(query);
      }
      
      // 語単位での一致（改良版）
      const queryWords = normalizedQuery.split(/\s+/);
      const contentWords = content.split(/\s+/);
      
      for (const queryWord of queryWords) {
        let wordMatched = false;
        for (const contentWord of contentWords) {
          // 部分一致
          if (contentWord.includes(queryWord)) {
            score += 0.5;
            wordMatched = true;
          }
          // エディット距離による近似マッチ
          else if (this.levenshteinDistance(queryWord, contentWord) <= Math.max(1, Math.floor(queryWord.length * 0.3))) {
            score += 0.3;
            wordMatched = true;
          }
        }
        if (wordMatched) {
          // highlights.push(queryWord);
        }
      }
      
      // より低い閾値で実用的な結果を提供
      if (score >= Math.min(threshold, 0.1)) {
        results.push({
          id: memo.id,
          memo,
          score,
          highlightedTitle: memo.title,
          highlightedText: memo.text || memo.content || '',
          matchedTerms: []
        });
      }
    }
    
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  }

  /**
   * レーベンシュタイン距離（エディット距離）を計算
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0]![i] = i;
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j]![0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j]![i] = Math.min(
          matrix[j]![i - 1]! + 1,     // deletion
          matrix[j - 1]![i]! + 1,     // insertion
          matrix[j - 1]![i - 1]! + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length]![str1.length]!;
  }

  /**
   * カテゴリベース検索
   */
  public searchByCategory(category: string, memos: MemoData[]): MemoData[] {
    return memos.filter(memo => 
      memo.visible !== false && 
      memo.category === category
    );
  }

  /**
   * 関連メモ検索（特定のメモと類似のメモを検索）
   */
  public findSimilarMemos(targetMemo: MemoData, memos: MemoData[], maxResults: number = 5): SearchResult[] {
    if (!this.documents.has(targetMemo.id)) {
      this.indexMemo(targetMemo);
    }
    
    const targetDoc = this.documents.get(targetMemo.id)!;
    const results: SearchResult[] = [];
    
    for (const memo of memos) {
      if (memo.id === targetMemo.id || memo.visible === false) continue;
      
      if (!this.documents.has(memo.id)) {
        this.indexMemo(memo);
      }
      
      const doc = this.documents.get(memo.id)!;
      
      // より実用的な類似度計算
      let similarity = 0;
      
      // 1. カテゴリマッチングボーナス
      if (targetMemo.category && memo.category === targetMemo.category) {
        similarity += 0.3;
      }
      
      // 2. タグマッチングボーナス
      const targetTags = new Set(targetMemo.tags || []);
      const memoTags = new Set(memo.tags || []);
      const commonTags = [...targetTags].filter(tag => memoTags.has(tag));
      if (commonTags.length > 0) {
        similarity += 0.2 * (commonTags.length / Math.max(targetTags.size, memoTags.size));
      }
      
      // 3. コサイン類似度計算
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      
      const allTokens = new Set([...targetDoc.tokens, ...doc.tokens]);
      
      for (const token of allTokens) {
        const tfA = targetDoc.tf.get(token) || 0;
        const tfB = doc.tf.get(token) || 0;
        const idf = this.calculateIDF(token);
        
        const tfidfA = tfA * idf;
        const tfidfB = tfB * idf;
        
        dotProduct += tfidfA * tfidfB;
        normA += tfidfA * tfidfA;
        normB += tfidfB * tfidfB;
      }
      
      if (normA > 0 && normB > 0) {
        const cosineSimilarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        similarity += cosineSimilarity * 0.5; // テキスト類似度の重み
      }
      
      // より低い閾値で実用的な結果を提供
      if (similarity > 0.05) {
        results.push({
          id: memo.id,
          memo,
          score: similarity,
          highlightedTitle: memo.title,
          highlightedText: memo.text || memo.content || '',
          matchedTerms: []
        });
      }
    }
    
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  }

  /**
   * 検索統計情報の取得
   */
  public getSearchStats(): {
    totalDocuments: number;
    vocabularySize: number;
    averageDocumentLength: number;
  } {
    const totalTokens = Array.from(this.documents.values())
      .reduce((sum, doc) => sum + doc.length, 0);
    
    return {
      totalDocuments: this.documents.size,
      vocabularySize: this.vocabulary.size,
      averageDocumentLength: this.documents.size > 0 ? totalTokens / this.documents.size : 0
    };
  }
}

// シングルトンインスタンス
export const searchEngine = new SearchEngine();

// 型エクスポート
export type { SearchResult, TfIdfResult };
export { SearchEngine };