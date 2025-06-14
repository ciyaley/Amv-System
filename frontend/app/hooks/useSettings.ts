import { useState, useEffect, useCallback } from 'react'
import { create } from "zustand"
import { saveSettings as saveSettingsToFile, loadSettings as loadSettingsFromFile } from '../../utils/fileAccess'

export interface AppSettings {
  sidebarDensity: 'detailed' | 'standard' | 'dense'
  theme: 'light' | 'dark'
  language: 'ja' | 'en'
  autoSave: boolean
  sidebarCollapsed: boolean
  showSearchByDefault: boolean
  virtualScrollThreshold: number
}

const DEFAULT_SETTINGS: AppSettings = {
  sidebarDensity: 'standard',
  theme: 'light',
  language: 'ja',
  autoSave: true,
  sidebarCollapsed: false,
  showSearchByDefault: true,
  virtualScrollThreshold: 200
}

// 設定値の妥当性をチェック
const validateSettings = (settings: unknown): AppSettings => {
  const validated: AppSettings = { ...DEFAULT_SETTINGS }
  
  if (settings && typeof settings === 'object') {
    const settingsObj = settings as Partial<AppSettings>;
    // sidebarDensity の検証
    if (settingsObj.sidebarDensity && ['detailed', 'standard', 'dense'].includes(settingsObj.sidebarDensity)) {
      validated.sidebarDensity = settingsObj.sidebarDensity
    }
    
    // theme の検証
    if (settingsObj.theme && ['light', 'dark'].includes(settingsObj.theme)) {
      validated.theme = settingsObj.theme
    }
    
    // language の検証
    if (settingsObj.language && ['ja', 'en'].includes(settingsObj.language)) {
      validated.language = settingsObj.language
    }
    
    // boolean 値の検証
    if (typeof settingsObj.autoSave === 'boolean') {
      validated.autoSave = settingsObj.autoSave
    }
    
    if (typeof settingsObj.sidebarCollapsed === 'boolean') {
      validated.sidebarCollapsed = settingsObj.sidebarCollapsed
    }
    
    if (typeof settingsObj.showSearchByDefault === 'boolean') {
      validated.showSearchByDefault = settingsObj.showSearchByDefault
    }
    
    // number 値の検証
    if (typeof settingsObj.virtualScrollThreshold === 'number' && settingsObj.virtualScrollThreshold > 0) {
      validated.virtualScrollThreshold = settingsObj.virtualScrollThreshold
    }
  }
  
  return validated
}

// ファイルシステムからの読み込み（localStorageフォールバック付き）
const loadSettings = async (): Promise<AppSettings> => {
  try {
    if (typeof window === 'undefined') {
      return DEFAULT_SETTINGS
    }
    
    const stored = await loadSettingsFromFile()
    if (!stored) {
      return DEFAULT_SETTINGS
    }
    
    return validateSettings(stored)
  } catch {
    
    // ファイルシステムが失敗した場合、localStorageからフォールバック
    try {
      const localStored = localStorage.getItem('amv-settings')
      if (localStored) {
        const parsed = JSON.parse(localStored)
        return validateSettings(parsed)
      }
    } catch {
      // Silently ignore localStorage errors
    }
    
    return DEFAULT_SETTINGS
  }
}

// ファイルシステムへの保存（localStorageフォールバック付き）
const saveSettings = async (settings: AppSettings): Promise<void> => {
  try {
    if (typeof window === 'undefined') {
      return
    }
    
    const settingsData = {
      theme: { mode: settings.theme },
      canvas: { language: settings.language },
      general: { 
        sidebarDensity: settings.sidebarDensity,
        autoSave: settings.autoSave,
        sidebarCollapsed: settings.sidebarCollapsed,
        showSearchByDefault: settings.showSearchByDefault,
        virtualScrollThreshold: settings.virtualScrollThreshold
      },
      version: '1.0.0'
    };
    await saveSettingsToFile(settingsData)
  } catch (error) {
    
    // ファイルシステムが失敗した場合、localStorageにフォールバック
    try {
      localStorage.setItem('amv-settings', JSON.stringify(settings))
    } catch {
      throw error  // 元のエラーをスロー
    }
  }
}

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  
  // 初期化時にファイルシステムから読み込み
  useEffect(() => {
    const loadInitialSettings = async () => {
      const loadedSettings = await loadSettings()
      setSettings(loadedSettings)
      setIsLoading(false)
    }
    
    loadInitialSettings()
  }, [])
  
  // 単一設定項目の更新
  const updateSetting = useCallback(<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings(prevSettings => {
      // 同じ値の場合は更新しない（最適化）
      if (prevSettings[key] === value) {
        return prevSettings
      }
      
      const newSettings = { ...prevSettings, [key]: value }
      
      // 妥当性チェック
      const validatedSettings = validateSettings(newSettings)
      
      // 妥当でない場合は更新しない
      if (validatedSettings[key] !== value) {
        return prevSettings
      }
      
      // 非同期で保存（エラーが発生してもUIの更新は継続）
      saveSettings(validatedSettings).catch(() => {
      })
      
      return validatedSettings
    })
  }, [])
  
  // 複数設定項目の一括更新
  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    setSettings(currentSettings => {
      const newSettings = { ...currentSettings, ...updates }
      const validatedSettings = validateSettings(newSettings)
      
      // 非同期で保存（エラーが発生してもUIの更新は継続）
      saveSettings(validatedSettings).catch(() => {
      })
      
      return validatedSettings
    })
  }, [])
  
  // 設定のリセット
  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS)
    
    // デフォルト設定を保存
    try {
      await saveSettings(DEFAULT_SETTINGS)
    } catch (error) {
      throw error
    }
  }, [])
  
  // 設定のエクスポート
  const exportSettings = useCallback((): string => {
    return JSON.stringify(settings, null, 2)
  }, [settings])
  
  // 設定のインポート
  const importSettings = useCallback((jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString)
      const validatedSettings = validateSettings(parsed)
      
      // 元の設定と比較して、有効な設定があるかチェック
      const hasValidChanges = Object.keys(parsed).some(key => {
        return key in DEFAULT_SETTINGS && 
               parsed[key] !== undefined &&
               validatedSettings[key as keyof AppSettings] === parsed[key]
      })
      
      if (!hasValidChanges) {
        return false
      }
      
      setSettings(validatedSettings)
      
      // 非同期で保存
      saveSettings(validatedSettings).catch(() => {
      })
      
      return true
    } catch {
      return false
    }
  }, [])
  
  return {
    settings,
    isLoading,
    updateSetting,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings
  }
}

// 既存のSettingsTab用のZustandストア（互換性のために保持）
export type SettingsTab = "general" | "appearance" | "account"

interface SettingsState {
  activeTab: SettingsTab
  setTab: (tab: SettingsTab) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  activeTab: "general",
  setTab: (tab) => set({ activeTab: tab }),
}))