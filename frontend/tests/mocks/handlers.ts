import { http, HttpResponse } from 'msw'

const API_BASE_URL = 'http://localhost:8787'

export const handlers = [
  // 登録エンドポイント
  http.post(`${API_BASE_URL}/api/auth/register`, async ({ request }) => {
    const { email, password } = await request.json() as { email: string; password: string }
    
    // パスワードバリデーション
    if (password.length < 12) {
      return HttpResponse.json(
        { status: 'error', code: 1003, message: 'Password must be at least 12 characters' },
        { status: 400 }
      )
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return HttpResponse.json(
        { status: 'error', code: 1003, message: 'Password must contain letters and numbers' },
        { status: 400 }
      )
    }
    
    // 既存ユーザーのシミュレーション
    if (email === 'existing@example.com') {
      return HttpResponse.json(
        { status: 'error', code: 1002, message: 'User already exists' },
        { status: 400 }
      )
    }
    
    // 成功レスポンス
    return HttpResponse.json({
      message: 'Registered successfully',
      uuid: 'test-uuid-123',
      email: email
    })
  }),

  // ログインエンドポイント
  http.post(`${API_BASE_URL}/api/auth/login`, async ({ request }) => {
    const { email, password } = await request.json() as { email: string; password: string }
    
    // 認証失敗のシミュレーション
    if (password === 'WrongPassword') {
      return HttpResponse.json(
        { status: 'error', code: 1001, message: 'Invalid credentials' },
        { status: 401 }
      )
    }
    
    // 成功レスポンス
    return HttpResponse.json({
      message: 'Logged in successfully',
      uuid: 'test-uuid-123',
      email: email
    })
  }),

  // 自動ログインエンドポイント
  http.get(`${API_BASE_URL}/api/autologin`, ({ cookies }) => {
    // トークンがない場合
    if (!cookies.token) {
      return HttpResponse.json(
        { status: 'error', code: 1004, message: 'No token' },
        { status: 401 }
      )
    }
    
    // 成功レスポンス
    return HttpResponse.json({
      uuid: 'test-uuid-123',
      email: 'test@example.com'
    })
  }),

  // ログアウトエンドポイント
  http.post(`${API_BASE_URL}/api/auth/logout`, () => {
    return HttpResponse.json({ message: 'Logged out' })
  }),
]