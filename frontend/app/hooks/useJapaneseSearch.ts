// app/hooks/useJapaneseSearch.ts
/**
 * 日本語特化検索フック - TinySegmenter + TF-IDF実装
 * 要件: RDv1.1.3準拠の日本語検索機能
 */

import { useState, useCallback, useMemo } from 'react';
import TinySegmenter from 'tiny-segmenter';
import type { MemoData } from '../types/tools';

interface JapaneseSearchResult {
  memo: MemoData;
  score: number;
  matchedTerms: string[];
  highlights: string[];
}

interface JapaneseSearchOptions {
  minScore?: number;
  maxResults?: number;
  includeContent?: boolean;
  includeTitle?: boolean;
}

// 日本語ストップワード（検索の邪魔になる語）
const JAPANESE_STOP_WORDS = new Set([
  'の', 'に', 'は', 'を', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ', 'ある', 'いる', 'する',
  'です', 'ます', 'だ', 'である', 'た', 'な', 'ない', 'なる', 'この', 'その', 'あの',
  'どの', 'これ', 'それ', 'あれ', 'どれ', 'ここ', 'そこ', 'あそこ', 'どこ', 'こう',
  'そう', 'ああ', 'どう', 'から', 'まで', 'より', 'へ', 'など', 'として', 'について'
]);

export const useJapaneseSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // TinySegmenterインスタンス
  const segmenter = useMemo(() => new TinySegmenter(), []);

  /**
   * テキストを形態素解析して検索用トークンに分割
   */
  const tokenize = useCallback((text: string): string[] => {
    if (!text?.trim()) return [];
    
    const tokens = segmenter.segment(text.toLowerCase())
      .filter((token: string) => 
        token.trim().length > 0 && 
        !JAPANESE_STOP_WORDS.has(token) &&
        !/^[0-9\s\p{P}]+$/u.test(token) // 数字と記号のみの語を除外
      );
    
    return tokens;
  }, [segmenter]);

  /**
   * TF-IDF計算によるスコアリング
   */
  const calculateTFIDF = useCallback((
    queryTokens: string[],
    documentTokens: string[],
    allDocuments: string[][]
  ): number => {
    if (queryTokens.length === 0 || documentTokens.length === 0) return 0;

    let totalScore = 0;
    const docLength = documentTokens.length;

    for (const queryToken of queryTokens) {
      // TF (Term Frequency) - 文書内での語の出現頻度
      const tf = documentTokens.filter(token => token === queryToken).length / docLength;
      
      if (tf === 0) continue;

      // IDF (Inverse Document Frequency) - 語の希少性
      const docsContainingTerm = allDocuments.filter(doc => 
        doc.includes(queryToken)
      ).length;
      
      const idf = docsContainingTerm > 0 
        ? Math.log(allDocuments.length / docsContainingTerm)
        : 0;

      // TF-IDFスコア
      totalScore += tf * idf;
    }

    return totalScore;
  }, []);

  /**
   * 日本語検索実行
   */
  const search = useCallback(async (
    query: string,
    memos: MemoData[],
    options: JapaneseSearchOptions = {}
  ): Promise<JapaneseSearchResult[]> => {
    const {
      minScore = 0.01,
      maxResults = 50,
      includeContent = true,
      includeTitle = true
    } = options;

    setIsSearching(true);

    try {
      // クエリをトークン化
      const queryTokens = tokenize(query);
      if (queryTokens.length === 0) {
        return [];
      }

      // 検索履歴に追加
      setSearchHistory(prev => {
        const newHistory = [query, ...prev.filter(h => h !== query)];
        return newHistory.slice(0, 10); // 最新10件まで保持
      });

      // 全文書のトークン化
      const allDocuments = memos.map(memo => {
        const searchText = [
          includeTitle ? memo.title : '',
          includeContent ? (memo.content || memo.text || '') : ''
        ].filter(Boolean).join(' ');
        
        return tokenize(searchText);
      });

      // 各メモでスコア計算
      const results: JapaneseSearchResult[] = [];

      for (let i = 0; i < memos.length; i++) {
        const memo = memos[i];
        if (!memo) continue;
        
        const documentTokens = allDocuments[i];
        
        // TF-IDFスコア計算
        const tfidfScore = documentTokens ? calculateTFIDF(queryTokens, documentTokens, allDocuments) : 0;
        
        // 完全一致ボーナス
        const exactMatchBonus = queryTokens.some(token => 
          memo.title.toLowerCase().includes(token) ||
          (memo.content || memo.text || '').toLowerCase().includes(token)
        ) ? 0.5 : 0;

        // タイトル一致ボーナス
        const titleBonus = queryTokens.some(token =>
          memo.title.toLowerCase().includes(token)
        ) ? 1.0 : 0;

        const finalScore = tfidfScore + exactMatchBonus + titleBonus;

        if (finalScore >= minScore) {
          // マッチした語句を特定
          const matchedTerms = documentTokens 
            ? queryTokens.filter(token => documentTokens.includes(token))
            : [];

          // ハイライト用の語句抽出
          const highlights = queryTokens.filter(token => {
            const searchText = `${memo.title} ${memo.content || memo.text || ''}`;
            return searchText.toLowerCase().includes(token);
          });

          results.push({
            memo,
            score: finalScore,
            matchedTerms,
            highlights
          });
        }
      }

      // スコア順にソートして結果数制限
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);

    } finally {
      setIsSearching(false);
    }
  }, [tokenize, calculateTFIDF]);

  /**
   * 検索サジェスション生成
   */
  const getSuggestions = useCallback((
    query: string,
    memos: MemoData[]
  ): string[] => {
    if (!query.trim()) return searchHistory;

    // メモのタイトルから類似する語句を抽出
    const suggestions = new Set<string>();
    const queryLower = query.toLowerCase();

    memos.forEach(memo => {
      // タイトルから候補抽出
      const titleTokens = tokenize(memo.title);
      titleTokens.forEach(token => {
        if (token.includes(queryLower) && token !== queryLower) {
          suggestions.add(token);
        }
      });

      // 完全一致も候補に
      if (memo.title.toLowerCase().includes(queryLower)) {
        suggestions.add(memo.title);
      }
    });

    return [...suggestions].slice(0, 5);
  }, [tokenize, searchHistory]);

  return {
    search,
    getSuggestions,
    tokenize,
    isSearching,
    searchHistory,
    clearHistory: () => setSearchHistory([])
  };
};