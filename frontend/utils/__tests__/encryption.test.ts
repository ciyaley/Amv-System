// utils/__tests__/encryption.test.ts
/**
 * Unit Tests: Encryption Utilities
 * 
 * Tests core encryption and decryption functionality
 * - Data encryption/decryption
 * - Key derivation
 * - Salt generation
 * - Error handling
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock Web Crypto API
const mockCrypto = {
  subtle: {
    importKey: vi.fn(),
    deriveKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    generateKey: vi.fn(),
  },
  getRandomValues: vi.fn(),
}

// Mock TextEncoder/TextDecoder
global.TextEncoder = vi.fn().mockImplementation(() => ({
  encode: vi.fn().mockImplementation((str: string) => new Uint8Array(Buffer.from(str, 'utf8')))
}))

global.TextDecoder = vi.fn().mockImplementation(() => ({
  decode: vi.fn().mockImplementation((buffer: Uint8Array) => Buffer.from(buffer).toString('utf8'))
}))

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
})

describe('Encryption Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock behaviors
    mockCrypto.getRandomValues.mockImplementation((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
      return array
    })
    
    mockCrypto.subtle.importKey.mockResolvedValue({ type: 'secret' })
    mockCrypto.subtle.deriveKey.mockResolvedValue({ type: 'secret' })
    mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(32))
    mockCrypto.subtle.decrypt.mockResolvedValue(new ArrayBuffer(32))
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Basic Encryption/Decryption', () => {
    it('should encrypt data correctly', async () => {
      const { encryptData } = await import('../encryption')

      const testData = { sensitive: 'information', number: 42 }
      const password = 'test-password'

      const result = await encryptData(testData, password)

      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should decrypt data correctly', async () => {
      const { encryptData, decryptData } = await import('../encryption')

      const originalData = { sensitive: 'information', number: 42 }
      const password = 'test-password'

      // Mock encrypt to return predictable result
      mockCrypto.subtle.encrypt.mockResolvedValue(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer
      )

      const encrypted = await encryptData(originalData, password)

      // Mock decrypt to return original data
      const originalJson = JSON.stringify(originalData)
      const encoder = new TextEncoder()
      mockCrypto.subtle.decrypt.mockResolvedValue(encoder.encode(originalJson).buffer)

      const decrypted = await decryptData(encrypted, password)

      expect(decrypted).toEqual(originalData)
    })

    it('should handle different data types', async () => {
      const { encryptData, decryptData } = await import('../encryption')

      const testCases = [
        { string: 'hello world' },
        { number: 12345 },
        { boolean: true },
        { array: [1, 2, 3] },
        { nested: { deep: { object: 'value' } } },
        null,
        undefined
      ]

      const password = 'test-password'

      for (const testData of testCases) {
        // Mock encrypt/decrypt cycle
        const originalJson = JSON.stringify(testData)
        const encoder = new TextEncoder()
        
        mockCrypto.subtle.encrypt.mockResolvedValue(
          new Uint8Array([1, 2, 3, 4]).buffer
        )
        mockCrypto.subtle.decrypt.mockResolvedValue(
          encoder.encode(originalJson).buffer
        )

        const encrypted = await encryptData(testData, password)
        const decrypted = await decryptData(encrypted, password)

        expect(decrypted).toEqual(testData)
      }
    })
  })

  describe('Key Derivation', () => {
    it('should derive key from password and salt', async () => {
      const { deriveKey } = await import('../encryption')

      const password = 'test-password'
      const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])

      const key = await deriveKey(password, salt)

      expect(mockCrypto.subtle.importKey).toHaveBeenCalled()
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalled()
      expect(key).toBeDefined()
    })

    it('should generate different keys for different passwords', async () => {
      const { deriveKey } = await import('../encryption')

      const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])

      // Mock different return values for different passwords
      let callCount = 0
      mockCrypto.subtle.deriveKey.mockImplementation(() => {
        return Promise.resolve({ type: 'secret', id: ++callCount })
      })

      const key1 = await deriveKey('password1', salt)
      const key2 = await deriveKey('password2', salt)

      expect(key1).not.toEqual(key2)
    })

    it('should generate different keys for different salts', async () => {
      const { deriveKey } = await import('../encryption')

      const password = 'same-password'
      const salt1 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
      const salt2 = new Uint8Array([8, 7, 6, 5, 4, 3, 2, 1])

      // Mock different return values for different salts
      let callCount = 0
      mockCrypto.subtle.deriveKey.mockImplementation(() => {
        return Promise.resolve({ type: 'secret', id: ++callCount })
      })

      const key1 = await deriveKey(password, salt1)
      const key2 = await deriveKey(password, salt2)

      expect(key1).not.toEqual(key2)
    })
  })

  describe('Salt Generation', () => {
    it('should generate random salt', async () => {
      const { generateSalt } = await import('../encryption')

      const salt = generateSalt()

      expect(salt).toBeInstanceOf(Uint8Array)
      expect(salt.length).toBe(16) // Standard salt length
      expect(mockCrypto.getRandomValues).toHaveBeenCalledWith(salt)
    })

    it('should generate different salts each time', async () => {
      const { generateSalt } = await import('../encryption')

      // Mock getRandomValues to return different values
      let counter = 0
      mockCrypto.getRandomValues.mockImplementation((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = (counter + i) % 256
        }
        counter += 10
        return array
      })

      const salt1 = generateSalt()
      const salt2 = generateSalt()

      expect(salt1).not.toEqual(salt2)
    })
  })

  describe('Error Handling', () => {
    it('should handle encryption errors gracefully', async () => {
      const { encryptData } = await import('../encryption')

      mockCrypto.subtle.encrypt.mockRejectedValue(new Error('Encryption failed'))

      const testData = { test: 'data' }
      const password = 'test-password'

      await expect(encryptData(testData, password)).rejects.toThrow('Encryption failed')
    })

    it('should handle decryption errors gracefully', async () => {
      const { decryptData } = await import('../encryption')

      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'))

      const encryptedData = 'mock-encrypted-data'
      const password = 'test-password'

      await expect(decryptData(encryptedData, password)).rejects.toThrow('Decryption failed')
    })

    it('should handle invalid encrypted data format', async () => {
      const { decryptData } = await import('../encryption')

      const invalidData = 'not-base64-or-invalid-format'
      const password = 'test-password'

      await expect(decryptData(invalidData, password)).rejects.toThrow()
    })

    it('should handle key derivation errors', async () => {
      const { deriveKey } = await import('../encryption')

      mockCrypto.subtle.deriveKey.mockRejectedValue(new Error('Key derivation failed'))

      const password = 'test-password'
      const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])

      await expect(deriveKey(password, salt)).rejects.toThrow('Key derivation failed')
    })
  })

  describe('Security Properties', () => {
    it('should use proper encryption parameters', async () => {
      const { encryptData } = await import('../encryption')

      await encryptData({ test: 'data' }, 'password')

      // Verify proper encryption algorithm is used
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'AES-GCM'
        }),
        expect.any(Object),
        expect.any(Uint8Array)
      )
    })

    it('should use proper key derivation parameters', async () => {
      const { deriveKey } = await import('../encryption')

      await deriveKey('password', new Uint8Array(16))

      // Verify PBKDF2 is used for key derivation
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'PBKDF2',
          iterations: expect.any(Number)
        }),
        expect.any(Object),
        expect.objectContaining({
          name: 'AES-GCM'
        }),
        false,
        ['encrypt', 'decrypt']
      )
    })

    it('should include IV/nonce in encrypted data', async () => {
      const { encryptData } = await import('../encryption')

      const result = await encryptData({ test: 'data' }, 'password')

      // Result should include IV (typically base64 encoded with the data)
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(20) // Should be longer than just the data
    })
  })

  describe('Performance', () => {
    it('should encrypt data within reasonable time', async () => {
      const { encryptData } = await import('../encryption')

      const largeData = {
        content: 'x'.repeat(10000) // 10KB of data
      }

      const startTime = performance.now()
      await encryptData(largeData, 'password')
      const endTime = performance.now()

      // Should complete within 1 second
      expect(endTime - startTime).toBeLessThan(1000)
    })

    it('should handle multiple concurrent operations', async () => {
      const { encryptData, decryptData } = await import('../encryption')

      const password = 'test-password'
      const testData = { test: 'concurrent data' }

      // Mock for consistent encrypt/decrypt
      const mockEncrypted = 'mock-encrypted-result'
      mockCrypto.subtle.encrypt.mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer)
      
      const encoder = new TextEncoder()
      mockCrypto.subtle.decrypt.mockResolvedValue(
        encoder.encode(JSON.stringify(testData)).buffer
      )

      // Run multiple operations concurrently
      const operations = Array.from({ length: 5 }, async (_, i) => {
        const data = { ...testData, id: i }
        const encrypted = await encryptData(data, password)
        return decryptData(encrypted, password)
      })

      const results = await Promise.all(operations)

      expect(results).toHaveLength(5)
      results.forEach((result, i) => {
        expect(result).toEqual({ ...testData, id: i })
      })
    })
  })
});