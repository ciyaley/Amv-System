// app/hooks/__tests__/useMemos-fileOperations.integration.test.ts
/**
 * Integration Tests: useMemos + File Operations
 * 
 * Tests the integration between memo state management and file operations
 * - Auto-save trigger scenarios
 * - Manual save operations  
 * - File loading and state synchronization
 * - Error handling in file operations
 */
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useMemos } from '../useMemos'
import type { MemoData } from '../../types/tools'

// Mock file access utilities
const mockSaveIndividualMemo = vi.fn()
const mockDeleteMemoFromDisk = vi.fn()
const mockLoadMemosFromDisk = vi.fn()
const mockSaveAllMemos = vi.fn()
const mockSaveMemoManually = vi.fn()

vi.mock('../../../utils/fileAccess', () => ({
  saveIndividualMemo: mockSaveIndividualMemo,
  deleteMemoFromDisk: mockDeleteMemoFromDisk,
  loadMemosFromDisk: mockLoadMemosFromDisk,
  saveAllMemos: mockSaveAllMemos,
  saveMemoManually: mockSaveMemoManually,
  enableFileSystemOperations: vi.fn(),
  stopFileSystemOperations: vi.fn(),
  requestDirectory: vi.fn().mockResolvedValue(undefined),
  getStoredDir: vi.fn().mockResolvedValue(null),
}))

// Mock memo operations
vi.mock('../memoFileOperations', () => ({
  loadMemosFromDisk: mockLoadMemosFromDisk,
  mergeMemosWithExisting: vi.fn((existing, loaded) => [...existing, ...loaded]),
  saveAllMemos: mockSaveAllMemos,
  saveMemoManually: mockSaveMemoManually,
  deleteMemoFromDisk: mockDeleteMemoFromDisk,
}))

// Mock auto-save
const mockPersistMemo = vi.fn()
const mockStopAutoSave = vi.fn()
const mockClearAutoSaveTimers = vi.fn()

vi.mock('../memoAutoSave', () => ({
  persistMemo: mockPersistMemo,
  stopAutoSave: mockStopAutoSave,
  clearAutoSaveTimers: mockClearAutoSaveTimers,
}))

describe('useMemos + File Operations Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    // Set default mock behaviors
    mockSaveIndividualMemo.mockResolvedValue(undefined)
    mockDeleteMemoFromDisk.mockResolvedValue(undefined)
    mockLoadMemosFromDisk.mockResolvedValue([])
    mockSaveAllMemos.mockResolvedValue(undefined)
    mockSaveMemoManually.mockResolvedValue(undefined)
    mockPersistMemo.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllTimers()
  })

  describe('Auto-Save Integration', () => {
    it('should trigger auto-save when creating memo', () => {
      const { result } = renderHook(() => useMemos())

      act(() => {
        result.current.createMemo({ x: 100, y: 100 })
      })

      expect(result.current.memos).toHaveLength(1)
      const memo = result.current.memos[0]
      
      // Verify persistMemo was called for auto-save
      expect(mockPersistMemo).toHaveBeenCalledWith(memo)
    })

    it('should trigger auto-save when updating memo', () => {
      const { result } = renderHook(() => useMemos())

      // Create memo
      act(() => {
        result.current.createMemo({ x: 100, y: 100 })
      })

      const memo = result.current.memos[0]
      mockPersistMemo.mockClear()

      // Update memo
      act(() => {
        result.current.updateMemo(memo.id, { content: 'Updated content' })
      })

      // Verify auto-save was triggered for update
      expect(mockPersistMemo).toHaveBeenCalledWith(
        expect.objectContaining({
          id: memo.id,
          content: 'Updated content'
        })
      )
    })

    it('should trigger auto-save when changing memo position', () => {
      const { result } = renderHook(() => useMemos())

      // Create memo
      act(() => {
        result.current.createMemo({ x: 100, y: 100 })
      })

      const memo = result.current.memos[0]
      mockPersistMemo.mockClear()

      // Update position
      act(() => {
        result.current.updateMemoPosition(memo.id, 200, 150)
      })

      // Verify auto-save was triggered for position change
      expect(mockPersistMemo).toHaveBeenCalledWith(
        expect.objectContaining({
          id: memo.id,
          x: 200,
          y: 150
        })
      )
    })

    it('should trigger auto-save when changing z-index', () => {
      const { result } = renderHook(() => useMemos())

      // Create two memos
      act(() => {
        result.current.createMemo({ x: 100, y: 100 })
        result.current.createMemo({ x: 200, y: 200 })
      })

      const firstMemo = result.current.memos[0]
      mockPersistMemo.mockClear()

      // Bring to front
      act(() => {
        result.current.bringToFront(firstMemo.id)
      })

      // Verify auto-save was triggered for z-index change
      expect(mockPersistMemo).toHaveBeenCalledWith(
        expect.objectContaining({
          id: firstMemo.id
        })
      )
    })
  })

  describe('Manual Save Operations', () => {
    it('should handle manual save all memos', async () => {
      const { result } = renderHook(() => useMemos())

      // Create multiple memos
      act(() => {
        result.current.createMemo({ x: 100, y: 100 })
        result.current.createMemo({ x: 200, y: 200 })
      })

      expect(result.current.memos).toHaveLength(2)

      // Manual save all
      await act(async () => {
        await result.current.saveAllMemos()
      })

      // Verify saveAllMemos was called with all memos
      expect(mockSaveAllMemos).toHaveBeenCalledWith(result.current.memos)
    })

    it('should handle manual save single memo', async () => {
      const { result } = renderHook(() => useMemos())

      // Create memo
      act(() => {
        result.current.createMemo({ x: 100, y: 100 })
      })

      const memo = result.current.memos[0]

      // Manual save single memo
      await act(async () => {
        await result.current.saveMemoManually(memo.id)
      })

      // Verify saveMemoManually was called with the memo
      expect(mockSaveMemoManually).toHaveBeenCalledWith(memo)
    })

    it('should handle manual save non-existent memo gracefully', async () => {
      const { result } = renderHook(() => useMemos())

      // Try to save non-existent memo
      await act(async () => {
        await result.current.saveMemoManually('non-existent-id')
      })

      // Should not call save function
      expect(mockSaveMemoManually).not.toHaveBeenCalled()
    })
  })

  describe('File Loading Integration', () => {
    it('should load memos from disk and merge with existing', async () => {
      const { result } = renderHook(() => useMemos())

      // Create existing memo
      act(() => {
        result.current.createMemo({ x: 100, y: 100 })
      })

      const existingMemo = result.current.memos[0]

      // Mock loaded memos
      const loadedMemos: MemoData[] = [
        {
          id: 'loaded-memo-1',
          title: 'Loaded Memo',
          content: 'From disk',
          text: 'From disk',
          x: 200,
          y: 200,
          w: 300,
          h: 200,
          zIndex: 1,
          type: 'memo',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          sourceType: 'guest',
          visible: true
        }
      ]

      mockLoadMemosFromDisk.mockResolvedValue(loadedMemos)

      // Load memos from disk
      await act(async () => {
        await result.current.loadMemosFromDisk()
      })

      // Verify memos were merged
      expect(result.current.memos).toHaveLength(2)
      expect(result.current.memos.find(m => m.id === existingMemo.id)).toBeDefined()
      expect(result.current.memos.find(m => m.id === 'loaded-memo-1')).toBeDefined()
    })

    it('should handle empty load gracefully', async () => {
      const { result } = renderHook(() => useMemos())

      // Create existing memo
      act(() => {
        result.current.createMemo({ x: 100, y: 100 })
      })

      expect(result.current.memos).toHaveLength(1)

      // Mock empty load
      mockLoadMemosFromDisk.mockResolvedValue([])

      // Load memos from disk
      await act(async () => {
        await result.current.loadMemosFromDisk()
      })

      // Verify existing memo is preserved
      expect(result.current.memos).toHaveLength(1)
    })

    it('should handle load errors gracefully', async () => {
      const { result } = renderHook(() => useMemos())

      // Create existing memo
      act(() => {
        result.current.createMemo({ x: 100, y: 100 })
      })

      expect(result.current.memos).toHaveLength(1)

      // Mock load error
      mockLoadMemosFromDisk.mockRejectedValue(new Error('Load failed'))

      // Load memos from disk
      await act(async () => {
        await result.current.loadMemosFromDisk()
      })

      // Verify existing memo is preserved despite error
      expect(result.current.memos).toHaveLength(1)
    })
  })

  describe('Delete Operations', () => {
    it('should delete memo from memory and disk', async () => {
      const { result } = renderHook(() => useMemos())

      // Create memo
      act(() => {
        result.current.createMemo({ x: 100, y: 100 })
      })

      const memo = result.current.memos[0]
      expect(result.current.memos).toHaveLength(1)

      // Delete memo
      await act(async () => {
        await result.current.deleteMemo(memo.id)
      })

      // Verify memo was deleted from memory
      expect(result.current.memos).toHaveLength(0)

      // Verify delete was called on disk
      expect(mockDeleteMemoFromDisk).toHaveBeenCalledWith(memo.id)
    })

    it('should handle delete disk error gracefully', async () => {
      const { result } = renderHook(() => useMemos())

      // Create memo
      act(() => {
        result.current.createMemo({ x: 100, y: 100 })
      })

      const memo = result.current.memos[0]

      // Mock delete error
      mockDeleteMemoFromDisk.mockRejectedValue(new Error('Delete failed'))

      // Delete memo
      await act(async () => {
        await result.current.deleteMemo(memo.id)
      })

      // Verify memo was still deleted from memory
      expect(result.current.memos).toHaveLength(0)
    })
  })

  describe('Auto-Save Cleanup', () => {
    it('should stop auto-save when clearing all memos', () => {
      const { result } = renderHook(() => useMemos())

      // Create memos
      act(() => {
        result.current.createMemo({ x: 100, y: 100 })
        result.current.createMemo({ x: 200, y: 200 })
      })

      expect(result.current.memos).toHaveLength(2)

      // Clear all memos
      act(() => {
        result.current.clearAllMemos()
      })

      // Verify auto-save timers were cleared
      expect(mockClearAutoSaveTimers).toHaveBeenCalled()
      expect(result.current.memos).toHaveLength(0)
    })

    it('should stop auto-save when explicitly called', () => {
      const { result } = renderHook(() => useMemos())

      // Stop auto-save
      act(() => {
        result.current.stopAutoSave()
      })

      // Verify stopAutoSave was called
      expect(mockStopAutoSave).toHaveBeenCalled()
    })
  })

  describe('File Operation Error Handling', () => {
    it('should handle save errors during auto-save', () => {
      const { result } = renderHook(() => useMemos())

      // Mock save error
      mockPersistMemo.mockRejectedValue(new Error('Auto-save failed'))

      // Create memo (this triggers auto-save)
      act(() => {
        result.current.createMemo({ x: 100, y: 100 })
      })

      // Verify memo was still created in memory despite save error
      expect(result.current.memos).toHaveLength(1)
    })

    it('should handle save errors during manual save all', async () => {
      const { result } = renderHook(() => useMemos())

      // Create memo
      act(() => {
        result.current.createMemo({ x: 100, y: 100 })
      })

      // Mock save error
      mockSaveAllMemos.mockRejectedValue(new Error('Manual save failed'))

      // Try manual save
      await expect(
        act(async () => {
          await result.current.saveAllMemos()
        })
      ).rejects.toThrow('Manual save failed')

      // Verify memo is still in memory
      expect(result.current.memos).toHaveLength(1)
    })

    it('should handle save errors during manual save single', async () => {
      const { result } = renderHook(() => useMemos())

      // Create memo
      act(() => {
        result.current.createMemo({ x: 100, y: 100 })
      })

      const memo = result.current.memos[0]

      // Mock save error
      mockSaveMemoManually.mockRejectedValue(new Error('Single save failed'))

      // Try manual save single
      await expect(
        act(async () => {
          await result.current.saveMemoManually(memo.id)
        })
      ).rejects.toThrow('Single save failed')

      // Verify memo is still in memory
      expect(result.current.memos).toHaveLength(1)
    })
  })
});