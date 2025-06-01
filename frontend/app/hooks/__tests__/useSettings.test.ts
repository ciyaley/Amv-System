import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

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

import { useSettings } from '../useSettings'
import * as fileAccess from '../../../utils/fileAccess'

// モック関数への参照を取得
const mockSaveSettings = (fileAccess as any).__mockHelpers.mockSaveSettings
const mockLoadSettings = (fileAccess as any).__mockHelpers.mockLoadSettings

// テスト用ヘルパー
const mockFileSystemAPI = {
  settingsData: null as any,
  saveSettingsData: async function(settings: any) {
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
    }),
    length: 0,
    key: vi.fn()
  }
})()

// グローバル localStorage をモック
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('useSettings', () => {
  beforeEach(() => {
    mockFileSystemAPI.clearSettings()
    mockLocalStorage.clear()
    vi.clearAllMocks()
    
    // モック関数の実装をリセット
    mockLoadSettings.mockImplementation(() => mockFileSystemAPI.loadSettingsData())
    mockSaveSettings.mockImplementation((settings) => mockFileSystemAPI.saveSettingsData(settings))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('初期化', () => {
    it('should load default settings when file system is empty', async () => {
      const { result } = renderHook(() => useSettings())
      
      // 初期状態では isLoading が true
      expect(result.current.isLoading).toBe(true)
      
      // 非同期読み込み完了を待つ
      await vi.waitFor(() => {
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
      await vi.waitFor(() => {
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
      await vi.waitFor(() => {
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
      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      // 一部の設定は保持、欠落した設定はデフォルト値
      expect(result.current.settings).toEqual({
        sidebarDensity: 'dense',
        theme: 'dark',
        language: 'ja', // デフォルト
        autoSave: true, // デフォルト
        sidebarCollapsed: false, // デフォルト
        showSearchByDefault: true, // デフォルト
        virtualScrollThreshold: 200 // デフォルト
      })
    })
  })

  describe('設定の更新', () => {
    it('should update single setting and persist to file system', async () => {
      const { result } = renderHook(() => useSettings())
      
      // 初期化完了を待つ
      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      act(() => {
        result.current.updateSetting('sidebarDensity', 'dense')
      })
      
      expect(result.current.settings.sidebarDensity).toBe('dense')
      
      // 非同期保存が呼ばれることを確認
      await vi.waitFor(() => {
        expect(mockSaveSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            sidebarDensity: 'dense'
          })
        )
      })
    })

    it('should update multiple settings at once', async () => {
      const { result } = renderHook(() => useSettings())
      
      // 初期化完了を待つ
      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      const updates = {
        sidebarDensity: 'dense' as const,
        theme: 'dark' as const,
        autoSave: false
      }
      
      act(() => {
        result.current.updateSettings(updates)
      })
      
      expect(result.current.settings).toEqual(
        expect.objectContaining(updates)
      )
      
      // 非同期保存が呼ばれることを確認
      await vi.waitFor(() => {
        expect(mockSaveSettings).toHaveBeenCalledWith(
          expect.objectContaining(updates)
        )
      })
    })

    it('should handle file system write errors gracefully', async () => {
      const { result } = renderHook(() => useSettings())
      
      // 初期化完了を待つ
      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      // saveSettings がエラーを投げるようにモック
      mockSaveSettings.mockRejectedValueOnce(new Error('File system error'))
      
      // エラーが投げられずに設定が更新される
      expect(() => {
        act(() => {
          result.current.updateSetting('sidebarDensity', 'dense')
        })
      }).not.toThrow()
      
      // メモリ上では更新される
      expect(result.current.settings.sidebarDensity).toBe('dense')
    })
  })

  describe('設定のリセット', () => {
    it('should reset settings to defaults and save to file system', async () => {
      const { result } = renderHook(() => useSettings())
      
      // 初期化完了を待つ
      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      // 先に設定を変更
      act(() => {
        result.current.updateSetting('sidebarDensity', 'dense')
      })
      
      // リセット
      act(() => {
        result.current.resetSettings()
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
      
      // デフォルト設定がファイルに保存されることを確認
      await vi.waitFor(() => {
        expect(mockSaveSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            sidebarDensity: 'standard',
            theme: 'light'
          })
        )
      })
    })
  })

  describe('設定の検証', () => {
    it('should validate sidebarDensity values', () => {
      const { result } = renderHook(() => useSettings())
      
      act(() => {
        // @ts-expect-error 無効な値をテスト
        result.current.updateSetting('sidebarDensity', 'invalid')
      })
      
      // 無効な値は無視される（デフォルトのまま）
      expect(result.current.settings.sidebarDensity).toBe('standard')
    })

    it('should validate theme values', () => {
      const { result } = renderHook(() => useSettings())
      
      act(() => {
        // @ts-expect-error 無効な値をテスト
        result.current.updateSetting('theme', 'invalid')
      })
      
      // 無効な値は無視される（デフォルトのまま）
      expect(result.current.settings.theme).toBe('light')
    })

    it('should validate number values', () => {
      const { result } = renderHook(() => useSettings())
      
      act(() => {
        // @ts-expect-error 無効な値をテスト
        result.current.updateSetting('virtualScrollThreshold', 'not-a-number')
      })
      
      // 無効な値は無視される（デフォルトのまま）
      expect(result.current.settings.virtualScrollThreshold).toBe(200)
    })
  })

  describe('設定エクスポート/インポート', () => {
    it('should export current settings as JSON', () => {
      const { result } = renderHook(() => useSettings())
      
      // 設定を変更
      act(() => {
        result.current.updateSettings({
          sidebarDensity: 'dense',
          theme: 'dark'
        })
      })
      
      const exported = result.current.exportSettings()
      expect(JSON.parse(exported)).toEqual(result.current.settings)
    })

    it('should import valid settings from JSON', async () => {
      const { result } = renderHook(() => useSettings())
      
      // 初期化完了を待つ
      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      const importData = {
        sidebarDensity: 'dense',
        theme: 'dark',
        language: 'en',
        autoSave: false,
        sidebarCollapsed: true,
        showSearchByDefault: false,
        virtualScrollThreshold: 300
      }
      
      let success: boolean = false
      act(() => {
        success = result.current.importSettings(JSON.stringify(importData))
      })
      
      expect(success).toBe(true)
      expect(result.current.settings).toEqual(importData)
      
      // ファイルシステムに保存されることを確認
      await vi.waitFor(() => {
        expect(mockSaveSettings).toHaveBeenCalledWith(importData)
      })
    })

    it('should reject invalid JSON on import', () => {
      const { result } = renderHook(() => useSettings())
      const originalSettings = { ...result.current.settings }
      
      let success: boolean = true
      act(() => {
        success = result.current.importSettings('invalid-json')
      })
      
      expect(success).toBe(false)
      expect(result.current.settings).toEqual(originalSettings)
    })

    it('should validate imported settings schema', () => {
      const { result } = renderHook(() => useSettings())
      const originalSettings = { ...result.current.settings }
      
      const invalidSettings = {
        sidebarDensity: 'invalid',
        theme: 'unknown',
        language: 123, // 型が間違い
        extraField: 'should-be-ignored'
      }
      
      let success: boolean = true
      act(() => {
        success = result.current.importSettings(JSON.stringify(invalidSettings))
      })
      
      expect(success).toBe(false)
      expect(result.current.settings).toEqual(originalSettings)
    })
  })

  describe('リアクティブ更新', () => {
    it('should trigger re-render when settings change', () => {
      const { result } = renderHook(() => useSettings())
      const initialRender = result.current
      
      act(() => {
        result.current.updateSetting('sidebarDensity', 'dense')
      })
      
      // 新しいオブジェクト参照が作成される
      expect(result.current).not.toBe(initialRender)
      expect(result.current.settings.sidebarDensity).toBe('dense')
    })

    it('should not trigger unnecessary re-renders for same values', () => {
      const { result } = renderHook(() => useSettings())
      
      act(() => {
        result.current.updateSetting('sidebarDensity', 'standard') // 同じ値
      })
      
      // localStorageが呼ばれていない（最適化）
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
    })
  })
})