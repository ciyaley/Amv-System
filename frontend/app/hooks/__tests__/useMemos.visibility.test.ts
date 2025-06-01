import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMemos } from '../useMemos'

describe('useMemos Visibility Functions', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useMemos())
    act(() => {
      result.current.setMemos([]) // リセット
    })
  })

  it('should toggle memo visibility', () => {
    const { result } = renderHook(() => useMemos())
    
    // メモを作成
    act(() => {
      result.current.createMemo({ x: 100, y: 100 })
    })
    
    const memoId = result.current.memos[0].id
    expect(result.current.memos[0].visible).toBe(true) // デフォルトは表示
    
    // 非表示にする
    act(() => {
      result.current.toggleMemoVisibility(memoId)
    })
    
    expect(result.current.memos[0].visible).toBe(false)
    
    // 再表示する
    act(() => {
      result.current.toggleMemoVisibility(memoId)
    })
    
    expect(result.current.memos[0].visible).toBe(true)
  })

  it('should get visible memos only', () => {
    const { result } = renderHook(() => useMemos())
    
    // 複数のメモを作成
    act(() => {
      result.current.createMemo({ x: 100, y: 100 })
      result.current.createMemo({ x: 200, y: 200 })
      result.current.createMemo({ x: 300, y: 300 })
    })
    
    const memo1Id = result.current.memos[0].id
    const memo2Id = result.current.memos[1].id
    
    // 1つ目と2つ目を非表示にする
    act(() => {
      result.current.toggleMemoVisibility(memo1Id)
      result.current.toggleMemoVisibility(memo2Id)
    })
    
    const visibleMemos = result.current.getVisibleMemos()
    expect(visibleMemos).toHaveLength(1)
    expect(visibleMemos[0].visible).toBe(true)
  })

  it('should get hidden memos only', () => {
    const { result } = renderHook(() => useMemos())
    
    // 複数のメモを作成
    act(() => {
      result.current.createMemo({ x: 100, y: 100 })
      result.current.createMemo({ x: 200, y: 200 })
      result.current.createMemo({ x: 300, y: 300 })
    })
    
    const memo1Id = result.current.memos[0].id
    const memo2Id = result.current.memos[1].id
    
    // 1つ目と2つ目を非表示にする
    act(() => {
      result.current.toggleMemoVisibility(memo1Id)
      result.current.toggleMemoVisibility(memo2Id)
    })
    
    const hiddenMemos = result.current.getHiddenMemos()
    expect(hiddenMemos).toHaveLength(2)
    hiddenMemos.forEach(memo => {
      expect(memo.visible).toBe(false)
    })
  })

  it('should focus memo on canvas (bring to front and make visible)', () => {
    const { result } = renderHook(() => useMemos())
    
    // 複数メモを作成して非表示にする
    act(() => {
      result.current.createMemo({ x: 100, y: 100 })
      result.current.createMemo({ x: 200, y: 200 })
      result.current.createMemo({ x: 300, y: 300 })
    })
    
    const memo1Id = result.current.memos[0].id
    
    act(() => {
      result.current.toggleMemoVisibility(memo1Id)
    })
    
    expect(result.current.memos[0].visible).toBe(false)
    
    // フォーカス前の最大zIndexを取得
    const otherMemos = result.current.memos.filter(m => m.id !== memo1Id)
    const maxOtherZIndex = Math.max(...otherMemos.map(m => m.zIndex))
    
    // フォーカス
    act(() => {
      result.current.focusMemoOnCanvas(memo1Id)
    })
    
    // 表示状態になり、他のメモより前面に移動
    const focusedMemo = result.current.memos.find(m => m.id === memo1Id)!
    expect(focusedMemo.visible).toBe(true)
    expect(focusedMemo.zIndex).toBeGreaterThanOrEqual(maxOtherZIndex)
  })

  it('should handle non-existent memo ID gracefully', () => {
    const { result } = renderHook(() => useMemos())
    
    // 存在しないIDでの操作
    expect(() => {
      act(() => {
        result.current.toggleMemoVisibility('non-existent-id')
        result.current.focusMemoOnCanvas('non-existent-id')
      })
    }).not.toThrow()
  })

  it('should maintain visibility state when updating memo content', () => {
    const { result } = renderHook(() => useMemos())
    
    // メモを作成して非表示にする
    act(() => {
      result.current.createMemo({ x: 100, y: 100 })
    })
    
    const memoId = result.current.memos[0].id
    
    act(() => {
      result.current.toggleMemoVisibility(memoId)
    })
    
    expect(result.current.memos[0].visible).toBe(false)
    
    // コンテンツを更新
    act(() => {
      result.current.updateMemo(memoId, { title: 'Updated Title', text: 'Updated Content' })
    })
    
    // 表示状態は維持される
    expect(result.current.memos[0].visible).toBe(false)
    expect(result.current.memos[0].title).toBe('Updated Title')
  })
})