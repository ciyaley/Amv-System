// app/components/__tests__/settings-integration-test-helpers.ts - Settings Integration Test Helpers

import React from 'react';
import { vi } from 'vitest';
import type { Screen } from '@testing-library/react';

// Testing Library screen type
type TestScreen = Pick<Screen, 'getByRole' | 'getByText' | 'getByLabelText' | 'getByTestId' | 'queryByText' | 'queryByTestId' | 'getAllByTestId' | 'getByDisplayValue'>;

// AuthForm props type
interface AuthFormProps {
  mode: 'login' | 'register';
  onSuccess?: () => void;
}

// Background image handle type
interface BackgroundImageHandle {
  name: string;
  kind: 'file';
}

// Mock objects for all settings components
export const mockUseAuth = {
  isLoggedIn: false,
  email: null as string | null,
  uuid: null as string | null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  deleteAccount: vi.fn(),
  checkAutoLogin: vi.fn(),
  setAuth: vi.fn()
};

export const mockUseTheme = {
  bgColor: '#ffffff',
  setBgColor: vi.fn(),
  bgHandle: null,
  pickBgImage: vi.fn(),
  getBgImageUrl: vi.fn().mockResolvedValue(null)
};

export const mockUseCanvas = {
  width: 1600,
  height: 900,
  zoom: 5,
  offsetX: 0,
  offsetY: 0,
  setWidth: vi.fn(),
  setHeight: vi.fn(),
  setZoom: vi.fn(),
  resetPan: vi.fn(),
  setLayout: vi.fn(),
  setOffset: vi.fn(),
  panBy: vi.fn()
};

// Common setup functions
export const setupMocks = () => {
  // Mock sonner
  vi.mock('sonner', () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn()
    }
  }));

  // Mock AuthForm component 
  vi.mock('../AuthForm', () => ({
    AuthForm: ({ mode, onSuccess }: AuthFormProps) => {
      return React.createElement('div', {
        'data-testid': `auth-form-${mode}`
      }, React.createElement('button', {
        onClick: () => onSuccess?.(),
        'data-testid': 'auth-submit'
      }, mode === 'login' ? 'ログイン' : '登録'));
    }
  }));

  // Mock hooks
  vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => mockUseAuth
  }));

  vi.mock('../../hooks/useTheme', () => ({
    useThemeStore: () => mockUseTheme
  }));

  vi.mock('../../hooks/useCanvas', () => ({
    useCanvasStore: () => mockUseCanvas
  }));

  // Mock storage validator and auto test runner
  vi.mock('../../../utils/storageValidator', () => ({
    validateStorageState: vi.fn().mockResolvedValue({ isValid: true, details: 'OK' }),
    formatValidationResult: vi.fn().mockReturnValue('Validation OK')
  }));

  vi.mock('../../../utils/autoTestRunner', () => ({
    runFullAutoTest: vi.fn().mockResolvedValue({ success: true, message: 'All tests passed' }),
    runJWTTest: vi.fn().mockResolvedValue({ success: true, autologinWorks: true, message: 'JWT test passed' })
  }));

  // Mock fileAccess utilities
  vi.mock('../../../utils/fileAccess', () => ({
    getStoredDir: vi.fn().mockResolvedValue({ name: 'test-directory' }),
    requestDirectory: vi.fn().mockResolvedValue(undefined),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    loadSettings: vi.fn().mockResolvedValue(null),
    saveWorkspace: vi.fn().mockResolvedValue(undefined),
    loadWorkspace: vi.fn().mockResolvedValue(null)
  }));
};

// Reset functions
export const resetMockStates = () => {
  vi.clearAllMocks();
  
  // Reset mock states
  mockUseAuth.isLoggedIn = false;
  mockUseAuth.email = null;
  mockUseAuth.uuid = null;
  
  mockUseTheme.bgColor = '#ffffff';
  mockUseTheme.bgHandle = null;
  
  mockUseCanvas.width = 1600;
  mockUseCanvas.height = 900;
  mockUseCanvas.zoom = 5;
};

// Helper functions for common test scenarios
export const setupAuthenticatedUser = (email: string = 'test@example.com', uuid: string = 'test-uuid-123') => {
  mockUseAuth.isLoggedIn = true;
  mockUseAuth.email = email;
  mockUseAuth.uuid = uuid;
};

export const setupGuestUser = () => {
  mockUseAuth.isLoggedIn = false;
  mockUseAuth.email = null;
  mockUseAuth.uuid = null;
};

export const setupThemeWithBackground = (color: string = '#123456', imageHandle?: BackgroundImageHandle | null) => {
  mockUseTheme.bgColor = color;
  mockUseTheme.bgHandle = imageHandle || null;
};

export const setupCanvas = (width: number = 1600, height: number = 900, zoom: number = 5) => {
  mockUseCanvas.width = width;
  mockUseCanvas.height = height;
  mockUseCanvas.zoom = zoom;
};

// Test assertion helpers
export const expectAuthenticatedUI = (screen: TestScreen) => {
  expect(screen.getByText('ログイン済み')).toBeInTheDocument();
  expect(screen.getByText('ログアウト')).toBeInTheDocument();
  expect(screen.getByText('アカウントを削除')).toBeInTheDocument();
};

export const expectGuestUI = (screen: TestScreen) => {
  expect(screen.getByTestId('auth-form-login')).toBeInTheDocument();
  expect(screen.getByText('登録')).toBeInTheDocument();
};

export const expectCanvasSettings = (screen: TestScreen, width: number, height: number) => {
  expect(screen.getByDisplayValue(width.toString())).toBeInTheDocument();
  expect(screen.getByDisplayValue(height.toString())).toBeInTheDocument();
};

export const expectThemeSettings = (screen: TestScreen, color: string) => {
  const colorInput = screen.getByDisplayValue(color);
  expect(colorInput).toBeInTheDocument();
};

// Error simulation helpers
export const simulateAuthError = () => {
  mockUseAuth.login.mockRejectedValue(new Error('Authentication failed'));
  mockUseAuth.register.mockRejectedValue(new Error('Registration failed'));
  mockUseAuth.deleteAccount.mockRejectedValue(new Error('Account deletion failed'));
};

export const simulateDirectoryError = async () => {
  const { requestDirectory } = await import('../../../utils/fileAccess');
  vi.mocked(requestDirectory)
    .mockRejectedValue(new Error('Directory selection failed'));
};

export const simulateThemeError = () => {
  mockUseTheme.pickBgImage.mockRejectedValue(new Error('Background image selection failed'));
  mockUseTheme.getBgImageUrl.mockRejectedValue(new Error('Failed to load background image'));
};