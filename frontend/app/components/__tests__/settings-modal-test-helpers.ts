// app/components/__tests__/settings-modal-test-helpers.ts - Settings Modal Test Helpers
import { vi } from 'vitest';

// テスト用設定データ
export const mockSettings = {
  theme: 'light' as const,
  language: 'ja' as const,
  sidebarDensity: 'standard' as const,
  autoSave: true,
  sidebarCollapsed: false,
  showSearchByDefault: true,
  virtualScrollThreshold: 200,
};

// Mock functions
export const mockUpdateSettings = vi.fn();
export const mockResetSettings = vi.fn();
export const mockCloseModal = vi.fn();
export const mockDeleteAccount = vi.fn();
export const mockLogout = vi.fn();

// Mock hooks setup
export function setupMockHooks() {
  // useSettings モック
  const mockUseSettings = vi.fn().mockReturnValue({
    settings: mockSettings,
    isLoading: false,
    updateSetting: vi.fn(),
    updateSettings: mockUpdateSettings,
    resetSettings: mockResetSettings,
    exportSettings: vi.fn(() => JSON.stringify(mockSettings)),
    importSettings: vi.fn(() => true),
  });

  // useAuth モック
  const mockUseAuth = vi.fn().mockReturnValue({
    isLoggedIn: true,
    email: 'test@example.com',
    uuid: 'test-uuid-123',
    isLogoutInProgress: false,
    logout: mockLogout,
    deleteAccount: mockDeleteAccount,
  });

  // useModalStore モック
  const mockUseModalStore = vi.fn().mockReturnValue({
    activeModal: 'settings',
    closeModal: mockCloseModal,
  });

  return {
    mockUseSettings,
    mockUseAuth,
    mockUseModalStore
  };
}

// Global mocks setup
export function setupGlobalMocks() {
  vi.mock('../../hooks/useSettings', () => ({
    useSettings: setupMockHooks().mockUseSettings
  }));

  vi.mock('../../hooks/useAuth', () => ({
    useAuth: setupMockHooks().mockUseAuth  
  }));

  vi.mock('../../hooks/useModal', () => ({
    useModalStore: setupMockHooks().mockUseModalStore
  }));

  // File System API Mock
  Object.defineProperty(window, 'showDirectoryPicker', {
    value: vi.fn().mockResolvedValue({
      name: 'test-folder',
      kind: 'directory'
    }),
    writable: true
  });

  // URL.createObjectURL Mock
  Object.defineProperty(global.URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:mock-url'),
    writable: true
  });

  // FileReader Mock
  global.FileReader = vi.fn().mockImplementation(() => ({
    readAsDataURL: vi.fn(),
    onload: null,
    onerror: null,
    result: 'data:image/jpeg;base64,mockImageData'
  }));
}

// Test utilities
export const waitForModalAnimation = async (delay: number = 100) => {
  await new Promise(resolve => setTimeout(resolve, delay));
};

export const simulateKeyPress = (element: Element, key: string, options: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', {
    key,
    code: key,
    bubbles: true,
    cancelable: true,
    ...options
  });
  
  element.dispatchEvent(event);
};

export const simulateFileUpload = (input: HTMLInputElement, file: File) => {
  Object.defineProperty(input, 'files', {
    value: [file],
    writable: false,
  });

  const event = new Event('change', { bubbles: true });
  input.dispatchEvent(event);
};

// Mock file creation
export const createMockFile = (
  name: string, 
  size: number, 
  type: string = 'image/jpeg'
): File => {
  const mockFile = new File(['mock-content'], name, { type });
  
  // Override size property
  Object.defineProperty(mockFile, 'size', {
    value: size,
    writable: false
  });

  return mockFile;
};

// Reset all mocks
export const resetAllMocks = () => {
  mockUpdateSettings.mockClear();
  mockResetSettings.mockClear();
  mockCloseModal.mockClear();
  mockDeleteAccount.mockClear();
  mockLogout.mockClear();
  vi.clearAllMocks();
};

// Tab navigation helpers
export const getTabButton = (screen: TestScreen, tabName: string) => {
  const tabPatterns = {
    general: /general|一般/i,
    appearance: /appearance|外観/i,  
    account: /account|アカウント/i
  };

  const pattern = tabPatterns[tabName as keyof typeof tabPatterns];
  if (!pattern) throw new Error(`Unknown tab: ${tabName}`);

  return screen.getByRole('tab', { name: pattern });
};

export const expectTabToBeActive = (tabElement: Element, active: boolean = true) => {
  if (active) {
    expect(tabElement).toHaveAttribute('aria-selected', 'true');
    expect(tabElement).toHaveClass('active');
  } else {
    expect(tabElement).toHaveAttribute('aria-selected', 'false');
    expect(tabElement).not.toHaveClass('active');
  }
};

// Settings form helpers
export const getSettingControl = (screen: TestScreen, settingName: string) => {
  const settingPatterns = {
    theme: /theme|テーマ/i,
    language: /language|言語/i,
    density: /density|密度/i,
    autoSave: /auto.?save|自動保存/i,
    fontSize: /font.?size|フォントサイズ/i,
    saveLocation: /save.?location|保存場所/i
  };

  const pattern = settingPatterns[settingName as keyof typeof settingPatterns];
  if (!pattern) throw new Error(`Unknown setting: ${settingName}`);

  // Try different control types
  try {
    return screen.getByRole('combobox', { name: pattern });
  } catch {
    try {
      return screen.getByRole('checkbox', { name: pattern });
    } catch {
      try {
        return screen.getByRole('slider', { name: pattern });
      } catch {
        return screen.getByLabelText(pattern);
      }
    }
  }
};

// Account action helpers
export const performAccountAction = async (screen: TestScreen, action: 'logout' | 'delete') => {
  const buttonPatterns = {
    logout: /logout|ログアウト/i,
    delete: /delete|削除/i
  };

  const pattern = buttonPatterns[action];
  const button = screen.getByRole('button', { name: pattern });
  
  return button;
};

// Validation helpers
export const expectSettingToBeUpdated = (settingKey: string, newValue: unknown) => {
  expect(mockUpdateSettings).toHaveBeenCalledWith(
    expect.objectContaining({
      [settingKey]: newValue
    })
  );
};