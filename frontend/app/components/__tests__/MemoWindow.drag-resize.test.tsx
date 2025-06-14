// app/components/__tests__/MemoWindow.drag-resize.test.tsx - Memo Window Drag and Resize Tests
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoWindow } from '../../workspace/Memowindow';
import { 
  setupMocks, 
  setupMockProviders, 
  resetAllMocks, 
  createSampleMemo,
  mockUseMemos,
  mockUseWorkspaceState,
  simulateDrag,
  waitForDragOperation
} from './memo-window-test-helpers';

describe('MemoWindow - Drag and Resize Operations', () => {
  beforeEach(() => {
    setupMocks();
    setupMockProviders();
  });

  afterEach(() => {
    resetAllMocks();
  });

  it('should handle drag operations correctly', async () => {
    const memo = createSampleMemo({ x: 100, y: 150 });

    render(<MemoWindow memo={memo} isSelected={true} />);

    const memoElement = screen.getByTestId(`memo-window-${memo.id}`);
    const header = memoElement.querySelector('[data-testid="memo-header"]') || memoElement;

    // Simulate drag operation
    await simulateDrag(header, { x: 100, y: 150 }, { x: 200, y: 250 });

    expect(mockUseMemos.updateMemoPosition).toHaveBeenCalledWith(
      memo.id,
      { x: 200, y: 250 }
    );
  });

  it('should respect zoom level during drag', async () => {
    const memo = createSampleMemo({ x: 100, y: 150 });
    mockUseWorkspaceState.scaleFactor = 1.5;

    render(<MemoWindow memo={memo} isSelected={true} />);

    const memoElement = screen.getByTestId(`memo-window-${memo.id}`);
    const header = memoElement.querySelector('[data-testid="memo-header"]') || memoElement;

    // Simulate drag with zoom
    await simulateDrag(header, { x: 100, y: 150 }, { x: 200, y: 250 });

    // Position should be adjusted for zoom level
    expect(mockUseMemos.updateMemoPosition).toHaveBeenCalledWith(
      memo.id,
      expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number)
      })
    );
  });

  it('should minimize drag when clicking on header controls', async () => {
    const memo = createSampleMemo();

    render(<MemoWindow memo={memo} isSelected={true} />);

    const minimizeButton = screen.getByLabelText(/minimize/i);

    // Click on minimize button
    fireEvent.mouseDown(minimizeButton);
    await waitForDragOperation(50);
    fireEvent.mouseMove(minimizeButton, { clientX: 110, clientY: 160 });
    await waitForDragOperation(50);
    fireEvent.mouseUp(minimizeButton);

    // Should not trigger drag operation
    expect(mockUseMemos.updateMemoPosition).not.toHaveBeenCalled();
  });

  it('should not drag when clicking on layer control buttons', async () => {
    const memo = createSampleMemo();

    render(<MemoWindow memo={memo} isSelected={true} />);

    const bringToFrontButton = screen.getByLabelText(/bring to front/i);

    // Click on layer control button
    fireEvent.mouseDown(bringToFrontButton);
    await waitForDragOperation(50);
    fireEvent.mouseMove(bringToFrontButton, { clientX: 120, clientY: 170 });
    await waitForDragOperation(50);
    fireEvent.mouseUp(bringToFrontButton);

    // Should not trigger drag operation
    expect(mockUseMemos.updateMemoPosition).not.toHaveBeenCalled();
  });

  it('should handle resize operations correctly', async () => {
    const memo = createSampleMemo({ w: 300, h: 200 });

    render(<MemoWindow memo={memo} isSelected={true} />);

    const resizeHandle = screen.getByTestId('resize-handle');

    // Simulate resize operation
    fireEvent.mouseDown(resizeHandle, { clientX: 400, clientY: 350 });
    await waitForDragOperation(50);
    
    fireEvent.mouseMove(resizeHandle, { clientX: 450, clientY: 400 });
    await waitForDragOperation(50);
    
    fireEvent.mouseUp(resizeHandle, { clientX: 450, clientY: 400 });
    await waitForDragOperation(100);

    expect(mockUseMemos.updateMemoSize).toHaveBeenCalledWith(
      memo.id,
      expect.objectContaining({
        w: expect.any(Number),
        h: expect.any(Number)
      })
    );
  });

  it('should enforce minimum size constraints', async () => {
    const memo = createSampleMemo({ w: 200, h: 150 });

    render(<MemoWindow memo={memo} isSelected={true} />);

    const resizeHandle = screen.getByTestId('resize-handle');

    // Try to resize below minimum size
    fireEvent.mouseDown(resizeHandle, { clientX: 300, clientY: 300 });
    await waitForDragOperation(50);
    
    fireEvent.mouseMove(resizeHandle, { clientX: 150, clientY: 180 }); // Very small size
    await waitForDragOperation(50);
    
    fireEvent.mouseUp(resizeHandle, { clientX: 150, clientY: 180 });
    await waitForDragOperation(100);

    expect(mockUseMemos.updateMemoSize).toHaveBeenCalledWith(
      memo.id,
      expect.objectContaining({
        w: expect.any(Number), // Should be at least minimum width
        h: expect.any(Number)  // Should be at least minimum height
      })
    );

    const call = mockUseMemos.updateMemoSize.mock.calls[0];
    const { w, h } = call[1];
    
    // Check minimum size constraints
    expect(w).toBeGreaterThanOrEqual(150); // Minimum width
    expect(h).toBeGreaterThanOrEqual(100); // Minimum height
  });

  it('should respect zoom level during resize', async () => {
    const memo = createSampleMemo({ w: 300, h: 200 });
    mockUseWorkspaceState.scaleFactor = 0.8;

    render(<MemoWindow memo={memo} isSelected={true} />);

    const resizeHandle = screen.getByTestId('resize-handle');

    // Simulate resize with zoom
    fireEvent.mouseDown(resizeHandle, { clientX: 400, clientY: 350 });
    await waitForDragOperation(50);
    
    fireEvent.mouseMove(resizeHandle, { clientX: 450, clientY: 400 });
    await waitForDragOperation(50);
    
    fireEvent.mouseUp(resizeHandle, { clientX: 450, clientY: 400 });
    await waitForDragOperation(100);

    // Size should be adjusted for zoom level
    expect(mockUseMemos.updateMemoSize).toHaveBeenCalledWith(
      memo.id,
      expect.objectContaining({
        w: expect.any(Number),
        h: expect.any(Number)
      })
    );
  });

  it('should handle drag constraints with canvas boundaries', async () => {
    const memo = createSampleMemo({ x: 10, y: 10 });

    render(<MemoWindow memo={memo} isSelected={true} />);

    const memoElement = screen.getByTestId(`memo-window-${memo.id}`);
    const header = memoElement.querySelector('[data-testid="memo-header"]') || memoElement;

    // Try to drag beyond canvas boundaries (negative coordinates)
    await simulateDrag(header, { x: 50, y: 50 }, { x: -50, y: -50 });

    // Should constrain to valid canvas area
    expect(mockUseMemos.updateMemoPosition).toHaveBeenCalledWith(
      memo.id,
      expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number)
      })
    );

    const call = mockUseMemos.updateMemoPosition.mock.calls[0];
    const { x, y } = call[1];
    
    // Should not allow negative coordinates
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
  });

  it('should prevent resize below absolute minimum dimensions', async () => {
    const memo = createSampleMemo({ w: 180, h: 120 });

    render(<MemoWindow memo={memo} isSelected={true} />);

    const resizeHandle = screen.getByTestId('resize-handle');

    // Try to resize to impossibly small size
    fireEvent.mouseDown(resizeHandle, { clientX: 280, clientY: 220 });
    await waitForDragOperation(50);
    
    fireEvent.mouseMove(resizeHandle, { clientX: 110, clientY: 110 }); // 30x10 size attempt
    await waitForDragOperation(50);
    
    fireEvent.mouseUp(resizeHandle, { clientX: 110, clientY: 110 });
    await waitForDragOperation(100);

    expect(mockUseMemos.updateMemoSize).toHaveBeenCalledWith(
      memo.id,
      expect.objectContaining({
        w: expect.any(Number),
        h: expect.any(Number)
      })
    );

    const call = mockUseMemos.updateMemoSize.mock.calls[0];
    const { w, h } = call[1];
    
    // Should enforce absolute minimum dimensions
    expect(w).toBeGreaterThanOrEqual(150);
    expect(h).toBeGreaterThanOrEqual(100);
  });

  it('should handle multiple resize operations in sequence', async () => {
    const memo = createSampleMemo({ w: 300, h: 200 });

    render(<MemoWindow memo={memo} isSelected={true} />);

    const resizeHandle = screen.getByTestId('resize-handle');

    // First resize operation
    fireEvent.mouseDown(resizeHandle, { clientX: 400, clientY: 350 });
    fireEvent.mouseMove(resizeHandle, { clientX: 450, clientY: 400 });
    fireEvent.mouseUp(resizeHandle, { clientX: 450, clientY: 400 });
    await waitForDragOperation(100);

    // Second resize operation
    fireEvent.mouseDown(resizeHandle, { clientX: 450, clientY: 400 });
    fireEvent.mouseMove(resizeHandle, { clientX: 500, clientY: 450 });
    fireEvent.mouseUp(resizeHandle, { clientX: 500, clientY: 450 });
    await waitForDragOperation(100);

    // Should handle multiple resize operations
    expect(mockUseMemos.updateMemoSize).toHaveBeenCalledTimes(2);
  });
});