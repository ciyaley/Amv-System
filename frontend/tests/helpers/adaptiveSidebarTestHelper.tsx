import React, { useState } from 'react'
import { render, RenderResult } from '@testing-library/react'
import { vi } from 'vitest'
import { AdaptiveSidebar } from '../../app/components/AdaptiveSidebar'
import type { MemoData } from '../../app/hooks/useMemos'

export interface AdaptiveSidebarTestHelperProps {
  items: MemoData[]
  initialSearchQuery?: string
  onItemSelect?: (item: MemoData) => void
  onToggle?: () => void
  isOpen?: boolean
}

// 状態管理を含むテストコンポーネント
export const AdaptiveSidebarWithState: React.FC<AdaptiveSidebarTestHelperProps> = ({
  items,
  initialSearchQuery = '',
  onItemSelect,
  onToggle,
  isOpen = true
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)

  return (
    <AdaptiveSidebar
      items={items}
      isOpen={isOpen}
      onItemSelect={onItemSelect}
      onToggle={onToggle}
      onSearchChange={setSearchQuery}
      searchQuery={searchQuery}
    />
  )
}

// テストヘルパー関数
export const renderAdaptiveSidebarWithState = (
  props: AdaptiveSidebarTestHelperProps
): RenderResult => {
  return render(<AdaptiveSidebarWithState {...props} />)
}

// モック関数生成ヘルパー
export const createMockHandlers = () => ({
  onItemSelect: vi.fn(),
  onToggle: vi.fn(),
  onSearchChange: vi.fn()
})

// テストデータ生成ヘルパー（検索機能テスト用：11件以上で検索ボックス表示）
export const createTestMemos = (): MemoData[] => [
  {
    id: 'memo_work_1',
    type: 'memo',
    title: '重要な会議メモ',
    text: '明日の会議について話し合う内容をまとめる',
    x: 100,
    y: 100,
    w: 240,
    h: 160,
    zIndex: 1,
    tags: ['会議', '重要'],
    created: new Date('2024-01-01T10:00:00Z').toISOString(),
    updated: new Date('2024-01-01T10:00:00Z').toISOString(),
    importance: 'high',
    category: 'Work'
  },
  {
    id: 'memo_personal_1',
    type: 'memo',
    title: 'タスクリスト',
    text: '今日やるべきことのリスト',
    x: 200,
    y: 200,
    w: 240,
    h: 160,
    zIndex: 2,
    tags: ['タスク', '個人'],
    created: new Date('2024-01-02T10:00:00Z').toISOString(),
    updated: new Date('2024-01-02T10:00:00Z').toISOString(),
    importance: 'medium',
    category: 'Personal'
  },
  {
    id: 'memo_personal_2',
    type: 'memo',
    title: '買い物リスト',
    text: '今日買うもの：パン、牛乳、卵',
    x: 300,
    y: 300,
    w: 240,
    h: 160,
    zIndex: 3,
    tags: ['買い物'],
    created: new Date('2024-01-03T10:00:00Z').toISOString(),
    updated: new Date('2024-01-03T10:00:00Z').toISOString(),
    importance: 'low',
    category: 'Personal'
  },
  {
    id: 'memo_work_2',
    type: 'memo',
    title: 'その他のメモ',
    text: 'プロジェクト関連のメモ',
    x: 400,
    y: 400,
    w: 240,
    h: 160,
    zIndex: 4,
    tags: ['プロジェクト'],
    created: new Date('2024-01-04T10:00:00Z').toISOString(),
    updated: new Date('2024-01-04T10:00:00Z').toISOString(),
    importance: 'medium',
    category: 'Work'
  },
  {
    id: 'memo_project_1',
    type: 'memo',
    title: 'プロジェクト企画書',
    text: '新しいプロジェクトの企画書を作成',
    x: 500,
    y: 500,
    w: 240,
    h: 160,
    zIndex: 5,
    tags: ['企画', '新規'],
    created: new Date('2024-01-05T10:00:00Z').toISOString(),
    updated: new Date('2024-01-05T10:00:00Z').toISOString(),
    importance: 'high',
    category: 'Project'
  },
  {
    id: 'memo_project_2',
    type: 'memo',
    title: '進捗レポート',
    text: '週次の進捗レポートを作成',
    x: 600,
    y: 600,
    w: 240,
    h: 160,
    zIndex: 6,
    tags: ['レポート', '進捗'],
    created: new Date('2024-01-06T10:00:00Z').toISOString(),
    updated: new Date('2024-01-06T10:00:00Z').toISOString(),
    importance: 'medium',
    category: 'Project'
  },
  // 追加データ（検索ボックス表示のため11件以上にする）
  {
    id: 'memo_work_3',
    type: 'memo',
    title: 'システム設計書',
    text: 'システムアーキテクチャの設計書',
    x: 700,
    y: 700,
    w: 240,
    h: 160,
    zIndex: 7,
    tags: ['設計', 'システム'],
    created: new Date('2024-01-07T10:00:00Z').toISOString(),
    updated: new Date('2024-01-07T10:00:00Z').toISOString(),
    importance: 'high',
    category: 'Work'
  },
  {
    id: 'memo_personal_3',
    type: 'memo',
    title: '読書リスト',
    text: '今月読む予定の本のリスト',
    x: 800,
    y: 800,
    w: 240,
    h: 160,
    zIndex: 8,
    tags: ['読書', '趣味'],
    created: new Date('2024-01-08T10:00:00Z').toISOString(),
    updated: new Date('2024-01-08T10:00:00Z').toISOString(),
    importance: 'low',
    category: 'Personal'
  },
  {
    id: 'memo_project_3',
    type: 'memo',
    title: 'テスト計画書',
    text: 'プロジェクトのテスト計画と戦略',
    x: 900,
    y: 900,
    w: 240,
    h: 160,
    zIndex: 9,
    tags: ['テスト', '計画'],
    created: new Date('2024-01-09T10:00:00Z').toISOString(),
    updated: new Date('2024-01-09T10:00:00Z').toISOString(),
    importance: 'medium',
    category: 'Project'
  },
  {
    id: 'memo_work_4',
    type: 'memo',
    title: 'データベース設計',
    text: 'データベースのスキーマ設計',
    x: 1000,
    y: 1000,
    w: 240,
    h: 160,
    zIndex: 10,
    tags: ['データベース', 'スキーマ'],
    created: new Date('2024-01-10T10:00:00Z').toISOString(),
    updated: new Date('2024-01-10T10:00:00Z').toISOString(),
    importance: 'high',
    category: 'Work'
  },
  {
    id: 'memo_personal_4',
    type: 'memo',
    title: '健康管理メモ',
    text: '運動と食事の記録',
    x: 1100,
    y: 1100,
    w: 240,
    h: 160,
    zIndex: 11,
    tags: ['健康', '運動', '食事'],
    created: new Date('2024-01-11T10:00:00Z').toISOString(),
    updated: new Date('2024-01-11T10:00:00Z').toISOString(),
    importance: 'medium',
    category: 'Personal'
  }
]