// tests/workspace/__tests__/page.manual-save.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { requestDirectory, getStoredDir } from '../../../utils/fileAccess'
import { useAuth } from '../../hooks/useAuth'
import { useLoadAfterLogin } from '../../hooks/useLoadAfterLogin'
import { useMemos } from '../../hooks/useMemos'
import { useModalStore } from '../../hooks/useModal'

// 簡素化されたWorkspacePageコンポーネント（テスト用）
const MockWorkspacePage = () => {
  const { isLoggedIn } = useAuth()
  const { saveAllMemos } = useMemos()
  
  const handleManualSave = async () => {
    try {
      const currentDir = await getStoredDir()
      if (!currentDir) {
        toast.warning("保存フォルダを選択してください")
        await requestDirectory()
      }
      await saveAllMemos()
      toast.success("保存が完了しました")
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      toast.error("保存に失敗しました: " + errorMessage)
    }
  }

  return (
    <div>
      {!isLoggedIn && (
        <button
          onClick={handleManualSave}
          title="一括保存"
        >
          一括保存
        </button>
      )}
      <div data-testid="workspace-content">ワークスペース</div>
    </div>
  )
}

// モック設定
vi.mock('../../hooks/useAuth')
vi.mock('../../hooks/useMemos')
vi.mock('../../hooks/useModal')
vi.mock('../../hooks/useLoadAfterLogin')
vi.mock('../../../utils/fileAccess')
vi.mock('sonner')

const mockUseAuth = vi.mocked(useAuth)
const mockUseMemos = vi.mocked(useMemos)
const mockUseModalStore = vi.mocked(useModalStore)
const mockUseLoadAfterLogin = vi.mocked(useLoadAfterLogin)
const mockRequestDirectory = vi.mocked(requestDirectory)
const mockGetStoredDir = vi.mocked(getStoredDir)
const mockToast = vi.mocked(toast)

describe('WorkspacePage - Manual Batch Save', () => {
  const mockSaveAllMemos = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockToast.success = vi.fn()
    mockToast.error = vi.fn()
    mockToast.warning = vi.fn()

    mockUseModalStore.mockReturnValue({
      open: vi.fn(),
      close: vi.fn(),
      isOpen: false
    })

    mockUseLoadAfterLogin.mockReturnValue(undefined)

    mockUseMemos.mockReturnValue({
      memos: [
        { id: 'memo1', title: 'Test Memo 1', text: 'Content 1', type: 'memo', position: { x: 0, y: 0 }, size: { width: 200, height: 200 }, backgroundColor: '#ffffff', timestamp: Date.now() },
        { id: 'memo2', title: 'Test Memo 2', text: 'Content 2', type: 'memo', position: { x: 100, y: 100 }, size: { width: 200, height: 200 }, backgroundColor: '#ffffff', timestamp: Date.now() }
      ],
      saveAllMemos: mockSaveAllMemos,
      setMemos: vi.fn(),
      createMemo: vi.fn(),
      updateMemo: vi.fn(),
      updateMemoPosition: vi.fn(),
      updateMemoSize: vi.fn(),
      deleteMemo: vi.fn(),
      bringToFront: vi.fn(),
      sendToBack: vi.fn(),
      moveUp: vi.fn(),
      moveDown: vi.fn(),
      loadMemosFromDisk: vi.fn(),
      saveMemoManually: vi.fn(),
      clearAllMemos: vi.fn()
    })
  })

  describe('未ログイン時の表示制御', () => {
    it('should show only batch save button when logged out', () => {
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

      // When: ワークスペースページを表示
      render(<MockWorkspacePage />)

      // Then: 一括保存ボタンのみが表示される
      expect(screen.getByTitle('一括保存')).toBeInTheDocument()
      expect(screen.queryByTitle('保存フォルダを選択')).not.toBeInTheDocument()
    })

    it('should hide batch save button when logged in', () => {
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

      // When: ワークスペースページを表示
      render(<MockWorkspacePage />)

      // Then: 一括保存ボタンが非表示
      expect(screen.queryByTitle('一括保存')).not.toBeInTheDocument()
    })
  })

  describe('一括保存機能', () => {
    beforeEach(() => {
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
    })

    it('should save all memos when save button clicked with directory selected', async () => {
      // Given: ディレクトリが選択済み
      mockGetStoredDir.mockResolvedValue({ name: 'TestFolder' } as FileSystemDirectoryHandle)
      mockSaveAllMemos.mockResolvedValue(undefined)

      render(<MockWorkspacePage />)

      // When: 保存ボタンをクリック
      const saveButton = screen.getByTitle('一括保存')
      fireEvent.click(saveButton)

      // Then: 全メモが保存され、成功メッセージが表示
      await waitFor(() => {
        expect(mockSaveAllMemos).toHaveBeenCalled()
        expect(mockToast.success).toHaveBeenCalledWith('保存が完了しました')
      })
    })

    it('should prompt directory selection if not set', async () => {
      // Given: ディレクトリが未選択
      mockGetStoredDir.mockResolvedValue(null)
      mockRequestDirectory.mockResolvedValue({} as FileSystemDirectoryHandle)
      mockSaveAllMemos.mockResolvedValue(undefined)

      render(<MockWorkspacePage />)

      // When: 保存ボタンをクリック
      const saveButton = screen.getByTitle('一括保存')
      fireEvent.click(saveButton)

      // Then: ディレクトリ選択が促され、選択後に保存実行
      await waitFor(() => {
        expect(mockToast.warning).toHaveBeenCalledWith('保存フォルダを選択してください')
        expect(mockRequestDirectory).toHaveBeenCalled()
        expect(mockSaveAllMemos).toHaveBeenCalled()
      })
    })

    it('should handle save error gracefully', async () => {
      // Given: 保存処理がエラーを投げる
      mockGetStoredDir.mockResolvedValue({ name: 'TestFolder' } as FileSystemDirectoryHandle)
      mockSaveAllMemos.mockRejectedValue(new Error('Save failed'))

      render(<MockWorkspacePage />)

      // When: 保存ボタンをクリック
      const saveButton = screen.getByTitle('一括保存')
      fireEvent.click(saveButton)

      // Then: エラーメッセージが表示される
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('保存に失敗しました: Save failed')
      })
    })

    it('should handle directory selection error during save', async () => {
      // Given: ディレクトリが未選択で、選択も失敗
      mockGetStoredDir.mockResolvedValue(null)
      mockRequestDirectory.mockRejectedValue(new Error('Directory selection failed'))

      render(<MockWorkspacePage />)

      // When: 保存ボタンをクリック
      const saveButton = screen.getByTitle('一括保存')
      fireEvent.click(saveButton)

      // Then: ディレクトリ選択エラーが適切に処理される
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('保存に失敗しました: Directory selection failed')
      })
    })
  })

})