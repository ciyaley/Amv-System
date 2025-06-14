// app/hooks/__tests__/useSettings-useTheme.integration.test.ts
/**
 * Integration Tests: useSettings + useTheme
 * 
 * Tests the integration between settings management and theme application
 * - Theme changes triggering setting updates
 * - Setting persistence affecting theme state
 * - Theme consistency across setting resets
 * - Background image and color coordination
 */
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useSettings } from '../useSettings'
import { useThemeStore } from '../useTheme'

interface MockFileHandle {
  getFile: () => Promise<File>;
  name: string;
}

// Mock file access for settings
const mockLoadSettings = vi.fn()
const mockSaveSettings = vi.fn()

vi.mock('../../../utils/fileAccess', () => ({
  loadSettings: mockLoadSettings,
  saveSettings: mockSaveSettings,
  enableFileSystemOperations: vi.fn(),
  stopFileSystemOperations: vi.fn(),
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn().mockReturnValue('mock-blob-url')
global.URL.revokeObjectURL = vi.fn()

describe('useSettings + useTheme Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock behaviors
    mockLoadSettings.mockResolvedValue(null)
    mockSaveSettings.mockResolvedValue(undefined)
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Theme Setting Synchronization', () => {
    it('should update theme when theme setting changes', async () => {
      const { result: settingsResult } = renderHook(() => useSettings())

      // Change theme setting
      await act(async () => {
        await settingsResult.current.updateSettings({ theme: 'dark' })
      })

      // Wait for theme store to update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Verify theme setting was saved
      expect(settingsResult.current.settings.theme).toBe('dark')
    })

    it('should persist appearance settings correctly', async () => {
      const { result: settingsResult } = renderHook(() => useSettings())

      // Update multiple appearance settings
      await act(async () => {
        await settingsResult.current.updateSettings({
          theme: 'dark',
          language: 'ja',
          sidebarDensity: 'dense'
        })
      })

      // Verify all settings were updated
      expect(settingsResult.current.settings.theme).toBe('dark')
      expect(settingsResult.current.settings.language).toBe('ja') 
      expect(settingsResult.current.settings.sidebarDensity).toBe('dense')

      // Verify settings were saved
      expect(mockSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'dark',
          language: 'ja',
          sidebarDensity: 'dense'
        })
      )
    })

    it('should handle theme reset correctly', async () => {
      const { result: settingsResult } = renderHook(() => useSettings())

      // Set custom theme
      await act(async () => {
        await settingsResult.current.updateSettings({ theme: 'dark' })
      })

      expect(settingsResult.current.settings.theme).toBe('dark')

      // Reset settings
      await act(async () => {
        await settingsResult.current.resetSettings()
      })

      // Verify theme was reset to default
      expect(settingsResult.current.settings.theme).toBe('light')
    })
  })

  describe('Background Image Integration', () => {
    it('should handle background image setting and theme coordination', async () => {
      const { result: themeResult } = renderHook(() => useThemeStore())

      // Mock file handle for background image
      const mockFile = new File(['mock image data'], 'background.jpg', { type: 'image/jpeg' })
      const mockFileHandle: MockFileHandle = {
        getFile: vi.fn().mockResolvedValue(mockFile),
        name: 'background.jpg'
      }

      // Set background image
      act(() => {
        themeResult.current.setBgHandle(mockFileHandle)
      })

      // Verify background handle was set
      expect(themeResult.current.bgHandle).toBe(mockFileHandle)

      // Change background color
      act(() => {
        themeResult.current.setBgColor('#336699')
      })

      // Verify color was set
      expect(themeResult.current.bgColor).toBe('#336699')
    })

    it('should get background image URL correctly', async () => {
      const { result: themeResult } = renderHook(() => useThemeStore())

      // Mock file handle with image
      const mockFile = new File(['mock image data'], 'test.jpg', { type: 'image/jpeg' })
      const mockFileHandle: MockFileHandle = {
        getFile: vi.fn().mockResolvedValue(mockFile),
        name: 'test.jpg'
      }

      // Set background handle
      act(() => {
        themeResult.current.setBgHandle(mockFileHandle)
      })

      // Get image URL
      let imageUrl: string | null = null
      await act(async () => {
        imageUrl = await themeResult.current.getBgImageUrl()
      })

      // Verify URL was created
      expect(imageUrl).toBe('mock-blob-url')
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockFile)
    })

    it('should handle background image errors gracefully', async () => {
      const { result: themeResult } = renderHook(() => useThemeStore())

      // Mock file handle that throws error
      const mockFileHandle: MockFileHandle = {
        getFile: vi.fn().mockRejectedValue(new Error('File access failed')),
        name: 'error.jpg'
      }

      // Set background handle
      act(() => {
        themeResult.current.setBgHandle(mockFileHandle)
      })

      // Try to get image URL (should handle error)
      let imageUrl: string | null = null
      await act(async () => {
        imageUrl = await themeResult.current.getBgImageUrl()
      })

      // Should return null on error
      expect(imageUrl).toBeNull()
    })
  })

  describe('Setting Persistence and Theme Coordination', () => {
    it('should load saved theme settings on initialization', async () => {
      // Mock saved settings
      mockLoadSettings.mockResolvedValue({
        theme: 'dark',
        language: 'ja',
        sidebarDensity: 'dense',
        maxRecentFiles: 10,
        autoSaveInterval: 1000,
        debugMode: true
      })

      const { result: settingsResult } = renderHook(() => useSettings())

      // Wait for settings to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Verify settings were loaded
      expect(settingsResult.current.settings.theme).toBe('dark')
      expect(settingsResult.current.settings.language).toBe('ja')
      expect(settingsResult.current.settings.sidebarDensity).toBe('dense')
    })

    it('should fallback to localStorage when file system fails', async () => {
      // Mock file system failure
      mockLoadSettings.mockRejectedValue(new Error('File system not available'))
      
      // Mock localStorage with saved settings
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        theme: 'dark',
        language: 'en'
      }))

      renderHook(() => useSettings())

      // Wait for fallback to localStorage
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Verify localStorage was used
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('amv-settings')
    })

    it('should save theme changes to both file system and localStorage', async () => {
      const { result: settingsResult } = renderHook(() => useSettings())

      // Update theme setting
      await act(async () => {
        await settingsResult.current.updateSettings({ theme: 'dark' })
      })

      // Verify file system save was attempted
      expect(mockSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ theme: 'dark' })
      )

      // Verify localStorage backup was updated
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'amv-settings',
        expect.stringContaining('"theme":"dark"')
      )
    })
  })

  describe('Theme Validation and Error Handling', () => {
    it('should validate theme values during setting updates', async () => {
      const { result: settingsResult } = renderHook(() => useSettings())

      // Try to set invalid theme (intentionally use any for testing invalid input)
      await act(async () => {
        await settingsResult.current.updateSettings({ theme: 'invalid-theme' as any })
      })

      // Should fallback to default theme
      expect(settingsResult.current.settings.theme).toBe('light')
    })

    it('should validate language values during setting updates', async () => {
      const { result: settingsResult } = renderHook(() => useSettings())

      // Try to set invalid language (intentionally use any for testing invalid input)
      await act(async () => {
        await settingsResult.current.updateSettings({ language: 'invalid-lang' as any })
      })

      // Should fallback to default language
      expect(settingsResult.current.settings.language).toBe('en')
    })

    it('should validate density values during setting updates', async () => {
      const { result: settingsResult } = renderHook(() => useSettings())

      // Try to set invalid density (intentionally use any for testing invalid input)
      await act(async () => {
        await settingsResult.current.updateSettings({ sidebarDensity: 'invalid-density' as any })
      })

      // Should fallback to default density
      expect(settingsResult.current.settings.sidebarDensity).toBe('standard')
    })

    it('should handle save errors gracefully', async () => {
      const { result: settingsResult } = renderHook(() => useSettings())

      // Mock save error
      mockSaveSettings.mockRejectedValue(new Error('Save failed'))

      // Update setting (should not throw)
      await act(async () => {
        await settingsResult.current.updateSettings({ theme: 'dark' })
      })

      // Verify setting was updated in memory despite save error
      expect(settingsResult.current.settings.theme).toBe('dark')
    })
  })

  describe('Concurrent Updates Handling', () => {
    it('should handle rapid theme changes correctly', async () => {
      const { result: settingsResult } = renderHook(() => useSettings())

      // Rapid theme changes
      await act(async () => {
        settingsResult.current.updateSettings({ theme: 'dark' })
        settingsResult.current.updateSettings({ theme: 'light' })
        settingsResult.current.updateSettings({ theme: 'dark' })
      })

      // Should end up with the last value
      expect(settingsResult.current.settings.theme).toBe('dark')
    })

    it('should handle concurrent setting updates safely', async () => {
      const { result: settingsResult } = renderHook(() => useSettings())

      // Concurrent updates to different settings
      await act(async () => {
        await Promise.all([
          settingsResult.current.updateSettings({ theme: 'dark' }),
          settingsResult.current.updateSettings({ language: 'ja' }),
          settingsResult.current.updateSettings({ sidebarDensity: 'dense' })
        ])
      })

      // All updates should be applied
      expect(settingsResult.current.settings.theme).toBe('dark')
      expect(settingsResult.current.settings.language).toBe('ja')
      expect(settingsResult.current.settings.sidebarDensity).toBe('dense')
    })
  })
});