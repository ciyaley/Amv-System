/**
 * TF-IDF Vectorizer - Document Vector Space Model
 * High-performance TF-IDF calculation and similarity computation
 */

import type { MemoData } from '../../app/types/tools';
import { TextAnalyzer } from './text-analyzer';

export interface DocumentVector {
  tokens: string[];
  termFrequency: Map<string, number>;
  normalizedTF: Map<string, number>;
  magnitude: number;
}

export interface RelevanceScore {
  total: number;
  factors: {
    titleMatch: number;
    contentMatch: number;
    tagMatch: number;
    tfIdfScore: number;
    recencyBoost: number;
  };
}

export class TFIDFVectorizer {
  private textAnalyzer: TextAnalyzer;
  private documentVectors: Map<string, DocumentVector> = new Map();
  private inverseDocumentFrequency: Map<string, number> = new Map();
  private documentCount: number = 0;

  constructor() {
    this.textAnalyzer = new TextAnalyzer();
  }

  /**
   * 文書インデックスの構築
   */
  public buildIndex(memos: MemoData[]): void {
    this.documentVectors.clear();
    this.inverseDocumentFrequency.clear();
    this.documentCount = memos.length;

    // 各文書のベクトルを作成
    for (const memo of memos) {
      const vector = this.createDocumentVector(memo);
      this.documentVectors.set(memo.id, vector);
    }

    // IDF値を計算
    this.calculateIDF();
  }

  /**
   * 文書ベクトル作成
   */
  private createDocumentVector(memo: MemoData): DocumentVector {
    const text = `${memo.title} ${memo.text || memo.content || ''} ${memo.tags?.join(' ') || ''}`;
    const tokens = this.textAnalyzer.getFilteredTokens(text);
    
    // 用語頻度計算
    const termFrequency = new Map<string, number>();
    for (const token of tokens) {
      termFrequency.set(token, (termFrequency.get(token) || 0) + 1);
    }

    // 正規化TF計算
    const maxFreq = Math.max(...Array.from(termFrequency.values()));
    const normalizedTF = new Map<string, number>();
    
    for (const [term, freq] of termFrequency) {
      normalizedTF.set(term, freq / maxFreq);
    }

    // ベクトルの大きさ計算（後でコサイン類似度に使用）
    let magnitude = 0;
    for (const tf of normalizedTF.values()) {
      magnitude += tf * tf;
    }
    magnitude = Math.sqrt(magnitude);

    return {
      tokens,
      termFrequency,
      normalizedTF,
      magnitude
    };
  }

  /**
   * IDF値の計算
   */
  private calculateIDF(): void {
    const termDocumentCount = new Map<string, number>();

    // 各用語が出現する文書数をカウント
    for (const vector of this.documentVectors.values()) {
      const uniqueTerms = new Set(vector.tokens);
      for (const term of uniqueTerms) {
        termDocumentCount.set(term, (termDocumentCount.get(term) || 0) + 1);
      }
    }

    // IDF値を計算
    for (const [term, docCount] of termDocumentCount) {
      const idf = Math.log(this.documentCount / docCount);
      this.inverseDocumentFrequency.set(term, idf);
    }
  }

  /**
   * クエリベクトル作成
   */
  public createQueryVector(queryTokens: string[]): Map<string, number> {
    const queryTF = new Map<string, number>();
    
    for (const token of queryTokens) {
      queryTF.set(token, (queryTF.get(token) || 0) + 1);
    }

    // 正規化
    const maxFreq = Math.max(...Array.from(queryTF.values()), 1);
    const normalizedQuery = new Map<string, number>();
    
    for (const [term, freq] of queryTF) {
      normalizedQuery.set(term, freq / maxFreq);
    }

    return normalizedQuery;
  }

  /**
   * TF-IDFスコア計算
   */
  public calculateTFIDFScore(term: string, documentVector: DocumentVector): number {
    const tf = documentVector.normalizedTF.get(term) || 0;
    const idf = this.inverseDocumentFrequency.get(term) || 0;
    return tf * idf;
  }

  /**
   * コサイン類似度計算
   */
  public calculateCosineSimilarity(vector1: DocumentVector, vector2: DocumentVector): number {
    if (vector1.magnitude === 0 || vector2.magnitude === 0) return 0;

    let dotProduct = 0;
    
    for (const [term, tf1] of vector1.normalizedTF) {
      const tf2 = vector2.normalizedTF.get(term) || 0;
      dotProduct += tf1 * tf2;
    }

    return dotProduct / (vector1.magnitude * vector2.magnitude);
  }

  /**
   * 関連度スコア計算
   */
  public calculateRelevanceScore(
    memo: MemoData, 
    queryTokens: string[], 
    queryVector: Map<string, number>, 
    documentVector: DocumentVector
  ): RelevanceScore {
    const titleTokens = this.textAnalyzer.getFilteredTokens(memo.title);
    const contentTokens = this.textAnalyzer.getFilteredTokens(memo.text || memo.content || '');
    const tagTokens = memo.tags?.flatMap(tag => this.textAnalyzer.getFilteredTokens(tag)) || [];

    // タイトルマッチ（重要度高）
    const titleMatch = this.calculateFieldMatch(queryTokens, titleTokens) * 3.0;

    // コンテンツマッチ
    const contentMatch = this.calculateFieldMatch(queryTokens, contentTokens) * 1.0;

    // タグマッチ（完全一致重視）
    const tagMatch = this.calculateFieldMatch(queryTokens, tagTokens) * 2.0;

    // TF-IDFスコア
    let tfIdfScore = 0;
    for (const term of queryTokens) {
      const queryWeight = queryVector.get(term) || 0;
      const docWeight = this.calculateTFIDFScore(term, documentVector);
      tfIdfScore += queryWeight * docWeight;
    }

    // 新しさによるブースト
    const recencyBoost = this.calculateRecencyBoost(memo);

    const totalScore = titleMatch + contentMatch + tagMatch + tfIdfScore + recencyBoost;

    return {
      total: totalScore,
      factors: {
        titleMatch,
        contentMatch,
        tagMatch,
        tfIdfScore,
        recencyBoost
      }
    };
  }

  /**
   * フィールドマッチ計算
   */
  private calculateFieldMatch(queryTokens: string[], fieldTokens: string[]): number {
    if (fieldTokens.length === 0) return 0;

    const fieldSet = new Set(fieldTokens);
    let matches = 0;
    
    for (const token of queryTokens) {
      if (fieldSet.has(token)) {
        matches++;
      }
    }

    return matches / queryTokens.length;
  }

  /**
   * 新しさブースト計算
   */
  private calculateRecencyBoost(memo: MemoData): number {
    if (!memo.updatedAt) return 0;

    const now = new Date();
    const updated = new Date(memo.updatedAt);
    const daysDiff = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);

    // 30日以内は徐々にブースト、それ以降は0
    if (daysDiff <= 30) {
      return (30 - daysDiff) / 30 * 0.1;
    }

    return 0;
  }

  /**
   * 類似文書検索（More Like This）
   */
  public findSimilarDocuments(
    targetId: string, 
    threshold: number = 0.1
  ): Array<{ id: string; similarity: number }> {
    const targetVector = this.documentVectors.get(targetId);
    if (!targetVector) return [];

    const similarities: Array<{ id: string; similarity: number }> = [];

    for (const [id, vector] of this.documentVectors) {
      if (id === targetId) continue;

      const similarity = this.calculateCosineSimilarity(targetVector, vector);
      if (similarity > threshold) {
        similarities.push({ id, similarity });
      }
    }

    return similarities.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * 用語の重要度計算
   */
  public getTermImportance(term: string, documentId: string): number {
    const vector = this.documentVectors.get(documentId);
    if (!vector) return 0;

    return this.calculateTFIDFScore(term, vector);
  }

  /**
   * 文書内の重要用語取得
   */
  public getImportantTerms(
    documentId: string, 
    limit: number = 10
  ): Array<{ term: string; score: number }> {
    const vector = this.documentVectors.get(documentId);
    if (!vector) return [];

    const termScores: Array<{ term: string; score: number }> = [];

    for (const term of vector.tokens) {
      const score = this.calculateTFIDFScore(term, vector);
      termScores.push({ term, score });
    }

    return termScores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * インデックス統計情報
   */
  public getIndexStats(): {
    documentCount: number;
    vocabularySize: number;
    averageDocumentLength: number;
  } {
    const totalTokens = Array.from(this.documentVectors.values())
      .reduce((sum, vector) => sum + vector.tokens.length, 0);

    return {
      documentCount: this.documentCount,
      vocabularySize: this.inverseDocumentFrequency.size,
      averageDocumentLength: this.documentCount > 0 ? totalTokens / this.documentCount : 0
    };
  }

  /**
   * 文書ベクトル取得
   */
  public getDocumentVector(documentId: string): DocumentVector | undefined {
    return this.documentVectors.get(documentId);
  }

  /**
   * IDF値取得
   */
  public getIDF(term: string): number {
    return this.inverseDocumentFrequency.get(term) || 0;
  }

  /**
   * インデックスクリア
   */
  public clearIndex(): void {
    this.documentVectors.clear();
    this.inverseDocumentFrequency.clear();
    this.documentCount = 0;
  }
}