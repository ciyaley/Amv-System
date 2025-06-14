import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCanvasStore } from '../../hooks/useCanvas'
import { useMemos } from '../../hooks/useMemos'
import { MemoWindow } from '../../workspace/Memowindow'
import type { MemoData } from '../../types/tools'

// フックをモック
vi.mock('../../hooks/useMemos')
vi.mock('../../hooks/useCanvas')
vi.mock('sonner')

const mockMemo: MemoData = {
  id: 'memo_test_123',
  type: 'memo',
  title: 'テストメモ',
  text: 'これはテスト用のメモです',
  content: 'これはテスト用のメモです',
  sourceType: 'authenticated',
  x: 100,
  y: 100,
  w: 240,
  h: 160,
  zIndex: 1,
  tags: ['テスト', 'サンプル'],
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  appearance: {
    backgroundColor: '#ffeaa7',
    borderColor: '#fdcb6e',
    cornerRadius: 8,
    shadowEnabled: true
  }
}

describe('MemoWindow Component', () => {
  const mockUpdateMemo = vi.fn()
  const mockUpdateMemoPosition = vi.fn()
  const mockUpdateMemoSize = vi.fn()
  const mockDeleteMemo = vi.fn()
  const mockBringToFront = vi.fn()
  const mockSendToBack = vi.fn()
  const mockMoveUp = vi.fn()
  const mockMoveDown = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    const mockedUseMemos = vi.mocked(useMemos)
    mockedUseMemos.mockReturnValue({
      memos: [],
      createMemo: vi.fn(),
      updateMemo: mockUpdateMemo,
      updateMemoPosition: mockUpdateMemoPosition,
      updateMemoSize: mockUpdateMemoSize,
      deleteMemo: mockDeleteMemo,
      bringToFront: mockBringToFront,
      sendToBack: mockSendToBack,
      moveUp: mockMoveUp,
      moveDown: mockMoveDown,
      setMemos: vi.fn(),
      loadMemosFromDisk: vi.fn(),
      persistMemo: vi.fn()
    })
    
    const mockedUseCanvasStore = vi.mocked(useCanvasStore)
    mockedUseCanvasStore.mockReturnValue({
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      setZoom: vi.fn(),
      setOffset: vi.fn(),
      resetView: vi.fn(),
      layout: null,
      setLayout: vi.fn()
    })
  })

  describe('基本表示', () => {
    it('should render memo with title and text', () => {
      render(<MemoWindow memo={mockMemo} />)
      
      expect(screen.getByText('テストメモ')).toBeInTheDocument()
      expect(screen.getByText('これはテスト用のメモです')).toBeInTheDocument()
    })

    it('should display tags when tag button is clicked', async () => {
      const user = userEvent.setup()
      render(<MemoWindow memo={mockMemo} />)
      
      await user.click(screen.getByTitle('タグ'))
      
      expect(screen.getByText('テスト')).toBeInTheDocument()
      expect(screen.getByText('サンプル')).toBeInTheDocument()
    })

    it('should apply appearance styles', () => {
      render(<MemoWindow memo={mockMemo} />)
      
      const memoElement = screen.getByRole('article')
      expect(memoElement).toHaveStyle({
        backgroundColor: '#ffeaa7',
        border: '2px solid #fdcb6e',
        borderRadius: '8px'
      })
    })
  })

  describe('編集機能', () => {
    it('should enter edit mode on double click', async () => {
      const user = userEvent.setup()
      render(<MemoWindow memo={mockMemo} />)
      
      const contentElement = screen.getByText('これはテスト用のメモです')
      const contentArea = contentElement.parentElement
      if (!contentArea) throw new Error('Content area not found')
      await user.dblClick(contentArea)
      
      expect(screen.getByPlaceholderText('メモの内容')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('タイトル')).toBeInTheDocument()
    })

    it('should save memo when save button is clicked', async () => {
      const user = userEvent.setup()
      render(<MemoWindow memo={mockMemo} />)
      
      // 編集モードに入る
      const contentElement = screen.getByText('これはテスト用のメモです')
      const contentArea = contentElement.parentElement
      if (!contentArea) throw new Error('Content area not found')
      await user.dblClick(contentArea)
      
      // タイトルとテキストを変更
      const titleInput = screen.getByPlaceholderText('タイトル')
      const textArea = screen.getByPlaceholderText('メモの内容')
      
      await user.clear(titleInput)
      await user.type(titleInput, '更新されたタイトル')
      await user.clear(textArea)
      await user.type(textArea, '更新されたテキスト')
      
      // 完了ボタンをクリック
      await user.click(screen.getByText('完了'))
      
      expect(mockUpdateMemo).toHaveBeenCalledWith('memo_test_123', {
        title: '更新されたタイトル',
        text: '更新されたテキスト'
      })
      // handleSaveは自動保存でtoastを表示しない
    })

    it('should cancel edit when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<MemoWindow memo={mockMemo} />)
      
      // 編集モードに入る
      const contentElement = screen.getByText('これはテスト用のメモです')
      const contentArea = contentElement.parentElement
      if (!contentArea) throw new Error('Content area not found')
      await user.dblClick(contentArea)
      
      // テキストを変更
      const textArea = screen.getByPlaceholderText('メモの内容')
      await user.clear(textArea)
      await user.type(textArea, '変更されたテキスト')
      
      // キャンセルボタンをクリック
      await user.click(screen.getByText('キャンセル'))
      
      // 元のテキストが表示される
      expect(screen.getByText('これはテスト用のメモです')).toBeInTheDocument()
      expect(mockUpdateMemo).not.toHaveBeenCalled()
    })
  })

  describe('タグ管理', () => {
    it('should add new tag', async () => {
      const user = userEvent.setup()
      render(<MemoWindow memo={mockMemo} />)
      
      // タグセクションを開く
      await user.click(screen.getByTitle('タグ'))
      
      // 新しいタグを入力
      const tagInput = screen.getByPlaceholderText('新しいタグ')
      await user.type(tagInput, '新タグ')
      await user.click(screen.getByText('追加'))
      
      expect(mockUpdateMemo).toHaveBeenCalledWith('memo_test_123', {
        tags: ['テスト', 'サンプル', '新タグ']
      })
      expect(toast.success).toHaveBeenCalledWith('タグ「新タグ」を追加しました')
    })

    it('should remove tag when × button is clicked', async () => {
      const user = userEvent.setup()
      render(<MemoWindow memo={mockMemo} />)
      
      // タグセクションを開く
      await user.click(screen.getByTitle('タグ'))
      
      // タグコンテナ内の削除ボタンを探す
      const tagElement = screen.getByText('テスト')
      const tagElements = tagElement.parentElement
      if (!tagElements) throw new Error('Tag container not found')
      const removeButton = tagElements.querySelector('button')
      if (!removeButton) throw new Error('Remove button not found')
      
      await user.click(removeButton)
      
      expect(mockUpdateMemo).toHaveBeenCalledWith('memo_test_123', {
        tags: ['サンプル']
      })
      expect(toast.info).toHaveBeenCalledWith('タグ「テスト」を削除しました')
    })
  })

  describe('レイヤー操作', () => {
    it('should move memo up one layer', async () => {
      const user = userEvent.setup()
      render(<MemoWindow memo={mockMemo} />)
      
      await user.click(screen.getByTitle('一段上げ'))
      expect(mockMoveUp).toHaveBeenCalledWith('memo_test_123')
    })

    it('should move memo down one layer', async () => {
      const user = userEvent.setup()
      render(<MemoWindow memo={mockMemo} />)
      
      await user.click(screen.getByTitle('一段下げ'))
      expect(mockMoveDown).toHaveBeenCalledWith('memo_test_123')
    })

    it('should bring memo to front', async () => {
      const user = userEvent.setup()
      render(<MemoWindow memo={mockMemo} />)
      
      await user.click(screen.getByTitle('最前面へ'))
      expect(mockBringToFront).toHaveBeenCalledWith('memo_test_123')
    })

    it('should send memo to back', async () => {
      const user = userEvent.setup()
      render(<MemoWindow memo={mockMemo} />)
      
      await user.click(screen.getByTitle('最背面へ'))
      expect(mockSendToBack).toHaveBeenCalledWith('memo_test_123')
    })
  })

  describe('削除機能', () => {
    it('should delete memo after long press', async () => {
      // confirmをモック
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      
      render(<MemoWindow memo={mockMemo} />)
      
      const deleteButton = screen.getByTitle('長押しで削除')
      
      // マウスダウンイベントを発火
      fireEvent.mouseDown(deleteButton)
      
      // 1秒待つ
      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalledWith('このメモを削除しますか？')
      }, { timeout: 1500 })
      
      expect(mockDeleteMemo).toHaveBeenCalledWith('memo_test_123')
      expect(toast.success).toHaveBeenCalledWith('メモを削除しました')
      
      confirmSpy.mockRestore()
    })

    it('should not delete memo if long press is cancelled', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm')
      
      render(<MemoWindow memo={mockMemo} />)
      
      const deleteButton = screen.getByTitle('長押しで削除')
      
      // マウスダウンして、すぐにマウスアップ
      fireEvent.mouseDown(deleteButton)
      fireEvent.mouseUp(deleteButton)
      
      // 1秒待っても confirm が呼ばれないことを確認
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      expect(confirmSpy).not.toHaveBeenCalled()
      expect(mockDeleteMemo).not.toHaveBeenCalled()
      
      confirmSpy.mockRestore()
    })
  })
})