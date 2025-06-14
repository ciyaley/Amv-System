// app/components/__tests__/SettingsIntegration.appearance.test.tsx - Appearance Settings Tests
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { AppearanceSettings } from '../AppearanceSettings';
import { 
  setupMocks, 
  resetMockStates, 
  mockUseTheme,
  setupThemeWithBackground,
  expectThemeSettings
} from './settings-integration-test-helpers';

// Setup mocks
setupMocks();

describe('Settings Integration - Appearance Settings', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    resetMockStates();
  });

  it('should handle background color changes', async () => {
    render(<AppearanceSettings />);
    
    const colorPicker = screen.getByLabelText('背景色選択');
    await user.click(colorPicker);
    
    // Simulate color change
    fireEvent.change(colorPicker, { target: { value: '#ff0000' } });
    
    expect(mockUseTheme.setBgColor).toHaveBeenCalledWith('#ff0000');
  });

  it('should handle background image selection', async () => {
    mockUseTheme.pickBgImage.mockResolvedValue(undefined);
    
    render(<AppearanceSettings />);
    
    const imageButton = screen.getByText('背景画像を選択');
    await user.click(imageButton);
    
    expect(mockUseTheme.pickBgImage).toHaveBeenCalled();
  });

  it('should display background image preview when image is selected', async () => {
    const mockImageUrl = 'blob:mockurl';
    mockUseTheme.getBgImageUrl.mockResolvedValue(mockImageUrl);
    mockUseTheme.bgHandle = { name: 'test-image.jpg', kind: 'file' as const };
    
    render(<AppearanceSettings />);
    
    await waitFor(() => {
      const preview = screen.getByRole('img', { name: /背景プレビュー/ });
      expect(preview).toBeInTheDocument();
      expect(preview).toHaveAttribute('src', mockImageUrl);
    });
  });

  it('should reflect current theme state in UI', async () => {
    setupThemeWithBackground('#123456');
    
    render(<AppearanceSettings />);
    
    expectThemeSettings(screen, '#123456');
  });
});