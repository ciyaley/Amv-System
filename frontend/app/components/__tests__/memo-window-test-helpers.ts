// app/components/__tests__/memo-window-test-helpers.ts - Memo Window Test Helpers
import { vi } from 'vitest';
import type { MemoData } from '@/app/types/tools';

// Mock necessary dependencies
export function setupMocks() {
  vi.mock('sonner', () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn()
    }
  }));

  // Mock global confirm
  global.confirm = vi.fn(() => true);

  // Mock global URL methods for canvas background
  Object.assign(global.URL, {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn()
  });
}

// Mock hooks for both useMemos and useMemosBridge
export const mockUseMemos = {
  memos: [],
  updateMemo: vi.fn().mockResolvedValue(undefined),
  updateMemoPosition: vi.fn().mockResolvedValue(undefined),
  updateMemoSize: vi.fn().mockResolvedValue(undefined),
  deleteMemo: vi.fn().mockResolvedValue(undefined),
  bringToFront: vi.fn().mockResolvedValue(undefined),
  sendToBack: vi.fn().mockResolvedValue(undefined),
  moveUp: vi.fn().mockResolvedValue(undefined),
  moveDown: vi.fn().mockResolvedValue(undefined),
  toggleMemoVisibility: vi.fn(),
  getVisibleMemos: vi.fn(() => [] as MemoData[]),
  addMemo: vi.fn().mockResolvedValue(undefined),
  saveMemos: vi.fn().mockResolvedValue(undefined),
  loadMemos: vi.fn().mockResolvedValue(undefined),
  focusMemoOnCanvas: vi.fn(),
  setMemos: vi.fn(),
  saveAllMemos: vi.fn().mockResolvedValue(undefined),
  getMemoById: vi.fn(),
  getHiddenMemos: vi.fn(() => [] as MemoData[]),
  error: null,
  isLoading: false
};

// Mock appearance settings
export const mockUseAppearanceSettings = {
  backgroundType: 'solid' as const,
  solidColor: '#ffffff',
  customOpacity: 0.8,
  fontFamily: 'Inter',
  fontSize: 14,
  lineHeight: 1.5,
  textAlign: 'left' as const
};

// Mock workspace state
export const mockUseWorkspaceState = {
  canvasBackground: '#f0f0f0',
  showGrid: true,
  snapToGrid: true,
  gridSize: 20,
  isDarkMode: false,
  scaleFactor: 1,
  panOffset: { x: 0, y: 0 },
  setPanOffset: vi.fn(),
  setScaleFactor: vi.fn(),
  isCanvasPanning: false,
  setIsCanvasPanning: vi.fn(),
  enableCanvasPanning: vi.fn(),
  disableCanvasPanning: vi.fn()
};

// Sample memo data
export const createSampleMemo = (overrides: Partial<MemoData> = {}): MemoData => ({
  id: 'test-memo-1',
  title: 'Test Memo Title',
  content: 'This is test memo content',
  x: 100,
  y: 150,
  w: 300,
  h: 200,
  zIndex: 1,
  tags: ['work', 'important'],
  type: 'memo',
  visible: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides
});

// Mock providers wrapper
export function setupMockProviders() {
  vi.mock('@/app/hooks/useMemos', () => ({
    useMemos: () => mockUseMemos
  }));

  vi.mock('@/app/hooks/useMemosBridge', () => ({
    useMemosBridge: () => mockUseMemos
  }));

  vi.mock('@/app/hooks/useAppearanceSettings', () => ({
    useAppearanceSettings: () => mockUseAppearanceSettings
  }));

  vi.mock('@/app/hooks/useWorkspaceState', () => ({
    useWorkspaceState: () => mockUseWorkspaceState
  }));
}

// Test utilities
export const waitForDragOperation = async (delay: number = 100) => {
  await new Promise(resolve => setTimeout(resolve, delay));
};

export const simulateMouseEvent = (element: Element, eventType: string, coordinates: { x: number; y: number }) => {
  const event = new MouseEvent(eventType, {
    bubbles: true,
    cancelable: true,
    clientX: coordinates.x,
    clientY: coordinates.y
  });
  
  element.dispatchEvent(event);
};

export const simulateDrag = async (element: Element, fromCoords: { x: number; y: number }, toCoords: { x: number; y: number }) => {
  simulateMouseEvent(element, 'mousedown', fromCoords);
  await waitForDragOperation(50);
  
  simulateMouseEvent(element, 'mousemove', {
    x: fromCoords.x + (toCoords.x - fromCoords.x) / 2,
    y: fromCoords.y + (toCoords.y - fromCoords.y) / 2
  });
  await waitForDragOperation(50);
  
  simulateMouseEvent(element, 'mousemove', toCoords);
  await waitForDragOperation(50);
  
  simulateMouseEvent(element, 'mouseup', toCoords);
  await waitForDragOperation(100);
};

// Reset all mocks
export const resetAllMocks = () => {
  Object.values(mockUseMemos).forEach(fn => {
    if (typeof fn === 'function' && 'mockClear' in fn) {
      fn.mockClear();
    }
  });
  
  Object.values(mockUseWorkspaceState).forEach(fn => {
    if (typeof fn === 'function' && 'mockClear' in fn) {
      fn.mockClear();
    }
  });
  
  vi.clearAllMocks();
};