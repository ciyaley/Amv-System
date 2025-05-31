import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '../useAuth'
import { server } from '../../../tests/mocks/server'
import { networkErrorHandlers, serverErrorHandlers, invalidJsonHandlers } from '../../../tests/mocks/handlers'

describe('useAuth Hook', () => {
  beforeEach(() => {
    // Zustandのストアをリセット
    // Reset store state
    act(() => {
      useAuth.setState({ isLoggedIn: false, uuid: null, email: null })
    })
  })

  describe('基本動作', () => {
    it('should initialize with logged out state', () => {
      const { result } = renderHook(() => useAuth())
      
      expect(result.current.isLoggedIn).toBe(false)
      expect(result.current.uuid).toBeNull()
      expect(result.current.email).toBeNull()
    })
  })

  describe('ユーザー登録', () => {
    it('should register user successfully with valid credentials', async () => {
      const { result } = renderHook(() => useAuth())
      
      await act(async () => {
        await result.current.register('test@example.com', 'ValidPassword123!')
      })

      expect(result.current.isLoggedIn).toBe(true)
      expect(result.current.uuid).toBe('test-uuid-123')
      expect(result.current.email).toBe('test@example.com')
    })

    it('should handle duplicate email error', async () => {
      const { result } = renderHook(() => useAuth())
      
      await expect(
        result.current.register('existing@example.com', 'ValidPassword123!')
      ).rejects.toThrow('User already exists')

      expect(result.current.isLoggedIn).toBe(false)
    })

    it('should validate password requirements', async () => {
      const { result } = renderHook(() => useAuth())
      
      // 12文字未満
      await expect(
        result.current.register('test@example.com', 'Short1')
      ).rejects.toThrow('Password must be at least 12 characters')
      
      // 英字なし
      await expect(
        result.current.register('test@example.com', '123456789012')
      ).rejects.toThrow('Password must contain letters and numbers')
      
      // 数字なし
      await expect(
        result.current.register('test@example.com', 'NoNumbersHere')
      ).rejects.toThrow('Password must contain letters and numbers')
    })
  })

  describe('ログイン', () => {
    it('should login successfully with correct credentials', async () => {
      const { result } = renderHook(() => useAuth())
      
      await act(async () => {
        await result.current.login('test@example.com', 'ValidPassword123!')
      })

      expect(result.current.isLoggedIn).toBe(true)
      expect(result.current.uuid).toBe('test-uuid-123')
      expect(result.current.email).toBe('test@example.com')
    })

    it('should handle invalid credentials error', async () => {
      const { result } = renderHook(() => useAuth())
      
      await expect(
        result.current.login('test@example.com', 'WrongPassword')
      ).rejects.toThrow('Invalid credentials')

      expect(result.current.isLoggedIn).toBe(false)
    })
  })

  describe('自動ログイン', () => {
    it('should auto-login successfully with valid JWT cookie', async () => {
      // MSWがクッキーを処理するため、ここでは成功ケースのみテスト
      const { result } = renderHook(() => useAuth())
      
      // クッキーがある状態をシミュレート
      document.cookie = 'token=valid-jwt-token; path=/'
      
      await act(async () => {
        await result.current.checkAutoLogin()
      })

      expect(result.current.isLoggedIn).toBe(true)
      expect(result.current.uuid).toBe('test-uuid-123')
      expect(result.current.email).toBe('test@example.com')
    })

    it('should handle no token case gracefully', async () => {
      const { result } = renderHook(() => useAuth())
      
      // クッキーをクリア
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      
      await act(async () => {
        await result.current.checkAutoLogin()
      })

      expect(result.current.isLoggedIn).toBe(false)
    })
  })

  describe('ログアウト', () => {
    it('should logout and clear state', async () => {
      const { result } = renderHook(() => useAuth())
      
      // ログイン状態を設定
      act(() => {
        result.current.setAuth(true, 'test-uuid', 'test@example.com')
      })

      await act(async () => {
        await result.current.logout()
      })

      expect(result.current.isLoggedIn).toBe(false)
      expect(result.current.uuid).toBeNull()
      expect(result.current.email).toBeNull()
    })
  })

  describe('ネットワークエラーハンドリング', () => {
    it('should handle network error during registration', async () => {
      const { result } = renderHook(() => useAuth())
      
      // MSWでネットワークエラーをシミュレート
      server.use(...networkErrorHandlers)
      
      await expect(
        result.current.register('test@example.com', 'ValidPassword123!')
      ).rejects.toThrow()

      expect(result.current.isLoggedIn).toBe(false)
      
      // 元のハンドラーに戻す
      server.resetHandlers()
    })

    it('should handle network error during login', async () => {
      const { result } = renderHook(() => useAuth())
      
      server.use(...networkErrorHandlers)
      
      await expect(
        result.current.login('test@example.com', 'ValidPassword123!')
      ).rejects.toThrow()

      expect(result.current.isLoggedIn).toBe(false)
      
      server.resetHandlers()
    })

    it('should handle auto-login network error gracefully', async () => {
      const { result } = renderHook(() => useAuth())
      
      server.use(...networkErrorHandlers)
      
      // auto-loginはエラーを握りつぶすので例外を投げない
      await act(async () => {
        await result.current.checkAutoLogin()
      })

      expect(result.current.isLoggedIn).toBe(false)
      
      server.resetHandlers()
    })
  })

  describe('サーバーエラーハンドリング', () => {
    it('should handle 500 server error during registration', async () => {
      const { result } = renderHook(() => useAuth())
      
      server.use(...serverErrorHandlers)
      
      await expect(
        result.current.register('test@example.com', 'ValidPassword123!')
      ).rejects.toThrow('Internal Server Error')

      expect(result.current.isLoggedIn).toBe(false)
      
      server.resetHandlers()
    })

    it('should handle 503 server error during login', async () => {
      const { result } = renderHook(() => useAuth())
      
      server.use(...serverErrorHandlers)
      
      await expect(
        result.current.login('test@example.com', 'ValidPassword123!')
      ).rejects.toThrow('Service Unavailable')

      expect(result.current.isLoggedIn).toBe(false)
      
      server.resetHandlers()
    })
  })

  describe('JSON解析エラーハンドリング', () => {
    it('should handle invalid JSON response during registration', async () => {
      const { result } = renderHook(() => useAuth())
      
      server.use(...invalidJsonHandlers)
      
      await expect(
        result.current.register('test@example.com', 'ValidPassword123!')
      ).rejects.toThrow()

      expect(result.current.isLoggedIn).toBe(false)
      
      server.resetHandlers()
    })

    it('should handle invalid JSON response during login', async () => {
      const { result } = renderHook(() => useAuth())
      
      server.use(...invalidJsonHandlers)
      
      await expect(
        result.current.login('test@example.com', 'ValidPassword123!')
      ).rejects.toThrow()

      expect(result.current.isLoggedIn).toBe(false)
      
      server.resetHandlers()
    })
  })
})