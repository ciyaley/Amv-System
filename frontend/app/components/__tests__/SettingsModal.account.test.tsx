// app/components/__tests__/SettingsModal.account.test.tsx - Settings Modal Account Tab Tests
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import { useAuth } from '../../hooks/useAuth';
import { SettingsModal } from '../SettingsModal';
import { 
  setupGlobalMocks, 
  resetAllMocks, 
  mockLogout,
  mockDeleteAccount,
  waitForModalAnimation,
  getTabButton,
  performAccountAction
} from './settings-modal-test-helpers';

// Mock useAuth
vi.mock('../../hooks/useAuth');

describe('SettingsModal - Account Settings Tab', () => {
  beforeEach(() => {
    setupGlobalMocks();
  });

  afterEach(() => {
    resetAllMocks();
  });

  it('should display user account information', async () => {
    render(<SettingsModal />);

    // アカウント設定タブに移動
    const accountTab = getTabButton(screen, 'account');
    fireEvent.click(accountTab);

    await waitForModalAnimation();

    // ユーザー情報の表示確認
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('test-uuid-123')).toBeInTheDocument();
  });

  it('should show login form when user is not authenticated', async () => {
    // 未認証ユーザーのモック
    vi.mocked(useAuth).mockReturnValue({
      isLoggedIn: false,
      email: null,
      uuid: null,
      isLogoutInProgress: false,
      logout: mockLogout,
      deleteAccount: mockDeleteAccount,
    });

    render(<SettingsModal />);

    // アカウント設定タブに移動
    const accountTab = getTabButton(screen, 'account');
    fireEvent.click(accountTab);

    await waitForModalAnimation();

    // ログインフォームが表示される
    expect(screen.getByRole('form', { name: /login|ログイン/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email|メールアドレス/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password|パスワード/i)).toBeInTheDocument();
  });

  it('should perform login from account tab', async () => {
    const user = userEvent.setup();
    
    // 未認証ユーザーのモック
    vi.mocked(useAuth).mockReturnValue({
      isLoggedIn: false,
      email: null,
      uuid: null,
      isLogoutInProgress: false,
      login: vi.fn().mockResolvedValue(true),
      logout: mockLogout,
      deleteAccount: mockDeleteAccount,
    });

    render(<SettingsModal />);

    // アカウント設定タブに移動
    const accountTab = getTabButton(screen, 'account');
    fireEvent.click(accountTab);

    await waitForModalAnimation();

    // ログイン情報を入力
    const emailInput = screen.getByLabelText(/email|メールアドレス/i);
    const passwordInput = screen.getByLabelText(/password|パスワード/i);
    
    await user.type(emailInput, 'user@example.com');
    await user.type(passwordInput, 'password123');

    // ログインボタンをクリック
    const loginButton = screen.getByRole('button', { name: /login|ログイン/i });
    fireEvent.click(loginButton);

    await waitFor(() => {
      // ログイン関数が呼ばれることを確認
      expect(vi.mocked(useAuth)().login).toHaveBeenCalledWith(
        'user@example.com',
        'password123'
      );
    });
  });

  it('should perform logout', async () => {
    global.confirm = vi.fn(() => true);
    
    render(<SettingsModal />);

    // アカウント設定タブに移動
    const accountTab = getTabButton(screen, 'account');
    fireEvent.click(accountTab);

    await waitForModalAnimation();

    // ログアウトボタンをクリック
    const logoutButton = await performAccountAction(screen, 'logout');
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringMatching(/logout|ログアウト/i)
      );
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  it('should cancel logout when user declines confirmation', async () => {
    global.confirm = vi.fn(() => false);
    
    render(<SettingsModal />);

    // アカウント設定タブに移動
    const accountTab = getTabButton(screen, 'account');
    fireEvent.click(accountTab);

    await waitForModalAnimation();

    // ログアウトボタンをクリック
    const logoutButton = await performAccountAction(screen, 'logout');
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled();
      expect(mockLogout).not.toHaveBeenCalled();
    });
  });

  it('should perform account deletion', async () => {
    global.confirm = vi.fn(() => true);
    global.prompt = vi.fn(() => 'DELETE');
    
    render(<SettingsModal />);

    // アカウント設定タブに移動
    const accountTab = getTabButton(screen, 'account');
    fireEvent.click(accountTab);

    await waitForModalAnimation();

    // アカウント削除ボタンをクリック
    const deleteButton = await performAccountAction(screen, 'delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringMatching(/delete.?account|アカウントを削除/i)
      );
      expect(global.prompt).toHaveBeenCalledWith(
        expect.stringMatching(/type.?DELETE|DELETE.*入力/i)
      );
      expect(mockDeleteAccount).toHaveBeenCalled();
    });
  });

  it('should cancel account deletion with wrong confirmation', async () => {
    global.confirm = vi.fn(() => true);
    global.prompt = vi.fn(() => 'wrong input');
    
    render(<SettingsModal />);

    // アカウント設定タブに移動
    const accountTab = getTabButton(screen, 'account');
    fireEvent.click(accountTab);

    await waitForModalAnimation();

    // アカウント削除ボタンをクリック
    const deleteButton = await performAccountAction(screen, 'delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled();
      expect(global.prompt).toHaveBeenCalled();
      expect(mockDeleteAccount).not.toHaveBeenCalled();
    });
  });

  it('should change password', async () => {
    const user = userEvent.setup();
    const mockChangePassword = vi.fn().mockResolvedValue(true);
    
    // changePassword メソッドを追加
    vi.mocked(useAuth).mockReturnValue({
      isLoggedIn: true,
      email: 'test@example.com',
      uuid: 'test-uuid-123',
      isLogoutInProgress: false,
      logout: mockLogout,
      deleteAccount: mockDeleteAccount,
      changePassword: mockChangePassword,
    });

    render(<SettingsModal />);

    // アカウント設定タブに移動
    const accountTab = getTabButton(screen, 'account');
    fireEvent.click(accountTab);

    await waitForModalAnimation();

    // パスワード変更セクション
    const currentPasswordInput = screen.getByLabelText(/current.?password|現在のパスワード/i);
    const newPasswordInput = screen.getByLabelText(/new.?password|新しいパスワード/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm.?password|パスワード確認/i);

    await user.type(currentPasswordInput, 'oldpassword');
    await user.type(newPasswordInput, 'newpassword123');
    await user.type(confirmPasswordInput, 'newpassword123');

    // パスワード変更ボタンをクリック
    const changePasswordButton = screen.getByRole('button', { 
      name: /change.?password|パスワードを変更/i 
    });
    
    fireEvent.click(changePasswordButton);

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith(
        'oldpassword',
        'newpassword123'
      );
    });
  });

  it('should validate password confirmation match', async () => {
    const user = userEvent.setup();
    
    render(<SettingsModal />);

    // アカウント設定タブに移動
    const accountTab = getTabButton(screen, 'account');
    fireEvent.click(accountTab);

    await waitForModalAnimation();

    // パスワード不一致を入力
    const newPasswordInput = screen.getByLabelText(/new.?password|新しいパスワード/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm.?password|パスワード確認/i);

    await user.type(newPasswordInput, 'password123');
    await user.type(confirmPasswordInput, 'different');

    // バリデーションエラーが表示される
    await waitFor(() => {
      expect(screen.getByText(/passwords.?do.?not.?match|パスワードが一致しません/i)).toBeInTheDocument();
    });
  });

  it('should display account statistics', async () => {
    render(<SettingsModal />);

    // アカウント設定タブに移動
    const accountTab = getTabButton(screen, 'account');
    fireEvent.click(accountTab);

    await waitForModalAnimation();

    // アカウント統計情報の表示
    expect(screen.getByText(/account.?created|アカウント作成日/i)).toBeInTheDocument();
    expect(screen.getByText(/last.?login|最終ログイン/i)).toBeInTheDocument();
    expect(screen.getByText(/memo.?count|メモ数/i)).toBeInTheDocument();
  });

  it('should handle two-factor authentication setup', async () => {
    render(<SettingsModal />);

    // アカウント設定タブに移動
    const accountTab = getTabButton(screen, 'account');
    fireEvent.click(accountTab);

    await waitForModalAnimation();

    // 2FA設定ボタン
    const enable2FAButton = screen.getByRole('button', { 
      name: /enable.?2fa|2fa.*有効/i 
    });
    
    fireEvent.click(enable2FAButton);

    await waitFor(() => {
      // 2FA設定モーダルまたはQRコードが表示される
      expect(screen.getByText(/qr.?code|qrコード/i)).toBeInTheDocument();
    });
  });

  it('should export account data', async () => {
    render(<SettingsModal />);

    // アカウント設定タブに移動
    const accountTab = getTabButton(screen, 'account');
    fireEvent.click(accountTab);

    await waitForModalAnimation();

    // データエクスポートボタン
    const exportDataButton = screen.getByRole('button', { 
      name: /export.?data|データをエクスポート/i 
    });
    
    fireEvent.click(exportDataButton);

    await waitFor(() => {
      // エクスポート開始メッセージ
      expect(screen.getByText(/exporting|エクスポート中/i)).toBeInTheDocument();
    });
  });

  it('should show privacy settings', async () => {
    render(<SettingsModal />);

    // アカウント設定タブに移動
    const accountTab = getTabButton(screen, 'account');
    fireEvent.click(accountTab);

    await waitForModalAnimation();

    // プライバシー設定セクション
    expect(screen.getByText(/privacy.?settings|プライバシー設定/i)).toBeInTheDocument();
    
    // データ共有オプション
    const dataShareCheckbox = screen.getByRole('checkbox', { 
      name: /share.?analytics|分析データを共有/i 
    });
    
    expect(dataShareCheckbox).toBeInTheDocument();
  });

  it('should handle email change', async () => {
    const user = userEvent.setup();
    const mockChangeEmail = vi.fn().mockResolvedValue(true);
    
    // changeEmail メソッドを追加
    vi.mocked(useAuth).mockReturnValue({
      isLoggedIn: true,
      email: 'test@example.com',
      uuid: 'test-uuid-123',
      isLogoutInProgress: false,
      logout: mockLogout,
      deleteAccount: mockDeleteAccount,
      changeEmail: mockChangeEmail,
    });

    render(<SettingsModal />);

    // アカウント設定タブに移動
    const accountTab = getTabButton(screen, 'account');
    fireEvent.click(accountTab);

    await waitForModalAnimation();

    // メールアドレス変更
    const newEmailInput = screen.getByLabelText(/new.?email|新しいメールアドレス/i);
    await user.type(newEmailInput, 'newemail@example.com');

    const changeEmailButton = screen.getByRole('button', { 
      name: /change.?email|メールアドレスを変更/i 
    });
    
    fireEvent.click(changeEmailButton);

    await waitFor(() => {
      expect(mockChangeEmail).toHaveBeenCalledWith('newemail@example.com');
    });
  });
});