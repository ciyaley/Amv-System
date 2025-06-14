// app/hooks/useAdvancedSearch.ts
/**
 * 🟢 GREEN PHASE - Advanced Search Hook Implementation
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useMemos } from './useMemos';
import { AdvancedSearchEngine } from '../../utils/advancedSearchEngine';
import type { 
  SearchOptions, 
  SearchHistory, 
  SearchSuggestion,
  AdvancedSearchState,
  UseAdvancedSearchReturn 
} from '@/app/types/search';

export function useAdvancedSearch(): UseAdvancedSearchReturn {
  const { memos } = useMemos();
  
  const [state, setState] = useState<AdvancedSearchState>({
    currentQuery: '',
    results: [],
    isSearching: false,
    searchHistory: [],
    suggestions: [],
    searchOptions: {},
    error: null,
    stats: {
      totalMemos: 0,
      indexedMemos: 0,
      searchTime: 0,
      lastIndexUpdate: null
    }
  });

  // デバウンス用のタイマー
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // 検索エンジンのインスタンス
  const searchEngine = useMemo(() => new AdvancedSearchEngine(), []);

  /**
   * 検索インデックスの更新
   */
  const updateIndex = useCallback(async () => {
    searchEngine.buildIndex(memos);

    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        totalMemos: memos.length,
        indexedMemos: memos.length,
        lastIndexUpdate: new Date()
      }
    }));
  }, [memos]);

  /**
   * メモが変更されたときにインデックスを更新
   */
  useEffect(() => {
    if (memos.length > 0) {
      updateIndex();
    }
  }, [memos, updateIndex]);

  /**
   * 基本検索
   */
  const search = useCallback(async (query: string, options: SearchOptions = {}) => {
    setState(prev => ({ ...prev, isSearching: true, error: null }));

    try {
      const startTime = performance.now();
      
      // SearchOptionsをSearchFiltersに変換
      const filters = {
        category: options.category,
        importance: options.importance,
        dateRange: options.dateRange ? {
          start: options.dateRange.from,
          end: options.dateRange.to
        } : undefined
      };
      
      const engineResults = searchEngine.search(query, memos, filters, options.limit);
      
      // AdvancedSearchEngineの結果をSearchResult型に変換
      const results = engineResults.map(result => ({
        id: result.memo.id,
        score: result.score,
        highlightedTitle: result.memo.title || '',
        highlightedText: result.highlights.join(' '),
        memo: result.memo,
        matchedTerms: query.split(' ').filter(term => term.length > 0)
      }));
      
      const endTime = performance.now();
      const searchTime = endTime - startTime;

      // 検索履歴に追加
      const historyEntry: SearchHistory = {
        query,
        timestamp: new Date(),
        resultCount: results.length,
        options
      };

      setState(prev => ({
        ...prev,
        currentQuery: query,
        results,
        isSearching: false,
        searchHistory: [historyEntry, ...prev.searchHistory.slice(0, 49)], // 最新50件まで保持
        searchOptions: options,
        stats: {
          ...prev.stats,
          searchTime
        }
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        isSearching: false,
        error: error instanceof Error ? error.message : 'Search failed'
      }));
    }
  }, []);

  /**
   * デバウンス検索
   */
  const debouncedSearch = useCallback((query: string, options: SearchOptions = {}) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      search(query, options);
    }, 300); // 300ms debounce

    setDebounceTimer(timer);
  }, [search, debounceTimer]);

  /**
   * タグベース検索
   */
  const searchByTags = useCallback(async (tags: string[], options: SearchOptions = {}) => {
    setState(prev => ({ ...prev, isSearching: true }));

    try {
      // タグベースの検索をクエリに変換
      const tagQuery = tags.join(' ');
      const engineResults = searchEngine.search(tagQuery, memos, undefined, options.limit);
      
      // AdvancedSearchEngineの結果をSearchResult型に変換
      const results = engineResults.map(result => ({
        id: result.memo.id,
        score: result.score,
        highlightedTitle: result.memo.title || '',
        highlightedText: result.highlights.join(' '),
        memo: result.memo,
        matchedTerms: tags
      }));
      
      setState(prev => ({
        ...prev,
        results,
        isSearching: false,
        searchOptions: { ...options, tags }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSearching: false,
        error: error instanceof Error ? error.message : 'Tag search failed'
      }));
    }
  }, []);

  /**
   * 高度な検索
   */
  const advancedSearch = useCallback(async (options: SearchOptions) => {
    setState(prev => ({ ...prev, isSearching: true }));

    try {
      // SearchOptionsをSearchFiltersに変換
      const filters = {
        category: options.category,
        importance: options.importance,
        dateRange: options.dateRange ? {
          start: options.dateRange.from,
          end: options.dateRange.to
        } : undefined
      };
      
      const engineResults = searchEngine.search(options.query || '', memos, filters, options.limit);
      
      // AdvancedSearchEngineの結果をSearchResult型に変換
      const results = engineResults.map(result => ({
        id: result.memo.id,
        score: result.score,
        highlightedTitle: result.memo.title || '',
        highlightedText: result.highlights.join(' '),
        memo: result.memo,
        matchedTerms: (options.query || '').split(' ').filter(term => term.length > 0)
      }));
      
      setState(prev => ({
        ...prev,
        results,
        isSearching: false,
        searchOptions: options
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSearching: false,
        error: error instanceof Error ? error.message : 'Advanced search failed'
      }));
    }
  }, []);

  /**
   * 検索候補の取得
   */
  const getSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setState(prev => ({ ...prev, suggestions: [] }));
      return;
    }

    try {
      // 簡易的な候補生成
      const suggestions: SearchSuggestion[] = [];

      // 検索履歴から候補を生成
      state.searchHistory
        .filter(h => h.query.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5)
        .forEach(h => {
          suggestions.push({
            text: h.query,
            type: 'query',
            frequency: h.resultCount
          });
        });

      // タグから候補を生成
      const allTags = memos.flatMap(memo => memo.tags || []);
      const matchingTags = [...new Set(allTags)]
        .filter(tag => tag.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);

      matchingTags.forEach(tag => {
        suggestions.push({
          text: tag,
          type: 'tag',
          frequency: allTags.filter(t => t === tag).length
        });
      });

      // カテゴリから候補を生成
      const allCategories = memos.map(memo => memo.category).filter(Boolean);
      const matchingCategories = [...new Set(allCategories)]
        .filter(cat => cat && cat.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3);

      matchingCategories.forEach(category => {
        suggestions.push({
          text: category!,
          type: 'category',
          frequency: allCategories.filter(c => c === category).length
        });
      });

      // スコア順でソート
      suggestions.sort((a, b) => b.frequency - a.frequency);

      setState(prev => ({ ...prev, suggestions: suggestions.slice(0, 10) }));

    } catch (error) {
    }
  }, [state.searchHistory, memos]);

  /**
   * 検索履歴のクリア
   */
  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, searchHistory: [] }));
  }, []);

  // 返り値のメモ化
  const returnValue = useMemo((): UseAdvancedSearchReturn => ({
    search,
    debouncedSearch,
    searchByTags,
    advancedSearch,
    getSuggestions,
    clearHistory,
    updateIndex,
    state,
    results: state.results,
    isSearching: state.isSearching,
    searchHistory: state.searchHistory,
    suggestions: state.suggestions
  }), [
    search,
    debouncedSearch,
    searchByTags,
    advancedSearch,
    getSuggestions,
    clearHistory,
    updateIndex,
    state
  ]);

  return returnValue;
}