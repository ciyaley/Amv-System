// app/components/__tests__/SettingsModal.appearance.test.tsx - Settings Modal Appearance Tab Tests
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// unused import removed: import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import { SettingsModal } from '../SettingsModal';
import { 
  setupGlobalMocks, 
  resetAllMocks, 
  mockUpdateSettings,
  waitForModalAnimation,
  getTabButton,
  getSettingControl,
  expectSettingToBeUpdated,
  createMockFile,
  simulateFileUpload
} from './settings-modal-test-helpers';

describe('SettingsModal - Appearance Settings Tab', () => {
  beforeEach(() => {
    setupGlobalMocks();
  });

  afterEach(() => {
    resetAllMocks();
  });

  it('should change theme setting', async () => {
    render(<SettingsModal />);

    // 外観設定タブに移動
    const appearanceTab = getTabButton(screen, 'appearance');
    fireEvent.click(appearanceTab);

    await waitForModalAnimation();

    // テーマ設定を変更
    const themeSelect = getSettingControl(screen, 'theme');
    fireEvent.change(themeSelect, { target: { value: 'dark' } });

    await waitFor(() => {
      expectSettingToBeUpdated('theme', 'dark');
    });
  });

  it('should upload background image', async () => {
    render(<SettingsModal />);

    // 外観設定タブに移動
    const appearanceTab = getTabButton(screen, 'appearance');
    fireEvent.click(appearanceTab);

    await waitForModalAnimation();

    // ファイル入力を取得
    const fileInput = screen.getByLabelText(/background.?image|背景画像/i) as HTMLInputElement;
    
    // 有効な画像ファイルを作成
    const mockFile = createMockFile('background.jpg', 1024 * 1024); // 1MB
    
    simulateFileUpload(fileInput, mockFile);

    await waitFor(() => {
      // アップロード成功のメッセージまたは状態変更
      expect(screen.getByText(/uploaded|アップロード完了/i)).toBeInTheDocument();
    });
  });

  it('should validate background image size', async () => {
    render(<SettingsModal />);

    // 外観設定タブに移動
    const appearanceTab = getTabButton(screen, 'appearance');
    fireEvent.click(appearanceTab);

    await waitForModalAnimation();

    // ファイル入力を取得
    const fileInput = screen.getByLabelText(/background.?image|背景画像/i) as HTMLInputElement;
    
    // サイズが大きすぎるファイルを作成
    const largeFile = createMockFile('large-background.jpg', 10 * 1024 * 1024); // 10MB
    
    simulateFileUpload(fileInput, largeFile);

    await waitFor(() => {
      // エラーメッセージが表示される
      expect(screen.getByText(/too.?large|サイズが大きすぎます/i)).toBeInTheDocument();
    });
  });

  it('should remove background image', async () => {
    render(<SettingsModal />);

    // 外観設定タブに移動
    const appearanceTab = getTabButton(screen, 'appearance');
    fireEvent.click(appearanceTab);

    await waitForModalAnimation();

    // 背景画像削除ボタンをクリック
    const removeButton = screen.getByRole('button', { 
      name: /remove.?background|背景を削除/i 
    });
    
    fireEvent.click(removeButton);

    await waitFor(() => {
      expectSettingToBeUpdated('backgroundImage', null);
    });
  });

  it('should change font size', async () => {
    render(<SettingsModal />);

    // 外観設定タブに移動
    const appearanceTab = getTabButton(screen, 'appearance');
    fireEvent.click(appearanceTab);

    await waitForModalAnimation();

    // フォントサイズスライダーを変更
    const fontSizeSlider = getSettingControl(screen, 'fontSize');
    fireEvent.change(fontSizeSlider, { target: { value: '16' } });

    await waitFor(() => {
      expectSettingToBeUpdated('fontSize', 16);
    });
  });

  it('should change font family', async () => {
    render(<SettingsModal />);

    // 外観設定タブに移動
    const appearanceTab = getTabButton(screen, 'appearance');
    fireEvent.click(appearanceTab);

    await waitForModalAnimation();

    // フォントファミリー選択
    const fontFamilySelect = screen.getByRole('combobox', { 
      name: /font.?family|フォントファミリー/i 
    });
    
    fireEvent.change(fontFamilySelect, { target: { value: 'Georgia' } });

    await waitFor(() => {
      expectSettingToBeUpdated('fontFamily', 'Georgia');
    });
  });

  it('should change line height', async () => {
    render(<SettingsModal />);

    // 外観設定タブに移動
    const appearanceTab = getTabButton(screen, 'appearance');
    fireEvent.click(appearanceTab);

    await waitForModalAnimation();

    // 行間設定スライダー
    const lineHeightSlider = screen.getByRole('slider', { 
      name: /line.?height|行間/i 
    });
    
    fireEvent.change(lineHeightSlider, { target: { value: '1.6' } });

    await waitFor(() => {
      expectSettingToBeUpdated('lineHeight', 1.6);
    });
  });

  it('should change custom opacity', async () => {
    render(<SettingsModal />);

    // 外観設定タブに移動
    const appearanceTab = getTabButton(screen, 'appearance');
    fireEvent.click(appearanceTab);

    await waitForModalAnimation();

    // 透明度スライダー
    const opacitySlider = screen.getByRole('slider', { 
      name: /opacity|透明度/i 
    });
    
    fireEvent.change(opacitySlider, { target: { value: '0.8' } });

    await waitFor(() => {
      expectSettingToBeUpdated('customOpacity', 0.8);
    });
  });

  it('should preview appearance changes', async () => {
    render(<SettingsModal />);

    // 外観設定タブに移動
    const appearanceTab = getTabButton(screen, 'appearance');
    fireEvent.click(appearanceTab);

    await waitForModalAnimation();

    // プレビューエリアの確認
    const previewArea = screen.getByTestId('appearance-preview');
    expect(previewArea).toBeInTheDocument();

    // テーマを変更してプレビューが更新されることを確認
    const themeSelect = getSettingControl(screen, 'theme');
    fireEvent.change(themeSelect, { target: { value: 'dark' } });

    await waitFor(() => {
      // プレビューエリアのスタイルが変更される
      expect(previewArea).toHaveClass('dark-theme');
    });
  });

  it('should reset appearance settings to default', async () => {
    global.confirm = vi.fn(() => true);
    
    render(<SettingsModal />);

    // 外観設定タブに移動
    const appearanceTab = getTabButton(screen, 'appearance');
    fireEvent.click(appearanceTab);

    await waitForModalAnimation();

    // 外観設定リセットボタン
    const resetAppearanceButton = screen.getByRole('button', { 
      name: /reset.?appearance|外観をリセット/i 
    });
    
    fireEvent.click(resetAppearanceButton);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled();
      // デフォルト値での設定更新
      expect(mockUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'light',
          fontSize: 14,
          fontFamily: 'Inter'
        })
      );
    });
  });

  it('should validate background image file type', async () => {
    render(<SettingsModal />);

    // 外観設定タブに移動
    const appearanceTab = getTabButton(screen, 'appearance');
    fireEvent.click(appearanceTab);

    await waitForModalAnimation();

    // ファイル入力を取得
    const fileInput = screen.getByLabelText(/background.?image|背景画像/i) as HTMLInputElement;
    
    // 無効なファイルタイプを作成
    const invalidFile = new File(['content'], 'document.pdf', {
      type: 'application/pdf'
    });
    
    simulateFileUpload(fileInput, invalidFile);

    await waitFor(() => {
      // エラーメッセージが表示される
      expect(screen.getByText(/invalid.?file.?type|無効なファイル形式/i)).toBeInTheDocument();
    });
  });

  it('should show color picker for custom colors', async () => {
    render(<SettingsModal />);

    // 外観設定タブに移動
    const appearanceTab = getTabButton(screen, 'appearance');
    fireEvent.click(appearanceTab);

    await waitForModalAnimation();

    // カスタムカラーボタンをクリック
    const customColorButton = screen.getByRole('button', { 
      name: /custom.?color|カスタムカラー/i 
    });
    
    fireEvent.click(customColorButton);

    await waitFor(() => {
      // カラーピッカーが表示される
      expect(screen.getByTestId('color-picker')).toBeInTheDocument();
    });
  });

  it('should handle zoom level settings', async () => {
    render(<SettingsModal />);

    // 外観設定タブに移動
    const appearanceTab = getTabButton(screen, 'appearance');
    fireEvent.click(appearanceTab);

    await waitForModalAnimation();

    // ズームレベルスライダー
    const zoomSlider = screen.getByRole('slider', { 
      name: /zoom|ズーム/i 
    });
    
    fireEvent.change(zoomSlider, { target: { value: '1.2' } });

    await waitFor(() => {
      expectSettingToBeUpdated('zoomLevel', 1.2);
    });
  });

  it('should toggle compact mode', async () => {
    render(<SettingsModal />);

    // 外観設定タブに移動
    const appearanceTab = getTabButton(screen, 'appearance');
    fireEvent.click(appearanceTab);

    await waitForModalAnimation();

    // コンパクトモード切り替え
    const compactModeCheckbox = screen.getByRole('checkbox', { 
      name: /compact.?mode|コンパクトモード/i 
    });
    
    fireEvent.click(compactModeCheckbox);

    await waitFor(() => {
      expectSettingToBeUpdated('compactMode', true);
    });
  });

  it('should export appearance settings separately', async () => {
    render(<SettingsModal />);

    // 外観設定タブに移動
    const appearanceTab = getTabButton(screen, 'appearance');
    fireEvent.click(appearanceTab);

    await waitForModalAnimation();

    // 外観設定エクスポートボタン
    const exportAppearanceButton = screen.getByRole('button', { 
      name: /export.?appearance|外観設定をエクスポート/i 
    });
    
    fireEvent.click(exportAppearanceButton);

    await waitFor(() => {
      // エクスポート完了メッセージ
      expect(screen.getByText(/appearance.?exported|外観設定をエクスポートしました/i)).toBeInTheDocument();
    });
  });

  it('should handle high contrast mode', async () => {
    render(<SettingsModal />);

    // 外観設定タブに移動
    const appearanceTab = getTabButton(screen, 'appearance');
    fireEvent.click(appearanceTab);

    await waitForModalAnimation();

    // ハイコントラストモード切り替え
    const highContrastCheckbox = screen.getByRole('checkbox', { 
      name: /high.?contrast|ハイコントラスト/i 
    });
    
    fireEvent.click(highContrastCheckbox);

    await waitFor(() => {
      expectSettingToBeUpdated('highContrastMode', true);
    });
  });
});