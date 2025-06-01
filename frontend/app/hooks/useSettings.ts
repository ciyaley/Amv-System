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
const validateSettings = (settings: any): AppSettings => {
  const validated: AppSettings = { ...DEFAULT_SETTINGS }
  
  if (settings && typeof settings === 'object') {
    // sidebarDensity の検証
    if (['detailed', 'standard', 'dense'].includes(settings.sidebarDensity)) {
      validated.sidebarDensity = settings.sidebarDensity
    }
    
    // theme の検証
    if (['light', 'dark'].includes(settings.theme)) {
      validated.theme = settings.theme
    }
    
    // language の検証
    if (['ja', 'en'].includes(settings.language)) {
      validated.language = settings.language
    }
    
    // boolean 値の検証
    if (typeof settings.autoSave === 'boolean') {
      validated.autoSave = settings.autoSave
    }
    
    if (typeof settings.sidebarCollapsed === 'boolean') {
      validated.sidebarCollapsed = settings.sidebarCollapsed
    }
    
    if (typeof settings.showSearchByDefault === 'boolean') {
      validated.showSearchByDefault = settings.showSearchByDefault
    }
    
    // number 値の検証
    if (typeof settings.virtualScrollThreshold === 'number' && settings.virtualScrollThreshold > 0) {
      validated.virtualScrollThreshold = settings.virtualScrollThreshold
    }
  }
  
  return validated
}

// ファイルシステムからの読み込み
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
  } catch (error) {
    console.warn('Failed to load settings from file system:', error)
    return DEFAULT_SETTINGS
  }
}

// ファイルシステムへの保存
const saveSettings = async (settings: AppSettings): Promise<void> => {
  try {
    if (typeof window === 'undefined') {
      return
    }
    
    await saveSettingsToFile(settings)
  } catch (error) {
    console.warn('Failed to save settings to file system:', error)
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
        console.warn(`Invalid value for ${key}:`, value)
        return prevSettings
      }
      
      // 非同期で保存（エラーが発生してもUIの更新は継続）
      saveSettings(validatedSettings).catch(error => {
        console.error('Failed to save settings:', error)
      })
      
      return validatedSettings
    })
  }, [])
  
  // 複数設定項目の一括更新
  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prevSettings => {
      const newSettings = { ...prevSettings, ...updates }
      const validatedSettings = validateSettings(newSettings)
      
      // 非同期で保存（エラーが発生してもUIの更新は継続）
      saveSettings(validatedSettings).catch(error => {
        console.error('Failed to save settings:', error)
      })
      
      return validatedSettings
    })
  }, [])
  
  // 設定のリセット
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    
    // デフォルト設定を保存
    saveSettings(DEFAULT_SETTINGS).catch(error => {
      console.error('Failed to save default settings:', error)
    })
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
      saveSettings(validatedSettings).catch(error => {
        console.error('Failed to save imported settings:', error)
      })
      
      return true
    } catch (error) {
      console.warn('Failed to import settings:', error)
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