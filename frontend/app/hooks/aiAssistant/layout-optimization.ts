// app/hooks/aiAssistant/layout-optimization.ts - Layout Optimization and Spatial Analysis

import { useState, useCallback } from 'react';
import type { LayoutOptimization, AIAnalysis, AIState } from './types';
import type { MemoData } from '../../types/tools';

export const useLayoutOptimization = () => {
  const [state, setState] = useState<Pick<AIState, 'isAnalyzing' | 'analysisProgress'>>({
    isAnalyzing: false,
    analysisProgress: 0
  });

  // カテゴリクラスター配置
  const optimizeClusterLayout = useCallback(async (
    memos: MemoData[],
    analyses: Map<string, AIAnalysis>
  ): Promise<LayoutOptimization> => {
    setState(prev => ({ ...prev, isAnalyzing: true, analysisProgress: 0 }));

    try {
      // カテゴリごとにグループ化
      const categoryGroups = new Map<string, Array<{memo: MemoData; analysis: AIAnalysis}>>();
      
      memos.forEach((memo) => {
        const analysis = analyses.get(memo.id);
        if (analysis) {
          analysis.categories.forEach(category => {
            if (!categoryGroups.has(category)) {
              categoryGroups.set(category, []);
            }
            const group = categoryGroups.get(category);
            if (group) {
              group.push({ memo, analysis });
            }
          });
        }
      });

      // クラスター配置計算
      const memoPositions: LayoutOptimization['memoPositions'] = [];
      let currentX = 100;
      let currentY = 100;

      for (const [category, memoGroup] of categoryGroups) {
        memoGroup.forEach((item, index) => {
          memoPositions.push({
            memoId: item.memo.id,
            x: currentX + (index % 4) * 250,
            y: currentY + Math.floor(index / 4) * 200,
            reasoning: `Grouped by category: ${category}`
          });
        });

        currentX += Math.ceil(memoGroup.length / 4) * 250 + 100;
        if (currentX > 1500) {
          currentX = 100;
          currentY += 600;
        }
      }

      setState(prev => ({ ...prev, isAnalyzing: false, analysisProgress: 100 }));

      return {
        type: 'cluster',
        memoPositions,
        confidence: 0.8,
        estimatedImprovement: 'Improved organization by topic clusters'
      };

    } catch (error) {
      setState(prev => ({ ...prev, isAnalyzing: false, analysisProgress: 0 }));
      throw error;
    }
  }, []);

  // グリッド配置最適化
  const optimizeGridLayout = useCallback(async (
    memos: MemoData[]
  ): Promise<LayoutOptimization> => {
    const cols = Math.ceil(Math.sqrt(memos.length));
    const spacing = 250;
    const startX = 100;
    const startY = 100;

    const memoPositions = memos.map((memo, index) => ({
      memoId: memo.id,
      x: startX + (index % cols) * spacing,
      y: startY + Math.floor(index / cols) * 200,
      reasoning: 'Organized in uniform grid pattern'
    }));

    return {
      type: 'grid',
      memoPositions,
      confidence: 0.6,
      estimatedImprovement: 'Clean, uniform layout for easy scanning'
    };
  }, []);

  // タイムライン配置
  const optimizeTimelineLayout = useCallback(async (
    memos: MemoData[]
  ): Promise<LayoutOptimization> => {
    // メモを作成日時でソート
    const sortedMemos = [...memos].sort((a, b) => 
      new Date(a.created || 0).getTime() - new Date(b.created || 0).getTime()
    );

    const memoPositions = sortedMemos.map((memo, index) => ({
      memoId: memo.id,
      x: 100 + index * 300,
      y: 200 + Math.sin(index * 0.5) * 100, // 波状の配置
      reasoning: 'Arranged chronologically by creation date'
    }));

    return {
      type: 'timeline',
      memoPositions,
      confidence: 0.7,
      estimatedImprovement: 'Chronological organization for temporal relationships'
    };
  }, []);

  // マインドマップ配置
  const optimizeMindMapLayout = useCallback(async (
    memos: MemoData[],
    analyses: Map<string, AIAnalysis>
  ): Promise<LayoutOptimization> => {
    const centerX = 800;
    const centerY = 400;
    const radius = 300;

    // 中心となるメモを選択（最も多くの関連性を持つもの）
    let centralMemo = memos[0];
    let maxConnections = 0;

    for (const memo of memos) {
      const analysis = analyses.get(memo.id);
      if (analysis) {
        const connections = analysis.keywords.length + analysis.categories.length;
        if (connections > maxConnections) {
          maxConnections = connections;
          centralMemo = memo;
        }
      }
    }

    const memoPositions = memos.map((memo, index) => {
      if (centralMemo && memo.id === centralMemo.id) {
        return {
          memoId: memo.id,
          x: centerX,
          y: centerY,
          reasoning: 'Central hub with most connections'
        };
      }

      const angle = (index * 2 * Math.PI) / (memos.length - 1);
      return {
        memoId: memo.id,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        reasoning: 'Radial arrangement around central concept'
      };
    });

    return {
      type: 'mind_map',
      memoPositions,
      confidence: 0.75,
      estimatedImprovement: 'Hierarchical layout showing relationships'
    };
  }, []);

  // レイアウト最適化メイン関数
  const optimizeLayout = useCallback(async (
    memos: MemoData[],
    analyses: Map<string, AIAnalysis>,
    layoutType?: LayoutOptimization['type']
  ): Promise<LayoutOptimization> => {
    if (memos.length === 0) {
      throw new Error('No memos to optimize');
    }

    switch (layoutType) {
      case 'grid':
        return optimizeGridLayout(memos);
      case 'timeline':
        return optimizeTimelineLayout(memos);
      case 'mind_map':
        return optimizeMindMapLayout(memos, analyses);
      case 'cluster':
      default:
        return optimizeClusterLayout(memos, analyses);
    }
  }, [
    optimizeClusterLayout,
    optimizeGridLayout,
    optimizeTimelineLayout,
    optimizeMindMapLayout
  ]);

  // 複数レイアウト提案
  const suggestMultipleLayouts = useCallback(async (
    memos: MemoData[],
    analyses: Map<string, AIAnalysis>
  ): Promise<LayoutOptimization[]> => {
    const layouts = await Promise.all([
      optimizeClusterLayout(memos, analyses),
      optimizeGridLayout(memos),
      optimizeTimelineLayout(memos),
      optimizeMindMapLayout(memos, analyses)
    ]);

    return layouts.sort((a, b) => b.confidence - a.confidence);
  }, [
    optimizeClusterLayout,
    optimizeGridLayout,
    optimizeTimelineLayout,
    optimizeMindMapLayout
  ]);

  return {
    state,
    optimizeLayout,
    optimizeClusterLayout,
    optimizeGridLayout,
    optimizeTimelineLayout,
    optimizeMindMapLayout,
    suggestMultipleLayouts
  };
};