// app/components/__tests__/AdaptiveSidebar.rendering.test.tsx - AdaptiveSidebar Rendering Tests
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdaptiveSidebar } from '../AdaptiveSidebar';
import { 
  setupSidebarMocks,
  resetSidebarMocks,
  defaultSidebarProps,
  mockMemos,
  expectMemoToBeVisible,
  expectEmptyState,
  getCategorySection,
  simulateMobileViewport,
  simulateDesktopViewport
} from './adaptive-sidebar-test-helpers';

describe('AdaptiveSidebar - Rendering and UI Display', () => {
  beforeEach(() => {
    setupSidebarMocks();
  });

  afterEach(() => {
    resetSidebarMocks();
    simulateDesktopViewport(); // Reset to desktop
  });

  it('should render sidebar with all memos grouped by category', () => {
    render(<AdaptiveSidebar {...defaultSidebarProps} />);

    // サイドバーの存在確認
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    
    // カテゴリーごとのメモ表示確認
    expectMemoToBeVisible(screen, '重要な会議メモ');
    expectMemoToBeVisible(screen, 'タスクリスト');
    expectMemoToBeVisible(screen, '買い物リスト');
    expectMemoToBeVisible(screen, '読書メモ');
    expectMemoToBeVisible(screen, '新プロダクトアイデア');
    expectMemoToBeVisible(screen, 'その他のメモ');

    // カテゴリーヘッダーの確認
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('Ideas')).toBeInTheDocument();
    expect(screen.getByText(/uncategorized|その他/i)).toBeInTheDocument();
  });

  it('should render search input at the top', () => {
    render(<AdaptiveSidebar {...defaultSidebarProps} />);

    const searchInput = screen.getByRole('searchbox', { name: /search|検索/i });
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('placeholder', expect.stringMatching(/search|検索/i));
  });

  it('should not render sidebar content when isOpen is false', () => {
    render(<AdaptiveSidebar {...defaultSidebarProps} isOpen={false} />);

    // サイドバーコンテンツが表示されない
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByText('重要な会議メモ')).not.toBeInTheDocument();
    
    // しかし、ルート要素は存在する可能性がある（CSS制御）
    const sidebar = screen.queryByRole('complementary');
    if (sidebar) {
      expect(sidebar).toHaveClass('closed');
    }
  });

  it('should show empty state when no memos', () => {
    render(<AdaptiveSidebar {...defaultSidebarProps} memos={[]} />);

    expectEmptyState(screen);
    expect(screen.getByRole('searchbox')).toBeInTheDocument(); // 検索は表示される
  });

  it('should highlight selected memo', () => {
    render(<AdaptiveSidebar {...defaultSidebarProps} selectedMemoId="memo_work_1" />);

    const selectedMemo = screen.getByText('重要な会議メモ').closest('[data-testid^="memo-item-"]');
    expect(selectedMemo).toHaveClass('selected');
    expect(selectedMemo).toHaveAttribute('aria-selected', 'true');
  });

  it('should switch between density modes', () => {
    const { rerender } = render(<AdaptiveSidebar {...defaultSidebarProps} density="compact" />);

    // コンパクトモードでは小さいアイテム
    let memoItems = screen.getAllByTestId(/^memo-item-/);
    memoItems.forEach(item => {
      expect(item).toHaveClass('compact');
    });

    // 標準モードに切り替え
    rerender(<AdaptiveSidebar {...defaultSidebarProps} density="standard" />);

    memoItems = screen.getAllByTestId(/^memo-item-/);
    memoItems.forEach(item => {
      expect(item).toHaveClass('standard');
    });

    // 快適モードに切り替え
    rerender(<AdaptiveSidebar {...defaultSidebarProps} density="comfortable" />);

    memoItems = screen.getAllByTestId(/^memo-item-/);
    memoItems.forEach(item => {
      expect(item).toHaveClass('comfortable');
    });
  });

  it('should show close button on mobile', () => {
    simulateMobileViewport();
    
    render(<AdaptiveSidebar {...defaultSidebarProps} isMobile={true} />);

    const closeButton = screen.getByRole('button', { name: /close|閉じる/i });
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toBeVisible();
  });

  it('should not show close button on desktop', () => {
    render(<AdaptiveSidebar {...defaultSidebarProps} isMobile={false} />);

    const closeButton = screen.queryByRole('button', { name: /close|閉じる/i });
    expect(closeButton).not.toBeInTheDocument();
  });

  it('should apply correct layout classes for mobile', () => {
    simulateMobileViewport();
    
    render(<AdaptiveSidebar {...defaultSidebarProps} isMobile={true} />);

    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveClass('mobile');
  });

  it('should apply correct layout classes for desktop', () => {
    render(<AdaptiveSidebar {...defaultSidebarProps} isMobile={false} />);

    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveClass('desktop');
  });

  it('should display memo metadata correctly', () => {
    render(<AdaptiveSidebar {...defaultSidebarProps} />);

    // タイトルとコンテンツプレビューの確認
    expect(screen.getByText('重要な会議メモ')).toBeInTheDocument();
    expect(screen.getByText(/明日の会議について/)).toBeInTheDocument();

    // タグの表示確認
    expect(screen.getByText('会議')).toBeInTheDocument();
    expect(screen.getByText('重要')).toBeInTheDocument();
    expect(screen.getByText('タスク')).toBeInTheDocument();

    // 重要度インジケーターの確認
    const highImportanceMemo = screen.getByText('重要な会議メモ').closest('[data-testid^="memo-item-"]');
    expect(highImportanceMemo).toHaveClass('importance-high');

    const mediumImportanceMemo = screen.getByText('タスクリスト').closest('[data-testid^="memo-item-"]');
    expect(mediumImportanceMemo).toHaveClass('importance-medium');
  });

  it('should show category statistics', () => {
    render(<AdaptiveSidebar {...defaultSidebarProps} />);

    // カテゴリーごとのメモ数表示
    const workCategory = getCategorySection(screen, 'Work');
    expect(workCategory).toContainElement(screen.getByText('2')); // 2個のメモ

    const personalCategory = getCategorySection(screen, 'Personal');
    expect(personalCategory).toContainElement(screen.getByText('2')); // 2個のメモ

    const ideasCategory = getCategorySection(screen, 'Ideas');
    expect(ideasCategory).toContainElement(screen.getByText('1')); // 1個のメモ
  });

  it('should display last updated time', () => {
    render(<AdaptiveSidebar {...defaultSidebarProps} />);

    // 更新時刻の表示確認（相対時間）
    expect(screen.getByText(/30.*分前|30.*minutes.*ago/i)).toBeInTheDocument(); // 30分前
    expect(screen.getByText(/2.*時間前|2.*hours.*ago/i)).toBeInTheDocument(); // 2時間前
  });

  it('should handle very long memo titles', () => {
    const longTitleMemo = {
      ...mockMemos[0],
      title: 'これは非常に長いタイトルのメモで、サイドバーでの表示がどのように処理されるかをテストするためのものです'
    };

    render(<AdaptiveSidebar {...defaultSidebarProps} memos={[longTitleMemo]} />);

    const memoItem = screen.getByTestId(`memo-item-${longTitleMemo.id}`);
    expect(memoItem).toBeInTheDocument();
    
    // タイトルが省略されている
    const titleElement = screen.getByText(/これは非常に長い/);
    expect(titleElement).toHaveClass('truncated');
  });

  it('should display memo count badge', () => {
    render(<AdaptiveSidebar {...defaultSidebarProps} />);

    // 総メモ数の表示
    expect(screen.getByText(`${mockMemos.length}`)).toBeInTheDocument();
    
    // または総数ラベル
    expect(screen.getByText(/total|合計/i)).toBeInTheDocument();
  });

  it('should show virtual scroll indicator when enabled', () => {
    // 大量のメモでテスト
    const manyMemos = Array.from({ length: 100 }, (_, i) => ({
      ...mockMemos[0],
      id: `memo_${i}`,
      title: `メモ ${i + 1}`
    }));

    render(<AdaptiveSidebar {...defaultSidebarProps} memos={manyMemos} />);

    // 仮想スクロールコンテナの確認
    const virtualContainer = screen.getByTestId('virtual-scroll-container');
    expect(virtualContainer).toBeInTheDocument();
  });

  it('should handle category collapse state correctly', () => {
    render(<AdaptiveSidebar {...defaultSidebarProps} />);

    // デフォルトで展開されている
    const workCategory = getCategorySection(screen, 'Work');
    expect(workCategory).toHaveAttribute('aria-expanded', 'true');

    // カテゴリー内のメモが表示されている
    expectMemoToBeVisible(screen, '重要な会議メモ');
    expectMemoToBeVisible(screen, 'タスクリスト');
  });

  it('should apply correct theme classes', () => {
    render(<AdaptiveSidebar {...defaultSidebarProps} />);

    const sidebar = screen.getByRole('complementary');
    
    // テーマクラスの確認
    expect(sidebar).toHaveClass('theme-light'); // デフォルトテーマ
  });
});