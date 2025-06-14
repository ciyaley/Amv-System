// app/components/AdvancedSearchBox.tsx
/**
 * 🟢 GREEN PHASE - Advanced Search Box Component Implementation
 */

"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Filter, X, Tag, Clock } from 'lucide-react';
import type { AdvancedSearchBoxProps, SearchSuggestion } from '@/app/types/search';

export function AdvancedSearchBox({
  onSearch,
  onTagSelect,
  results = [],
  suggestions = [],
  isLoading = false,
  placeholder = 'メモを検索...',
  defaultOptions = {},
  showFilters = true,
  debounceMs = 300
}: AdvancedSearchBoxProps) {
  const [query, setQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedImportance, setSelectedImportance] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * デバウンス検索
   */
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onSearch(value, {
        ...defaultOptions,
        category: selectedCategory || undefined,
        importance: (selectedImportance as 'high' | 'medium' | 'low') || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined
      });
    }, debounceMs);
  }, [onSearch, defaultOptions, selectedCategory, selectedImportance, selectedTags, debounceMs]);

  /**
   * 候補選択
   */
  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    if (suggestion.type === 'tag') {
      onTagSelect(suggestion.text);
      setSelectedTags(prev => [...prev, suggestion.text]);
    } else {
      setQuery(suggestion.text);
      onSearch(suggestion.text, defaultOptions);
    }
    setShowSuggestions(false);
  }, [onSearch, onTagSelect, defaultOptions]);

  /**
   * 検索クリア
   */
  const handleClear = useCallback(() => {
    setQuery('');
    setSelectedTags([]);
    setSelectedCategory('');
    setSelectedImportance('');
    onSearch('', {});
    inputRef.current?.focus();
  }, [onSearch]);

  /**
   * タグ削除
   */
  const handleTagRemove = useCallback((tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  }, []);

  /**
   * フォーカス管理
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* メイン検索ボックス */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="search"
          className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg 
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     placeholder-gray-500 text-sm"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          data-testid="advanced-search-input"
        />
        
        {/* クリア・ローディング */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
          ) : query ? (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
              aria-label="検索をクリア"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          ) : null}
        </div>
      </div>

      {/* 選択されたタグ表示 */}
      {selectedTags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedTags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs 
                         bg-blue-100 text-blue-800"
            >
              <Tag className="h-3 w-3 mr-1" />
              {tag}
              <button
                onClick={() => handleTagRemove(tag)}
                className="ml-1 hover:text-blue-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 検索候補ドロップダウン */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 
                        rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.text}-${index}`}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 
                         border-b border-gray-100 last:border-b-0
                         flex items-center justify-between"
              onClick={() => handleSuggestionSelect(suggestion)}
            >
              <div className="flex items-center">
                {suggestion.type === 'query' && <Clock className="h-4 w-4 mr-2 text-gray-400" />}
                {suggestion.type === 'tag' && <Tag className="h-4 w-4 mr-2 text-blue-500" />}
                {suggestion.type === 'category' && <Filter className="h-4 w-4 mr-2 text-green-500" />}
                <span className="text-sm">{suggestion.text}</span>
              </div>
              <span className="text-xs text-gray-400">
                {suggestion.frequency > 0 && `${suggestion.frequency}件`}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 詳細検索フィルタ */}
      {showFilters && (
        <div className="mt-3">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-gray-600 hover:text-gray-800"
          >
            <Filter className="h-4 w-4 mr-1" />
            詳細検索
            {showAdvanced ? ' （非表示）' : ' （表示）'}
          </button>

          {showAdvanced && (
            <div className="mt-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* カテゴリフィルタ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    カテゴリ
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">すべて</option>
                    <option value="Development">開発</option>
                    <option value="Design">デザイン</option>
                    <option value="Meeting">会議</option>
                    <option value="Personal">個人</option>
                  </select>
                </div>

                {/* 重要度フィルタ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    重要度
                  </label>
                  <select
                    value={selectedImportance}
                    onChange={(e) => setSelectedImportance(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">すべて</option>
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>

                {/* 検索ボタン */}
                <div className="flex items-end">
                  <button
                    onClick={() => onSearch(query, {
                      category: selectedCategory || undefined,
                      importance: (selectedImportance as 'high' | 'medium' | 'low') || undefined,
                      tags: selectedTags.length > 0 ? selectedTags : undefined
                    })}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md 
                               hover:bg-blue-700 text-sm font-medium"
                  >
                    詳細検索実行
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 検索結果プレビュー */}
      {results.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          {results.length}件の検索結果
        </div>
      )}
    </div>
  );
}