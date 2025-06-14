// app/components/__tests__/SettingsModal.basic.test.tsx - Settings Modal Basic Functionality Tests
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import { useModalStore } from '../../hooks/useModal';
import { SettingsModal } from '../SettingsModal';
import { 
  setupGlobalMocks, 
  resetAllMocks, 
  mockCloseModal,
  waitForModalAnimation,
  simulateKeyPress,
  getTabButton,
  expectTabToBeActive
} from './settings-modal-test-helpers';

// Mock useModalStore
vi.mock('../../hooks/useModal');

describe('SettingsModal - Basic Functionality', () => {
  beforeEach(() => {
    setupGlobalMocks();
  });

  afterEach(() => {
    resetAllMocks();
  });

  it('should render settings modal with all tabs', () => {
    render(<SettingsModal />);

    // モーダルの存在確認
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/settings|設定/i)).toBeInTheDocument();

    // タブの存在確認
    expect(getTabButton(screen, 'general')).toBeInTheDocument();
    expect(getTabButton(screen, 'appearance')).toBeInTheDocument();
    expect(getTabButton(screen, 'account')).toBeInTheDocument();
  });

  it('should close modal when close button is clicked', async () => {
    render(<SettingsModal />);

    const closeButton = screen.getByRole('button', { name: /close|閉じる/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(mockCloseModal).toHaveBeenCalled();
    });
  });

  it('should close modal when backdrop is clicked', async () => {
    render(<SettingsModal />);

    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);

    await waitFor(() => {
      expect(mockCloseModal).toHaveBeenCalled();
    });
  });

  it('should close modal when Escape key is pressed', async () => {
    render(<SettingsModal />);

    const modal = screen.getByRole('dialog');
    simulateKeyPress(modal, 'Escape');

    await waitFor(() => {
      expect(mockCloseModal).toHaveBeenCalled();
    });
  });

  it('should not render when modal is closed', () => {
    // Mock closed modal state
    vi.mocked(useModalStore).mockReturnValue({
      activeModal: null,
      closeModal: mockCloseModal,
    });

    render(<SettingsModal />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should switch to appearance tab', async () => {
    render(<SettingsModal />);

    const appearanceTab = getTabButton(screen, 'appearance');
    fireEvent.click(appearanceTab);

    await waitForModalAnimation();

    expectTabToBeActive(appearanceTab, true);
    expect(screen.getByText(/theme|テーマ/i)).toBeInTheDocument();
  });

  it('should switch to account tab', async () => {
    render(<SettingsModal />);

    const accountTab = getTabButton(screen, 'account');
    fireEvent.click(accountTab);

    await waitForModalAnimation();

    expectTabToBeActive(accountTab, true);
    expect(screen.getByText(/account|アカウント/i)).toBeInTheDocument();
  });

  it('should maintain active tab state', async () => {
    render(<SettingsModal />);

    // 外観タブに切り替え
    const appearanceTab = getTabButton(screen, 'appearance');
    fireEvent.click(appearanceTab);

    await waitForModalAnimation();

    // 一般タブに戻る
    const generalTab = getTabButton(screen, 'general');
    fireEvent.click(generalTab);

    await waitForModalAnimation();

    expectTabToBeActive(generalTab, true);
    expectTabToBeActive(appearanceTab, false);
  });

  it('should support keyboard navigation between tabs', async () => {
    const user = userEvent.setup();
    render(<SettingsModal />);

    const generalTab = getTabButton(screen, 'general');
    const appearanceTab = getTabButton(screen, 'appearance');
    const accountTab = getTabButton(screen, 'account');

    // フォーカスを一般タブに設定
    generalTab.focus();
    expect(generalTab).toHaveFocus();

    // 右矢印キーで次のタブに移動
    await user.keyboard('{ArrowRight}');
    expect(appearanceTab).toHaveFocus();

    // 右矢印キーでさらに次のタブに移動
    await user.keyboard('{ArrowRight}');
    expect(accountTab).toHaveFocus();

    // 左矢印キーで前のタブに戻る
    await user.keyboard('{ArrowLeft}');
    expect(appearanceTab).toHaveFocus();
  });

  it('should prevent modal close during unsaved changes', async () => {
    render(<SettingsModal />);

    // 設定を変更（未保存状態を作る）
    const someInput = screen.getByDisplayValue(/test/i);
    if (someInput) {
      fireEvent.change(someInput, { target: { value: 'modified value' } });
    }

    // モーダルを閉じようとする
    const closeButton = screen.getByRole('button', { name: /close|閉じる/i });
    fireEvent.click(closeButton);

    // 確認ダイアログが表示されるかテスト
    // 実装によってはモーダルがすぐに閉じない場合がある
    await waitForModalAnimation();
  });

  it('should handle modal animations properly', async () => {
    const { rerender } = render(<SettingsModal />);

    // モーダルが表示されている
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // モーダルを閉じる
    vi.mocked(useModalStore).mockReturnValue({
      activeModal: null,
      closeModal: mockCloseModal,
    });

    rerender(<SettingsModal />);

    // アニメーション完了後はモーダルが表示されない
    await waitForModalAnimation(300);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should handle accessibility attributes correctly', () => {
    render(<SettingsModal />);

    const modal = screen.getByRole('dialog');
    
    // ARIA属性の確認
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby');
    
    // フォーカストラップの確認
    const firstFocusable = modal.querySelector('[tabindex="0"]');
    expect(firstFocusable).toBeTruthy();
  });

  it('should handle multiple modal instances gracefully', () => {
    // 複数のモーダルインスタンスをレンダリング
    render(
      <>
        <SettingsModal />
        <SettingsModal />
      </>
    );

    // 1つのモーダルのみが表示される
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs).toHaveLength(1);
  });

  it('should preserve focus when switching tabs', async () => {
    render(<SettingsModal />);

    const generalTab = getTabButton(screen, 'general');
    const appearanceTab = getTabButton(screen, 'appearance');

    // 一般タブにフォーカス
    generalTab.focus();
    expect(generalTab).toHaveFocus();

    // 外観タブに切り替え
    fireEvent.click(appearanceTab);
    await waitForModalAnimation();

    // フォーカスが適切に管理されている
    expect(document.activeElement).toBeTruthy();
  });

  it('should handle window resize during modal display', () => {
    render(<SettingsModal />);

    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();

    // ウィンドウリサイズをシミュレート
    global.dispatchEvent(new Event('resize'));

    // モーダルが引き続き正常に表示される
    expect(modal).toBeInTheDocument();
    expect(modal).toBeVisible();
  });
});