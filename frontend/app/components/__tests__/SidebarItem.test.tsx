import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SidebarItem } from '../SidebarItem'
import type { MemoData } from '../../hooks/useMemos'

// テストデータ
const createMockMemo = (overrides?: Partial<MemoData>): MemoData => ({
  id: 'memo_test_123',
  type: 'memo',
  title: 'Test Memo Title',
  text: 'This is a test memo content that is long enough to demonstrate truncation and preview functionality.',
  x: 100,
  y: 100,
  w: 240,
  h: 160,
  zIndex: 1,
  tags: ['test', 'sample'],
  created: new Date('2024-01-01T10:00:00').toISOString(),
  updated: new Date('2024-01-01T15:30:00').toISOString(),
  importance: 'medium',
  category: 'Work',
  ...overrides
})

const mockOnClick = vi.fn()

describe('SidebarItem Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('詳細表示モード (detailed)', () => {
    it('should render title, text preview, tags, and metadata', () => {
      const memo = createMockMemo()
      render(
        <SidebarItem
          item={memo}
          density="detailed"
          onClick={mockOnClick}
        />
      )

      // タイトル
      expect(screen.getByText('Test Memo Title')).toBeInTheDocument()
      
      // テキストプレビュー（2行表示）
      expect(screen.getByText(/This is a test memo content/)).toBeInTheDocument()
      
      // タグ
      expect(screen.getByText('test')).toBeInTheDocument()
      expect(screen.getByText('sample')).toBeInTheDocument()
      
      // 更新時刻（日付表示）
      expect(screen.getByText('1/1')).toBeInTheDocument()
    })

    it('should show importance indicator', () => {
      const { rerender } = render(
        <SidebarItem
          item={createMockMemo({ importance: 'high' })}
          density="detailed"
          onClick={mockOnClick}
        />
      )

      // 高重要度 - 赤色
      let indicator = screen.getByTestId('importance-indicator')
      expect(indicator).toHaveClass('bg-red-500')

      // 中重要度 - 黄色
      rerender(
        <SidebarItem
          item={createMockMemo({ importance: 'medium' })}
          density="detailed"
          onClick={mockOnClick}
        />
      )
      indicator = screen.getByTestId('importance-indicator')
      expect(indicator).toHaveClass('bg-yellow-500')

      // 低重要度 - 灰色
      rerender(
        <SidebarItem
          item={createMockMemo({ importance: 'low' })}
          density="detailed"
          onClick={mockOnClick}
        />
      )
      indicator = screen.getByTestId('importance-indicator')
      expect(indicator).toHaveClass('bg-gray-400')
    })

    it('should truncate long text with ellipsis', () => {
      const longText = 'A'.repeat(200)
      render(
        <SidebarItem
          item={createMockMemo({ text: longText })}
          density="detailed"
          onClick={mockOnClick}
        />
      )

      const textElement = screen.getByText(/^A+/)
      expect(textElement).toHaveClass('line-clamp-2')
    })
  })

  describe('標準表示モード (standard)', () => {
    it('should render title, first line of text, and time', () => {
      render(
        <SidebarItem
          item={createMockMemo()}
          density="standard"
          onClick={mockOnClick}
        />
      )

      // タイトル
      expect(screen.getByText('Test Memo Title')).toBeInTheDocument()
      
      // テキストプレビュー（1行のみ）
      const textElement = screen.getByText(/This is a test memo content/)
      expect(textElement).toHaveClass('line-clamp-1')
      
      // 更新時刻（日付表示）
      expect(screen.getByText('1/1')).toBeInTheDocument()
      
      // タグは表示されない
      expect(screen.queryByText('test')).not.toBeInTheDocument()
    })

    it('should show category icon', () => {
      render(
        <SidebarItem
          item={createMockMemo({ category: 'Work' })}
          density="standard"
          onClick={mockOnClick}
        />
      )

      const icon = screen.getByTestId('category-icon')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('コンパクト表示モード (compact)', () => {
    it('should render only title and time', () => {
      render(
        <SidebarItem
          item={createMockMemo()}
          density="dense"
          onClick={mockOnClick}
        />
      )

      // タイトル
      expect(screen.getByText('Test Memo Title')).toBeInTheDocument()
      
      // 更新時刻（日付表示）
      expect(screen.getByText('1/1')).toBeInTheDocument()
      
      // テキストとタグは表示されない
      expect(screen.queryByText(/This is a test memo content/)).not.toBeInTheDocument()
      expect(screen.queryByText('test')).not.toBeInTheDocument()
    })

    it('should show importance dot only', () => {
      render(
        <SidebarItem
          item={createMockMemo({ importance: 'high' })}
          density="dense"
          onClick={mockOnClick}
        />
      )

      const dot = screen.getByTestId('importance-dot')
      expect(dot).toHaveClass('bg-red-500')
      expect(dot).toHaveClass('w-2', 'h-2') // 小さいドット
    })
  })

  describe('ホバープレビュー機能', () => {
    it('should show preview after 300ms hover', async () => {
      render(
        <SidebarItem
          item={createMockMemo()}
          density="standard"
          onClick={mockOnClick}
        />
      )

      const item = screen.getByRole('button')
      
      // ホバー開始
      fireEvent.mouseEnter(item)
      
      // プレビューはまだ表示されない
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
      
      // 300ms待つ
      vi.advanceTimersByTime(300)
      
      // プレビューが表示される
      await waitFor(() => {
        const preview = screen.getByRole('tooltip')
        expect(preview).toBeInTheDocument()
        expect(preview).toHaveTextContent('Test Memo Title')
        expect(preview).toHaveTextContent(/This is a test memo content/)
      })
    })

    it('should cancel preview on mouse leave before 300ms', async () => {
      render(
        <SidebarItem
          item={createMockMemo()}
          density="standard"
          onClick={mockOnClick}
        />
      )

      const item = screen.getByRole('button')
      
      // ホバー開始
      fireEvent.mouseEnter(item)
      
      // 200ms後にマウスを離す
      vi.advanceTimersByTime(200)
      fireEvent.mouseLeave(item)
      
      // さらに200ms待っても表示されない
      vi.advanceTimersByTime(200)
      
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    it('should hide preview on mouse leave', async () => {
      render(
        <SidebarItem
          item={createMockMemo()}
          density="standard"
          onClick={mockOnClick}
        />
      )

      const item = screen.getByRole('button')
      
      // プレビューを表示
      fireEvent.mouseEnter(item)
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument()
      })
      
      // マウスを離す
      fireEvent.mouseLeave(item)
      
      // プレビューが消える
      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
      })
    })

    it('should show full content in preview', async () => {
      const longText = 'This is a very long text that will be truncated in the list view but should be fully visible in the preview tooltip. '.repeat(5)
      
      render(
        <SidebarItem
          item={createMockMemo({ text: longText })}
          density="standard"
          onClick={mockOnClick}
        />
      )

      const item = screen.getByRole('button')
      fireEvent.mouseEnter(item)
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        const preview = screen.getByRole('tooltip')
        expect(preview).toHaveTextContent(longText.trim())
      })
    })

    it('should position preview correctly', async () => {
      render(
        <SidebarItem
          item={createMockMemo()}
          density="standard"
          onClick={mockOnClick}
        />
      )

      const item = screen.getByRole('button')
      
      // アイテムの位置を設定
      Object.defineProperty(item, 'getBoundingClientRect', {
        value: () => ({
          top: 100,
          left: 50,
          right: 350,
          bottom: 150,
          width: 300,
          height: 50
        })
      })
      
      fireEvent.mouseEnter(item)
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        const preview = screen.getByRole('tooltip')
        // プレビューはアイテムの右側に表示される
        expect(preview).toHaveStyle({
          position: 'fixed',
          left: '360px', // item.right + 10px
          top: '100px'
        })
      })
    })
  })

  describe('クリックイベント', () => {
    it('should call onClick when clicked', async () => {
      const user = userEvent.setup({ delay: null })
      const memo = createMockMemo()
      
      render(
        <SidebarItem
          item={memo}
          density="standard"
          onClick={mockOnClick}
        />
      )

      await user.click(screen.getByRole('button'))
      
      expect(mockOnClick).toHaveBeenCalledWith(memo)
    })

    it('should hide preview when clicked', async () => {
      const user = userEvent.setup({ delay: null })
      
      render(
        <SidebarItem
          item={createMockMemo()}
          density="standard"
          onClick={mockOnClick}
        />
      )

      const item = screen.getByRole('button')
      
      // プレビューを表示
      fireEvent.mouseEnter(item)
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument()
      })
      
      // クリック
      await user.click(item)
      
      // プレビューが消える
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })
  })

  describe('選択状態', () => {
    it('should apply selected styles when isSelected is true', () => {
      render(
        <SidebarItem
          item={createMockMemo()}
          density="standard"
          onClick={mockOnClick}
          isSelected={true}
        />
      )

      const item = screen.getByRole('button')
      expect(item).toHaveClass('bg-blue-50', 'border-blue-300')
    })

    it('should apply hover styles when not selected', async () => {
      const user = userEvent.setup({ delay: null })
      
      render(
        <SidebarItem
          item={createMockMemo()}
          density="standard"
          onClick={mockOnClick}
          isSelected={false}
        />
      )

      const item = screen.getByRole('button')
      
      // ホバー前
      expect(item).toHaveClass('hover:bg-gray-50')
      
      // ホバー時のスタイルが適用されることを確認
      await user.hover(item)
    })
  })

  describe('時刻表示', () => {
    it('should show relative time for recent updates', () => {
      // 30分前
      const recentMemo = createMockMemo({
        updated: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      })
      
      render(
        <SidebarItem
          item={recentMemo}
          density="standard"
          onClick={mockOnClick}
        />
      )

      expect(screen.getByText('30分前')).toBeInTheDocument()
    })

    it('should show time for today', () => {
      // 今日の15:30
      const today = new Date()
      today.setHours(15, 30, 0, 0)
      
      render(
        <SidebarItem
          item={createMockMemo({ updated: today.toISOString() })}
          density="standard"
          onClick={mockOnClick}
        />
      )

      expect(screen.getByText('15:30')).toBeInTheDocument()
    })

    it('should show date for older items', () => {
      // 3日前
      const oldMemo = createMockMemo({
        updated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      })
      
      render(
        <SidebarItem
          item={oldMemo}
          density="standard"
          onClick={mockOnClick}
        />
      )

      // 日付形式で表示される（3日前なので3d）
      expect(screen.getByText('3d')).toBeInTheDocument()
    })
  })

  describe('アクセシビリティ', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <SidebarItem
          item={createMockMemo()}
          density="standard"
          onClick={mockOnClick}
          isSelected={false}
        />
      )

      const item = screen.getByRole('button')
      expect(item).toHaveAttribute('aria-label', 'Test Memo Title を開く')
      expect(item).toHaveAttribute('aria-selected', 'false')
    })

    it('should update aria-selected when selected', () => {
      render(
        <SidebarItem
          item={createMockMemo()}
          density="standard"
          onClick={mockOnClick}
          isSelected={true}
        />
      )

      const item = screen.getByRole('button')
      expect(item).toHaveAttribute('aria-selected', 'true')
    })

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup({ delay: null })
      
      render(
        <SidebarItem
          item={createMockMemo()}
          density="standard"
          onClick={mockOnClick}
        />
      )

      const item = screen.getByRole('button')
      
      // フォーカス
      item.focus()
      expect(item).toHaveFocus()
      
      // Enterキーで選択
      await user.keyboard('{Enter}')
      expect(mockOnClick).toHaveBeenCalled()
    })
  })

  describe('エッジケース', () => {
    it('should handle memo without title', () => {
      render(
        <SidebarItem
          item={createMockMemo({ title: '' })}
          density="standard"
          onClick={mockOnClick}
        />
      )

      expect(screen.getByText('無題のメモ')).toBeInTheDocument()
    })

    it('should handle memo without text', () => {
      render(
        <SidebarItem
          item={createMockMemo({ text: '' })}
          density="detailed"
          onClick={mockOnClick}
        />
      )

      expect(screen.getByText(/内容なし/)).toBeInTheDocument()
    })

    it('should handle memo without tags', () => {
      render(
        <SidebarItem
          item={createMockMemo({ tags: [] })}
          density="detailed"
          onClick={mockOnClick}
        />
      )

      // タグセクションが表示されない
      expect(screen.queryByTestId('tags-container')).not.toBeInTheDocument()
    })
  })
})