import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdaptiveSidebar } from '../AdaptiveSidebar'
import type { MemoData } from '../../hooks/useMemos'

// テストデータ
const createMockMemo = (overrides?: Partial<MemoData>): MemoData => ({
  id: `memo_${Math.random()}`,
  type: 'memo',
  title: 'Test Memo',
  text: 'This is a test memo content',
  x: 100,
  y: 100,
  w: 240,
  h: 160,
  zIndex: 1,
  tags: ['test'],
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  importance: 'medium',
  category: 'Work',
  ...overrides
})

const mockMemos: MemoData[] = [
  // 仕事カテゴリー
  createMockMemo({
    id: 'memo_work_1',
    title: '重要な会議メモ',
    text: '明日の会議について重要な内容が含まれています。プロジェクトの進捗状況と次のステップについて話し合います。',
    tags: ['会議', '重要'],
    importance: 'high',
    category: 'Work',
    updated: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30分前
  }),
  createMockMemo({
    id: 'memo_work_2',
    title: 'タスクリスト',
    text: '今週中に完了すべきタスク一覧',
    tags: ['タスク'],
    importance: 'medium',
    category: 'Work',
    updated: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2時間前
  }),
  createMockMemo({
    id: 'memo_work_3',
    title: 'プロジェクト計画',
    text: '新しいプロジェクトの計画とスケジュール',
    tags: ['計画'],
    importance: 'medium',
    category: 'Work',
    updated: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString()
  }),
  createMockMemo({
    id: 'memo_work_4',
    title: 'レビューメモ',
    text: 'コードレビューで指摘された内容',
    tags: ['レビュー'],
    importance: 'medium',
    category: 'Work',
    updated: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()
  }),
  // 個人カテゴリー
  createMockMemo({
    id: 'memo_personal_1',
    title: '買い物リスト',
    text: '牛乳、パン、卵',
    tags: ['買い物'],
    importance: 'low',
    category: 'Personal',
    updated: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1日前
  }),
  createMockMemo({
    id: 'memo_personal_2',
    title: '旅行計画',
    text: '夏休みの旅行先候補',
    tags: ['旅行'],
    importance: 'low',
    category: 'Personal',
    updated: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString()
  }),
  createMockMemo({
    id: 'memo_personal_3',
    title: '読書リスト',
    text: '読みたい本のリスト',
    tags: ['読書'],
    importance: 'low',
    category: 'Personal',
    updated: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString()
  }),
  // アイデアカテゴリー
  createMockMemo({
    id: 'memo_idea_1',
    title: '新しいアプリのアイデア',
    text: 'AIを活用したメモアプリケーション',
    tags: ['アイデア', 'AI'],
    importance: 'medium',
    category: 'Project',
    updated: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() // 2日前
  }),
  createMockMemo({
    id: 'memo_idea_2',
    title: 'ビジネスアイデア',
    text: '新しいビジネスモデルの構想',
    tags: ['ビジネス'],
    importance: 'medium',
    category: 'Project',
    updated: new Date(Date.now() - 1000 * 60 * 60 * 49).toISOString()
  }),
  // カテゴリーなし
  createMockMemo({
    id: 'memo_none_1',
    title: 'その他のメモ',
    text: '分類されていないメモ',
    tags: ['その他'],
    importance: 'low',
    category: undefined,
    updated: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() // 3日前
  }),
  createMockMemo({
    id: 'memo_none_2',
    title: 'ランダムメモ',
    text: 'カテゴリなしのメモ',
    tags: ['雑記'],
    importance: 'low',
    category: undefined,
    updated: new Date(Date.now() - 1000 * 60 * 60 * 73).toISOString()
  }),
  createMockMemo({
    id: 'memo_none_3',
    title: '一時的なメモ',
    text: '後で整理する予定',
    tags: ['一時的'],
    importance: 'low',
    category: undefined,
    updated: new Date(Date.now() - 1000 * 60 * 60 * 74).toISOString()
  })
]

// モック関数
const mockOnSelectMemo = vi.fn()
const mockOnClose = vi.fn()

describe('AdaptiveSidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本表示', () => {
    it('should render sidebar with all memos grouped by category', () => {
      render(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
        />
      )

      // カテゴリーセクションが表示されることを確認
      expect(screen.getByText('Work')).toBeInTheDocument()
      expect(screen.getByText('Personal')).toBeInTheDocument()
      expect(screen.getByText('Project')).toBeInTheDocument()
      expect(screen.getByText('Uncategorized')).toBeInTheDocument()

      // 各カテゴリーのメモ数が正しく表示されることを確認
      expect(screen.getByText('(4件)')).toBeInTheDocument() // 仕事
      expect(screen.getAllByText('(3件)')).toHaveLength(2) // 個人、カテゴリなし
      expect(screen.getByText('(2件)')).toBeInTheDocument() // プロジェクト
    })

    it('should render search input at the top', () => {
      render(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
        />
      )

      expect(screen.getByPlaceholderText('検索...')).toBeInTheDocument()
    })

    it('should not render sidebar content when isOpen is false', () => {
      render(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={false}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
        />
      )

      // サイドバーコンテンツは表示されない
      expect(screen.queryByText('Work')).not.toBeInTheDocument()
      expect(screen.queryByPlaceholderText('検索...')).not.toBeInTheDocument()
    })
  })

  describe('検索機能', () => {
    it('should filter memos based on search query', async () => {
      const user = userEvent.setup()
      render(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
        />
      )

      const searchInput = screen.getByPlaceholderText('検索...')
      await user.type(searchInput, '会議')

      // 検索結果が表示されるまで待つ（デバウンス300ms）
      await waitFor(() => {
        expect(screen.getByText('重要な会議メモ')).toBeInTheDocument()
        expect(screen.queryByText('タスクリスト')).not.toBeInTheDocument()
        expect(screen.queryByText('買い物リスト')).not.toBeInTheDocument()
      }, { timeout: 400 })
    })

    it('should show all categories expanded when search is active', async () => {
      const user = userEvent.setup()
      render(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
        />
      )

      // まず一つのカテゴリーを折りたたむ
      const workCategory = screen.getByText('Work').closest('div')
      const toggleButton = within(workCategory!).getByRole('button')
      await user.click(toggleButton)

      // 検索を実行
      const searchInput = screen.getByPlaceholderText('検索...')
      await user.type(searchInput, 'メモ')

      await waitFor(() => {
        // すべてのメモが見えることを確認（カテゴリーが自動展開される）
        expect(screen.getByText('重要な会議メモ')).toBeVisible()
        expect(screen.getByText('その他のメモ')).toBeVisible()
      }, { timeout: 400 })
    })

    it('should clear search when clear button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
        />
      )

      const searchInput = screen.getByPlaceholderText('検索...')
      await user.type(searchInput, '会議')

      await waitFor(() => {
        expect(screen.queryByText('タスクリスト')).not.toBeInTheDocument()
      }, { timeout: 400 })

      // クリアボタンをクリック
      const clearButton = screen.getByLabelText('検索をクリア')
      await user.click(clearButton)

      // すべてのメモが再表示される
      expect(screen.getByText('タスクリスト')).toBeInTheDocument()
      expect(screen.getByText('買い物リスト')).toBeInTheDocument()
    })

    it('should debounce search input', async () => {
      const user = userEvent.setup()
      render(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
        />
      )

      const searchInput = screen.getByPlaceholderText('検索...')
      
      // 素早く文字を入力
      await user.type(searchInput, 'タスク')

      // デバウンス中はすべてのメモが表示されている
      expect(screen.getByText('重要な会議メモ')).toBeInTheDocument()
      expect(screen.getByText('買い物リスト')).toBeInTheDocument()

      // デバウンス後に検索結果が反映される
      await waitFor(() => {
        expect(screen.getByText('タスクリスト')).toBeInTheDocument()
        expect(screen.queryByText('重要な会議メモ')).not.toBeInTheDocument()
      }, { timeout: 400 })
    })
  })

  describe('メモ選択', () => {
    it('should call onSelectMemo when a memo is clicked', async () => {
      const user = userEvent.setup()
      render(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
        />
      )

      await user.click(screen.getByText('重要な会議メモ'))
      
      expect(mockOnSelectMemo).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'memo_work_1',
          title: '重要な会議メモ'
        })
      )
    })

    it('should highlight selected memo', () => {
      render(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          selectedItem="memo_work_1"
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
        />
      )

      const selectedMemo = screen.getByText('重要な会議メモ').closest('div[role="button"]')
      expect(selectedMemo).toHaveClass('bg-blue-50')
    })
  })

  describe('密度切り替え', () => {
    it('should switch between density modes', async () => {
      const user = userEvent.setup()
      render(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
        />
      )

      // デフォルトは標準密度
      const memoItem = screen.getByText('重要な会議メモ').closest('div[role="button"]')
      expect(memoItem).toBeInTheDocument()
      
      // 密度切り替えボタンをクリック（詳細モードへ）
      const densityButton = screen.getByLabelText('detailed表示')
      await user.click(densityButton)

      // 詳細モードでは本文プレビューが表示される
      expect(screen.getByText(/明日の会議について/)).toBeInTheDocument()

      // もう一度クリック（コンパクトモードへ）
      await user.click(densityButton)

      // コンパクトモードではタイトルのみ
      expect(screen.queryByText(/明日の会議について/)).not.toBeInTheDocument()
    })
  })

  describe('モバイル対応', () => {
    it('should show close button on mobile', () => {
      // モバイルビューポートをシミュレート
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375)
      
      render(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
        />
      )

      expect(screen.getByLabelText('サイドバーを閉じる')).toBeInTheDocument()
    })

    it('should close sidebar when close button is clicked', async () => {
      const user = userEvent.setup()
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375)
      
      render(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
        />
      )

      await user.click(screen.getByLabelText('サイドバーを閉じる'))
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should close sidebar when backdrop is clicked on mobile', async () => {
      const user = userEvent.setup()
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375)
      
      render(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
        />
      )

      const backdrop = screen.getByTestId('sidebar-backdrop')
      await user.click(backdrop)
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('空の状態', () => {
    it('should show empty state when no memos', () => {
      render(
        <AdaptiveSidebar
          items={[]}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
        />
      )

      expect(screen.getByText('アイテムがありません')).toBeInTheDocument()
    })

    it('should show no results when search returns empty', async () => {
      const user = userEvent.setup()
      render(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
        />
      )

      const searchInput = screen.getByPlaceholderText('検索...')
      await user.type(searchInput, '存在しない検索語')

      await waitFor(() => {
        expect(screen.getByText('検索結果がありません')).toBeInTheDocument()
      }, { timeout: 400 })
    })
  })

  describe('アクセシビリティ', () => {
    it('should have proper ARIA labels', () => {
      render(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
        />
      )

      expect(screen.getByRole('complementary')).toHaveAttribute('aria-label', 'アイテム一覧')
      expect(screen.getByRole('search')).toBeInTheDocument()
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
        />
      )

      // Tabキーでフォーカスを移動
      await user.tab()
      expect(screen.getByPlaceholderText('検索...')).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText('detailed表示')).toHaveFocus()

      // メモアイテムにフォーカス
      await user.tab()
      await user.tab() // カテゴリーボタンをスキップ
      const firstMemo = screen.getByText('重要な会議メモ').closest('div[role="button"]')
      expect(firstMemo).toHaveFocus()

      // Enterキーで選択
      await user.keyboard('{Enter}')
      expect(mockOnSelectMemo).toHaveBeenCalled()
    })
  })
})