import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CategorySection } from '../CategorySection'
import type { MemoData } from '../../types/tools'

// テストデータ
const createMockMemo = (overrides?: Partial<MemoData>): MemoData => ({
  id: `memo_${Math.random()}`,
  type: 'memo',
  title: 'Test Memo',
  text: 'Test content',
  content: 'Test content',
  sourceType: 'guest',
  x: 100,
  y: 100,
  w: 240,
  h: 160,
  zIndex: 1,
  tags: ['test'],
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  appearance: {
    backgroundColor: '#ffeaa7',
    borderColor: '#fdcb6e'
  },
  ...overrides
})

describe('CategorySection Component', () => {
  const mockOnItemClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本表示', () => {
    it('should render category header with item count', () => {
      const items = [createMockMemo(), createMockMemo()]
      
      render(
        <CategorySection
          category="Tech"
          items={items}
          density="standard"
          onItemClick={mockOnItemClick}
        />
      )

      expect(screen.getByText('Tech')).toBeInTheDocument()
      expect(screen.getByText('(2件)')).toBeInTheDocument()
    })

    it('should expand/collapse when header is clicked', async () => {
      const user = userEvent.setup()
      const items = [createMockMemo()]
      
      render(
        <CategorySection
          category="Tech"
          items={items}
          density="standard"
          defaultExpanded={true}
          onItemClick={mockOnItemClick}
        />
      )

      const header = screen.getByRole('button', { name: /Tech/ })
      
      // Initially expanded
      expect(screen.getByText('Test Memo')).toBeInTheDocument()
      
      // Click to collapse
      await user.click(header)
      expect(screen.queryByText('Test Memo')).not.toBeInTheDocument()
    })
  })

  describe('Show more button', () => {
    it('should show "show more" button when items exceed display limit', () => {
      const items = Array.from({ length: 10 }, () => createMockMemo())
      
      render(
        <CategorySection
          category="Tech"
          items={items}
          density="standard"
          defaultExpanded={true}
          onItemClick={mockOnItemClick}
        />
      )

      expect(screen.getByText(/もっと見る/)).toBeInTheDocument()
    })

    it('should show more items when "show more" is clicked', async () => {
      const user = userEvent.setup()
      const items = Array.from({ length: 10 }, (_, i) => 
        createMockMemo({ title: `Memo ${i + 1}` })
      )
      
      render(
        <CategorySection
          category="Tech"
          items={items}
          density="standard"
          defaultExpanded={true}
          onItemClick={mockOnItemClick}
        />
      )

      const showMoreButton = screen.getByText(/もっと見る/)
      await user.click(showMoreButton)

      // More items should be visible now
      expect(screen.getByText('Memo 6')).toBeInTheDocument()
    })
  })
})