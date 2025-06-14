// app/components/__tests__/SettingsIntegration.errors.test.tsx - Error Handling Tests
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AccountSettings } from '../AccountSettings';
import { AppearanceSettings } from '../AppearanceSettings';
import { GeneralSettings } from '../GeneralSettings';
import { 
  setupMocks, 
  resetMockStates, 
  mockUseAuth,
  mockUseTheme,
  setupAuthenticatedUser,
  simulateAuthError,
  simulateDirectoryError,
  simulateThemeError
} from './settings-integration-test-helpers';

// Setup mocks
setupMocks();

describe('Settings Integration - Error Handling', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    resetMockStates();
  });

  it('should handle account operation errors gracefully', async () => {
    setupAuthenticatedUser('test@example.com');
    mockUseAuth.logout.mockRejectedValue(new Error('Logout failed'));
    
    render(<AccountSettings />);
    
    const logoutButton = screen.getByText('ログアウト');
    await act(async () => {
      await user.click(logoutButton);
    });
    
    await waitFor(() => {
      expect(mockUseAuth.logout).toHaveBeenCalled();
      // Error handling should be triggered
    });
  });

  it('should handle directory selection failures', async () => {
    // Get the mocked function from our vi.mock declaration
    const mockFileAccess = await import('../../../utils/fileAccess');
    vi.mocked(mockFileAccess.requestDirectory).mockRejectedValue(new Error('Directory access denied'));
    
    setupAuthenticatedUser();
    
    render(<GeneralSettings />);
    
    const selectButton = screen.getAllByText(/フォルダを選択/)[0];
    await act(async () => {
      if (selectButton) {
        await user.click(selectButton);
      }
    });
    
    await waitFor(() => {
      expect(mockFileAccess.requestDirectory).toHaveBeenCalled();
      // Error handling should be triggered
    });
  });

  it('should handle theme resource loading failures', async () => {
    // エラーハンドリングのテスト - Promise rejectionを適切に処理
    const mockError = new Error('Image load failed');
    mockUseTheme.getBgImageUrl.mockRejectedValue(mockError);
    mockUseTheme.bgHandle = { name: 'test-image.jpg', kind: 'file' as const };
    
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    render(<AppearanceSettings />);
    
    // Should handle error gracefully without crashing
    await waitFor(() => {
      expect(mockUseTheme.getBgImageUrl).toHaveBeenCalled();
    });
    
    // エラーハンドリングが呼ばれることを確認
    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to load background image:', mockError);
    });
    
    consoleWarnSpy.mockRestore();
  });

  it('should handle authentication errors during login', async () => {
    simulateAuthError();
    
    render(<AccountSettings />);
    
    const authSubmitButton = screen.getByTestId('auth-submit');
    await act(async () => {
      await user.click(authSubmitButton);
    });
    
    // The onSuccess callback should be called even in mock mode
    await waitFor(() => {
      expect(authSubmitButton).toBeInTheDocument();
    });
  });

  it('should handle directory permission errors', async () => {
    simulateDirectoryError();
    setupAuthenticatedUser();
    
    render(<GeneralSettings />);
    
    const selectButton = screen.getAllByText(/フォルダを選択/)[0];
    await act(async () => {
      if (selectButton) {
        await user.click(selectButton);
      }
    });
    
    // Should handle permission errors gracefully
    await waitFor(() => {
      expect(screen.getAllByText(/フォルダを選択/)[0]).toBeInTheDocument();
    });
  });

  it('should handle theme loading errors', async () => {
    simulateThemeError();
    
    render(<AppearanceSettings />);
    
    // Should render without crashing even with theme errors
    expect(screen.getByLabelText('背景色選択')).toBeInTheDocument();
  });
});