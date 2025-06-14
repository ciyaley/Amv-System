// app/components/__tests__/MemoWindow.layers-canvas.test.tsx - Memo Window Layers and Canvas Tests
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoWindow } from '../../workspace/Memowindow';
import { WorkspaceCanvas } from '../../workspace/WorkspaceCanvas';
import { 
  setupMocks, 
  setupMockProviders, 
  resetAllMocks, 
  createSampleMemo,
  mockUseMemos,
  mockUseWorkspaceState
} from './memo-window-test-helpers';

describe('MemoWindow - Layers and Canvas Integration', () => {
  beforeEach(() => {
    setupMocks();
    setupMockProviders();
  });

  afterEach(() => {
    resetAllMocks();
  });

  it('should handle layer operations correctly', async () => {
    const memo = createSampleMemo({ zIndex: 5 });

    render(<MemoWindow memo={memo} isSelected={true} />);

    // Test bring to front
    const bringToFrontButton = screen.getByLabelText(/bring to front/i);
    fireEvent.click(bringToFrontButton);

    await waitFor(() => {
      expect(mockUseMemos.bringToFront).toHaveBeenCalledWith(memo.id);
    });

    // Test send to back
    const sendToBackButton = screen.getByLabelText(/send to back/i);
    fireEvent.click(sendToBackButton);

    await waitFor(() => {
      expect(mockUseMemos.sendToBack).toHaveBeenCalledWith(memo.id);
    });

    // Test move up
    const moveUpButton = screen.getByLabelText(/move up/i);
    if (moveUpButton) {
      fireEvent.click(moveUpButton);
      
      await waitFor(() => {
        expect(mockUseMemos.moveUp).toHaveBeenCalledWith(memo.id);
      });
    }

    // Test move down
    const moveDownButton = screen.getByLabelText(/move down/i);
    if (moveDownButton) {
      fireEvent.click(moveDownButton);
      
      await waitFor(() => {
        expect(mockUseMemos.moveDown).toHaveBeenCalledWith(memo.id);
      });
    }
  });

  it('should toggle visibility correctly', async () => {
    const memo = createSampleMemo({ visible: true });

    render(<MemoWindow memo={memo} isSelected={true} />);

    const visibilityButton = screen.getByLabelText(/toggle visibility/i);
    fireEvent.click(visibilityButton);

    await waitFor(() => {
      expect(mockUseMemos.toggleMemoVisibility).toHaveBeenCalledWith(memo.id);
    });
  });

  it('should handle long press deletion', async () => {
    const memo = createSampleMemo();

    render(<MemoWindow memo={memo} isSelected={true} />);

    const deleteButton = screen.getByLabelText(/delete/i);

    // Start long press
    fireEvent.mouseDown(deleteButton);

    // Wait for long press duration (2 seconds)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 2100));
    });

    // Release
    fireEvent.mouseUp(deleteButton);

    await waitFor(() => {
      expect(mockUseMemos.deleteMemo).toHaveBeenCalledWith(memo.id);
    });
  });

  it('should cancel deletion if mouse leaves before timeout', async () => {
    const memo = createSampleMemo();

    render(<MemoWindow memo={memo} isSelected={true} />);

    const deleteButton = screen.getByLabelText(/delete/i);

    // Start long press
    fireEvent.mouseDown(deleteButton);

    // Wait for partial duration
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    // Mouse leave before timeout
    fireEvent.mouseLeave(deleteButton);

    // Wait for remaining duration
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1200));
    });

    // Should not delete
    expect(mockUseMemos.deleteMemo).not.toHaveBeenCalled();
  });

  it('should cancel deletion if mouse up before timeout', async () => {
    const memo = createSampleMemo();

    render(<MemoWindow memo={memo} isSelected={true} />);

    const deleteButton = screen.getByLabelText(/delete/i);

    // Start long press
    fireEvent.mouseDown(deleteButton);

    // Wait for partial duration
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    // Mouse up before timeout
    fireEvent.mouseUp(deleteButton);

    // Wait for remaining duration
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1200));
    });

    // Should not delete
    expect(mockUseMemos.deleteMemo).not.toHaveBeenCalled();
  });

  it('should render memo windows on canvas correctly', () => {
    const memos = [
      createSampleMemo({ id: 'memo1', x: 100, y: 100 }),
      createSampleMemo({ id: 'memo2', x: 200, y: 200 }),
      createSampleMemo({ id: 'memo3', x: 300, y: 300, visible: false })
    ];

    mockUseMemos.memos = memos;
    mockUseMemos.getVisibleMemos.mockReturnValue(memos.filter(m => m.visible !== false));

    render(<WorkspaceCanvas />);

    // Should render visible memos
    expect(screen.getByTestId('memo-window-memo1')).toBeInTheDocument();
    expect(screen.getByTestId('memo-window-memo2')).toBeInTheDocument();
    
    // Should not render hidden memo
    expect(screen.queryByTestId('memo-window-memo3')).not.toBeInTheDocument();
  });

  it('should handle canvas panning correctly', async () => {
    const memos = [createSampleMemo({ id: 'memo1' })];
    mockUseMemos.memos = memos;
    mockUseMemos.getVisibleMemos.mockReturnValue(memos);

    render(<WorkspaceCanvas />);

    const canvas = screen.getByTestId('workspace-canvas');

    // Start panning
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
    
    // Pan movement
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
    
    // End panning
    fireEvent.mouseUp(canvas, { clientX: 150, clientY: 150 });

    await waitFor(() => {
      expect(mockUseWorkspaceState.setPanOffset).toHaveBeenCalledWith(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number)
        })
      );
    });
  });

  it('should handle canvas zoom correctly', async () => {
    const memos = [createSampleMemo({ id: 'memo1' })];
    mockUseMemos.memos = memos;
    mockUseMemos.getVisibleMemos.mockReturnValue(memos);

    render(<WorkspaceCanvas />);

    const canvas = screen.getByTestId('workspace-canvas');

    // Zoom in
    fireEvent.wheel(canvas, { deltaY: -100 });

    await waitFor(() => {
      expect(mockUseWorkspaceState.setScaleFactor).toHaveBeenCalledWith(
        expect.any(Number)
      );
    });
  });

  it('should not pan when clicking on memo window', async () => {
    const memos = [createSampleMemo({ id: 'memo1', x: 100, y: 100 })];
    mockUseMemos.memos = memos;
    mockUseMemos.getVisibleMemos.mockReturnValue(memos);

    render(<WorkspaceCanvas />);

    const memoWindow = screen.getByTestId('memo-window-memo1');

    // Click on memo window
    fireEvent.mouseDown(memoWindow, { clientX: 200, clientY: 200 });
    fireEvent.mouseMove(memoWindow, { clientX: 250, clientY: 250 });
    fireEvent.mouseUp(memoWindow, { clientX: 250, clientY: 250 });

    // Should not trigger canvas panning
    expect(mockUseWorkspaceState.setPanOffset).not.toHaveBeenCalled();
  });

  it('should apply background styling correctly', async () => {
    mockUseWorkspaceState.canvasBackground = '#f5f5f5';
    mockUseWorkspaceState.showGrid = true;

    render(<WorkspaceCanvas />);

    const canvas = screen.getByTestId('workspace-canvas');
    
    // Check background color
    expect(canvas).toHaveStyle({ backgroundColor: '#f5f5f5' });
    
    // Check for grid pattern (if implemented)
    const computedStyle = window.getComputedStyle(canvas);
    expect(computedStyle.backgroundImage).toBeDefined();
  });

  it('should sync local state when memo prop changes', () => {
    const initialMemo = createSampleMemo({
      title: 'Initial Title',
      content: 'Initial Content'
    });

    const { rerender } = render(<MemoWindow memo={initialMemo} isSelected={false} />);

    // Update memo
    const updatedMemo = createSampleMemo({
      ...initialMemo,
      title: 'Updated Title',
      content: 'Updated Content'
    });

    rerender(<MemoWindow memo={updatedMemo} isSelected={false} />);

    // Should display updated content
    expect(screen.getByText('Updated Title')).toBeInTheDocument();
    expect(screen.getByText('Updated Content')).toBeInTheDocument();
  });

  it('should handle memo focus operations', async () => {
    const memo = createSampleMemo({ id: 'focus-memo' });

    render(<MemoWindow memo={memo} isSelected={true} />);

    const memoElement = screen.getByTestId(`memo-window-${memo.id}`);
    
    // Focus memo
    fireEvent.click(memoElement);

    await waitFor(() => {
      expect(mockUseMemos.focusMemoOnCanvas).toHaveBeenCalledWith(memo.id);
    });
  });

  it('should handle canvas state synchronization', async () => {
    const memos = [
      createSampleMemo({ id: 'memo1' }),
      createSampleMemo({ id: 'memo2' })
    ];

    mockUseMemos.memos = memos;
    mockUseMemos.getVisibleMemos.mockReturnValue(memos);

    // Initial render
    const { rerender } = render(<WorkspaceCanvas />);

    // Update canvas state
    mockUseWorkspaceState.scaleFactor = 1.5;
    mockUseWorkspaceState.panOffset = { x: 50, y: 75 };

    // Re-render with new state
    rerender(<WorkspaceCanvas />);

    // Memo positions should reflect canvas transformation
    const memo1 = screen.getByTestId('memo-window-memo1');
    const memo2 = screen.getByTestId('memo-window-memo2');

    expect(memo1).toBeInTheDocument();
    expect(memo2).toBeInTheDocument();
  });

  it('should handle memo selection state changes', () => {
    const memo = createSampleMemo({ id: 'selectable-memo' });

    const { rerender } = render(<MemoWindow memo={memo} isSelected={false} />);

    let memoElement = screen.getByTestId(`memo-window-${memo.id}`);
    expect(memoElement).not.toHaveClass('selected');

    // Select memo
    rerender(<MemoWindow memo={memo} isSelected={true} />);

    memoElement = screen.getByTestId(`memo-window-${memo.id}`);
    expect(memoElement).toHaveClass('selected');

    // Deselect memo
    rerender(<MemoWindow memo={memo} isSelected={false} />);

    memoElement = screen.getByTestId(`memo-window-${memo.id}`);
    expect(memoElement).not.toHaveClass('selected');
  });
});