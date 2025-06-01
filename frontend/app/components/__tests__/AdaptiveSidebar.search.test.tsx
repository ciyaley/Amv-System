import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { 
  renderAdaptiveSidebarWithState, 
  createTestMemos, 
  createMockHandlers 
} from '../../../tests/helpers/adaptiveSidebarTestHelper'

describe('AdaptiveSidebar Search Functionality', () => {
  const testMemos = createTestMemos()
  let mockHandlers: ReturnType<typeof createMockHandlers>

  beforeEach(() => {
    mockHandlers = createMockHandlers()
    vi.clearAllMocks()
  })

  describe('検索フィルタリング', () => {
    it('should filter memos by search query', async () => {
      renderAdaptiveSidebarWithState({
        items: testMemos,
        onItemSelect: mockHandlers.onItemSelect,
        onToggle: mockHandlers.onToggle
      })

      const searchInput = screen.getByPlaceholderText('検索...')
      
      // 検索語を入力
      await userEvent.type(searchInput, '会議')
      
      // デバウンス完了を待つ（300ms + α）
      await waitFor(() => {
        expect(screen.getByText('重要な会議メモ')).toBeInTheDocument()
        expect(screen.queryByText('タスクリスト')).not.toBeInTheDocument()
        expect(screen.queryByText('買い物リスト')).not.toBeInTheDocument()
      }, { timeout: 500 })
    })

    it('should show all memos when search is cleared', async () => {
      renderAdaptiveSidebarWithState({
        items: testMemos,
        initialSearchQuery: '会議', // 初期状態で検索済み
        onItemSelect: mockHandlers.onItemSelect,
        onToggle: mockHandlers.onToggle
      })

      // 初期状態で検索結果のみ表示
      expect(screen.getByText('重要な会議メモ')).toBeInTheDocument()
      expect(screen.queryByText('タスクリスト')).not.toBeInTheDocument()

      const searchInput = screen.getByPlaceholderText('検索...')
      
      // 検索をクリア
      await userEvent.clear(searchInput)
      
      // 全てのメモが表示される
      await waitFor(() => {
        expect(screen.getByText('重要な会議メモ')).toBeInTheDocument()
        expect(screen.getByText('タスクリスト')).toBeInTheDocument()
        expect(screen.getByText('買い物リスト')).toBeInTheDocument()
      }, { timeout: 500 })
    })

    it('should show no results message when no matches found', async () => {
      renderAdaptiveSidebarWithState({
        items: testMemos,
        onItemSelect: mockHandlers.onItemSelect,
        onToggle: mockHandlers.onToggle
      })

      const searchInput = screen.getByPlaceholderText('検索...')
      
      await userEvent.type(searchInput, '存在しない検索語')
      
      await waitFor(() => {
        expect(screen.getByText('検索結果がありません')).toBeInTheDocument()
        expect(screen.queryByText('重要な会議メモ')).not.toBeInTheDocument()
      }, { timeout: 500 })
    })

    it('should clear search when clear button is clicked', async () => {
      renderAdaptiveSidebarWithState({
        items: testMemos,
        initialSearchQuery: '会議',
        onItemSelect: mockHandlers.onItemSelect,
        onToggle: mockHandlers.onToggle
      })

      // 初期状態で検索済み
      expect(screen.queryByText('タスクリスト')).not.toBeInTheDocument()

      // クリアボタンをクリック
      const clearButton = screen.getByLabelText('検索をクリア')
      await userEvent.click(clearButton)

      // 全てのメモが表示される
      await waitFor(() => {
        expect(screen.getByText('タスクリスト')).toBeInTheDocument()
        expect(screen.getByText('買い物リスト')).toBeInTheDocument()
      }, { timeout: 500 })
    })
  })

  describe('検索デバウンス', () => {
    it('should debounce rapid search input', async () => {
      const searchSpy = vi.fn()
      
      renderAdaptiveSidebarWithState({
        items: testMemos,
        onItemSelect: mockHandlers.onItemSelect,
        onToggle: mockHandlers.onToggle
      })

      const searchInput = screen.getByPlaceholderText('検索...')
      
      // 手動でonChangeイベントをトリガーしてデバウンスをテスト
      fireEvent.change(searchInput, { target: { value: 'タ' } })
      fireEvent.change(searchInput, { target: { value: 'タス' } })
      fireEvent.change(searchInput, { target: { value: 'タスク' } })

      // 最終的な検索結果のみが表示される
      await waitFor(() => {
        expect(screen.getByText('タスクリスト')).toBeInTheDocument()
        expect(screen.queryByText('重要な会議メモ')).not.toBeInTheDocument()
      }, { timeout: 500 })
    })
  })

  describe('検索とカテゴリ表示', () => {
    it('should expand all categories when search is active', async () => {
      renderAdaptiveSidebarWithState({
        items: testMemos,
        onItemSelect: mockHandlers.onItemSelect,
        onToggle: mockHandlers.onToggle
      })

      const searchInput = screen.getByPlaceholderText('検索...')
      
      // 部分一致で複数のカテゴリにヒットする検索
      await userEvent.type(searchInput, 'メモ')

      await waitFor(() => {
        // 複数カテゴリのメモが見える（カテゴリが自動展開される）
        expect(screen.getByText('重要な会議メモ')).toBeVisible()
        expect(screen.getByText('その他のメモ')).toBeVisible()
      }, { timeout: 500 })
    })
  })

  describe('検索と仮想スクロール連携', () => {
    it('should handle search with large datasets', async () => {
      // 大量のデータセットを作成（200件超で仮想スクロール有効）
      const largeMemos = Array.from({ length: 250 }, (_, i) => ({
        ...testMemos[0],
        id: `memo_${i}`,
        title: `Test Memo ${i}`,
        text: `Content for memo ${i}`,
        category: i % 3 === 0 ? 'Work' : i % 3 === 1 ? 'Personal' : 'Project'
      }))

      renderAdaptiveSidebarWithState({
        items: largeMemos,
        onItemSelect: mockHandlers.onItemSelect,
        onToggle: mockHandlers.onToggle
      })

      // 仮想スクロールが有効になっている
      expect(screen.getByRole('list', { name: '仮想スクロールリスト' })).toBeInTheDocument()

      const searchInput = screen.getByPlaceholderText('検索...')
      
      // 検索で結果を絞り込み（より限定的な検索）
      await userEvent.type(searchInput, 'Test Memo 249')

      await waitFor(() => {
        // 検索結果が少数の場合は通常表示に切り替わる
        expect(screen.queryByRole('list', { name: '仮想スクロールリスト' })).not.toBeInTheDocument()
      }, { timeout: 500 })
    })
  })
})