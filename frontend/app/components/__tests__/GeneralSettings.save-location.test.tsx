// tests/components/__tests__/GeneralSettings.save-location.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getStoredDir, requestDirectory } from '../../../utils/fileAccess'
import { useAuth } from '../../hooks/useAuth'
import { GeneralSettings } from '../GeneralSettings'

// モック設定
vi.mock('../../hooks/useAuth')
vi.mock('../../../utils/fileAccess')
vi.mock('sonner')
vi.mock('../../hooks/useCanvas', () => ({
  useCanvasStore: () => ({
    width: 800,
    height: 600,
    zoom: 1,
    setWidth: vi.fn(),
    setHeight: vi.fn(),
    setZoom: vi.fn(),
    resetPan: vi.fn()
  })
}))

const mockUseAuth = vi.mocked(useAuth)
const mockGetStoredDir = vi.mocked(getStoredDir)
const mockRequestDirectory = vi.mocked(requestDirectory)
const mockToast = vi.mocked(toast)

describe('GeneralSettings - File Location Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToast.success = vi.fn()
    mockToast.error = vi.fn()
  })

  describe('ログイン状態での表示制御', () => {
    it('should show file save settings when logged in', () => {
      // Given: ユーザーがログイン済み
      mockUseAuth.mockReturnValue({
        isLoggedIn: true,
        uuid: 'test-uuid',
        email: 'test@example.com',
        login: vi.fn(),
        register: vi.fn(),
        checkAutoLogin: vi.fn(),
        logout: vi.fn(),
        deleteAccount: vi.fn(),
        setAuth: vi.fn()
      })
      mockGetStoredDir.mockResolvedValue(null)

      // When: GeneralSettingsを表示
      render(<GeneralSettings />)

      // Then: ファイル保存設定セクションが表示される
      expect(screen.getByText('ファイル保存設定')).toBeInTheDocument()
      expect(screen.getByText('保存フォルダ:')).toBeInTheDocument()
      expect(screen.getByText('フォルダを選択')).toBeInTheDocument()
    })

    it('should hide file save settings when logged out', () => {
      // Given: ユーザーが未ログイン
      mockUseAuth.mockReturnValue({
        isLoggedIn: false,
        uuid: null,
        email: null,
        login: vi.fn(),
        register: vi.fn(),
        checkAutoLogin: vi.fn(),
        logout: vi.fn(),
        deleteAccount: vi.fn(),
        setAuth: vi.fn()
      })

      // When: GeneralSettingsを表示
      render(<GeneralSettings />)

      // Then: ファイル保存設定セクションが非表示
      expect(screen.queryByText('ファイル保存設定')).not.toBeInTheDocument()
      expect(screen.queryByText('保存フォルダ:')).not.toBeInTheDocument()
      expect(screen.queryByText('フォルダを選択')).not.toBeInTheDocument()
    })
  })

  describe('ディレクトリ選択機能', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isLoggedIn: true,
        uuid: 'test-uuid',
        email: 'test@example.com',
        login: vi.fn(),
        register: vi.fn(),
        checkAutoLogin: vi.fn(),
        logout: vi.fn(),
        deleteAccount: vi.fn(),
        setAuth: vi.fn()
      })
    })

    it('should display "未選択" when no directory selected', async () => {
      // Given: ディレクトリが未選択
      mockGetStoredDir.mockResolvedValue(null)

      // When: コンポーネントを初期化
      render(<GeneralSettings />)

      // Then: "未選択"と表示される
      await waitFor(() => {
        expect(screen.getByText('未選択')).toBeInTheDocument()
      })
    })

    it('should display directory name when directory is selected', async () => {
      // Given: ディレクトリが選択済み
      const mockDirHandle = { name: 'TestFolder' } as FileSystemDirectoryHandle
      mockGetStoredDir.mockResolvedValue(mockDirHandle)

      // When: コンポーネントを初期化
      render(<GeneralSettings />)

      // Then: ディレクトリ名が表示される
      await waitFor(() => {
        expect(screen.getByText('TestFolder')).toBeInTheDocument()
      })
    })

    it('should update directory path after successful selection', async () => {
      // Given: ディレクトリ選択ダイアログが表示
      mockGetStoredDir
        .mockResolvedValueOnce(null) // 初期状態
        .mockResolvedValueOnce({ name: 'NewFolder' } as FileSystemDirectoryHandle) // 選択後
      mockRequestDirectory.mockResolvedValue({} as FileSystemDirectoryHandle)

      render(<GeneralSettings />)

      // When: ユーザーがディレクトリを選択
      const selectButton = screen.getByText('フォルダを選択')
      fireEvent.click(selectButton)

      // Then: パスが更新され、成功トーストが表示
      await waitFor(() => {
        expect(mockRequestDirectory).toHaveBeenCalled()
        expect(mockToast.success).toHaveBeenCalledWith('保存フォルダが設定されました')
      })
    })

    it('should handle directory selection error gracefully', async () => {
      // Given: ディレクトリ選択が失敗
      mockGetStoredDir.mockResolvedValue(null)
      mockRequestDirectory.mockRejectedValue(new Error('Selection failed'))

      render(<GeneralSettings />)

      // When: 選択操作を実行
      const selectButton = screen.getByText('フォルダを選択')
      fireEvent.click(selectButton)

      // Then: エラートーストが表示され、状態は変更されない
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('フォルダの選択に失敗しました')
        expect(screen.getByText('未選択')).toBeInTheDocument()
      })
    })

    it('should show loading state during directory selection', async () => {
      // Given: ディレクトリ選択処理中
      mockGetStoredDir.mockResolvedValue(null)
      mockRequestDirectory.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<GeneralSettings />)

      // When: 選択ボタンをクリック
      const selectButton = screen.getByText('フォルダを選択')
      fireEvent.click(selectButton)

      // Then: ローディング状態が表示される
      expect(screen.getByText('選択中...')).toBeInTheDocument()
      expect(screen.getByText('選択中...')).toBeDisabled()
    })

    it('should handle getStoredDir error gracefully on component mount', async () => {
      // Given: getStoredDirがエラーを投げる
      mockGetStoredDir.mockRejectedValue(new Error('Storage error'))

      // When: コンポーネントを初期化
      render(<GeneralSettings />)

      // Then: "未選択"が表示され、エラーが適切に処理される
      await waitFor(() => {
        expect(screen.getByText('未選択')).toBeInTheDocument()
      })
    })
  })

  describe('キャンバス設定との統合', () => {
    it('should render both file save settings and canvas settings when logged in', () => {
      // Given: ログイン状態
      mockUseAuth.mockReturnValue({
        isLoggedIn: true,
        uuid: 'test-uuid',
        email: 'test@example.com',
        login: vi.fn(),
        register: vi.fn(),
        checkAutoLogin: vi.fn(),
        logout: vi.fn(),
        deleteAccount: vi.fn(),
        setAuth: vi.fn()
      })
      mockGetStoredDir.mockResolvedValue(null)

      // When: GeneralSettingsを表示
      render(<GeneralSettings />)

      // Then: 両方のセクションが表示される
      expect(screen.getByText('ファイル保存設定')).toBeInTheDocument()
      expect(screen.getByText('キャンバス設定')).toBeInTheDocument()
    })
  })
})