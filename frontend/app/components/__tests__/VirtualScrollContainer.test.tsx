import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { VirtualScrollContainer } from '../VirtualScrollContainer'
import type { MemoData } from '../../types/tools'

// テストデータファクトリー
const createMockMemo = (index: number): MemoData => ({
  id: `memo_${index}`,
  type: 'memo',
  title: `Test Memo ${index}`,
  text: `This is memo content ${index}`,
  content: `This is memo content ${index}`,
  sourceType: 'guest',
  x: 100,
  y: 100,
  w: 240,
  h: 160,
  zIndex: 1,
  tags: [`tag${index}`],
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  importance: 'medium',
  category: index % 3 === 0 ? 'Work' : index % 3 === 1 ? 'Personal' : 'Project'
})

// 大量テストデータ生成
const generateMockMemos = (count: number): MemoData[] => 
  Array.from({ length: count }, (_, i) => createMockMemo(i))

describe('VirtualScrollContainer Component', () => {
  const mockOnItemSelect = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    // IntersectionObserver のモック
    global.IntersectionObserver = vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })) as unknown as typeof IntersectionObserver

    // getBoundingClientRect のモック
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      top: 0,
      left: 0,
      bottom: 400,
      right: 300,
      width: 300,
      height: 400,
      x: 0,
      y: 0,
      toJSON: vi.fn()
    }))

    // scrollIntoView のモック
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('基本レンダリング', () => {
    it('should render virtual scroll container with basic props', () => {
      const items = generateMockMemos(10)
      
      render(
        <VirtualScrollContainer
          items={items}
          itemHeight={48}
          height={400}
          onItemSelect={mockOnItemSelect}
        />
      )

      expect(screen.getByRole('list')).toBeInTheDocument()
      expect(screen.getByRole('list')).toHaveAttribute('aria-label', '仮想スクロールリスト')
    })

    it('should render only visible items for large datasets', () => {
      const items = generateMockMemos(1000)
      
      render(
        <VirtualScrollContainer
          items={items}
          itemHeight={48}
          height={400}
          onItemSelect={mockOnItemSelect}
        />
      )

      // 400px / 48px = 8.33 → 9個 + overscan 3 = 12個程度が表示される
      const listItems = screen.getAllByRole('listitem')
      expect(listItems.length).toBeLessThan(20) // 大幅に少ない
      expect(listItems.length).toBeGreaterThan(5) // でも最低限は表示
    })

    it('should handle empty items list', () => {
      render(
        <VirtualScrollContainer
          items={[]}
          itemHeight={48}
          height={400}
          onItemSelect={mockOnItemSelect}
        />
      )

      expect(screen.getByRole('list')).toBeInTheDocument()
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    })
  })

  describe('スクロール動作', () => {
    it('should update visible items on scroll', async () => {
      const items = generateMockMemos(1000)
      
      render(
        <VirtualScrollContainer
          items={items}
          itemHeight={48}
          height={400}
          onItemSelect={mockOnItemSelect}
        />
      )

      const container = screen.getByRole('list')

      // 初期状態：最初のアイテムが表示
      expect(screen.getByText('Test Memo 0')).toBeInTheDocument()
      expect(screen.queryByText('Test Memo 50')).not.toBeInTheDocument()

      // スクロールイベントをシミュレート
      act(() => {
        Object.defineProperty(container, 'scrollTop', {
          value: 2400, // 50 * 48 = 2400
          writable: true
        })
        fireEvent.scroll(container)
      })

      // デバウンス後にアイテムが更新される
      await waitFor(() => {
        expect(screen.queryByText('Test Memo 0')).not.toBeInTheDocument()
        expect(screen.getByText('Test Memo 50')).toBeInTheDocument()
      }, { timeout: 100 })
    })

    it('should maintain accurate scroll position', () => {
      const items = generateMockMemos(1000)
      
      const { container } = render(
        <VirtualScrollContainer
          items={items}
          itemHeight={48}
          height={400}
          onItemSelect={mockOnItemSelect}
        />
      )

      const scrollContainer = container.querySelector('[role="list"]')
      if (!scrollContainer) throw new Error('Scroll container not found')

      // 総高さが正しく設定されている
      const innerContainer = scrollContainer.querySelector('div')
      if (!innerContainer) throw new Error('Inner container not found')
      expect(innerContainer).toHaveStyle({ height: '48000px' }) // 1000 * 48
    })
  })

  describe('密度別表示', () => {
    it('should render items with detailed density (80px height)', () => {
      const items = generateMockMemos(100)
      
      render(
        <VirtualScrollContainer
          items={items}
          itemHeight={80}
          height={400}
          onItemSelect={mockOnItemSelect}
          density="detailed"
        />
      )

      const container = screen.getByRole('list')
      const innerContainer = container.querySelector('div')
      if (!innerContainer) throw new Error('Inner container not found')
      expect(innerContainer).toHaveStyle({ height: '8000px' }) // 100 * 80
    })

    it('should render items with dense density (32px height)', () => {
      const items = generateMockMemos(100)
      
      render(
        <VirtualScrollContainer
          items={items}
          itemHeight={32}
          height={400}
          onItemSelect={mockOnItemSelect}
          density="dense"
        />
      )

      const container = screen.getByRole('list')
      const innerContainer = container.querySelector('div')
      if (!innerContainer) throw new Error('Inner container not found')
      expect(innerContainer).toHaveStyle({ height: '3200px' }) // 100 * 32
    })
  })

  describe('パフォーマンス', () => {
    it('should not re-render invisible items when scrolling', async () => {
      const items = generateMockMemos(1000)
      const renderCounts = new Map<string, number>()

      const TrackedItem = ({ item }: { item: MemoData }) => {
        const count = renderCounts.get(item.id) || 0
        renderCounts.set(item.id, count + 1)
        return <div data-testid={`item-${item.id}`}>{item.title}</div>
      }

      render(
        <VirtualScrollContainer
          items={items}
          itemHeight={48}
          height={400}
          onItemSelect={mockOnItemSelect}
          renderItem={TrackedItem}
        />
      )

      const container = screen.getByRole('list')

      // 初期レンダリング
      const initialRenderCount = renderCounts.get('memo_0') || 0

      // スクロール
      act(() => {
        Object.defineProperty(container, 'scrollTop', {
          value: 2400,
          writable: true
        })
        fireEvent.scroll(container)
      })

      await waitFor(() => {
        // 非可視アイテムは再レンダリングされない
        expect(renderCounts.get('memo_0')).toBe(initialRenderCount)
      })
    })

    it('should debounce scroll events', async () => {
      const items = generateMockMemos(1000)
      const scrollHandler = vi.fn()

      render(
        <VirtualScrollContainer
          items={items}
          itemHeight={48}
          height={400}
          onItemSelect={mockOnItemSelect}
          onScroll={scrollHandler}
        />
      )

      const container = screen.getByRole('list')

      // 連続してスクロールイベントを発火
      act(() => {
        fireEvent.scroll(container)
        fireEvent.scroll(container)
        fireEvent.scroll(container)
      })

      // デバウンス期間(16ms)の完了を待つ
      await waitFor(() => {
        expect(scrollHandler).toHaveBeenCalledTimes(1)
      }, { timeout: 100 })
    })
  })

  describe('アクセシビリティ', () => {
    it('should have proper ARIA attributes', () => {
      const items = generateMockMemos(100)
      
      render(
        <VirtualScrollContainer
          items={items}
          itemHeight={48}
          height={400}
          onItemSelect={mockOnItemSelect}
        />
      )

      const container = screen.getByRole('list')
      expect(container).toHaveAttribute('aria-label', '仮想スクロールリスト')
      expect(container).toHaveAttribute('tabIndex', '0')
    })

    it('should support keyboard navigation', async () => {
      const items = generateMockMemos(100)
      
      render(
        <VirtualScrollContainer
          items={items}
          itemHeight={48}
          height={400}
          onItemSelect={mockOnItemSelect}
        />
      )

      const container = screen.getByRole('list')
      container.focus()

      // ArrowDown キーで下にスクロール
      fireEvent.keyDown(container, { key: 'ArrowDown' })
      
      await waitFor(() => {
        expect(container.scrollTop).toBeGreaterThan(0)
      })

      // ArrowUp キーで上にスクロール
      fireEvent.keyDown(container, { key: 'ArrowUp' })
      
      await waitFor(() => {
        expect(container.scrollTop).toBe(0)
      })
    })

    it('should support Page Up/Down navigation', async () => {
      const items = generateMockMemos(1000)
      
      render(
        <VirtualScrollContainer
          items={items}
          itemHeight={48}
          height={400}
          onItemSelect={mockOnItemSelect}
        />
      )

      const container = screen.getByRole('list')
      container.focus()

      // PageDown キーで1画面分スクロール
      fireEvent.keyDown(container, { key: 'PageDown' })
      
      await waitFor(() => {
        expect(container.scrollTop).toBe(400) // コンテナ高さ分スクロール
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('should handle invalid item height gracefully', () => {
      const items = generateMockMemos(10)
      
      expect(() => {
        render(
          <VirtualScrollContainer
            items={items}
            itemHeight={0}
            height={400}
            onItemSelect={mockOnItemSelect}
          />
        )
      }).not.toThrow()
    })

    it('should handle invalid container height gracefully', () => {
      const items = generateMockMemos(10)
      
      expect(() => {
        render(
          <VirtualScrollContainer
            items={items}
            itemHeight={48}
            height={0}
            onItemSelect={mockOnItemSelect}
          />
        )
      }).not.toThrow()
    })

    it('should handle rapid item changes without crashing', async () => {
      let items = generateMockMemos(100)
      
      const { rerender } = render(
        <VirtualScrollContainer
          items={items}
          itemHeight={48}
          height={400}
          onItemSelect={mockOnItemSelect}
        />
      )

      // アイテムを急速に変更
      for (let i = 0; i < 10; i++) {
        items = generateMockMemos(100 + i * 10)
        rerender(
          <VirtualScrollContainer
            items={items}
            itemHeight={48}
            height={400}
            onItemSelect={mockOnItemSelect}
          />
        )
      }

      // クラッシュしない
      expect(screen.getByRole('list')).toBeInTheDocument()
    })
  })
})