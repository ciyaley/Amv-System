import React from 'react'
import { render as rtlRender } from '@testing-library/react'
import { vi } from 'vitest'
import type { MemoData } from '../../app/types/tools'

/**
 * サイドバーコンポーネントのテスト用ヘルパー関数
 */

// カテゴリーラベルのマッピング
export const CATEGORY_LABELS = {
  work: '仕事',
  personal: '個人',
  idea: 'アイデア',
  none: 'その他'
} as const

// 重要度の色クラスマッピング
export const IMPORTANCE_COLORS = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-gray-400'
} as const

// 表示密度の定義
export type DensityMode = 'detailed' | 'standard' | 'compact'

/**
 * モックメモデータを作成するファクトリー関数
 */
export const createMockMemo = (overrides?: Partial<MemoData>): MemoData => {
  const now = new Date()
  return {
    id: `memo_${Math.random().toString(36).substr(2, 9)}`,
    type: 'memo',
    title: 'Test Memo',
    content: 'This is a test memo content',
    text: 'This is a test memo content',
    x: 100,
    y: 100,
    w: 240,
    h: 160,
    zIndex: 1,
    sourceType: 'guest',
    tags: [],
    created: now.toISOString(),
    updated: now.toISOString(),
    importance: 'medium',
    category: 'work',
    ...overrides
  }
}

/**
 * 複数のモックメモを作成
 */
export const createMockMemos = (count: number, categoryDistribution?: {
  work?: number
  personal?: number
  idea?: number
  none?: number
}): MemoData[] => {
  const memos: MemoData[] = []
  
  if (categoryDistribution) {
    Object.entries(categoryDistribution).forEach(([category, num]) => {
      for (let i = 0; i < num; i++) {
        memos.push(createMockMemo({
          id: `memo_${category}_${i}`,
          title: `${CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]} メモ ${i + 1}`,
          category: category === 'none' ? undefined : category,
          updated: new Date(Date.now() - i * 60 * 60 * 1000).toISOString() // 1時間ずつ古くする
        }))
      }
    })
  } else {
    for (let i = 0; i < count; i++) {
      memos.push(createMockMemo({
        id: `memo_${i}`,
        title: `メモ ${i + 1}`,
        updated: new Date(Date.now() - i * 60 * 60 * 1000).toISOString()
      }))
    }
  }
  
  return memos
}

/**
 * 相対時刻を計算（「30分前」などの表示用）
 */
export const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMinutes < 1) return '今'
  if (diffMinutes < 60) return `${diffMinutes}分前`
  if (diffHours < 24) {
    // 今日の場合は時刻を表示
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    }
    return `${diffHours}時間前`
  }
  if (diffDays < 7) return `${diffDays}日前`
  
  // 7日以上前は日付を表示
  return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
}

/**
 * 検索フィルタリング関数（実際のコンポーネントと同じロジック）
 */
export const filterMemos = (memos: MemoData[], searchQuery: string): MemoData[] => {
  if (!searchQuery) return memos
  
  const query = searchQuery.toLowerCase()
  return memos.filter(memo => {
    const titleMatch = memo.title?.toLowerCase().includes(query)
    const textMatch = memo.text?.toLowerCase().includes(query)
    const tagMatch = memo.tags?.some(tag => tag.toLowerCase().includes(query))
    
    return titleMatch || textMatch || tagMatch
  })
}

/**
 * カテゴリー別にメモをグループ化
 */
export const groupMemosByCategory = (memos: MemoData[]): Record<string, MemoData[]> => {
  const grouped: Record<string, MemoData[]> = {
    work: [],
    personal: [],
    idea: [],
    none: []
  }
  
  memos.forEach(memo => {
    const category = memo.category || 'none'
    if (category in grouped) {
      grouped[category]!.push(memo)
    } else {
      grouped.none!.push(memo)
    }
  })
  
  // 空のカテゴリーを削除
  Object.keys(grouped).forEach(key => {
    if (grouped[key]!.length === 0) {
      delete grouped[key]
    }
  })
  
  return grouped
}

/**
 * プレビュー位置を計算
 */
export const calculatePreviewPosition = (
  itemRect: DOMRect,
  previewWidth: number = 300,
  previewHeight: number = 200
): { top: number; left: number } => {
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  
  // デフォルトは右側に表示
  let left = itemRect.right + 10
  let top = itemRect.top
  
  // 右側に十分なスペースがない場合は左側に表示
  if (left + previewWidth > windowWidth) {
    left = itemRect.left - previewWidth - 10
  }
  
  // 下に見切れる場合は上に調整
  if (top + previewHeight > windowHeight) {
    top = windowHeight - previewHeight - 10
  }
  
  // 上に見切れる場合は調整
  if (top < 10) {
    top = 10
  }
  
  return { top, left }
}

/**
 * テスト用のカスタムレンダー関数
 */
export const renderWithSidebar = (ui: React.ReactElement) => {
  return rtlRender(ui)
}

/**
 * モックのリサイズオブザーバー
 */
export const mockResizeObserver = () => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))
}

/**
 * モックのIntersectionObserver
 */
export const mockIntersectionObserver = () => {
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))
}

/**
 * デバウンスのテスト用ヘルパー
 */
export const waitForDebounce = async (ms: number = 300) => {
  vi.advanceTimersByTime(ms)
  await Promise.resolve()
}