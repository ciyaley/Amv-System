import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdaptiveSidebar } from '../AdaptiveSidebar';

describe('AdaptiveSidebar - Interactions and Accessibility', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    memos: [],
    selectedMemoId: null,
    onSelectMemo: vi.fn(),
    searchQuery: '',
    onSearchChange: vi.fn(),
    density: 'standard' as const,
    onDensityChange: vi.fn(),
    isMobile: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call onSelectMemo when a memo is clicked', async () => {
    const memos = [{
      id: 'test-memo-1',
      title: 'Test Memo',
      content: 'Content',
      type: 'memo' as const,
      x: 0,
      y: 0,
      w: 200,
      h: 150,
      zIndex: 1
    }];

    render(<AdaptiveSidebar {...mockProps} memos={memos} />);
    
    const memoItem = screen.getByText('Test Memo');
    await userEvent.click(memoItem);

    expect(mockProps.onSelectMemo).toHaveBeenCalledWith('test-memo-1');
  });

  it('should close sidebar when close button is clicked', async () => {
    render(<AdaptiveSidebar {...mockProps} isMobile={true} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('should close sidebar when backdrop is clicked on mobile', async () => {
    render(<AdaptiveSidebar {...mockProps} isMobile={true} />);
    
    const backdrop = screen.getByTestId('sidebar-backdrop');
    await userEvent.click(backdrop);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('should have proper ARIA labels', () => {
    render(<AdaptiveSidebar {...mockProps} />);

    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveAttribute('aria-label');

    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toHaveAttribute('aria-label');
  });

  it('should be keyboard navigable', async () => {
    const memos = Array.from({ length: 3 }, (_, i) => ({
      id: `memo-${i}`,
      title: `Memo ${i + 1}`,
      content: 'Content',
      type: 'memo' as const,
      x: 0,
      y: 0,
      w: 200,
      h: 150,
      zIndex: 1
    }));

    render(<AdaptiveSidebar {...mockProps} memos={memos} />);
    
    const firstMemo = screen.getByText('Memo 1');
    firstMemo.focus();

    fireEvent.keyDown(firstMemo, { key: 'ArrowDown' });
    
    const secondMemo = screen.getByText('Memo 2');
    expect(secondMemo).toHaveFocus();
  });

  it('should handle keyboard memo selection', async () => {
    const memos = [{
      id: 'test-memo-1',
      title: 'Test Memo',
      content: 'Content',
      type: 'memo' as const,
      x: 0,
      y: 0,
      w: 200,
      h: 150,
      zIndex: 1
    }];

    render(<AdaptiveSidebar {...mockProps} memos={memos} />);
    
    const memoItem = screen.getByText('Test Memo');
    memoItem.focus();
    
    fireEvent.keyDown(memoItem, { key: 'Enter' });

    expect(mockProps.onSelectMemo).toHaveBeenCalledWith('test-memo-1');
  });
});