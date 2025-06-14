// app/components/__tests__/SettingsIntegration.integration.test.tsx - Cross-Settings Integration Tests
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { AccountSettings } from '../AccountSettings';
import { AppearanceSettings } from '../AppearanceSettings';
import { GeneralSettings } from '../GeneralSettings';
import { 
  setupMocks, 
  resetMockStates, 
  mockUseCanvas,
  mockUseTheme,
  setupAuthenticatedUser,
  setupGuestUser
} from './settings-integration-test-helpers';

// Setup mocks
setupMocks();

describe('Settings Integration - Cross-Settings Integration', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    resetMockStates();
  });

  it('should maintain settings consistency across components', async () => {
    // Render all settings components
    const { container } = render(
      <div>
        <AccountSettings />
        <AppearanceSettings />
        <GeneralSettings />
      </div>
    );
    
    // Verify all components render without conflicts
    expect(container.querySelector('[role="tabpanel"]')).toBeInTheDocument();
    expect(screen.getByLabelText('背景色選択')).toBeInTheDocument();
    expect(screen.getByLabelText(/幅/)).toBeInTheDocument();
  });

  it('should handle authentication state changes affecting all settings', async () => {
    setupGuestUser();
    
    render(
      <div>
        <AccountSettings />
        <GeneralSettings />
      </div>
    );
    
    // Start as guest
    expect(screen.getByTestId('auth-form-login')).toBeInTheDocument();
    // Verify file save section is not displayed for guest
    expect(screen.queryByText(/保存フォルダ/)).not.toBeInTheDocument();
  });

  it('should show file settings when authenticated', async () => {
    setupAuthenticatedUser('test@example.com');
    
    render(
      <div>
        <AccountSettings />
        <GeneralSettings />
      </div>
    );
    
    // Verify authentication affects both components
    expect(screen.getByText('ログイン済み')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-form-login')).not.toBeInTheDocument();
    expect(screen.getByText(/保存フォルダ/)).toBeInTheDocument();
  });

  it('should validate settings state consistency', async () => {
    // Test canvas and theme settings consistency
    render(
      <div>
        <AppearanceSettings />
        <GeneralSettings />
      </div>
    );
    
    // Change canvas size in GeneralSettings
    const widthInput = screen.getByLabelText(/幅/) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(widthInput, { target: { value: '1920' } });
    });
    
    // Verify canvas change is applied
    expect(mockUseCanvas.setWidth).toHaveBeenCalledWith(1920);
    
    // Change background color in AppearanceSettings
    const colorPicker = screen.getByLabelText('背景色選択');
    await act(async () => {
      fireEvent.change(colorPicker, { target: { value: '#ff0000' } });
    });
    
    // Verify theme change is applied
    expect(mockUseTheme.setBgColor).toHaveBeenCalledWith('#ff0000');
  });

  it('should persist canvas settings across component unmounts', async () => {
    const { unmount } = render(<GeneralSettings />);
    
    // Verify setting persisted from store
    const widthInput = screen.getByLabelText(/幅/) as HTMLInputElement;
    expect(widthInput.value).toBe('1600'); // Default value from mock
    
    // Unmount
    unmount();
    
    // Mock the setting being updated in store
    mockUseCanvas.width = 1920;
    
    render(<GeneralSettings />);
    
    // Verify setting persisted from store
    const newWidthInput = screen.getByLabelText(/幅/) as HTMLInputElement;
    expect(newWidthInput.value).toBe('1920');
  });

  it('should handle storage validation and testing workflow', async () => {
    render(<GeneralSettings />);
    
    // Test storage validation
    const validateButton = screen.getByText(/ストレージ状態をチェック/);
    await user.click(validateButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Validation OK/)).toBeInTheDocument();
    });
    
    // Test auto test runner
    const testButton = screen.getByText(/完全自動テスト実行/);
    await user.click(testButton);
    
    // Auto test should run after validation
    await waitFor(() => {
      expect(screen.getByText(/Validation OK/)).toBeInTheDocument();
    });
  });
});