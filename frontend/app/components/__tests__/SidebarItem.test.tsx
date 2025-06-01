import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SidebarItem } from '../SidebarItem'
import type { MemoData } from '../../hooks/useMemos'

// 基本テストデータ
const createBasicMemo = (): MemoData => ({
  id: 'test-memo',
  type: 'memo',
  title: 'Test Title',
  text: 'Test content',
  x: 0,
  y: 0,
  w: 200,
  h: 150,
  zIndex: 1,
  created: new Date('2024-01-01').toISOString(),
  updated: new Date('2024-01-01').toISOString(),
  visible: true
})

describe('SidebarItem Basic Tests', () => {
  it('should render basic memo information', () => {
    const memo = createBasicMemo()
    const mockOnClick = vi.fn()
    const mockOnToggleVisibility = vi.fn()
    const mockOnFocusOnCanvas = vi.fn()

    render(
      <SidebarItem
        item={memo}
        density="standard"
        onClick={mockOnClick}
        onToggleVisibility={mockOnToggleVisibility}
        onFocusOnCanvas={mockOnFocusOnCanvas}
      />
    )

    // 基本表示の確認
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar-item-main')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-visibility-button')).toBeInTheDocument()
  })

  it('should show focus button for hidden memo', () => {
    const memo = { ...createBasicMemo(), visible: false }
    const mockOnClick = vi.fn()
    const mockOnToggleVisibility = vi.fn()
    const mockOnFocusOnCanvas = vi.fn()

    render(
      <SidebarItem
        item={memo}
        density="standard"
        onClick={mockOnClick}
        onToggleVisibility={mockOnToggleVisibility}
        onFocusOnCanvas={mockOnFocusOnCanvas}
      />
    )

    expect(screen.getByTestId('focus-on-canvas-button')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-visibility-button')).toBeInTheDocument()
  })
})