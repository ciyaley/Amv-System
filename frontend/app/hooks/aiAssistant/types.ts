// app/hooks/aiAssistant/types.ts - AI Assistant Type Definitions

import type { MemoData } from '../../types/tools';

export interface AIAnalysis {
  categories: string[];
  keywords: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  language: 'ja' | 'en' | 'mixed';
  topics: Array<{
    name: string;
    relevance: number;
  }>;
}

export interface MemoSuggestion {
  type: 'related' | 'category' | 'layout' | 'merge' | 'split';
  title: string;
  description: string;
  confidence: number;
  targetMemoIds: string[];
  suggestedAction: SuggestedAction;
}

export interface SuggestedAction {
  type: 'move' | 'merge' | 'categorize' | 'connect' | 'split';
  data: {
    position?: { x: number; y: number };
    category?: string;
    mergeMemoIds?: string[];
    splitPoints?: number[];
  };
}

export interface LayoutOptimization {
  type: 'grid' | 'cluster' | 'timeline' | 'mind_map';
  memoPositions: Array<{
    memoId: string;
    x: number;
    y: number;
    reasoning: string;
  }>;
  confidence: number;
  estimatedImprovement: string;
}

export interface AIState {
  isAnalyzing: boolean;
  analysisProgress: number;
  lastAnalysis: Date | null;
  processingQueue: string[];
  cache: Map<string, AIAnalysis>;
}

export interface CategoryRule {
  name: string;
  keywords: string[];
  weight: number;
}

export interface TextAnalysisOptions {
  language?: 'ja' | 'en' | 'auto';
  includeKeywords?: boolean;
  includeSentiment?: boolean;
  includeTopics?: boolean;
}

export interface AIAssistantReturnType {
  // State
  isAnalyzing: boolean;
  analysisProgress: number;
  lastAnalysis: Date | null;
  suggestions: MemoSuggestion[];
  cacheSize: number;
  
  // Analysis functions
  analyzeMemo: (memo: MemoData) => Promise<AIAnalysis>;
  analyzeAllMemos: (memos: MemoData[]) => Promise<Map<string, AIAnalysis>>;
  
  // Suggestions
  suggestRelatedMemos: (memoId: string, memos: MemoData[]) => MemoSuggestion[];
  suggestMerge: (memoIds: string[], memos: MemoData[]) => MemoSuggestion | null;
  optimizeLayout: (memos: MemoData[]) => LayoutOptimization;
  
  // Layout optimization
  optimizeClusterLayout: (memos: MemoData[]) => LayoutOptimization;
  optimizeGridLayout: (memos: MemoData[]) => LayoutOptimization;
  optimizeTimelineLayout: (memos: MemoData[]) => LayoutOptimization;
  optimizeMindMapLayout: (memos: MemoData[]) => LayoutOptimization;
  suggestMultipleLayouts: (memos: MemoData[]) => LayoutOptimization[];
  
  // Category and analysis
  suggestCategories: (memos: MemoData[]) => Array<{ name: string; confidence: number }>;
  
  // Utils
  calculateSimilarity: (analysis1: AIAnalysis, analysis2: AIAnalysis) => number;
  isReady: boolean;
  clearCache: () => void;
}