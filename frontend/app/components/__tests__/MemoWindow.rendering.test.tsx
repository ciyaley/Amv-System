// app/components/__tests__/MemoWindow.rendering.test.tsx - Memo Window Rendering Tests
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoWindow } from '../../workspace/Memowindow';
import { 
  setupMocks, 
  setupMockProviders, 
  resetAllMocks, 
  createSampleMemo,
  mockUseAppearanceSettings 
} from './memo-window-test-helpers';

describe('MemoWindow - Rendering and Display', () => {
  beforeEach(() => {
    setupMocks();
    setupMockProviders();
  });

  afterEach(() => {
    resetAllMocks();
  });

  it('should render memo window with correct positioning and styling', () => {
    const memo = createSampleMemo({
      x: 100,
      y: 150,
      w: 300,
      h: 200,
      zIndex: 5
    });

    render(<MemoWindow memo={memo} isSelected={false} />);

    const memoElement = screen.getByTestId(`memo-window-${memo.id}`);
    expect(memoElement).toBeInTheDocument();

    // Check positioning styles
    expect(memoElement).toHaveStyle({
      position: 'absolute',
      left: '100px',
      top: '150px',
      width: '300px',
      height: '200px',
      zIndex: '5'
    });
  });

  it('should display memo content correctly', () => {
    const memo = createSampleMemo({
      title: 'Test Title',
      content: 'Test Content'
    });

    render(<MemoWindow memo={memo} isSelected={false} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should show tags when available', async () => {
    const memo = createSampleMemo({
      tags: ['work', 'important', 'urgent']
    });

    render(<MemoWindow memo={memo} isSelected={false} />);

    await waitFor(() => {
      expect(screen.getByText('work')).toBeInTheDocument();
      expect(screen.getByText('important')).toBeInTheDocument();
      expect(screen.getByText('urgent')).toBeInTheDocument();
    });
  });

  it('should apply custom appearance settings', () => {
    const memo = createSampleMemo();
    
    // Mock appearance settings
    mockUseAppearanceSettings.fontFamily = 'Georgia';
    mockUseAppearanceSettings.fontSize = 16;
    mockUseAppearanceSettings.lineHeight = 1.6;
    mockUseAppearanceSettings.customOpacity = 0.9;

    render(<MemoWindow memo={memo} isSelected={false} />);

    const memoElement = screen.getByTestId(`memo-window-${memo.id}`);
    
    // Check if custom styles are applied
    const computedStyle = window.getComputedStyle(memoElement);
    expect(computedStyle.fontFamily).toContain('Georgia');
    expect(computedStyle.opacity).toBe('0.9');
  });

  it('should show selection state correctly', () => {
    const memo = createSampleMemo();

    const { rerender } = render(<MemoWindow memo={memo} isSelected={false} />);
    
    let memoElement = screen.getByTestId(`memo-window-${memo.id}`);
    expect(memoElement).not.toHaveClass('selected');

    rerender(<MemoWindow memo={memo} isSelected={true} />);
    
    memoElement = screen.getByTestId(`memo-window-${memo.id}`);
    expect(memoElement).toHaveClass('selected');
  });

  it('should handle hidden memo visibility', () => {
    const memo = createSampleMemo({ visible: false });

    render(<MemoWindow memo={memo} isSelected={false} />);

    const memoElement = screen.getByTestId(`memo-window-${memo.id}`);
    expect(memoElement).toHaveClass('opacity-30');
  });

  it('should display memo header with controls', () => {
    const memo = createSampleMemo();

    render(<MemoWindow memo={memo} isSelected={false} />);

    // Check for header controls
    expect(screen.getByLabelText(/minimize/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bring to front/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/send to back/i)).toBeInTheDocument();
  });

  it('should handle memo without tags gracefully', () => {
    const memo = createSampleMemo({ tags: [] });

    render(<MemoWindow memo={memo} isSelected={false} />);

    const memoElement = screen.getByTestId(`memo-window-${memo.id}`);
    expect(memoElement).toBeInTheDocument();
    
    // Should not show any tag elements
    expect(screen.queryByTestId('memo-tags')).not.toBeInTheDocument();
  });

  it('should handle long content with proper overflow', () => {
    const longContent = 'Lorem ipsum '.repeat(100);
    const memo = createSampleMemo({ content: longContent });

    render(<MemoWindow memo={memo} isSelected={false} />);

    const contentElement = screen.getByText(longContent);
    expect(contentElement).toBeInTheDocument();
    
    // Should have proper overflow handling
    const computedStyle = window.getComputedStyle(contentElement);
    expect(computedStyle.overflow).toBe('auto');
  });

  it('should display creation and update timestamps', () => {
    const memo = createSampleMemo({
      createdAt: '2024-01-01T10:00:00.000Z',
      updatedAt: '2024-01-02T15:30:00.000Z'
    });

    render(<MemoWindow memo={memo} isSelected={false} />);

    // Check for timestamp elements (format may vary)
    const timestampElements = screen.getAllByText(/2024/);
    expect(timestampElements.length).toBeGreaterThan(0);
  });

  it('should apply correct theme classes', () => {
    const memo = createSampleMemo();

    render(<MemoWindow memo={memo} isSelected={false} />);

    const memoElement = screen.getByTestId(`memo-window-${memo.id}`);
    
    // Should have theme-appropriate classes
    expect(memoElement).toHaveClass('bg-white', 'border', 'rounded-lg', 'shadow-md');
  });

  it('should handle resize handles visibility', () => {
    const memo = createSampleMemo();

    const { rerender } = render(<MemoWindow memo={memo} isSelected={false} />);
    
    // Resize handles should not be visible when not selected
    expect(screen.queryByTestId('resize-handle')).not.toBeInTheDocument();

    rerender(<MemoWindow memo={memo} isSelected={true} />);
    
    // Resize handles should be visible when selected
    expect(screen.getByTestId('resize-handle')).toBeInTheDocument();
  });
});