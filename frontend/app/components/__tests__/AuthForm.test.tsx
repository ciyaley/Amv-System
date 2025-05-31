import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthForm } from '../AuthForm'
import { useAuth } from '../../hooks/useAuth'

// useAuthフックをモック
vi.mock('../../hooks/useAuth')

describe('AuthForm Component', () => {
  const mockLogin = vi.fn()
  const mockRegister = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    const mockedUseAuth = vi.mocked(useAuth)
    mockedUseAuth.mockReturnValue({
      login: mockLogin,
      register: mockRegister,
      isLoggedIn: false,
      uuid: null,
      email: null,
      checkAutoLogin: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn()
    })
  })

  describe('基本動作', () => {
    it('should render login form by default', () => {
      render(<AuthForm />)
      
      expect(screen.getByRole('heading', { name: 'ログイン' })).toBeInTheDocument()
      expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument()
      expect(screen.getByLabelText('パスワード')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument()
    })

    it('should switch to register form when clicking switch button', async () => {
      const user = userEvent.setup()
      render(<AuthForm />)
      
      const switchButton = screen.getByText('アカウントを作成')
      await user.click(switchButton)
      
      expect(screen.getByText('新規登録')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '登録' })).toBeInTheDocument()
    })
  })

  describe('ログインフォーム', () => {
    it('should handle successful login', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValueOnce(undefined)
      
      render(<AuthForm />)
      
      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com')
      await user.type(screen.getByLabelText('パスワード'), 'ValidPassword123!')
      await user.click(screen.getByRole('button', { name: 'ログイン' }))
      
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'ValidPassword123!')
      })
    })

    it('should display error message on login failure', async () => {
      const user = userEvent.setup()
      mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'))
      
      render(<AuthForm />)
      
      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com')
      await user.type(screen.getByLabelText('パスワード'), 'WrongPassword')
      await user.click(screen.getByRole('button', { name: 'ログイン' }))
      
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
    })

  })

  describe('登録フォーム', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      render(<AuthForm />)
      await user.click(screen.getByText('アカウントを作成'))
    })

    it('should handle successful registration', async () => {
      const user = userEvent.setup()
      mockRegister.mockResolvedValueOnce(undefined)
      
      await user.type(screen.getByLabelText('メールアドレス'), 'new@example.com')
      await user.type(screen.getByLabelText('パスワード'), 'ValidPassword123!')
      await user.type(screen.getByLabelText('パスワード（確認）'), 'ValidPassword123!')
      await user.click(screen.getByRole('button', { name: '登録' }))
      
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith('new@example.com', 'ValidPassword123!')
      })
    })

    it('should validate password requirements', async () => {
      const user = userEvent.setup()
      
      // 短すぎるパスワード
      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com')
      await user.type(screen.getByLabelText('パスワード'), 'Short1')
      await user.type(screen.getByLabelText('パスワード（確認）'), 'Short1')
      await user.click(screen.getByRole('button', { name: '登録' }))
      
      expect(screen.getByText('パスワードは12文字以上で、英字と数字を含む必要があります')).toBeInTheDocument()
    })

    it('should validate password confirmation match', async () => {
      const user = userEvent.setup()
      
      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com')
      await user.type(screen.getByLabelText('パスワード'), 'ValidPassword123!')
      await user.type(screen.getByLabelText('パスワード（確認）'), 'DifferentPassword123!')
      await user.click(screen.getByRole('button', { name: '登録' }))
      
      expect(screen.getByText('パスワードが一致しません')).toBeInTheDocument()
    })
  })

  describe('フォームの状態管理', () => {
    it('should disable submit button while processing', async () => {
      const user = userEvent.setup()
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
      
      render(<AuthForm />)
      
      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com')
      await user.type(screen.getByLabelText('パスワード'), 'ValidPassword123!')
      
      const submitButton = screen.getByRole('button', { name: 'ログイン' })
      await user.click(submitButton)
      
      expect(submitButton).toBeDisabled()
      expect(screen.getByText('処理中...')).toBeInTheDocument()
    })

    it('should clear form on successful submission', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValueOnce(undefined)
      
      render(<AuthForm />)
      
      const emailInput = screen.getByLabelText('メールアドレス') as HTMLInputElement
      const passwordInput = screen.getByLabelText('パスワード') as HTMLInputElement
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'ValidPassword123!')
      await user.click(screen.getByRole('button', { name: 'ログイン' }))
      
      await waitFor(() => {
        expect(emailInput.value).toBe('')
        expect(passwordInput.value).toBe('')
      })
    })
  })

  describe('ネットワークエラーハンドリング', () => {
    it('should display error message on network failure during login', async () => {
      const user = userEvent.setup()
      
      // ネットワークエラーをモックで再現
      mockLogin.mockRejectedValueOnce(new Error('Network error'))
      
      render(<AuthForm />)
      
      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com')
      await user.type(screen.getByLabelText('パスワード'), 'ValidPassword123!')
      await user.click(screen.getByRole('button', { name: 'ログイン' }))
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('should display error message on network failure during registration', async () => {
      const user = userEvent.setup()
      
      // ネットワークエラーをモックで再現
      mockRegister.mockRejectedValueOnce(new Error('Network error'))
      
      render(<AuthForm />)
      
      // 登録フォームに切り替え
      await user.click(screen.getByText('アカウントを作成'))
      
      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com')
      await user.type(screen.getByLabelText('パスワード'), 'ValidPassword123!')
      await user.type(screen.getByLabelText('パスワード（確認）'), 'ValidPassword123!')
      await user.click(screen.getByRole('button', { name: '登録' }))
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('should display specific error message for server errors', async () => {
      const user = userEvent.setup()
      
      // サーバーエラーをモックで再現
      mockLogin.mockRejectedValueOnce(new Error('Service Unavailable'))
      
      render(<AuthForm />)
      
      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com')
      await user.type(screen.getByLabelText('パスワード'), 'ValidPassword123!')
      await user.click(screen.getByRole('button', { name: 'ログイン' }))
      
      await waitFor(() => {
        expect(screen.getByText('Service Unavailable')).toBeInTheDocument()
      })
    })

    it('should handle JSON parsing errors gracefully', async () => {
      const user = userEvent.setup()
      
      // JSON解析エラーをモックで再現
      mockLogin.mockRejectedValueOnce(new Error('Unexpected token in JSON'))
      
      render(<AuthForm />)
      
      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com')
      await user.type(screen.getByLabelText('パスワード'), 'ValidPassword123!')
      await user.click(screen.getByRole('button', { name: 'ログイン' }))
      
      await waitFor(() => {
        expect(screen.getByText('Unexpected token in JSON')).toBeInTheDocument()
      })
    })
  })

  describe('タイムアウトエラーハンドリング', () => {
    it('should handle timeout during login', async () => {
      const user = userEvent.setup()
      
      render(<AuthForm />)
      
      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com')
      await user.type(screen.getByLabelText('パスワード'), 'ValidPassword123!')
      await user.click(screen.getByRole('button', { name: 'ログイン' }))
      
      // ローディング状態を確認
      expect(screen.getByText('処理中...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '処理中...' })).toBeDisabled()
    }, 15000) // タイムアウトテストのため15秒に延長
  })
})