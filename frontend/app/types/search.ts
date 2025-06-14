// app/types/search.ts
/**
 * Advanced Search System Type Definitions
 * 高度な検索システムの型定義
 */

import type { MemoData } from './tools';

export interface SearchResult {
  /** メモID */
  id: string;
  /** 関連性スコア (0-1) */
  score: number;
  /** ハイライト済みタイトル */
  highlightedTitle: string;
  /** ハイライト済みテキスト */
  highlightedText: string;
  /** 元のメモデータ */
  memo: MemoData;
  /** マッチした検索語句 */
  matchedTerms: string[];
}

export interface SearchOptions {
  /** 検索クエリ */
  query?: string;
  /** フィルタリング対象タグ */
  tags?: string[];
  /** カテゴリフィルタ */
  category?: string;
  /** 重要度フィルタ */
  importance?: 'high' | 'medium' | 'low';
  /** 検索結果の制限数 */
  limit?: number;
  /** 複合検索のモード */
  combineMode?: 'AND' | 'OR';
  /** 日付範囲フィルタ */
  dateRange?: {
    from: Date;
    to: Date;
  };
  /** ソート順 */
  sortBy?: 'relevance' | 'date' | 'title' | 'importance';
  /** ソート方向 */
  sortOrder?: 'asc' | 'desc';
}

export interface SearchHistory {
  /** 検索クエリ */
  query: string;
  /** 検索実行日時 */
  timestamp: Date;
  /** 検索結果数 */
  resultCount: number;
  /** 使用された検索オプション */
  options: SearchOptions;
}

export interface SearchSuggestion {
  /** 候補テキスト */
  text: string;
  /** 候補の種類 */
  type: 'query' | 'tag' | 'category' | 'title';
  /** 候補の頻度・重要度 */
  frequency: number;
}

export interface TokenizedContent {
  /** 元のテキスト */
  original: string;
  /** トークン化されたテキスト */
  tokens: string[];
  /** 正規化されたトークン */
  normalizedTokens: string[];
  /** トークンの位置情報 */
  positions: Array<{
    token: string;
    start: number;
    end: number;
  }>;
}

export interface TFIDFScore {
  /** 用語 */
  term: string;
  /** TF値 (Term Frequency) */
  tf: number;
  /** DF値 (Document Frequency) */
  df: number;
  /** IDF値 (Inverse Document Frequency) */
  idf: number;
  /** TF-IDFスコア */
  tfidf: number;
}

export interface SearchIndex {
  /** メモID */
  memoId: string;
  /** トークン化されたタイトル */
  titleTokens: TokenizedContent;
  /** トークン化されたテキスト */
  textTokens: TokenizedContent;
  /** タグ情報 */
  tags: string[];
  /** カテゴリ */
  category: string;
  /** 重要度 */
  importance: 'high' | 'medium' | 'low';
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
  /** TF-IDFスコア情報 */
  tfidfScores: TFIDFScore[];
}

export interface AdvancedSearchState {
  /** 現在の検索クエリ */
  currentQuery: string;
  /** 検索結果 */
  results: SearchResult[];
  /** 検索中フラグ */
  isSearching: boolean;
  /** 検索履歴 */
  searchHistory: SearchHistory[];
  /** 検索候補 */
  suggestions: SearchSuggestion[];
  /** 現在の検索オプション */
  searchOptions: SearchOptions;
  /** エラー情報 */
  error: string | null;
  /** 検索統計 */
  stats: {
    totalMemos: number;
    indexedMemos: number;
    searchTime: number;
    lastIndexUpdate: Date | null;
  };
}

export interface SearchFilters {
  /** タグフィルタの状態 */
  selectedTags: string[];
  /** カテゴリフィルタの状態 */
  selectedCategory: string | null;
  /** 重要度フィルタの状態 */
  selectedImportance: ('high' | 'medium' | 'low')[];
  /** 日付範囲フィルタの状態 */
  dateRange: {
    from: Date | null;
    to: Date | null;
  } | null;
  /** 可視性フィルタ */
  includeHidden: boolean;
}

export interface SearchHighlight {
  /** ハイライト対象のテキスト */
  text: string;
  /** ハイライトすべき用語 */
  terms: string[];
  /** ハイライトのHTML */
  highlightedHtml: string;
  /** マッチした位置情報 */
  matches: Array<{
    term: string;
    start: number;
    end: number;
    score: number;
  }>;
}

// Hook の戻り値型
export interface UseAdvancedSearchReturn {
  /** 検索実行 */
  search: (query: string, options?: SearchOptions) => Promise<void>;
  /** デバウンス検索 */
  debouncedSearch: (query: string, options?: SearchOptions) => void;
  /** タグベース検索 */
  searchByTags: (tags: string[], options?: SearchOptions) => Promise<void>;
  /** 高度な検索 */
  advancedSearch: (options: SearchOptions) => Promise<void>;
  /** 検索候補取得 */
  getSuggestions: (query: string) => Promise<void>;
  /** 検索履歴クリア */
  clearHistory: () => void;
  /** 検索インデックス更新 */
  updateIndex: () => Promise<void>;
  /** 現在の状態 */
  state: AdvancedSearchState;
  /** 検索結果 */
  results: SearchResult[];
  /** 検索中フラグ */
  isSearching: boolean;
  /** 検索履歴 */
  searchHistory: SearchHistory[];
  /** 検索候補 */
  suggestions: SearchSuggestion[];
}

// Component Props
export interface AdvancedSearchBoxProps {
  /** 検索実行コールバック */
  onSearch: (query: string, options?: SearchOptions) => void;
  /** タグ選択コールバック */
  onTagSelect: (tag: string) => void;
  /** 検索結果 */
  results?: SearchResult[];
  /** 検索候補 */
  suggestions?: SearchSuggestion[];
  /** ローディング状態 */
  isLoading?: boolean;
  /** プレースホルダーテキスト */
  placeholder?: string;
  /** デフォルト検索オプション */
  defaultOptions?: SearchOptions;
  /** フィルタ表示制御 */
  showFilters?: boolean;
  /** デバウンス時間 (ms) */
  debounceMs?: number;
}