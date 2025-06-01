// tests/hooks/__tests__/useMemos.auto-save.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMemos } from '../useMemos'
import { useEncryptionStore } from '../useEncryptionStore'
import { saveIndividualMemo } from '../../../utils/fileAccess'

// モック設定
vi.mock('../useEncryptionStore')
vi.mock('../../../utils/fileAccess')

const mockUseEncryptionStore = vi.mocked(useEncryptionStore)
const mockSaveIndividualMemo = vi.mocked(saveIndividualMemo)

// nanoidのモック
vi.mock('nanoid', () => ({
  nanoid: () => 'test-id-123'
}))

describe('useMemos - Auto Save Functionality', () => {
  const mockPassword = 'test-password-123'
  const mockGetState = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockSaveIndividualMemo.mockResolvedValue()
    
    // useEncryptionStore.getStateのモック
    mockGetState.mockReturnValue({ password: null })
    mockUseEncryptionStore.getState = mockGetState

    // コンソールログのスパイ
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // useMemos ストアをリセット
    try {
      const { useMemos } = await import('../useMemos')
      useMemos.getState().setMemos([])
    } catch (error) {
      // モック環境では無視
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ログイン状態での自動保存', () => {
    it('should auto-save memo when user is logged in', async () => {
      // Given: ユーザーがログイン済み（password設定済み）
      mockGetState.mockReturnValue({ password: mockPassword })
      
      const { result } = renderHook(() => useMemos())

      // When: メモを作成
      await act(async () => {
        result.current.createMemo({ x: 100, y: 100 })
        // 非同期処理を待機
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      // Then: saveIndividualMemoが呼ばれ、ログが出力
      expect(mockSaveIndividualMemo).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'memo_test-id-123',
          type: 'memo',
          title: '新しいメモ',
          x: 100,
          y: 100
        })
      )
      expect(console.log).toHaveBeenCalledWith('Auto-saved memo: memo_test-id-123')
    })

    it('should not auto-save when user is logged out', async () => {
      // Given: ユーザーが未ログイン（password未設定）
      mockGetState.mockReturnValue({ password: null })
      
      const { result } = renderHook(() => useMemos())

      // When: メモを作成
      await act(async () => {
        result.current.createMemo({ x: 100, y: 100 })
        // 非同期処理を待機
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      // Then: saveIndividualMemoが呼ばれない
      expect(mockSaveIndividualMemo).not.toHaveBeenCalled()
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('Auto-saved memo:'))
    })

    it('should handle auto-save errors gracefully', async () => {
      // Given: ログイン状態だが保存がエラーになる
      mockGetState.mockReturnValue({ password: mockPassword })
      mockSaveIndividualMemo.mockRejectedValue(new Error('Save failed'))
      
      const { result } = renderHook(() => useMemos())

      // When: メモを作成
      await act(async () => {
        result.current.createMemo({ x: 100, y: 100 })
        // 非同期処理を待機
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      // Then: エラーログが出力されるが、アプリは正常動作
      expect(mockSaveIndividualMemo).toHaveBeenCalled()
      expect(console.error).toHaveBeenCalledWith('Failed to auto-save memo:', expect.any(Error))
      // ストアに正しくメモが1個追加されることを確認
      expect(result.current.memos.length).toBeGreaterThan(0)
    })
  })

  describe('メモ操作での自動保存トリガー', () => {
    beforeEach(() => {
      mockGetState.mockReturnValue({ password: mockPassword })
    })

    it('should auto-save on memo creation', async () => {
      // Given: ログイン状態
      const { result } = renderHook(() => useMemos())

      // When: createMemoを実行
      await act(async () => {
        result.current.createMemo({ x: 50, y: 75 })
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      // Then: persistMemoが呼ばれる
      expect(mockSaveIndividualMemo).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'memo_test-id-123',
          x: 50,
          y: 75
        })
      )
    })

    it('should auto-save on memo text update', async () => {
      // Given: ログイン状態とメモが存在
      const { result } = renderHook(() => useMemos())
      
      await act(async () => {
        result.current.createMemo()
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      vi.clearAllMocks() // 作成時の保存をクリア

      // When: updateMemoでテキストを更新
      await act(async () => {
        result.current.updateMemo('memo_test-id-123', { 
          text: 'Updated content',
          title: 'Updated title'
        })
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      // Then: persistMemoが呼ばれる
      expect(mockSaveIndividualMemo).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'memo_test-id-123',
          text: 'Updated content',
          title: 'Updated title'
        })
      )
    })

    it('should auto-generate title from text content', async () => {
      // Given: ログイン状態とメモが存在
      const { result } = renderHook(() => useMemos())
      
      await act(async () => {
        result.current.createMemo()
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      vi.clearAllMocks()

      // When: タイトルなしでテキストのみ更新
      await act(async () => {
        result.current.updateMemo('memo_test-id-123', { 
          text: 'This is a long text content that should be truncated for title'
        })
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      // Then: テキストから自動生成されたタイトルで保存
      expect(mockSaveIndividualMemo).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'memo_test-id-123',
          title: 'This is a long text ', // 20文字で切り取られる
          text: 'This is a long text content that should be truncated for title'
        })
      )
    })

    it('should auto-save on position changes', async () => {
      // Given: ログイン状態とメモが存在
      const { result } = renderHook(() => useMemos())
      
      await act(async () => {
        result.current.createMemo()
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      vi.clearAllMocks()

      // When: 位置を変更
      await act(async () => {
        result.current.updateMemoPosition('memo_test-id-123', 200, 300)
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      // Then: persistMemoが呼ばれる
      expect(mockSaveIndividualMemo).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'memo_test-id-123',
          x: 200,
          y: 300
        })
      )
    })

    it('should auto-save on size changes', async () => {
      // Given: ログイン状態とメモが存在
      const { result } = renderHook(() => useMemos())
      
      await act(async () => {
        result.current.createMemo()
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      vi.clearAllMocks()

      // When: サイズを変更
      await act(async () => {
        result.current.updateMemoSize('memo_test-id-123', 300, 200)
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      // Then: persistMemoが呼ばれる
      expect(mockSaveIndividualMemo).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'memo_test-id-123',
          w: 300,
          h: 200
        })
      )
    })

    it('should auto-save on z-index changes (bring to front)', async () => {
      // Given: ログイン状態と複数のメモが存在
      const { result } = renderHook(() => useMemos())
      
      await act(async () => {
        result.current.createMemo()
        result.current.createMemo() // 2個目のメモ
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      vi.clearAllMocks()

      // When: 最前面に移動
      await act(async () => {
        result.current.bringToFront('memo_test-id-123')
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      // Then: persistMemoが呼ばれる
      expect(mockSaveIndividualMemo).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'memo_test-id-123'
        })
      )
    })

    it('should auto-save on layer order changes (move up)', async () => {
      // Given: ログイン状態と複数のメモが存在
      const { result } = renderHook(() => useMemos())
      
      await act(async () => {
        result.current.createMemo()
        result.current.createMemo() // 2個目のメモ
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      vi.clearAllMocks()

      // When: レイヤーを上に移動
      await act(async () => {
        result.current.moveUp('memo_test-id-123')
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      // Then: persistMemoが呼ばれる
      expect(mockSaveIndividualMemo).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'memo_test-id-123'
        })
      )
    })
  })

  describe('手動保存機能', () => {
    beforeEach(() => {
      mockGetState.mockReturnValue({ password: mockPassword })
    })

    it('should save all memos manually', async () => {
      // Given: 複数のメモが存在
      const { result } = renderHook(() => useMemos())
      
      // まずはストアをクリアして、明示的にメモを設定
      await act(async () => {
        result.current.setMemos([
          { id: 'memo1', title: 'Test Memo 1', text: 'Content 1' } as any,
          { id: 'memo2', title: 'Test Memo 2', text: 'Content 2' } as any
        ])
      })

      vi.clearAllMocks()

      // When: saveAllMemosを実行
      await act(async () => {
        await result.current.saveAllMemos()
      })

      // Then: 全メモが保存される
      expect(mockSaveIndividualMemo).toHaveBeenCalledTimes(2)
    })

    it('should handle manual save errors for individual memos', async () => {
      // Given: 複数のメモが存在し、一部の保存が失敗
      const { result } = renderHook(() => useMemos())
      
      // まずはストアをクリアして、明示的にメモを設定
      await act(async () => {
        result.current.setMemos([
          { id: 'memo1', title: 'Test Memo 1', text: 'Content 1' } as any,
          { id: 'memo2', title: 'Test Memo 2', text: 'Content 2' } as any
        ])
      })

      vi.clearAllMocks()
      mockSaveIndividualMemo
        .mockResolvedValueOnce() // 1個目は成功
        .mockRejectedValueOnce(new Error('Save failed')) // 2個目は失敗

      // When: saveAllMemosを実行
      await act(async () => {
        await result.current.saveAllMemos()
      })

      // Then: エラーログが出力されるが処理は継続
      expect(mockSaveIndividualMemo).toHaveBeenCalledTimes(2)
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save memo'),
        expect.any(Error)
      )
    })
  })
})