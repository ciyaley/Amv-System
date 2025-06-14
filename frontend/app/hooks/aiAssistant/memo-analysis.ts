// app/hooks/aiAssistant/memo-analysis.ts - Memo Analysis and Suggestions

import { useState, useCallback } from 'react';
import { useTextAnalysis } from './text-analysis';
import type { AIAnalysis, MemoSuggestion, AIState } from './types';
import type { MemoData } from '../../types/tools';

export const useMemoAnalysis = () => {
  const [state, setState] = useState<AIState>({
    isAnalyzing: false,
    analysisProgress: 0,
    lastAnalysis: null,
    processingQueue: [],
    cache: new Map()
  });

  const { performTextAnalysis } = useTextAnalysis();

  // メモ解析
  const analyzeMemo = useCallback(async (memo: MemoData): Promise<AIAnalysis> => {
    // キャッシュチェック
    const cacheKey = `${memo.id}-${memo.updated}`;
    const cached = state.cache.get(cacheKey);
    if (cached) return cached;

    setState(prev => ({ ...prev, isAnalyzing: true, analysisProgress: 0 }));

    try {
      const text = `${memo.title} ${memo.text || memo.content || ''}`;
      const analysis = await performTextAnalysis(text);
      
      // キャッシュに保存
      setState(prev => {
        const newCache = new Map(prev.cache);
        newCache.set(cacheKey, analysis);
        return { 
          ...prev, 
          cache: newCache, 
          isAnalyzing: false,
          analysisProgress: 100,
          lastAnalysis: new Date()
        };
      });

      return analysis;
    } catch (error) {
      setState(prev => ({ ...prev, isAnalyzing: false, analysisProgress: 0 }));
      throw error;
    }
  }, [state.cache, performTextAnalysis]);

  // 関連メモ提案
  const suggestRelatedMemos = useCallback(async (
    targetMemo: MemoData, 
    allMemos: MemoData[]
  ): Promise<MemoSuggestion[]> => {
    const targetAnalysis = await analyzeMemo(targetMemo);
    const suggestions: MemoSuggestion[] = [];

    for (const memo of allMemos) {
      if (memo.id === targetMemo.id) continue;

      const memoAnalysis = await analyzeMemo(memo);
      
      // カテゴリ類似性
      const commonCategories = targetAnalysis.categories.filter(cat => 
        memoAnalysis.categories.includes(cat)
      );

      // キーワード類似性
      const commonKeywords = targetAnalysis.keywords.filter(kw => 
        memoAnalysis.keywords.includes(kw)
      );

      const similarity = (commonCategories.length * 0.6 + commonKeywords.length * 0.4) / 
                        Math.max(targetAnalysis.categories.length + targetAnalysis.keywords.length, 1);

      if (similarity > 0.3) {
        suggestions.push({
          type: 'related',
          title: `Related to "${memo.title}"`,
          description: `Shares ${commonCategories.length} categories and ${commonKeywords.length} keywords`,
          confidence: similarity,
          targetMemoIds: [memo.id],
          suggestedAction: {
            type: 'connect',
            data: {}
          }
        });
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }, [analyzeMemo]);

  // カテゴリ分類提案
  const suggestCategories = useCallback(async (memos: MemoData[]): Promise<MemoSuggestion[]> => {
    const suggestions: MemoSuggestion[] = [];
    const uncategorizedMemos = memos.filter(memo => !memo.category || memo.category === 'Uncategorized');

    for (const memo of uncategorizedMemos) {
      const analysis = await analyzeMemo(memo);
      
      if (analysis.categories.length > 0 && analysis.confidence > 60) {
        suggestions.push({
          type: 'category',
          title: `Categorize "${memo.title}"`,
          description: `Suggested category: ${analysis.categories[0]}`,
          confidence: analysis.confidence / 100,
          targetMemoIds: [memo.id],
          suggestedAction: {
            type: 'categorize',
            data: {
              category: analysis.categories[0]
            }
          }
        });
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }, [analyzeMemo]);

  // メモ統合提案
  const suggestMemoMerge = useCallback(async (memos: MemoData[]): Promise<MemoSuggestion[]> => {
    const suggestions: MemoSuggestion[] = [];
    const analyses = new Map<string, AIAnalysis>();

    // 全メモの分析
    for (const memo of memos) {
      analyses.set(memo.id, await analyzeMemo(memo));
    }

    // 類似メモのペアを検索
    for (let i = 0; i < memos.length; i++) {
      for (let j = i + 1; j < memos.length; j++) {
        const memo1 = memos[i];
        const memo2 = memos[j];
        if (!memo1 || !memo2) continue;
        
        const analysis1 = analyses.get(memo1.id);
        const analysis2 = analyses.get(memo2.id);
        if (!analysis1 || !analysis2) continue;

        // 高い類似性をチェック
        const commonCategories = analysis1.categories.filter(cat => 
          analysis2.categories.includes(cat)
        );
        const commonKeywords = analysis1.keywords.filter(kw => 
          analysis2.keywords.includes(kw)
        );

        const similarity = (commonCategories.length * 0.7 + commonKeywords.length * 0.3) / 
                          Math.max(analysis1.categories.length + analysis1.keywords.length, 1);

        if (similarity > 0.6) {
          suggestions.push({
            type: 'merge',
            title: `Merge "${memo1.title}" and "${memo2.title}"`,
            description: `High similarity detected (${Math.round(similarity * 100)}%)`,
            confidence: similarity,
            targetMemoIds: [memo1.id, memo2.id],
            suggestedAction: {
              type: 'merge',
              data: {
                mergeMemoIds: [memo1.id, memo2.id]
              }
            }
          });
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }, [analyzeMemo]);

  // バッチ解析
  const analyzeBatch = useCallback(async (
    memos: MemoData[], 
    onProgress?: (progress: number) => void
  ): Promise<Map<string, AIAnalysis>> => {
    const results = new Map<string, AIAnalysis>();
    const total = memos.length;

    setState(prev => ({ ...prev, isAnalyzing: true, analysisProgress: 0 }));

    for (let i = 0; i < memos.length; i++) {
      const memo = memos[i];
      if (!memo) continue;
      
      try {
        const analysis = await analyzeMemo(memo);
        results.set(memo.id, analysis);
        
        const progress = Math.round(((i + 1) / total) * 100);
        setState(prev => ({ ...prev, analysisProgress: progress }));
        onProgress?.(progress);
      } catch (error) {
        console.warn(`Failed to analyze memo ${memo.id}:`, error);
      }
    }

    setState(prev => ({ 
      ...prev, 
      isAnalyzing: false, 
      analysisProgress: 100,
      lastAnalysis: new Date()
    }));

    return results;
  }, [analyzeMemo]);

  // キャッシュクリア
  const clearCache = useCallback(() => {
    setState(prev => ({ ...prev, cache: new Map() }));
  }, []);

  return {
    state,
    analyzeMemo,
    suggestRelatedMemos,
    suggestCategories,
    suggestMemoMerge,
    analyzeBatch,
    clearCache
  };
};