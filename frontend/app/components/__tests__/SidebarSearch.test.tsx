import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SidebarSearch } from '../SidebarSearch'

describe('SidebarSearch Component', () => {
  const mockOnSearch = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('基本表示', () => {
    it('should render search input with placeholder', () => {
      render(<SidebarSearch onSearch={mockOnSearch} />)
      
      const input = screen.getByPlaceholderText('検索...')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'search')
    })

    it('should show search icon', () => {
      render(<SidebarSearch onSearch={mockOnSearch} />)
      
      // Search iconはaria-hiddenのため、containerで検証
      const searchContainer = screen.getByRole('search')
      expect(searchContainer).toBeInTheDocument()
    })

    it('should have proper ARIA attributes', () => {
      render(<SidebarSearch onSearch={mockOnSearch} />)
      
      const searchContainer = screen.getByRole('search')
      expect(searchContainer).toBeInTheDocument()
      
      // type="search"の場合、role="searchbox"が暗黙的に設定される
      const input = screen.getByRole('searchbox')
      expect(input).toHaveAttribute('aria-label', 'アイテムを検索')
      expect(input).toHaveAttribute('type', 'search')
    })
  })

  describe('検索入力', () => {
    it('should update input value when typing', async () => {
      const user = userEvent.setup({ delay: null })
      render(<SidebarSearch onSearch={mockOnSearch} />)
      
      const input = screen.getByPlaceholderText('検索...')
      await user.type(input, 'test query')
      
      expect(input).toHaveValue('test query')
    })

    it('should call onSearch after debounce delay', async () => {
      const user = userEvent.setup({ delay: null })
      render(<SidebarSearch onSearch={mockOnSearch} />)
      
      const input = screen.getByPlaceholderText('検索...')
      await user.type(input, 'test')
      
      // デバウンス前は呼ばれない
      expect(mockOnSearch).not.toHaveBeenCalled()
      
      // デバウンス後に呼ばれる
      vi.advanceTimersByTime(300)
      expect(mockOnSearch).toHaveBeenCalledWith('test')
    })

    it('should show clear button when input has value', async () => {
      const user = userEvent.setup({ delay: null })
      render(<SidebarSearch onSearch={mockOnSearch} />)
      
      const input = screen.getByPlaceholderText('検索...')
      
      // 初期状態ではクリアボタンは表示されない
      expect(screen.queryByLabelText('検索をクリア')).not.toBeInTheDocument()
      
      // 入力後はクリアボタンが表示される
      await user.type(input, 'test')
      expect(screen.getByLabelText('検索をクリア')).toBeInTheDocument()
    })
  })

  describe('クリア機能', () => {
    it('should clear input when clear button is clicked', async () => {
      const user = userEvent.setup({ delay: null })
      render(<SidebarSearch onSearch={mockOnSearch} />)
      
      const input = screen.getByPlaceholderText('検索...')
      await user.type(input, 'test query')
      
      const clearButton = screen.getByLabelText('検索をクリア')
      await user.click(clearButton)
      
      expect(input).toHaveValue('')
      expect(mockOnSearch).toHaveBeenLastCalledWith('')
    })

    it('should clear input on Escape key', async () => {
      const user = userEvent.setup({ delay: null })
      render(<SidebarSearch onSearch={mockOnSearch} />)
      
      const input = screen.getByPlaceholderText('検索...')
      await user.type(input, 'test')
      await user.keyboard('{Escape}')
      
      expect(input).toHaveValue('')
      expect(mockOnSearch).toHaveBeenLastCalledWith('')
    })

    it('should focus input after clearing', async () => {
      const user = userEvent.setup({ delay: null })
      render(<SidebarSearch onSearch={mockOnSearch} />)
      
      const input = screen.getByPlaceholderText('検索...')
      await user.type(input, 'test')
      
      const clearButton = screen.getByLabelText('検索をクリア')
      await user.click(clearButton)
      
      expect(input).toHaveFocus()
    })
  })

  describe('ローディング状態', () => {
    it('should show loading indicator when isLoading is true', () => {
      render(<SidebarSearch onSearch={mockOnSearch} isLoading={true} />)
      
      // ローディングスピナーが表示される
      const clearButton = screen.getByLabelText('検索をクリア')
      expect(clearButton.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should not show loading when isLoading is false', async () => {
      const user = userEvent.setup({ delay: null })
      render(<SidebarSearch onSearch={mockOnSearch} isLoading={false} />)
      
      const input = screen.getByPlaceholderText('検索...')
      await user.type(input, 'test')
      
      const clearButton = screen.getByLabelText('検索をクリア')
      expect(clearButton.querySelector('.animate-spin')).not.toBeInTheDocument()
    })
  })

  describe('カスタム設定', () => {
    it('should use custom placeholder', () => {
      render(<SidebarSearch onSearch={mockOnSearch} placeholder="カスタム検索..." />)
      
      expect(screen.getByPlaceholderText('カスタム検索...')).toBeInTheDocument()
    })

    it('should use custom debounce delay', async () => {
      const user = userEvent.setup({ delay: null })
      render(<SidebarSearch onSearch={mockOnSearch} debounceMs={500} />)
      
      const input = screen.getByPlaceholderText('検索...')
      await user.type(input, 'test')
      
      // 300msでは呼ばれない
      vi.advanceTimersByTime(300)
      expect(mockOnSearch).not.toHaveBeenCalled()
      
      // 500msで呼ばれる
      vi.advanceTimersByTime(200)
      expect(mockOnSearch).toHaveBeenCalledWith('test')
    })
  })

  describe('アクセシビリティ', () => {
    it('should have proper ARIA structure', () => {
      render(<SidebarSearch onSearch={mockOnSearch} />)
      
      const searchContainer = screen.getByRole('search')
      expect(searchContainer).toBeInTheDocument()
      
      // アクセシビリティテスト: searchbox roleでアクセス可能であること
      const input = screen.getByRole('searchbox')
      expect(input).toHaveAttribute('aria-label', 'アイテムを検索')
      expect(input).toHaveAttribute('type', 'search')
      
      // ラベルでもアクセス可能であること
      const inputByLabel = screen.getByLabelText('アイテムを検索')
      expect(inputByLabel).toBe(input)
    })

    it('should announce search updates', async () => {
      const user = userEvent.setup({ delay: null })
      render(<SidebarSearch onSearch={mockOnSearch} />)
      
      const input = screen.getByPlaceholderText('検索...')
      await user.type(input, 'test')
      
      vi.advanceTimersByTime(300)
      
      // aria-live領域が存在することを確認
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should provide keyboard navigation support', async () => {
      const user = userEvent.setup({ delay: null })
      render(<SidebarSearch onSearch={mockOnSearch} />)
      
      const input = screen.getByRole('searchbox')
      
      // Tab キーでフォーカス可能
      await user.tab()
      expect(input).toHaveFocus()
      
      // 入力後、Escape でクリア可能
      await user.type(input, 'test query')
      await user.keyboard('{Escape}')
      expect(input).toHaveValue('')
      expect(input).toHaveFocus() // フォーカスが維持される
    })

    it('should have semantic search landmark', () => {
      render(<SidebarSearch onSearch={mockOnSearch} />)
      
      // search landmarkが正しく設定されている
      const searchContainer = screen.getByRole('search')
      expect(searchContainer).toBeInTheDocument()
      
      // 入力フィールドは検索機能として識別される
      const input = screen.getByRole('searchbox')
      expect(input).toBeInTheDocument()
    })
  })
})