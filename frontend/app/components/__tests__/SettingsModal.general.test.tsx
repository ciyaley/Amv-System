// app/components/__tests__/SettingsModal.general.test.tsx - Settings Modal General Tab Tests
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import { SettingsModal } from '../SettingsModal';
import { 
  setupGlobalMocks, 
  resetAllMocks, 
  mockUpdateSettings,
  mockResetSettings,
  getTabButton,
  getSettingControl,
  expectSettingToBeUpdated
} from './settings-modal-test-helpers';

describe('SettingsModal - General Settings Tab', () => {
  beforeEach(() => {
    setupGlobalMocks();
  });

  afterEach(() => {
    resetAllMocks();
  });

  it('should display current save location', () => {
    render(<SettingsModal />);

    // 一般設定タブに移動
    const generalTab = getTabButton(screen, 'general');
    fireEvent.click(generalTab);

    // 保存場所の表示確認
    expect(screen.getByText(/save.?location|保存場所/i)).toBeInTheDocument();
    expect(screen.getByText(/documents|ドキュメント/i)).toBeInTheDocument();
  });

  it('should change save location', async () => {
    render(<SettingsModal />);

    // 一般設定タブに移動
    const generalTab = getTabButton(screen, 'general');
    fireEvent.click(generalTab);

    // 保存場所変更ボタンをクリック
    const changeSaveLocationButton = screen.getByRole('button', { 
      name: /change.?location|場所を変更/i 
    });
    
    fireEvent.click(changeSaveLocationButton);

    await waitFor(() => {
      // showDirectoryPicker が呼ばれることを確認
      expect(window.showDirectoryPicker).toHaveBeenCalled();
    });
  });

  it('should toggle auto-save setting', async () => {
    render(<SettingsModal />);

    // 一般設定タブに移動
    const generalTab = getTabButton(screen, 'general');
    fireEvent.click(generalTab);

    // 自動保存チェックボックスを取得
    const autoSaveCheckbox = getSettingControl(screen, 'autoSave') as HTMLInputElement;
    expect(autoSaveCheckbox).toBeChecked();

    // チェックボックスをクリック
    fireEvent.click(autoSaveCheckbox);

    await waitFor(() => {
      expectSettingToBeUpdated('autoSave', false);
    });
  });

  it('should change language setting', async () => {
    render(<SettingsModal />);

    // 一般設定タブに移動
    const generalTab = getTabButton(screen, 'general');
    fireEvent.click(generalTab);

    // 言語設定を変更
    const languageSelect = getSettingControl(screen, 'language');
    fireEvent.change(languageSelect, { target: { value: 'en' } });

    await waitFor(() => {
      expectSettingToBeUpdated('language', 'en');
    });
  });

  it('should change density setting', async () => {
    render(<SettingsModal />);

    // 一般設定タブに移動
    const generalTab = getTabButton(screen, 'general');
    fireEvent.click(generalTab);

    // 密度設定を変更
    const densitySelect = getSettingControl(screen, 'density');
    fireEvent.change(densitySelect, { target: { value: 'compact' } });

    await waitFor(() => {
      expectSettingToBeUpdated('sidebarDensity', 'compact');
    });
  });

  it('should reset all settings', async () => {
    global.confirm = vi.fn(() => true);
    
    render(<SettingsModal />);

    // 一般設定タブに移動
    const generalTab = getTabButton(screen, 'general');
    fireEvent.click(generalTab);

    // リセットボタンをクリック
    const resetButton = screen.getByRole('button', { 
      name: /reset|リセット/i 
    });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringMatching(/reset|リセット/i)
      );
      expect(mockResetSettings).toHaveBeenCalled();
    });
  });

  it('should cancel reset when user declines confirmation', async () => {
    global.confirm = vi.fn(() => false);
    
    render(<SettingsModal />);

    // 一般設定タブに移動
    const generalTab = getTabButton(screen, 'general');
    fireEvent.click(generalTab);

    // リセットボタンをクリック
    const resetButton = screen.getByRole('button', { 
      name: /reset|リセット/i 
    });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled();
      expect(mockResetSettings).not.toHaveBeenCalled();
    });
  });

  it('should toggle sidebar collapsed setting', async () => {
    render(<SettingsModal />);

    // 一般設定タブに移動
    const generalTab = getTabButton(screen, 'general');
    fireEvent.click(generalTab);

    // サイドバー折りたたみ設定を切り替え
    const sidebarCollapsedCheckbox = screen.getByRole('checkbox', { 
      name: /sidebar.?collapsed|サイドバー折りたたみ/i 
    });
    
    fireEvent.click(sidebarCollapsedCheckbox);

    await waitFor(() => {
      expectSettingToBeUpdated('sidebarCollapsed', !sidebarCollapsedCheckbox.checked);
    });
  });

  it('should toggle show search by default setting', async () => {
    render(<SettingsModal />);

    // 一般設定タブに移動
    const generalTab = getTabButton(screen, 'general');
    fireEvent.click(generalTab);

    // デフォルト検索表示設定を切り替え
    const showSearchCheckbox = screen.getByRole('checkbox', { 
      name: /show.?search|検索を表示/i 
    });
    
    fireEvent.click(showSearchCheckbox);

    await waitFor(() => {
      expectSettingToBeUpdated('showSearchByDefault', !showSearchCheckbox.checked);
    });
  });

  it('should change virtual scroll threshold', async () => {
    render(<SettingsModal />);

    // 一般設定タブに移動
    const generalTab = getTabButton(screen, 'general');
    fireEvent.click(generalTab);

    // 仮想スクロール閾値を変更
    const thresholdInput = screen.getByRole('spinbutton', { 
      name: /virtual.?scroll|仮想スクロール/i 
    });
    
    fireEvent.change(thresholdInput, { target: { value: '150' } });

    await waitFor(() => {
      expectSettingToBeUpdated('virtualScrollThreshold', 150);
    });
  });

  it('should validate virtual scroll threshold input', async () => {
    render(<SettingsModal />);

    // 一般設定タブに移動
    const generalTab = getTabButton(screen, 'general');
    fireEvent.click(generalTab);

    // 無効な値を入力
    const thresholdInput = screen.getByRole('spinbutton', { 
      name: /virtual.?scroll|仮想スクロール/i 
    });
    
    fireEvent.change(thresholdInput, { target: { value: '-10' } });

    // バリデーションエラーメッセージが表示される
    await waitFor(() => {
      expect(screen.getByText(/invalid|無効/i)).toBeInTheDocument();
    });

    // 設定は更新されない
    expect(mockUpdateSettings).not.toHaveBeenCalledWith(
      expect.objectContaining({
        virtualScrollThreshold: -10
      })
    );
  });

  it('should export settings', async () => {
    render(<SettingsModal />);

    // 一般設定タブに移動
    const generalTab = getTabButton(screen, 'general');
    fireEvent.click(generalTab);

    // エクスポートボタンをクリック
    const exportButton = screen.getByRole('button', { 
      name: /export|エクスポート/i 
    });
    
    fireEvent.click(exportButton);

    // ダウンロードリンクが作成される
    await waitFor(() => {
      // エクスポート機能の実行確認
      expect(screen.getByText(/exported|エクスポート完了/i)).toBeInTheDocument();
    });
  });

  it('should import settings', async () => {
    render(<SettingsModal />);

    // 一般設定タブに移動
    const generalTab = getTabButton(screen, 'general');
    fireEvent.click(generalTab);

    // インポートファイル選択
    const importInput = screen.getByLabelText(/import|インポート/i) as HTMLInputElement;
    
    const mockFile = new File(['{"theme":"dark"}'], 'settings.json', {
      type: 'application/json'
    });

    Object.defineProperty(importInput, 'files', {
      value: [mockFile],
      writable: false,
    });

    fireEvent.change(importInput);

    await waitFor(() => {
      // インポート成功メッセージ
      expect(screen.getByText(/imported|インポート完了/i)).toBeInTheDocument();
    });
  });

  it('should handle invalid import file', async () => {
    render(<SettingsModal />);

    // 一般設定タブに移動
    const generalTab = getTabButton(screen, 'general');
    fireEvent.click(generalTab);

    // 無効なファイルを選択
    const importInput = screen.getByLabelText(/import|インポート/i) as HTMLInputElement;
    
    const mockFile = new File(['invalid json'], 'invalid.json', {
      type: 'application/json'
    });

    Object.defineProperty(importInput, 'files', {
      value: [mockFile],
      writable: false,
    });

    fireEvent.change(importInput);

    await waitFor(() => {
      // エラーメッセージが表示される
      expect(screen.getByText(/error|エラー/i)).toBeInTheDocument();
    });
  });

  it('should show keyboard shortcuts help', async () => {
    render(<SettingsModal />);

    // 一般設定タブに移動
    const generalTab = getTabButton(screen, 'general');
    fireEvent.click(generalTab);

    // キーボードショートカットヘルプボタン
    const helpButton = screen.getByRole('button', { 
      name: /keyboard.?shortcuts|キーボードショートカット/i 
    });
    
    fireEvent.click(helpButton);

    await waitFor(() => {
      // ヘルプモーダルまたはツールチップが表示される
      expect(screen.getByText(/shortcuts|ショートカット/i)).toBeInTheDocument();
    });
  });
});