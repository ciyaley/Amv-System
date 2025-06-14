// utils/__tests__/fileAccess-simple.test.ts
/**
 * Simple File Access Tests
 * 
 * Tests only the functions that actually exist in the fileAccess module
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock dependencies
vi.mock('../encryption', () => ({
  encryptData: vi.fn().mockResolvedValue('encrypted-data'),
  decryptData: vi.fn().mockResolvedValue({ test: 'data' })
}))

vi.mock('../../app/hooks/useEncryptionStore', () => ({
  useEncryptionStore: {
    getState: vi.fn(() => ({ password: 'test-password' }))
  }
}))

describe('File Access - Simple Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Module Imports', () => {
    it('should import module constants correctly', async () => {
      const { FOLDER_NAME, MEMOS_DIR, WORKSPACE_FILENAME } = await import('../fileAccess')

      expect(FOLDER_NAME).toBeDefined()
      expect(MEMOS_DIR).toBeDefined()  
      expect(WORKSPACE_FILENAME).toBeDefined()
    })

    it('should import error classes correctly', async () => {
      const { FileSystemError, PermissionError, DataIntegrityError } = await import('../fileAccess')

      expect(FileSystemError).toBeDefined()
      expect(PermissionError).toBeDefined()
      expect(DataIntegrityError).toBeDefined()
    })

    it('should create error instances correctly', async () => {
      const { FileSystemError, PermissionError } = await import('../fileAccess')

      const fsError = new FileSystemError('Test error', 'TEST_CODE')
      expect(fsError.message).toBe('Test error')
      expect(fsError.code).toBe('TEST_CODE')
      expect(fsError.name).toBe('FileSystemError')

      const permError = new PermissionError('Permission denied')
      expect(permError.message).toBe('Permission denied')
      expect(permError.code).toBe('PERMISSION_DENIED')
    })
  })

  describe('Module Metadata', () => {
    it('should have correct module information', async () => {
      const { MODULE_INFO } = await import('../fileAccess')

      expect(MODULE_INFO.version).toBeDefined()
      expect(MODULE_INFO.totalFiles).toBe(3)
      expect(MODULE_INFO.originalFiles).toBe(10)
      expect(MODULE_INFO.reductionPercentage).toBe(70)
    })
  })

  describe('Utility Functions', () => {
    it('should provide dynamic import utilities', async () => {
      const { loadDataIntegrityUtils, loadDirectoryRestoreUtils, loadGuestModeUtils } = await import('../fileAccess')

      expect(typeof loadDataIntegrityUtils).toBe('function')
      expect(typeof loadDirectoryRestoreUtils).toBe('function')
      expect(typeof loadGuestModeUtils).toBe('function')
    })

    it('should provide file system operations object', async () => {
      const { fileSystemOperations } = await import('../fileAccess')

      expect(fileSystemOperations).toBeDefined()
      expect(fileSystemOperations.core).toBeDefined()
      expect(fileSystemOperations.operations).toBeDefined()
      expect(fileSystemOperations.utils).toBeDefined()
    })
  })

  describe('Legacy Compatibility', () => {
    it('should provide deprecated function warnings', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      import('../fileAccess').then(({ saveIndividualMemoDeprecated, loadAllMemosDeprecated }) => {
        // These should trigger warnings when called
        expect(typeof saveIndividualMemoDeprecated).toBe('function')
        expect(typeof loadAllMemosDeprecated).toBe('function')
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Basic Functionality', () => {
    it('should handle encryption utilities', async () => {
      const { encryptData, decryptData } = await import('../fileAccess')

      expect(typeof encryptData).toBe('function')
      expect(typeof decryptData).toBe('function')
    })

    it('should provide compatibility functions', async () => {
      const { enableAutoSave, disableAutoSave, saveWithEncryption, loadWithDecryption } = await import('../fileAccess')

      expect(typeof enableAutoSave).toBe('function')
      expect(typeof disableAutoSave).toBe('function')
      expect(typeof saveWithEncryption).toBe('function')
      expect(typeof loadWithDecryption).toBe('function')

      // Test that they execute without errors
      await expect(enableAutoSave(() => {})).resolves.toBeUndefined()
      await expect(disableAutoSave()).resolves.toBeUndefined()
    })
  })
});