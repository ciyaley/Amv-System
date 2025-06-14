/**
 * Text Analyzer - TinySegmenter Integration
 * Japanese and English text tokenization and preprocessing
 */

import TinySegmenter from 'tiny-segmenter';

export interface TokenAnalysis {
  tokens: string[];
  stopWords: string[];
  filteredTokens: string[];
  wordCount: number;
}

export class TextAnalyzer {
  private segmenter: TinySegmenter;
  private stopWords: Set<string> = new Set();

  constructor() {
    this.segmenter = new TinySegmenter();
    this.initializeStopWords();
  }

  private initializeStopWords(): void {
    this.stopWords = new Set([
      // 日本語ストップワード
      'の', 'に', 'は', 'を', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ', 'ある', 'いる', 'する', 
      'です', 'ます', 'だ', 'である', 'た', 'な', 'ない', 'なる', 'この', 'その', 'あの', 
      'どの', 'これ', 'それ', 'あれ', 'どれ', 'ここ', 'そこ', 'あそこ', 'どこ', 'こう', 
      'そう', 'ああ', 'どう', 'から', 'まで', 'より', 'へ', 'など', 'として', 'について',
      'において', 'とは', 'では', 'には', 'への', 'から', 'まで', 'こと', 'もの', 'ため',
      
      // 英語ストップワード
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 
      'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with', 'would',
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not',
      'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from',
      'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would',
      'there', 'their'
    ]);
  }

  /**
   * テキストをトークンに分割
   */
  public tokenize(text: string): string[] {
    if (!text) return [];

    // 日本語・英語混在テキストの処理
    const segments = this.segmenter.segment(text);
    
    return segments
      .map((token: string) => token.trim())
      .filter((token: string) => {
        if (!token || token.length === 0) return false;
        
        // 特殊文字・記号のフィルタリング
        if (/^[\s\p{P}\p{S}]+$/u.test(token)) return false;
        
        // 1文字の数字や記号を除外
        if (token.length === 1 && /[\d\p{P}\p{S}]/u.test(token)) return false;
        
        return true;
      })
      .map((token: string) => token.toLowerCase());
  }

  /**
   * ストップワードを除去したトークン取得
   */
  public getFilteredTokens(text: string): string[] {
    const tokens = this.tokenize(text);
    return tokens.filter(token => !this.stopWords.has(token));
  }

  /**
   * 詳細なテキスト分析
   */
  public analyzeText(text: string): TokenAnalysis {
    const tokens = this.tokenize(text);
    const stopWordsFound = tokens.filter(token => this.stopWords.has(token));
    const filteredTokens = tokens.filter(token => !this.stopWords.has(token));

    return {
      tokens,
      stopWords: stopWordsFound,
      filteredTokens,
      wordCount: filteredTokens.length
    };
  }

  /**
   * 単語の正規化
   */
  public normalizeToken(token: string): string {
    return token
      .toLowerCase()
      .trim()
      .replace(/[^\w\p{L}\p{N}]/gu, ''); // Unicode文字クラスを使用
  }

  /**
   * N-gramの生成（バイグラム、トライグラム対応）
   */
  public generateNGrams(tokens: string[], n: number = 2): string[] {
    if (tokens.length < n) return [];
    
    const ngrams: string[] = [];
    for (let i = 0; i <= tokens.length - n; i++) {
      const ngram = tokens.slice(i, i + n).join(' ');
      ngrams.push(ngram);
    }
    
    return ngrams;
  }

  /**
   * テキスト類似度の基本計算（Jaccard Index）
   */
  public calculateJaccardSimilarity(tokens1: string[], tokens2: string[]): number {
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * 言語検出（簡易版）
   */
  public detectLanguage(text: string): 'japanese' | 'english' | 'mixed' {
    const japaneseChars = (text.match(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/gu) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    const totalChars = japaneseChars + englishChars;
    
    if (totalChars === 0) return 'mixed';
    
    const japaneseRatio = japaneseChars / totalChars;
    
    if (japaneseRatio > 0.7) return 'japanese';
    if (japaneseRatio < 0.3) return 'english';
    return 'mixed';
  }

  /**
   * 用語抽出（頻出語の特定）
   */
  public extractKeyTerms(text: string, maxTerms: number = 10): Array<{ term: string; frequency: number }> {
    const tokens = this.getFilteredTokens(text);
    const termFreq = new Map<string, number>();
    
    for (const token of tokens) {
      if (token.length > 1) { // 1文字の単語を除外
        termFreq.set(token, (termFreq.get(token) || 0) + 1);
      }
    }
    
    return Array.from(termFreq.entries())
      .map(([term, frequency]) => ({ term, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, maxTerms);
  }

  /**
   * ストップワードの追加
   */
  public addStopWords(words: string[]): void {
    words.forEach(word => this.stopWords.add(word.toLowerCase()));
  }

  /**
   * ストップワードの削除
   */
  public removeStopWords(words: string[]): void {
    words.forEach(word => this.stopWords.delete(word.toLowerCase()));
  }

  /**
   * 現在のストップワードリストを取得
   */
  public getStopWords(): string[] {
    return Array.from(this.stopWords);
  }
}