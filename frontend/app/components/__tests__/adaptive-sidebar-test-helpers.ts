// app/components/__tests__/adaptive-sidebar-test-helpers.ts - AdaptiveSidebar Test Helpers
import { vi } from 'vitest';
import type { MemoData } from '../../types/tools';
import type { Screen } from '@testing-library/react';

// Testing Library screen type
type TestScreen = Pick<Screen, 'getByRole' | 'getByText' | 'getByLabelText' | 'getByTestId' | 'queryByText' | 'queryByTestId' | 'getAllByTestId' | 'getByDisplayValue'>;

// Keyboard event options type
interface KeyboardEventOptions {
  bubbles?: boolean;
  cancelable?: boolean;
  key?: string;
  code?: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
}

// Create mock memo utility
export const createMockMemo = (overrides?: Partial<MemoData>): MemoData => ({
  id: `memo_${Math.random()}`,
  type: 'memo' as const,
  title: 'Test Memo',
  content: 'This is a test memo content',
  text: 'This is a test memo content',
  x: 100,
  y: 100,
  w: 240,
  h: 160,
  zIndex: 1,
  tags: ['test'],
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  importance: 'medium',
  category: 'Work',
  sourceType: 'authenticated',
  ...overrides
});

// Mock memos dataset
export const mockMemos: MemoData[] = [
  // 仕事カテゴリー
  createMockMemo({
    id: 'memo_work_1',
    title: '重要な会議メモ',
    content: '明日の会議について重要な内容が含まれています。プロジェクトの進捗状況と次のステップについて話し合います。',
    text: '明日の会議について重要な内容が含まれています。プロジェクトの進捗状況と次のステップについて話し合います。',
    tags: ['会議', '重要'],
    importance: 'high',
    category: 'Work',
    updated: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30分前
  }),
  createMockMemo({
    id: 'memo_work_2',
    title: 'タスクリスト',
    content: '今週中に完了すべきタスク一覧',
    text: '今週中に完了すべきタスク一覧',
    tags: ['タスク'],
    importance: 'medium',
    category: 'Work',
    updated: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2時間前
  }),

  // 個人カテゴリー
  createMockMemo({
    id: 'memo_personal_1',
    title: '買い物リスト',
    content: '週末に買うもの：牛乳、パン、卵',
    text: '週末に買うもの：牛乳、パン、卵',
    tags: ['買い物'],
    importance: 'low',
    category: 'Personal',
    updated: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() // 4時間前
  }),
  createMockMemo({
    id: 'memo_personal_2',
    title: '読書メモ',
    content: '最近読んだ本の感想とメモ',
    text: '最近読んだ本の感想とメモ',
    tags: ['読書', '学習'],
    importance: 'medium',
    category: 'Personal',
    updated: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString() // 6時間前
  }),

  // アイデアカテゴリー
  createMockMemo({
    id: 'memo_idea_1',
    title: '新プロダクトアイデア',
    content: 'モバイルアプリの新機能についてのアイデア',
    text: 'モバイルアプリの新機能についてのアイデア',
    tags: ['アイデア', 'プロダクト'],
    importance: 'high',
    category: 'Ideas',
    updated: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString() // 8時間前
  }),

  // カテゴリーなし
  createMockMemo({
    id: 'memo_uncategorized_1',
    title: 'その他のメモ',
    content: 'カテゴリー分けされていないメモ',
    text: 'カテゴリー分けされていないメモ',
    tags: ['その他'],
    importance: 'low',
    category: undefined,
    updated: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString() // 10時間前
  })
];

// Default props for AdaptiveSidebar
export const defaultSidebarProps = {
  isOpen: true,
  onClose: vi.fn(),
  memos: mockMemos,
  selectedMemoId: null,
  onSelectMemo: vi.fn(),
  searchQuery: '',
  onSearchChange: vi.fn(),
  density: 'standard' as const,
  onDensityChange: vi.fn(),
  isMobile: false
};

// Mock hooks
export const setupSidebarMocks = () => {
  // Mock useVirtualScroll
  vi.mock('../../hooks/useVirtualScroll', () => ({
    useVirtualScroll: vi.fn(() => ({
      containerRef: { current: null },
      virtualItems: mockMemos.map((memo, index) => ({
        index,
        start: index * 60,
        size: 60,
        end: (index + 1) * 60,
        key: memo.id
      })),
      totalSize: mockMemos.length * 60,
      scrollToIndex: vi.fn(),
      isScrolling: false
    }))
  }));

  // Mock useAdaptiveLayout
  vi.mock('../../hooks/useAdaptiveLayout', () => ({
    useAdaptiveLayout: vi.fn(() => ({
      density: 'standard',
      isMobile: false,
      setDensity: vi.fn()
    }))
  }));

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
};

// Test utilities
export const waitForSearchDebounce = async (delay: number = 300) => {
  await new Promise(resolve => setTimeout(resolve, delay));
};

export const simulateSearch = async (searchInput: HTMLElement, query: string) => {
  const user = (await import('@testing-library/user-event')).default.setup();
  await user.clear(searchInput);
  await user.type(searchInput, query);
  await waitForSearchDebounce();
};

export const getSearchInput = (screen: TestScreen) => {
  return screen.getByRole('searchbox', { name: /search|検索/i });
};

export const getClearSearchButton = (screen: TestScreen) => {
  return screen.getByRole('button', { name: /clear|クリア/i });
};

export const getMemoItem = (screen: TestScreen, memoTitle: string) => {
  return screen.getByText(memoTitle).closest('[data-testid^="memo-item-"]');
};

export const getCategorySection = (screen: TestScreen, categoryName: string) => {
  return screen.getByText(categoryName).closest('[data-testid^="category-"]');
};

export const getDensityButton = (screen: TestScreen, density: 'compact' | 'standard' | 'comfortable') => {
  return screen.getByRole('button', { name: new RegExp(density, 'i') });
};

export const getCloseButton = (screen: TestScreen) => {
  return screen.getByRole('button', { name: /close|閉じる/i });
};

export const expectMemoToBeVisible = (screen: TestScreen, memoTitle: string) => {
  expect(screen.getByText(memoTitle)).toBeInTheDocument();
};

export const expectMemoNotToBeVisible = (screen: TestScreen, memoTitle: string) => {
  expect(screen.queryByText(memoTitle)).not.toBeInTheDocument();
};

export const expectCategoryToBeExpanded = (screen: TestScreen, categoryName: string) => {
  const categorySection = getCategorySection(screen, categoryName);
  expect(categorySection).toHaveAttribute('aria-expanded', 'true');
};

export const expectCategoryToBeCollapsed = (screen: TestScreen, categoryName: string) => {
  const categorySection = getCategorySection(screen, categoryName);
  expect(categorySection).toHaveAttribute('aria-expanded', 'false');
};

export const expectMemoToBeSelected = (screen: TestScreen, memoTitle: string) => {
  const memoItem = getMemoItem(screen, memoTitle);
  expect(memoItem).toHaveClass('selected');
  expect(memoItem).toHaveAttribute('aria-selected', 'true');
};

export const expectSearchResultsCount = (screen: TestScreen, count: number) => {
  const memoItems = screen.getAllByTestId(/^memo-item-/);
  expect(memoItems).toHaveLength(count);
};

export const expectEmptyState = (screen: TestScreen) => {
  expect(screen.getByText(/no memos|メモがありません/i)).toBeInTheDocument();
};

export const expectNoSearchResults = (screen: TestScreen) => {
  expect(screen.getByText(/no results|検索結果がありません/i)).toBeInTheDocument();
};

// Keyboard navigation helpers
export const simulateKeyDown = (element: Element, key: string, options: KeyboardEventOptions = {}) => {
  const event = new KeyboardEvent('keydown', {
    key,
    code: key,
    bubbles: true,
    cancelable: true,
    ...options
  });
  
  element.dispatchEvent(event);
};

export const expectElementToHaveFocus = (element: Element) => {
  expect(element).toHaveFocus();
};

// Mobile helpers
export const simulateMobileViewport = () => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 375,
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 667,
  });
  
  window.dispatchEvent(new Event('resize'));
};

export const simulateDesktopViewport = () => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1280,
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 720,
  });
  
  window.dispatchEvent(new Event('resize'));
};

// Reset all mocks
export const resetSidebarMocks = () => {
  defaultSidebarProps.onClose.mockClear();
  defaultSidebarProps.onSelectMemo.mockClear();
  defaultSidebarProps.onSearchChange.mockClear();
  defaultSidebarProps.onDensityChange.mockClear();
  vi.clearAllMocks();
};