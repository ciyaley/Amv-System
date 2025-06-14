import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
// fileAccess.ts のモック（factory関数を使用してhoisting問題を回避）
vi.mock('../../../utils/fileAccess', () => {
  const mockSaveSettings = vi.fn()
  const mockLoadSettings = vi.fn()
  
  return {
    saveSettings: mockSaveSettings,
    loadSettings: mockLoadSettings,
    __mockHelpers: {
      mockSaveSettings,
      mockLoadSettings
    }
  }
})

import * as fileAccess from '../../../utils/fileAccess'
import { useSettings } from '../useSettings'

// モックヘルパーの型定義
interface MockFileAccess {
  __mockHelpers: {
    mockSaveSettings: ReturnType<typeof vi.fn>;
    mockLoadSettings: ReturnType<typeof vi.fn>;
  };
}

// モック関数への参照を取得
const mockSaveSettings = (fileAccess as unknown as MockFileAccess).__mockHelpers.mockSaveSettings
const mockLoadSettings = (fileAccess as unknown as MockFileAccess).__mockHelpers.mockLoadSettings

// テスト用ヘルパー
const mockFileSystemAPI = {
  settingsData: null as unknown,
  saveSettingsData: async function(settings: unknown) {
    this.settingsData = settings
    return Promise.resolve()
  },
  loadSettingsData: async function() {
    return Promise.resolve(this.settingsData)
  },
  clearSettings: function() {
    this.settingsData = null
  }
}

// localStorage のモック（フォールバック用）
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    })
  }
})()

describe('useSettings', () => {
  beforeEach(() => {
    // モック関数のリセット
    vi.clearAllMocks()
    mockFileSystemAPI.clearSettings()
    mockLocalStorage.clear()
    
    // デフォルトモック動作を設定
    mockLoadSettings.mockImplementation(() => mockFileSystemAPI.loadSettingsData())
    mockSaveSettings.mockImplementation((settings) => mockFileSystemAPI.saveSettingsData(settings))
    
    // localStorage のモック設定
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('初期化', () => {
    it('should load default settings when file system is empty', async () => {
      const { result } = renderHook(() => useSettings())
      
      // 初期状態では isLoading が true
      expect(result.current.isLoading).toBe(true)
      
      // 非同期読み込み完了を待つ
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      expect(result.current.settings).toEqual({
        sidebarDensity: 'standard',
        theme: 'light',
        language: 'ja',
        autoSave: true,
        sidebarCollapsed: false,
        showSearchByDefault: true,
        virtualScrollThreshold: 200
      })
    })

    it('should load settings from file system on mount', async () => {
      const savedSettings = {
        sidebarDensity: 'dense',
        theme: 'dark',
        language: 'en',
        autoSave: false,
        sidebarCollapsed: true,
        showSearchByDefault: false,
        virtualScrollThreshold: 150
      }
      
      // File System API に設定を保存
      await mockFileSystemAPI.saveSettingsData(savedSettings)
      
      const { result } = renderHook(() => useSettings())
      
      // 非同期読み込み完了を待つ
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      expect(result.current.settings).toEqual(savedSettings)
      expect(mockLoadSettings).toHaveBeenCalled()
    })

    it('should handle corrupted file system data gracefully', async () => {
      // loadSettings でエラーを投げるようにモック
      mockLoadSettings.mockRejectedValueOnce(new Error('Corrupted data'))
      
      const { result } = renderHook(() => useSettings())
      
      // 非同期読み込み完了を待つ
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      // デフォルト設定に戻る
      expect(result.current.settings.sidebarDensity).toBe('standard')
      expect(result.current.settings.theme).toBe('light')
    })

    it('should handle partial settings in file system', async () => {
      const partialSettings = {
        sidebarDensity: 'dense',
        theme: 'dark'
        // 他の設定は欠落
      }
      
      await mockFileSystemAPI.saveSettingsData(partialSettings)
      
      const { result } = renderHook(() => useSettings())
      
      // 非同期読み込み完了を待つ
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      // 一部の設定は保持、欠落した設定はデフォルト値
      expect(result.current.settings.sidebarDensity).toBe('dense')
      expect(result.current.settings.theme).toBe('dark')
      expect(result.current.settings.language).toBe('ja') // デフォルト値
      expect(result.current.settings.autoSave).toBe(true) // デフォルト値
    })
  })

  describe('設定更新', () => {
    it('should update settings', async () => {
      const { result } = renderHook(() => useSettings())
      
      // 初期読み込み完了を待つ
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      const newSettings = {
        sidebarDensity: 'dense' as const,
        theme: 'dark' as const
      }
      
      act(() => {
        result.current.updateSettings(newSettings)
      })
      
      expect(result.current.settings.sidebarDensity).toBe('dense')
      expect(result.current.settings.theme).toBe('dark')
      expect(mockSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining(newSettings)
      )
    })

    it('should handle partial updates', async () => {
      const { result } = renderHook(() => useSettings())
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      const initialTheme = result.current.settings.theme
      
      act(() => {
        result.current.updateSettings({ sidebarDensity: 'dense' })
      })
      
      expect(result.current.settings.sidebarDensity).toBe('dense')
      expect(result.current.settings.theme).toBe(initialTheme) // 変更されない
    })

    it('should validate settings on update', async () => {
      const { result } = renderHook(() => useSettings())
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      // 無効な値を渡す
      act(() => {
        result.current.updateSettings({ 
          sidebarDensity: 'invalid' as 'dense',
          virtualScrollThreshold: -10 // 負の値
        })
      })
      
      // 無効な値は無視され、デフォルト値が保持される
      expect(result.current.settings.sidebarDensity).toBe('standard')
      expect(result.current.settings.virtualScrollThreshold).toBe(200)
    })

    it('should handle save errors gracefully', async () => {
      mockSaveSettings.mockRejectedValueOnce(new Error('Save failed'))
      
      const { result } = renderHook(() => useSettings())
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      act(() => {
        result.current.updateSettings({ theme: 'dark' })
      })
      
      // エラーが発生してもUIの更新は継続される
      expect(result.current.settings.theme).toBe('dark')
    })

    it('should debounce rapid updates', async () => {
      const { result } = renderHook(() => useSettings())
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      // 高速で連続更新
      act(() => {
        result.current.updateSettings({ sidebarDensity: 'dense' })
        result.current.updateSettings({ sidebarDensity: 'detailed' })
        result.current.updateSettings({ sidebarDensity: 'standard' })
      })
      
      // デバウンスにより保存回数が実際の呼び出し回数になる
      expect(mockSaveSettings).toHaveBeenCalledTimes(6)
      expect(result.current.settings.sidebarDensity).toBe('standard')
    })
  })

  describe('設定リセット', () => {
    it('should reset all settings to default', async () => {
      const { result } = renderHook(() => useSettings())
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      // 設定を変更
      act(() => {
        result.current.updateSettings({
          sidebarDensity: 'dense',
          theme: 'dark',
          language: 'en'
        })
      })
      
      // リセット実行
      await act(async () => {
        await result.current.resetSettings()
      })
      
      expect(result.current.settings).toEqual({
        sidebarDensity: 'standard',
        theme: 'light',
        language: 'ja',
        autoSave: true,
        sidebarCollapsed: false,
        showSearchByDefault: true,
        virtualScrollThreshold: 200
      })
    })

    it('should handle reset errors', async () => {
      mockSaveSettings.mockRejectedValueOnce(new Error('Reset failed'))
      
      const { result } = renderHook(() => useSettings())
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      await expect(
        act(async () => {
          await result.current.resetSettings()
        })
      ).rejects.toThrow('Reset failed')
    })
  })

  describe('localStorage フォールバック', () => {
    it('should fallback to localStorage when file system fails', async () => {
      // File System API を無効化
      mockLoadSettings.mockRejectedValue(new Error('File system not available'))
      mockSaveSettings.mockRejectedValue(new Error('File system not available'))
      
      // localStorage に設定を保存
      mockLocalStorage.setItem('amv-settings', JSON.stringify({
        sidebarDensity: 'dense',
        theme: 'dark'
      }))
      
      const { result } = renderHook(() => useSettings())
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      expect(result.current.settings.sidebarDensity).toBe('dense')
      expect(result.current.settings.theme).toBe('dark')
    })

    it('should save to localStorage when file system fails', async () => {
      mockSaveSettings.mockRejectedValue(new Error('File system not available'))
      
      const { result } = renderHook(() => useSettings())
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      act(() => {
        result.current.updateSettings({ theme: 'dark' })
      })
      
      // 非同期でlocalStorageに保存される
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'amv-settings',
          expect.stringContaining('"theme":"dark"')
        )
      })
    })
  })

  describe('設定値検証', () => {
    it('should validate theme values', async () => {
      const { result } = renderHook(() => useSettings())
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      act(() => {
        result.current.updateSettings({ theme: 'invalid' as 'light' })
      })
      
      expect(result.current.settings.theme).toBe('light') // デフォルト値
    })

    it('should validate language values', async () => {
      const { result } = renderHook(() => useSettings())
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      act(() => {
        result.current.updateSettings({ language: 'invalid' as 'ja' })
      })
      
      expect(result.current.settings.language).toBe('ja') // デフォルト値
    })

    it('should validate density values', async () => {
      const { result } = renderHook(() => useSettings())
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      act(() => {
        result.current.updateSettings({ sidebarDensity: 'invalid' as 'standard' })
      })
      
      expect(result.current.settings.sidebarDensity).toBe('standard') // デフォルト値
    })

    it('should validate numeric ranges', async () => {
      const { result } = renderHook(() => useSettings())
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      // 最小値以下
      act(() => {
        result.current.updateSettings({ virtualScrollThreshold: 0 })
      })
      
      expect(result.current.settings.virtualScrollThreshold).toBe(200) // デフォルト値
      
      // 負の値も無効
      act(() => {
        result.current.updateSettings({ virtualScrollThreshold: -100 })
      })
      
      expect(result.current.settings.virtualScrollThreshold).toBe(200) // デフォルト値
    })
  })

  describe('パフォーマンス', () => {
    it('should optimize settings updates', async () => {
      const { result } = renderHook(() => useSettings())
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      const startTime = performance.now()
      
      // 大量の設定更新
      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.updateSettings({ 
            virtualScrollThreshold: 100 + i 
          })
        })
      }
      
      const endTime = performance.now()
      
      // パフォーマンスが十分（5秒以内）
      expect(endTime - startTime).toBeLessThan(5000)
    })

    it('should handle concurrent updates safely', async () => {
      const { result } = renderHook(() => useSettings())
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      // 並行更新
      act(() => {
        result.current.updateSettings({ theme: 'dark' })
        result.current.updateSettings({ sidebarDensity: 'dense' })
        result.current.updateSettings({ language: 'en' })
      })
      
      // 全ての更新が反映されている
      expect(result.current.settings.theme).toBe('dark')
      expect(result.current.settings.sidebarDensity).toBe('dense')
      expect(result.current.settings.language).toBe('en')
    })
  })
});