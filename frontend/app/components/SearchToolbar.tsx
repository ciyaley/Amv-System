// app/components/SearchToolbar.tsx
/**
 * 🟢 GREEN PHASE - Search Toolbar Component
 * 
 * メインワークスペース用の高度検索ツールバー
 */

"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { AdvancedSearchEngine } from '../../utils/advancedSearchEngine';
import { useMemos } from '../hooks/useMemos';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import type { MemoData } from '../types/tools';

interface SearchOptions {
  filters?: {
    category?: string;
    importance?: string;
    dateRange?: { start: Date; end: Date };
  };
  limit?: number;
}

interface SearchToolbarProps {
  onSearchResults: (results: MemoData[]) => void;
  placeholder?: string;
  className?: string;
}

export function SearchToolbar({ 
  onSearchResults, 
  placeholder = "メモを検索...",
  className = ""
}: SearchToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Array<{ memo: MemoData; score: number; highlights: string[]; relevanceFactors: { titleMatch: number; contentMatch: number; categoryMatch: number; dateRelevance: number; } }>>([]);
  
  const { memos } = useMemos();
  const { trackSearchPerformance } = usePerformanceMonitor(true);
  
  // Initialize search engine
  const searchEngine = useMemo(() => new AdvancedSearchEngine(), []);
  
  // Build index when memos change
  useEffect(() => {
    if (memos.length > 0) {
      searchEngine.buildIndex(memos);
    }
  }, [memos, searchEngine]);

  /**
   * 検索実行
   */
  const handleSearch = useCallback(async (searchQuery: string, options: SearchOptions = {}) => {
    if (!searchQuery.trim()) {
      setResults([]);
      onSearchResults([]);
      return;
    }

    setIsSearching(true);
    const startTime = performance.now();
    
    try {
      const searchResults = searchEngine.search(searchQuery, memos, options.filters, options.limit);
      const searchTime = performance.now() - startTime;
      
      // Track performance
      trackSearchPerformance(searchTime);
      
      setResults(searchResults);
      
      // Convert to MemoData format
      const memoResults = searchResults.map(result => result.memo);
      onSearchResults(memoResults);
    } catch {
      setResults([]);
      onSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchEngine, memos, trackSearchPerformance, onSearchResults]);


  /**
   * 検索クリア
   */
  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    onSearchResults([]);
  }, [onSearchResults]);

  /**
   * 簡易検索バー（収納時）
   */
  if (!isExpanded) {
    return (
      <div className={`flex items-center bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm ${className}`}>
        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 mr-2" />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.length > 2) {
              handleSearch(e.target.value);
            } else if (e.target.value === '') {
              handleClear();
            }
          }}
          onFocus={() => setIsExpanded(true)}
          className="flex-1 outline-none text-sm placeholder-gray-500"
        />
        
        {query && (
          <button
            onClick={handleClear}
            className="ml-2 p-1 hover:bg-gray-100 rounded"
          >
            <XMarkIcon className="h-4 w-4 text-gray-400" />
          </button>
        )}
        
        <button
          onClick={() => setIsExpanded(true)}
          className="ml-2 p-1 hover:bg-gray-100 rounded"
          title="高度検索"
        >
          <AdjustmentsHorizontalIcon className="h-4 w-4 text-gray-600" />
        </button>
      </div>
    );
  }

  /**
   * 拡張検索インターフェース
   */
  return (
    <div className={`bg-white border border-gray-300 rounded-lg shadow-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">高度検索</h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <XMarkIcon className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Advanced Search Input */}
      <div className="space-y-4">
        <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg px-3 py-2">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.length > 2) {
                handleSearch(e.target.value);
              } else if (e.target.value === '') {
                handleClear();
              }
            }}
            className="flex-1 outline-none text-sm placeholder-gray-500 bg-transparent"
          />
          {isSearching && (
            <div className="ml-2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        
        {/* Search Options */}
        <div className="flex gap-2 text-xs">
          <span className="text-gray-500">Search in:</span>
          <label className="flex items-center gap-1">
            <input type="checkbox" defaultChecked className="w-3 h-3" />
            <span>Title</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" defaultChecked className="w-3 h-3" />
            <span>Content</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" className="w-3 h-3" />
            <span>Tags</span>
          </label>
        </div>
      </div>

      {/* 検索結果統計 */}
      {results.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {results.length}件の検索結果が見つかりました
          </div>
          
          {/* 検索結果プレビュー（最初の3件） */}
          <div className="mt-2 space-y-2">
            {results.slice(0, 3).map((result) => (
              <div 
                key={result.memo.id}
                className="p-2 bg-gray-50 rounded text-xs cursor-pointer hover:bg-gray-100"
                onClick={() => {
                  // メモにフォーカス（実装は親コンポーネントで）
                }}
              >
                <div className="font-medium text-gray-900 mb-1">
                  {result.memo.title}
                </div>
                <div className="text-gray-600 line-clamp-2">
                  {(result.memo.text || result.memo.content || '').substring(0, 100)}...
                </div>
                <div className="mt-1 text-gray-400 flex justify-between">
                  <span>スコア: {(result.score * 100).toFixed(1)}%</span>
                  <span>{result.relevanceFactors.titleMatch > 0 ? 'Title' : 'Content'} match</span>
                </div>
                {result.highlights.length > 0 && (
                  <div className="mt-1 text-xs text-blue-600">
                    Highlights: {result.highlights[0]?.substring(0, 50)}...
                  </div>
                )}
              </div>
            ))}
            
            {results.length > 3 && (
              <div className="text-xs text-gray-500 text-center">
                他 {results.length - 3}件の結果
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}