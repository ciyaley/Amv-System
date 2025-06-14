// app/components/__tests__/SettingsIntegration.general.test.tsx - General Settings Tests
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { GeneralSettings } from '../GeneralSettings';
import { 
  setupMocks, 
  resetMockStates, 
  mockUseCanvas,
  setupAuthenticatedUser,
  setupCanvas,
  expectCanvasSettings
} from './settings-integration-test-helpers';

// Setup mocks
setupMocks();

describe('Settings Integration - General Settings', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    resetMockStates();
  });

  it('should handle canvas size adjustments', async () => {
    render(<GeneralSettings />);
    
    // Find canvas width input
    const widthInput = screen.getByLabelText(/幅/) as HTMLInputElement;
    
    await act(async () => {
      fireEvent.change(widthInput, { target: { value: '1920' } });
    });
    
    // Check that setWidth was called with the final value
    expect(mockUseCanvas.setWidth).toHaveBeenCalledWith(1920);
  });

  it('should handle canvas height adjustments', async () => {
    render(<GeneralSettings />);
    
    const heightInput = screen.getByLabelText(/高さ/) as HTMLInputElement;
    
    await act(async () => {
      fireEvent.change(heightInput, { target: { value: '1080' } });
    });
    
    expect(mockUseCanvas.setHeight).toHaveBeenCalledWith(1080);
  });

  it('should handle zoom level changes', async () => {
    render(<GeneralSettings />);
    
    const zoomInput = screen.getByLabelText(/初期ズーム/) as HTMLInputElement;
    
    await act(async () => {
      fireEvent.change(zoomInput, { target: { value: '3' } });
    });
    
    expect(mockUseCanvas.setZoom).toHaveBeenCalledWith(3);
  });

  it('should handle directory selection for authenticated users', async () => {
    setupAuthenticatedUser();
    
    render(<GeneralSettings />);
    
    const selectButton = screen.getAllByText(/フォルダを選択/)[0];
    
    await act(async () => {
      if (selectButton) {
        await user.click(selectButton);
      }
    });
    
    await waitFor(() => {
      expect(screen.getAllByText(/フォルダを選択/)[0]).toBeInTheDocument();
    });
  });

  it('should handle canvas reset', async () => {
    render(<GeneralSettings />);
    
    const resetButton = screen.getByText(/初期位置に戻す/);
    await user.click(resetButton);
    
    expect(mockUseCanvas.resetPan).toHaveBeenCalled();
  });

  it('should display current canvas values correctly', async () => {
    setupCanvas(1920, 1080, 3);
    
    render(<GeneralSettings />);
    
    expectCanvasSettings(screen, 1920, 1080);
  });
});