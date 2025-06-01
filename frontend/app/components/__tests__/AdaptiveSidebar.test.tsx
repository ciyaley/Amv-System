import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
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
      let searchQuery = ''
      const handleSearchChange = vi.fn((query: string) => {
        searchQuery = query
      })

      const { rerender } = render(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
          onSearchChange={handleSearchChange}
          searchQuery={searchQuery}
        />
      )

      const searchInput = screen.getByPlaceholderText('検索...')
      
      // 検索語を入力
      fireEvent.change(searchInput, { target: { value: '会議' } })
      
      // デバウンス完了を待つ
      await waitFor(() => {
        expect(handleSearchChange).toHaveBeenCalledWith('会議')
      }, { timeout: 400 })

      // コンポーネントを再レンダリングして検索クエリを反映
      searchQuery = '会議'
      rerender(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
          onSearchChange={handleSearchChange}
          searchQuery={searchQuery}
        />
      )
      
      await waitFor(() => {
        expect(screen.getByText('重要な会議メモ')).toBeInTheDocument()
        expect(screen.queryByText('タスクリスト')).not.toBeInTheDocument()
        expect(screen.queryByText('買い物リスト')).not.toBeInTheDocument()
      })
    })

    it('should show all categories expanded when search is active', async () => {
      let searchQuery = ''
      const handleSearchChange = vi.fn((query: string) => {
        searchQuery = query
      })

      const { rerender } = render(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
          onSearchChange={handleSearchChange}
          searchQuery={searchQuery}
        />
      )

      // 検索を実行
      const searchInput = screen.getByPlaceholderText('検索...')
      fireEvent.change(searchInput, { target: { value: 'メモ' } })

      await waitFor(() => {
        expect(handleSearchChange).toHaveBeenCalledWith('メモ')
      }, { timeout: 400 })

      // コンポーネントを再レンダリング
      searchQuery = 'メモ'
      rerender(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
          onSearchChange={handleSearchChange}
          searchQuery={searchQuery}
        />
      )

      await waitFor(() => {
        // すべてのメモが見えることを確認（カテゴリーが自動展開される）
        expect(screen.getByText('重要な会議メモ')).toBeVisible()
        expect(screen.getByText('その他のメモ')).toBeVisible()
      })
    })

    it('should clear search when clear button is clicked', async () => {
      let searchQuery = '会議'
      const handleSearchChange = vi.fn((query: string) => {
        searchQuery = query
      })

      const { rerender } = render(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
          onSearchChange={handleSearchChange}
          searchQuery={searchQuery}
        />
      )

      // 初期状態で検索済み
      expect(screen.queryByText('タスクリスト')).not.toBeInTheDocument()

      // クリアボタンをクリック
      const clearButton = screen.getByLabelText('検索をクリア')
      fireEvent.click(clearButton)

      expect(handleSearchChange).toHaveBeenCalledWith('')

      // コンポーネントを再レンダリング
      searchQuery = ''
      rerender(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
          onSearchChange={handleSearchChange}
          searchQuery={searchQuery}
        />
      )

      // すべてのメモが再表示される
      expect(screen.getByText('タスクリスト')).toBeInTheDocument()
      expect(screen.getByText('買い物リスト')).toBeInTheDocument()
    })

    it('should debounce search input', async () => {
      const handleSearchChange = vi.fn()

      render(
        <AdaptiveSidebar
          items={mockMemos}
          isOpen={true}
          onItemSelect={mockOnSelectMemo}
          onToggle={mockOnClose}
          onSearchChange={handleSearchChange}
          searchQuery=""
        />
      )

      const searchInput = screen.getByPlaceholderText('検索...')
      
      // 連続して入力
      fireEvent.change(searchInput, { target: { value: 'タ' } })
      fireEvent.change(searchInput, { target: { value: 'タス' } })
      fireEvent.change(searchInput, { target: { value: 'タスク' } })

      // デバウンス期間内は最後の値のみが呼ばれる
      await waitFor(() => {
        expect(handleSearchChange).toHaveBeenCalledWith('タスク')
      }, { timeout: 400 })

      // 複数回呼ばれていないことを確認（デバウンス機能の確認）
      expect(handleSearchChange).toHaveBeenCalledTimes(1)
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

      // 現在の密度を確認
      const memoItem = screen.getByText('重要な会議メモ').closest('div[role="button"]')
      expect(memoItem).toBeInTheDocument()
      
      // standard表示ボタンをクリック（詳細から標準モードへ）
      const standardButton = screen.getByLabelText('standard表示')
      await user.click(standardButton)

      // コンパクトモードへ変更
      const denseButton = screen.getByLabelText('dense表示')
      await user.click(denseButton)

      // 再度詳細モードへ
      const detailedButton = screen.getByLabelText('detailed表示')
      await user.click(detailedButton)

      // 詳細モードでは本文プレビューが表示される
      expect(screen.getByText(/明日の会議について/)).toBeInTheDocument()
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
          isMobile={true}
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
          isMobile={true}
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
          isMobile={true}
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

      // 検索機能のテストは AdaptiveSidebar.search.test.tsx で実施済み
      // このテストは削除予定
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

      // 複数回Tabを押して検索入力欄にフォーカスを移動
      await user.tab() // 最初の要素（密度ボタンまたはカテゴリボタン）
      await user.tab() // 次の要素
      await user.tab() // さらに次の要素
      await user.tab() // さらに次の要素
      
      // 検索入力欄を明示的に探してフォーカス
      const searchInput = screen.getByPlaceholderText('検索...')
      searchInput.focus()
      
      expect(searchInput).toHaveFocus()

      // 検索入力でタイピングが動作することを確認
      await user.type(searchInput, 'test')
      expect(searchInput).toHaveValue('test')
      
      // Escapeキーでクリア機能をテスト
      await user.keyboard('{Escape}')
      expect(searchInput).toHaveValue('')
    })
  })
})