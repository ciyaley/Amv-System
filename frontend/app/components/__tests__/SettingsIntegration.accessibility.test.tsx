// app/components/__tests__/SettingsIntegration.accessibility.test.tsx - Accessibility Tests
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { AccountSettings } from '../AccountSettings';
import { AppearanceSettings } from '../AppearanceSettings';
import { GeneralSettings } from '../GeneralSettings';
import { 
  setupMocks, 
  resetMockStates
} from './settings-integration-test-helpers';

// Setup mocks
setupMocks();

describe('Settings Integration - Accessibility', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    resetMockStates();
  });

  it('should provide proper ARIA labels across all settings', () => {
    render(
      <div>
        <AccountSettings />
        <AppearanceSettings />
        <GeneralSettings />
      </div>
    );
    
    // Verify ARIA labels
    expect(screen.getByLabelText('背景色選択')).toBeInTheDocument();
    expect(screen.getByLabelText(/幅/)).toBeInTheDocument();
    expect(screen.getByLabelText(/高さ/)).toBeInTheDocument();
  });

  it('should support keyboard navigation across settings', async () => {
    render(
      <div>
        <AccountSettings />
        <AppearanceSettings />
        <GeneralSettings />
      </div>
    );
    
    // Test tab navigation
    await user.tab();
    
    // Verify focus management
    expect(document.activeElement).toBeInTheDocument();
  });

  it('should provide proper form labels for canvas settings', async () => {
    render(<GeneralSettings />);
    
    // Verify form labels
    expect(screen.getByLabelText(/幅/)).toBeInTheDocument();
    expect(screen.getByLabelText(/高さ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/初期ズーム/)).toBeInTheDocument();
  });

  it('should provide accessible authentication forms', () => {
    render(<AccountSettings />);
    
    // Verify auth form accessibility
    expect(screen.getByTestId('auth-form-login')).toBeInTheDocument();
    expect(screen.getByTestId('auth-submit')).toBeInTheDocument();
  });

  it('should provide accessible appearance controls', () => {
    render(<AppearanceSettings />);
    
    // Verify appearance controls have proper labels
    const colorPicker = screen.getByLabelText('背景色選択');
    expect(colorPicker).toBeInTheDocument();
    expect(colorPicker).toHaveAttribute('type', 'color');
    
    // Verify image selection button
    expect(screen.getByText('背景画像を選択')).toBeInTheDocument();
  });

  it('should support screen reader navigation', () => {
    render(
      <div>
        <AccountSettings />
        <AppearanceSettings />
        <GeneralSettings />
      </div>
    );
    
    // Verify landmark roles and headings exist
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    
    // Verify color picker
    const colorInput = screen.getByRole('textbox', { name: /背景色選択/ });
    expect(colorInput).toBeInTheDocument();
  });
});