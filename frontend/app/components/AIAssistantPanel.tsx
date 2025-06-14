/**
 * AI Assistant Panel Component  
 * Machine learning powered memo analysis and suggestions
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { X, Brain, Lightbulb, TrendingUp, Search, Zap, Loader } from 'lucide-react';
import type { AIAssistantReturnType, AIAnalysis, MemoSuggestion, LayoutOptimization } from '../hooks/aiAssistant/types';
import type { MemoData } from '../types/tools';

interface AIAssistantPanelProps {
  isVisible: boolean;
  onClose: () => void;
  aiAssistant: AIAssistantReturnType;
  memos: MemoData[];
  selectedMemoId?: string;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  isVisible,
  onClose,
  aiAssistant,
  memos,
  selectedMemoId
}) => {
  const [activeTab, setActiveTab] = useState<'analyze' | 'suggestions' | 'layout'>('analyze');
  const [currentAnalysis, setCurrentAnalysis] = useState<AIAnalysis | null>(null);
  const [relatedMemos, setRelatedMemos] = useState<MemoSuggestion[]>([]);
  const [layoutOptimization, setLayoutOptimization] = useState<LayoutOptimization | null>(null);

  const {
    isAnalyzing,
    analysisProgress,
    suggestions,
    cacheSize,
    analyzeMemo,
    suggestRelatedMemos,
    optimizeLayout,
    clearCache
  } = aiAssistant;

  const handleAnalyzeMemo = useCallback(async (memo: MemoData) => {
    try {
      const analysis = await analyzeMemo(memo);
      setCurrentAnalysis(analysis);
      
      // Get related memos
      const related = await suggestRelatedMemos(memo.id, memos);
      setRelatedMemos(related);
    } catch {
      // Error handled silently - analysis is optional
    }
  }, [analyzeMemo, suggestRelatedMemos, memos]);

  // Analyze selected memo
  useEffect(() => {
    if (selectedMemoId && isVisible) {
      const selectedMemo = memos.find(m => m.id === selectedMemoId);
      if (selectedMemo) {
        handleAnalyzeMemo(selectedMemo);
      }
    }
  }, [selectedMemoId, isVisible, memos, handleAnalyzeMemo]);

  const handleOptimizeLayout = async () => {
    try {
      const optimization = await optimizeLayout(memos);
      setLayoutOptimization(optimization);
    } catch {
      // Error handled silently - analysis is optional
    }
  };

  if (!isVisible) return null;

  const selectedMemo = selectedMemoId ? memos.find(m => m.id === selectedMemoId) : null;

  return (
    <div className="fixed top-20 left-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold">AI Assistant</h3>
          {isAnalyzing && (
            <Loader className="w-4 h-4 animate-spin text-purple-500" />
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Bar */}
      {isAnalyzing && (
        <div className="px-4 py-2 border-b border-gray-200">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-purple-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Analyzing... {Math.round(analysisProgress)}%
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('analyze')}
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === 'analyze' 
              ? 'border-b-2 border-purple-500 text-purple-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Analyze
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === 'suggestions' 
              ? 'border-b-2 border-purple-500 text-purple-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Suggestions
        </button>
        <button
          onClick={() => setActiveTab('layout')}
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === 'layout' 
              ? 'border-b-2 border-purple-500 text-purple-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Layout
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'analyze' && (
          <div className="p-4 space-y-4">
            {selectedMemo ? (
              <>
                <div className="text-sm">
                  <div className="font-medium text-gray-900 mb-2">
                    &ldquo;{selectedMemo.title}&rdquo;
                  </div>
                  <button
                    onClick={() => handleAnalyzeMemo(selectedMemo)}
                    disabled={isAnalyzing}
                    className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 disabled:opacity-50"
                  >
                    Re-analyze
                  </button>
                </div>

                {currentAnalysis && (
                  <div className="space-y-3">
                    {/* Language Detection */}
                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-1">Language</div>
                      <div className="text-sm capitalize">{currentAnalysis.language}</div>
                    </div>

                    {/* Categories */}
                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-1">Categories</div>
                      <div className="flex flex-wrap gap-1">
                        {currentAnalysis.categories.map((cat: string) => (
                          <span key={cat} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Keywords */}
                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-1">Keywords</div>
                      <div className="flex flex-wrap gap-1">
                        {currentAnalysis.keywords.slice(0, 6).map((keyword: string) => (
                          <span key={keyword} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Sentiment */}
                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-1">Sentiment</div>
                      <div className={`text-sm capitalize ${
                        currentAnalysis.sentiment === 'positive' ? 'text-green-600' :
                        currentAnalysis.sentiment === 'negative' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {currentAnalysis.sentiment}
                      </div>
                    </div>

                    {/* Topics */}
                    {currentAnalysis.topics.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-700 mb-1">Topics</div>
                        <div className="space-y-1">
                          {currentAnalysis.topics.map((topic, index: number) => (
                            <div key={index} className="flex justify-between text-xs">
                              <span>{topic.name}</span>
                              <span className="text-gray-500">{Math.round(topic.relevance * 100)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Confidence */}
                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-1">Confidence</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${currentAnalysis.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">
                          {Math.round(currentAnalysis.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Related Memos */}
                {relatedMemos.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Search className="w-3 h-3" />
                      Related Memos
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {relatedMemos.map((suggestion) => (
                        <div key={suggestion.targetMemoIds[0]} className="text-xs p-2 bg-gray-50 rounded">
                          <div className="font-medium">{suggestion.title}</div>
                          <div className="text-gray-600">{suggestion.description}</div>
                          <div className="text-purple-600">
                            {Math.round(suggestion.confidence * 100)}% match
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500">
                Select a memo to analyze with AI
              </div>
            )}
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-1">
                <Lightbulb className="w-4 h-4" />
                AI Suggestions
              </h4>
            </div>

            {suggestions.length > 0 ? (
              <div className="space-y-3">
                {suggestions.map((suggestion, index: number) => (
                  <div key={index} className="p-3 bg-gray-50 rounded text-sm">
                    <div className="font-medium">{suggestion.title}</div>
                    <div className="text-gray-600 text-xs mt-1">{suggestion.description}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-purple-600">
                        {Math.round(suggestion.confidence * 100)}% confidence
                      </span>
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        {suggestion.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                No suggestions available. Analyze some memos first.
              </div>
            )}
          </div>
        )}

        {activeTab === 'layout' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Layout Optimization
              </h4>
              <button
                onClick={handleOptimizeLayout}
                disabled={isAnalyzing || memos.length === 0}
                className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 disabled:opacity-50 flex items-center gap-1"
              >
                <Zap className="w-3 h-3" />
                Optimize
              </button>
            </div>

            {layoutOptimization ? (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded text-sm">
                  <div className="font-medium">Layout Strategy: {layoutOptimization.type}</div>
                  <div className="text-gray-600 text-xs mt-1">
                    {layoutOptimization.estimatedImprovement}
                  </div>
                  <div className="text-purple-600 text-xs mt-1">
                    Confidence: {Math.round(layoutOptimization.confidence * 100)}%
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-gray-700 mb-2">
                    Memo Positioning ({layoutOptimization.memoPositions.length} memos)
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {layoutOptimization.memoPositions.slice(0, 5).map((pos, index: number) => {
                      const memo = memos.find(m => m.id === pos.memoId);
                      return (
                        <div key={index} className="text-xs p-2 bg-white border rounded">
                          <div className="font-medium">{memo?.title || pos.memoId}</div>
                          <div className="text-gray-600">
                            ({pos.x}, {pos.y}) - {pos.reasoning}
                          </div>
                        </div>
                      );
                    })}
                    {layoutOptimization.memoPositions.length > 5 && (
                      <div className="text-xs text-gray-500 text-center">
                        ... and {layoutOptimization.memoPositions.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                Click &ldquo;Optimize&rdquo; to get AI-powered layout suggestions for your memos.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Cache: {cacheSize} analyses</span>
          <button
            onClick={clearCache}
            className="text-purple-600 hover:text-purple-800"
          >
            Clear Cache
          </button>
        </div>
      </div>
    </div>
  );
};