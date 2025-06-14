// app/hooks/aiAssistant/index.ts - AI Assistant Main Hook

import { useMemo } from 'react';
import { useLayoutOptimization } from './layout-optimization';
import { useMemoAnalysis } from './memo-analysis';
import type { AIAnalysis, MemoSuggestion, LayoutOptimization } from './types';
import type { MemoData } from '../../types/tools';

export const useAIAssistant = () => {
  const memoAnalysis = useMemoAnalysis();
  const layoutOptimization = useLayoutOptimization();

  // 類似度計算
  const calculateSimilarity = (analysis1: AIAnalysis, analysis2: AIAnalysis): number => {
    const commonCategories = analysis1.categories.filter(cat => 
      analysis2.categories.includes(cat)
    ).length;

    const commonKeywords = analysis1.keywords.filter(kw => 
      analysis2.keywords.includes(kw)
    ).length;

    const totalCategories = new Set([...analysis1.categories, ...analysis2.categories]).size;
    const totalKeywords = new Set([...analysis1.keywords, ...analysis2.keywords]).size;

    const categorySimilarity = totalCategories > 0 ? commonCategories / totalCategories : 0;
    const keywordSimilarity = totalKeywords > 0 ? commonKeywords / totalKeywords : 0;

    return (categorySimilarity * 0.4 + keywordSimilarity * 0.6);
  };

  // レガシー互換のためのメソッド統合
  const optimizeLayout = async (memos: MemoData[]): Promise<LayoutOptimization> => {
    const analyses = await memoAnalysis.analyzeBatch(memos);
    return layoutOptimization.optimizeLayout(memos, analyses, 'cluster');
  };

  const analyzeAllMemos = async (memos: MemoData[]): Promise<Map<string, AIAnalysis>> => {
    return memoAnalysis.analyzeBatch(memos);
  };

  // 統合されたステート
  const state = useMemo(() => ({
    ...memoAnalysis.state,
    isAnalyzing: memoAnalysis.state.isAnalyzing || layoutOptimization.state.isAnalyzing,
    analysisProgress: Math.max(
      memoAnalysis.state.analysisProgress, 
      layoutOptimization.state.analysisProgress
    )
  }), [memoAnalysis.state, layoutOptimization.state]);

  // 統合されたAPI
  return {
    // State
    ...state,
    suggestions: [] as MemoSuggestion[],
    layoutOptimizations: [] as LayoutOptimization[],

    // Analysis
    analyzeMemo: memoAnalysis.analyzeMemo,
    analyzeAllMemos,
    
    // Suggestions
    suggestRelatedMemos: memoAnalysis.suggestRelatedMemos,
    suggestMerge: memoAnalysis.suggestMemoMerge,
    optimizeLayout,

    // Layout Optimization
    optimizeClusterLayout: layoutOptimization.optimizeClusterLayout,
    optimizeGridLayout: layoutOptimization.optimizeGridLayout,
    optimizeTimelineLayout: layoutOptimization.optimizeTimelineLayout,
    optimizeMindMapLayout: layoutOptimization.optimizeMindMapLayout,
    suggestMultipleLayouts: layoutOptimization.suggestMultipleLayouts,

    // Category and Analysis
    suggestCategories: memoAnalysis.suggestCategories,

    // Utils
    calculateSimilarity,
    isReady: !state.isAnalyzing && state.cache.size > 0,
    cacheSize: state.cache.size,
    clearCache: memoAnalysis.clearCache
  };
};

// Export types for external use
export type * from './types';

// Export individual hooks for advanced usage
export { useMemoAnalysis } from './memo-analysis';
export { useLayoutOptimization } from './layout-optimization';
export { useTextAnalysis } from './text-analysis';