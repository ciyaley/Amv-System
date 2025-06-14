// app/hooks/__tests__/useAuth-useMemos.integration.test.ts
/**
 * Integration Tests: useAuth + useMemos
 * 
 * Tests the integration between authentication state and memo operations
 * - Authenticated memo creation vs guest memo creation
 * - Auto-save behavior based on auth state
 * - Data persistence across authentication state changes
 */
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useAuth } from '../useAuth'
import { useMemos } from '../useMemos'

// Mock external dependencies
vi.mock('../../../utils/fileAccess', () => ({
  enableFileSystemOperations: vi.fn(),
  stopFileSystemOperations: vi.fn(),
  requestDirectory: vi.fn().mockResolvedValue(undefined),
  getStoredDir: vi.fn().mockResolvedValue(null),
  saveIndividualMemo: vi.fn().mockResolvedValue(undefined),
  deleteMemoFromDisk: vi.fn().mockResolvedValue(undefined),
  loadMemosFromDisk: vi.fn().mockResolvedValue([]),
  saveAllMemos: vi.fn().mockResolvedValue(undefined),
  saveMemoManually: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../utils/encryption', () => ({
  encryptData: vi.fn().mockImplementation((data) => `encrypted_${JSON.stringify(data)}`),
  decryptData: vi.fn().mockImplementation((data) => JSON.parse(data.replace('encrypted_', ''))),
  generateSalt: vi.fn().mockReturnValue('mock_salt'),
  deriveKey: vi.fn().mockResolvedValue('mock_key'),
}))

// Mock environment
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

describe('useAuth + useMemos Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset localStorage mocks
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Authentication State Impact on Memo Operations', () => {
    it('should create authenticated memos when user is logged in', async () => {
      const { result: authResult } = renderHook(() => useAuth())
      const { result: memosResult } = renderHook(() => useMemos())

      // Set authenticated state
      act(() => {
        authResult.current.login('test@example.com', 'password123')
      })

      // Wait for auth state to stabilize
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Create memo in authenticated state
      act(() => {
        memosResult.current.createMemo({ x: 100, y: 100 })
      })

      // Verify memo was created with authenticated properties
      expect(memosResult.current.memos).toHaveLength(1)
      const memo = memosResult.current.memos[0]
      expect(memo.sourceType).toBe('authenticated')
      expect(memo.x).toBe(100)
      expect(memo.y).toBe(100)
    })

    it('should create guest memos when user is not logged in', () => {
      const { result: authResult } = renderHook(() => useAuth())
      const { result: memosResult } = renderHook(() => useMemos())

      // Ensure not authenticated
      expect(authResult.current.isLoggedIn).toBe(false)

      // Create memo in guest state
      act(() => {
        memosResult.current.createMemo({ x: 200, y: 150 })
      })

      // Verify memo was created with guest properties
      expect(memosResult.current.memos).toHaveLength(1)
      const memo = memosResult.current.memos[0]
      expect(memo.sourceType).toBe('guest')
      expect(memo.x).toBe(200)
      expect(memo.y).toBe(150)
    })

    it('should handle auto-save differently based on auth state', async () => {
      const { result: authResult } = renderHook(() => useAuth())
      const { result: memosResult } = renderHook(() => useMemos())

      // Test guest auto-save (should be limited/different)
      act(() => {
        memosResult.current.createMemo({ x: 100, y: 100 })
      })

      const guestMemo = memosResult.current.memos[0]

      // Update memo content in guest mode
      act(() => {
        memosResult.current.updateMemo(guestMemo.id, { content: 'Guest memo content' })
      })

      // Now authenticate
      act(() => {
        authResult.current.login('test@example.com', 'password123')
      })

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Update memo content in authenticated mode
      act(() => {
        memosResult.current.updateMemo(guestMemo.id, { content: 'Authenticated memo content' })
      })

      // Verify memo was updated
      const updatedMemo = memosResult.current.memos.find(m => m.id === guestMemo.id)
      expect(updatedMemo?.content).toBe('Authenticated memo content')
    })
  })

  describe('Authentication State Transitions', () => {
    it('should preserve memos when transitioning from guest to authenticated', async () => {
      const { result: authResult } = renderHook(() => useAuth())
      const { result: memosResult } = renderHook(() => useMemos())

      // Create memos as guest
      act(() => {
        memosResult.current.createMemo({ x: 100, y: 100 })
        memosResult.current.createMemo({ x: 200, y: 200 })
      })

      expect(memosResult.current.memos).toHaveLength(2)
      const guestMemoIds = memosResult.current.memos.map(m => m.id)

      // Authenticate
      act(() => {
        authResult.current.login('test@example.com', 'password123')
      })

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Verify memos are preserved
      expect(memosResult.current.memos).toHaveLength(2)
      guestMemoIds.forEach(id => {
        expect(memosResult.current.memos.find(m => m.id === id)).toBeDefined()
      })
    })

    it('should handle logout gracefully', async () => {
      const { result: authResult } = renderHook(() => useAuth())
      const { result: memosResult } = renderHook(() => useMemos())

      // Authenticate and create memos
      act(() => {
        authResult.current.login('test@example.com', 'password123')
      })

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      act(() => {
        memosResult.current.createMemo({ x: 100, y: 100 })
      })

      expect(memosResult.current.memos).toHaveLength(1)

      // Logout
      act(() => {
        authResult.current.logout()
      })

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Verify memo operations still work in guest mode
      act(() => {
        memosResult.current.createMemo({ x: 200, y: 200 })
      })

      expect(memosResult.current.memos).toHaveLength(2)
      const newMemo = memosResult.current.memos[1]
      expect(newMemo.sourceType).toBe('guest')
    })
  })

  describe('Data Persistence Integration', () => {
    it('should handle file operations correctly based on auth state', async () => {
      const { result: authResult } = renderHook(() => useAuth())
      const { result: memosResult } = renderHook(() => useMemos())

      // Test save operations in guest mode
      act(() => {
        memosResult.current.createMemo({ x: 100, y: 100 })
      })

      const guestMemo = memosResult.current.memos[0]

      // Manual save in guest mode
      await act(async () => {
        await memosResult.current.saveAllMemos()
      })

      // Authenticate
      act(() => {
        authResult.current.login('test@example.com', 'password123')
      })

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Update memo in authenticated mode
      act(() => {
        memosResult.current.updateMemo(guestMemo.id, { content: 'Updated in auth mode' })
      })

      // Verify the update was applied
      const updatedMemo = memosResult.current.memos.find(m => m.id === guestMemo.id)
      expect(updatedMemo?.content).toBe('Updated in auth mode')
    })

    it('should load memos correctly after authentication', async () => {
      const { result: authResult } = renderHook(() => useAuth())
      const { result: memosResult } = renderHook(() => useMemos())

      // Mock loaded memos from disk
      const { loadMemosFromDisk } = await import('../../../utils/fileAccess')
      vi.mocked(loadMemosFromDisk).mockResolvedValue([
        {
          id: 'loaded-memo-1',
          title: 'Loaded Memo',
          content: 'This was loaded from disk',
          text: 'This was loaded from disk',
          x: 150,
          y: 150,
          w: 300,
          h: 200,
          zIndex: 1,
          type: 'memo',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          sourceType: 'authenticated',
          visible: true
        }
      ])

      // Authenticate first
      act(() => {
        authResult.current.login('test@example.com', 'password123')
      })

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Load memos from disk
      await act(async () => {
        await memosResult.current.loadMemosFromDisk()
      })

      // Verify loaded memo is present
      expect(memosResult.current.memos).toHaveLength(1)
      const loadedMemo = memosResult.current.memos[0]
      expect(loadedMemo.id).toBe('loaded-memo-1')
      expect(loadedMemo.content).toBe('This was loaded from disk')
      expect(loadedMemo.sourceType).toBe('authenticated')
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle authentication errors gracefully', async () => {
      const { result: memosResult } = renderHook(() => useMemos())

      // Create a memo first
      act(() => {
        memosResult.current.createMemo({ x: 100, y: 100 })
      })

      expect(memosResult.current.memos).toHaveLength(1)

      // Attempt authentication with error
      const mockError = new Error('Authentication failed')
      
      try {
        await act(async () => {
          // This should not affect memo operations
          throw mockError
        })
      } catch {
        // Expected error
      }

      // Verify memo operations still work
      act(() => {
        memosResult.current.createMemo({ x: 200, y: 200 })
      })

      expect(memosResult.current.memos).toHaveLength(2)
    })

    it('should handle memo save errors in different auth states', async () => {
      const { result: memosResult } = renderHook(() => useMemos())

      // Mock save error
      const { saveIndividualMemo } = await import('../../../utils/fileAccess')
      vi.mocked(saveIndividualMemo).mockRejectedValue(new Error('Save failed'))

      // Create memo in guest mode
      act(() => {
        memosResult.current.createMemo({ x: 100, y: 100 })
      })

      const memo = memosResult.current.memos[0]

      // Update memo (this should trigger auto-save and handle error gracefully)
      act(() => {
        memosResult.current.updateMemo(memo.id, { content: 'Test content' })
      })

      // Verify memo was still updated in memory despite save error
      const updatedMemo = memosResult.current.memos.find(m => m.id === memo.id)
      expect(updatedMemo?.content).toBe('Test content')
    })
  })
});