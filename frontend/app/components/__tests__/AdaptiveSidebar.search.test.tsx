import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdaptiveSidebar } from '../AdaptiveSidebar';

describe('AdaptiveSidebar - Search and Filtering', () => {
  const mockMemos = [
    {
      id: '1',
      title: 'テスト会議',
      text: '会議メモ',
      x: 100,
      y: 100,
      w: 200,
      h: 200,
      type: 'text',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      visible: true,
      tags: ['会議']
    },
    {
      id: '2', 
      title: 'プロジェクト',
      text: 'プロジェクト計画',
      x: 300,
      y: 300,
      w: 200,
      h: 200,
      type: 'text',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      visible: true,
      tags: ['計画']
    }
  ]

  const mockProps = {
    items: mockMemos,
    selectedItem: null,
    onItemSelect: vi.fn(),
    searchQuery: '',
    onSearchChange: vi.fn(),
    onToggleVisibility: vi.fn(),
    onFocusOnCanvas: vi.fn(),
    isLoading: false,
    isMobile: false,
    isOpen: true,
    onToggle: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter memos based on search query', async () => {
    render(<AdaptiveSidebar {...mockProps} />);
    
    const searchInput = screen.getByTestId('sidebar-search-input');
    await userEvent.type(searchInput, '会議');

    // デバウンス待機時間（300ms）
    await new Promise(resolve => setTimeout(resolve, 350));

    expect(mockProps.onSearchChange).toHaveBeenCalledWith('会議');
  });

  it('should clear search when clear button is clicked', async () => {
    render(<AdaptiveSidebar {...mockProps} searchQuery="test" />);
    
    const clearButton = screen.getByLabelText('検索をクリア');
    await userEvent.click(clearButton);

    expect(mockProps.onSearchChange).toHaveBeenCalledWith('');
  });

  it('should debounce search input', async () => {
    render(<AdaptiveSidebar {...mockProps} />);
    
    const searchInput = screen.getByTestId('sidebar-search-input');
    await userEvent.type(searchInput, 'abc');

    // デバウンス待機時間（300ms）
    await new Promise(resolve => setTimeout(resolve, 350));
    
    expect(mockProps.onSearchChange).toHaveBeenCalledWith('abc');
  });
});