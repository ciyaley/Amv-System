import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdaptiveSidebar } from '../AdaptiveSidebar'
import type { MemoData } from '../../hooks/useMemos'

// テストデータファクトリー（大量データ用）
const createMockMemo = (index: number): MemoData => ({
  id: `memo_${index}`,
  type: 'memo',
  title: `Memo ${index}`,
  text: `Content for memo ${index}`,
  x: 100,
  y: 100,
  w: 240,
  h: 160,
  zIndex: 1,
  tags: [`tag${index % 10}`],
  created: new Date(Date.now() - index * 1000 * 60).toISOString(),
  updated: new Date(Date.now() - index * 1000 * 30).toISOString(),
  importance: ['low', 'medium', 'high'][index % 3] as 'low' | 'medium' | 'high',
  category: ['Work', 'Personal', 'Project'][index % 3]
})

// 大量テストデータ生成
const generateLargeMemoDataset = (count: number): MemoData[] => 
  Array.from({ length: count }, (_, i) => createMockMemo(i))

describe('AdaptiveSidebar Virtual Scroll Integration', () => {
  const mockOnItemSelect = vi.fn()
  const mockOnToggle = vi.fn()
  const mockOnSearchChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Virtual Scroll 関連のモック
    global.IntersectionObserver = vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })) as any

    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      top: 0,
      left: 0,
      bottom: 600,
      right: 320,
      width: 320,
      height: 600,
      x: 0,
      y: 0,
      toJSON: vi.fn()
    }))

    Element.prototype.scrollIntoView = vi.fn()
  })

  describe('仮想スクロール有効化条件', () => {
    it('should not enable virtual scroll for small datasets (< 200 items)', () => {
      const items = generateLargeMemoDataset(150)
      
      render(
        <AdaptiveSidebar
          items={items}
          isOpen={true}
          onItemSelect={mockOnItemSelect}
          onToggle={mockOnToggle}
          onSearchChange={mockOnSearchChange}
        />
      )

      // 通常のサイドバーが表示される
      expect(screen.getByRole('complementary')).toBeInTheDocument()
      
      // 仮想スクロールコンテナは使用されない
      expect(screen.queryByRole('list', { name: '仮想スクロールリスト' })).not.toBeInTheDocument()
    })

    it('should enable virtual scroll for large datasets (200+ items)', () => {
      const items = generateLargeMemoDataset(250)
      
      render(
        <AdaptiveSidebar
          items={items}
          isOpen={true}
          onItemSelect={mockOnItemSelect}
          onToggle={mockOnToggle}
          onSearchChange={mockOnSearchChange}
        />
      )

      // サイドバーが表示される
      expect(screen.getByRole('complementary')).toBeInTheDocument()
      
      // 仮想スクロールコンテナが使用される
      expect(screen.getByRole('list', { name: '仮想スクロールリスト' })).toBeInTheDocument()
    })

    it('should enable virtual scroll for very large datasets (1000+ items)', () => {
      const items = generateLargeMemoDataset(1500)
      
      render(
        <AdaptiveSidebar
          items={items}
          isOpen={true}
          onItemSelect={mockOnItemSelect}
          onToggle={mockOnToggle}
          onSearchChange={mockOnSearchChange}
        />
      )

      // 仮想スクロールが有効
      expect(screen.getByRole('list', { name: '仮想スクロールリスト' })).toBeInTheDocument()
      
      // すべてのアイテムが一度にレンダリングされない
      const renderedItems = screen.getAllByRole('button').filter(
        button => button.getAttribute('aria-label')?.includes('を開く')
      )
      expect(renderedItems.length).toBeLessThan(100) // 大幅に少ない
    })
  })

  describe('密度設定との連携', () => {
    it('should apply correct item height for detailed density in virtual scroll', async () => {
      const items = generateLargeMemoDataset(300)
      
      render(
        <AdaptiveSidebar
          items={items}
          isOpen={true}
          onItemSelect={mockOnItemSelect}
          onToggle={mockOnToggle}
          onSearchChange={mockOnSearchChange}
        />
      )

      // 詳細表示に切り替え
      const detailedButton = screen.getByLabelText('detailed表示')
      fireEvent.click(detailedButton)

      await waitFor(() => {
        // 仮想スクロールコンテナが詳細密度（80px）で設定される
        const virtualScrollContainer = screen.getByRole('list', { name: '仮想スクロールリスト' })
        const innerContainer = virtualScrollContainer.querySelector('div')!
        
        // 総高さが 300 * 80 = 24000px になる
        expect(innerContainer).toHaveStyle({ height: '24000px' })
      })
    })

    it('should apply correct item height for standard density in virtual scroll', () => {
      const items = generateLargeMemoDataset(300)
      
      render(
        <AdaptiveSidebar
          items={items}
          isOpen={true}
          onItemSelect={mockOnItemSelect}
          onToggle={mockOnToggle}
          onSearchChange={mockOnSearchChange}
        />
      )

      // デフォルトは標準表示（48px）
      const virtualScrollContainer = screen.getByRole('list', { name: '仮想スクロールリスト' })
      const innerContainer = virtualScrollContainer.querySelector('div')!
      
      // 総高さが 300 * 48 = 14400px になる
      expect(innerContainer).toHaveStyle({ height: '14400px' })
    })

    it('should apply correct item height for dense density in virtual scroll', async () => {
      const items = generateLargeMemoDataset(300)
      
      render(
        <AdaptiveSidebar
          items={items}
          isOpen={true}
          onItemSelect={mockOnItemSelect}
          onToggle={mockOnToggle}
          onSearchChange={mockOnSearchChange}
        />
      )

      // 密集表示に切り替え
      const denseButton = screen.getByLabelText('dense表示')
      fireEvent.click(denseButton)

      await waitFor(() => {
        // 仮想スクロールコンテナが密集密度（32px）で設定される
        const virtualScrollContainer = screen.getByRole('list', { name: '仮想スクロールリスト' })
        const innerContainer = virtualScrollContainer.querySelector('div')!
        
        // 総高さが 300 * 32 = 9600px になる
        expect(innerContainer).toHaveStyle({ height: '9600px' })
      })
    })
  })

  describe('検索機能との連携', () => {
    it('should maintain virtual scroll when search results are large', async () => {
      const items = generateLargeMemoDataset(500)
      
      render(
        <AdaptiveSidebar
          items={items}
          isOpen={true}
          onItemSelect={mockOnItemSelect}
          onToggle={mockOnToggle}
          onSearchChange={mockOnSearchChange}
        />
      )

      // 検索クエリを入力（200件以上の結果を想定）
      const searchInput = screen.getByPlaceholderText('検索...')
      fireEvent.change(searchInput, { target: { value: 'Memo' } })

      // 検索結果が大量でも仮想スクロールが維持される
      await waitFor(() => {
        expect(screen.getByRole('list', { name: '仮想スクロールリスト' })).toBeInTheDocument()
      })
    })

    it('should disable virtual scroll when search results are small', async () => {
      const items = generateLargeMemoDataset(500)
      
      render(
        <AdaptiveSidebar
          items={items}
          isOpen={true}
          onItemSelect={mockOnItemSelect}
          onToggle={mockOnToggle}
          onSearchChange={mockOnSearchChange}
        />
      )

      // 非常に特定的な検索クエリ（少数の結果を想定）
      const searchInput = screen.getByPlaceholderText('検索...')
      fireEvent.change(searchInput, { target: { value: 'Memo 1' } }) // 1件のみヒット

      // 検索結果が少数の場合は通常表示に戻る
      await waitFor(() => {
        expect(screen.queryByRole('list', { name: '仮想スクロールリスト' })).not.toBeInTheDocument()
      })
    })
  })

  describe('カテゴリ表示との連携', () => {
    it('should group items by category even in virtual scroll mode', () => {
      const items = generateLargeMemoDataset(300)
      
      render(
        <AdaptiveSidebar
          items={items}
          isOpen={true}
          onItemSelect={mockOnItemSelect}
          onToggle={mockOnToggle}
          onSearchChange={mockOnSearchChange}
        />
      )

      // カテゴリヘッダーが表示される
      expect(screen.getByText('Work')).toBeInTheDocument()
      expect(screen.getByText('Personal')).toBeInTheDocument()
      expect(screen.getByText('Project')).toBeInTheDocument()

      // 仮想スクロールと併用される
      expect(screen.getByRole('list', { name: '仮想スクロールリスト' })).toBeInTheDocument()
    })

    it('should handle category expansion/collapse in virtual scroll', async () => {
      const items = generateLargeMemoDataset(300)
      
      render(
        <AdaptiveSidebar
          items={items}
          isOpen={true}
          onItemSelect={mockOnItemSelect}
          onToggle={mockOnToggle}
          onSearchChange={mockOnSearchChange}
        />
      )

      // Workカテゴリを折りたたみ
      const workCategoryButton = screen.getByText('Work').closest('button')!
      fireEvent.click(workCategoryButton)

      await waitFor(() => {
        // 仮想スクロールの高さが調整される
        const virtualScrollContainer = screen.getByRole('list', { name: '仮想スクロールリスト' })
        const innerContainer = virtualScrollContainer.querySelector('div')!
        
        // Workカテゴリの分だけ高さが減る
        const expectedHeight = (300 - 100) * 48 // Work分（100件）を除いた高さ
        expect(innerContainer).toHaveStyle({ height: `${expectedHeight}px` })
      })
    })
  })

  describe('パフォーマンス検証', () => {
    it('should render large datasets efficiently', () => {
      const startTime = performance.now()
      const items = generateLargeMemoDataset(2000)
      
      render(
        <AdaptiveSidebar
          items={items}
          isOpen={true}
          onItemSelect={mockOnItemSelect}
          onToggle={mockOnToggle}
          onSearchChange={mockOnSearchChange}
        />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // 2000件のデータでも200ms以内でレンダリング完了
      expect(renderTime).toBeLessThan(200)

      // 仮想スクロールが有効になっている
      expect(screen.getByRole('list', { name: '仮想スクロールリスト' })).toBeInTheDocument()
    })

    it('should maintain smooth scrolling performance', async () => {
      const items = generateLargeMemoDataset(1000)
      
      render(
        <AdaptiveSidebar
          items={items}
          isOpen={true}
          onItemSelect={mockOnItemSelect}
          onToggle={mockOnToggle}
          onSearchChange={mockOnSearchChange}
        />
      )

      const container = screen.getByRole('list', { name: '仮想スクロールリスト' })

      // 連続スクロールイベント
      const scrollPromises = Array.from({ length: 10 }, (_, i) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            fireEvent.scroll(container, { target: { scrollTop: i * 100 } })
            resolve()
          }, i * 10)
        })
      })

      await Promise.all(scrollPromises)

      // スクロール後もコンポーネントが正常に動作
      expect(screen.getByRole('list', { name: '仮想スクロールリスト' })).toBeInTheDocument()
    })
  })
})