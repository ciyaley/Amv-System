import { http, HttpResponse } from 'msw'

const API_BASE_URL = 'http://localhost:8787'

// ネットワークエラーのシミュレーション用ハンドラー
export const networkErrorHandlers = [
  // ネットワークエラー（サーバー接続失敗）
  http.post(`${API_BASE_URL}/api/auth/register`, () => {
    return HttpResponse.error()
  }),
  http.post(`${API_BASE_URL}/api/auth/login`, () => {
    return HttpResponse.error()
  }),
  http.get(`${API_BASE_URL}/api/autologin`, () => {
    return HttpResponse.error()
  }),
]

// タイムアウトエラーのシミュレーション用ハンドラー
export const timeoutHandlers = [
  http.post(`${API_BASE_URL}/api/auth/register`, async () => {
    // 10秒待機してタイムアウトをシミュレート
    await new Promise(resolve => setTimeout(resolve, 10000))
    return HttpResponse.json({ message: 'Should not reach here' })
  }),
  http.post(`${API_BASE_URL}/api/auth/login`, async () => {
    await new Promise(resolve => setTimeout(resolve, 10000))
    return HttpResponse.json({ message: 'Should not reach here' })
  }),
]

// 不正なJSONレスポンスのシミュレーション用ハンドラー
export const invalidJsonHandlers = [
  http.post(`${API_BASE_URL}/api/auth/register`, () => {
    return new Response('Invalid JSON response', {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }),
  http.post(`${API_BASE_URL}/api/auth/login`, () => {
    return new Response('Invalid JSON response', {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }),
]

// 500系サーバーエラーのシミュレーション用ハンドラー
export const serverErrorHandlers = [
  http.post(`${API_BASE_URL}/api/auth/register`, () => {
    return HttpResponse.json(
      { status: 'error', message: 'Internal Server Error' },
      { status: 500 }
    )
  }),
  http.post(`${API_BASE_URL}/api/auth/login`, () => {
    return HttpResponse.json(
      { status: 'error', message: 'Service Unavailable' },
      { status: 503 }
    )
  }),
  http.get(`${API_BASE_URL}/api/autologin`, () => {
    return HttpResponse.json(
      { status: 'error', message: 'Internal Server Error' },
      { status: 500 }
    )
  }),
]

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
        { status: 'error', error: { code: 1002, message: 'User already exists' } },
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
    
    // 🟢 TDD Green Phase: テスト用認証成功条件を明確化
    const isValidCredentials = (
      email === 'test@example.com' && password === 'ValidPassword123!' ||
      email === 'user@example.com' && password === 'ValidPassword123!'
    );
    
    // 認証失敗のシミュレーション（上記以外はすべて失敗）
    if (!isValidCredentials) {
      return HttpResponse.json(
        { status: 'error', error: { code: 1001, message: 'Invalid credentials' } },
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

  // ディレクトリ管理API
  http.post(`${API_BASE_URL}/api/directory/associate`, async ({ request, cookies }) => {
    const { directoryPath } = await request.json() as { 
      directoryPath: string; 
    }
    
    // 認証チェック
    if (!cookies.token) {
      return HttpResponse.json(
        { status: 'error', code: 1004, message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // ディレクトリパス検証
    if (!directoryPath || directoryPath.trim() === '') {
      return HttpResponse.json(
        { status: 'error', code: 2001, message: 'Invalid directory path' },
        { status: 400 }
      )
    }
    
    // 成功レスポンス
    return HttpResponse.json({
      message: 'Directory association saved successfully',
      directoryPath: directoryPath,
      lastAccessTime: '2024-01-01T00:00:00Z'
    })
  }),

  http.get(`${API_BASE_URL}/api/directory/current`, ({ cookies }) => {
    // 認証チェック
    if (!cookies.token) {
      return HttpResponse.json(
        { status: 'error', code: 1004, message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // 成功レスポンス（ディレクトリが関連付けられている場合）
    return HttpResponse.json({
      directoryPath: '/test/path',
      lastAccessTime: '2024-01-01T00:00:00Z'
    })
  }),

  http.delete(`${API_BASE_URL}/api/directory/remove`, ({ cookies }) => {
    // 認証チェック
    if (!cookies.token) {
      return HttpResponse.json(
        { status: 'error', code: 1004, message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // 成功レスポンス
    return HttpResponse.json({
      message: 'Directory association removed successfully'
    })
  }),

  // デベロッパーモード KV 管理API
  http.get(`${API_BASE_URL}/api/dev/kv/list`, ({ cookies }) => {
    if (!cookies.token) {
      return HttpResponse.json(
        { status: 'error', message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return HttpResponse.json({
      keys: [
        { name: 'user:test-uuid-123', metadata: { type: 'user' } },
        { name: 'directory:test-uuid-123', metadata: { type: 'directory' } }
      ]
    })
  }),

  http.delete(`${API_BASE_URL}/api/dev/kv/clear`, ({ cookies }) => {
    if (!cookies.token) {
      return HttpResponse.json(
        { status: 'error', message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return HttpResponse.json({
      message: 'All KV data cleared',
      deletedCount: 2
    })
  }),

  // パスワードリセット要求
  http.post(`${API_BASE_URL}/api/auth/password-reset/request`, async ({ request }) => {
    const { email } = await request.json() as { email: string }
    
    // メールアドレスバリデーション（基本的なチェック）
    if (!email || !email.includes('@')) {
      return HttpResponse.json({
        status: 'error',
        error: { code: 'VALIDATION_FAILED', message: 'Invalid email format' }
      }, { status: 400 });
    }
    
    // 存在しないユーザーの場合でも200を返す（セキュリティ配慮）
    return HttpResponse.json({
      message: 'Password reset instructions sent if account exists'
    })
  }),

  // パスワードリセット実行
  http.post(`${API_BASE_URL}/api/auth/password-reset/confirm`, async ({ request }) => {
    const { token, newPassword } = await request.json() as { 
      token: string; 
      newPassword: string; 
    }
    
    // 無効なトークンのシミュレーション
    if (token === 'invalid-token') {
      return HttpResponse.json(
        { status: 'error', code: 1005, message: 'Invalid or expired token' },
        { status: 400 }
      )
    }
    
    // パスワードバリデーション
    if (newPassword.length < 12) {
      return HttpResponse.json(
        { status: 'error', code: 1003, message: 'Password must be at least 12 characters' },
        { status: 400 }
      )
    }
    
    // 成功レスポンス
    return HttpResponse.json({
      message: 'Password reset successfully'
    })
  }),

  // リフレッシュトークン
  http.post(`${API_BASE_URL}/api/auth/refresh`, ({ cookies }) => {
    if (!cookies.refreshToken) {
      return HttpResponse.json(
        { status: 'error', code: 1006, message: 'Refresh token required' },
        { status: 401 }
      )
    }
    
    // 新しいアクセストークンを発行
    return HttpResponse.json({
      message: 'Token refreshed successfully',
      uuid: 'test-uuid-123',
      email: 'test@example.com'
    })
  }),

  // アカウント削除
  http.delete(`${API_BASE_URL}/api/auth/delete`, ({ cookies }) => {
    if (!cookies.token) {
      return HttpResponse.json(
        { status: 'error', code: 1004, message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return HttpResponse.json({
      message: 'Account deleted successfully'
    })
  }),

  // パスワードリセット要求（正しいエンドポイント）
  http.post(`${API_BASE_URL}/api/auth/request-reset`, async ({ request }) => {
    const { email } = await request.json() as { email: string }
    
    // メールアドレスバリデーション（基本的なチェック）
    if (!email || !email.includes('@')) {
      return HttpResponse.json({
        status: 'error',
        error: { code: 'VALIDATION_FAILED', message: 'Invalid email format' }
      }, { status: 400 });
    }
    
    return HttpResponse.json({
      message: 'Password reset instructions sent if account exists'
    })
  }),

  // パスワードリセット実行（正しいエンドポイント）
  http.post(`${API_BASE_URL}/api/auth/reset-password`, async ({ request }) => {
    const { token, newPassword } = await request.json() as { 
      token: string; 
      newPassword: string; 
    }
    
    if (token === 'invalid-reset-token') {
      return HttpResponse.json(
        { status: 'error', code: 1005, message: 'Invalid or expired token' },
        { status: 400 }
      )
    }
    
    if (newPassword.length < 12) {
      return HttpResponse.json(
        { status: 'error', code: 1003, message: 'Password must be at least 12 characters' },
        { status: 400 }
      )
    }
    
    return HttpResponse.json({
      message: 'Password reset successfully'
    })
  }),

  // ディレクトリ関連付け更新
  http.put(`${API_BASE_URL}/api/directory/associate`, async ({ request, cookies }) => {
    const { directoryPath, lastAccessTime } = await request.json() as { 
      directoryPath: string; 
      lastAccessTime: string; 
    }
    
    if (!cookies.token) {
      return HttpResponse.json(
        { status: 'error', code: 1004, message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return HttpResponse.json({
      message: 'Directory association updated successfully',
      directoryPath,
      lastAccessTime
    })
  }),

  // データ移行要求
  http.post(`${API_BASE_URL}/api/directory/migrate-request`, async ({ request, cookies }) => {
    const { deviceId, encryptedData } = await request.json() as { 
      deviceId: string; 
      encryptedData: string; 
    }
    
    if (!cookies.token) {
      return HttpResponse.json(
        { status: 'error', code: 1004, message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // データバリデーション
    if (!deviceId || !encryptedData) {
      return HttpResponse.json(
        { status: 'error', code: 'VALIDATION_FAILED', message: 'Device ID and encrypted data are required' },
        { status: 400 }
      )
    }
    
    return HttpResponse.json({
      message: 'Migration request created',
      migrationToken: 'migration-token-123'
    })
  }),

  // データ移行取得
  http.get(`${API_BASE_URL}/api/directory/migrate-retrieve`, ({ request }) => {
    const urlObj = new URL(request.url);
    const token = urlObj.searchParams.get('token');
    
    if (token !== 'migration-token-123') {
      return HttpResponse.json(
        { status: 'error', code: 1007, message: 'Invalid migration token' },
        { status: 400 }
      )
    }
    
    return HttpResponse.json({
      deviceId: 'device-123',
      encryptedData: 'base64-encrypted-data',
      timestamp: '2025-01-01T12:00:00Z'
    })
  }),

  // CORSプリフライト
  http.options(`${API_BASE_URL}/api/auth/login`, () => {
    return new HttpResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true'
      }
    })
  }),

  http.options(`${API_BASE_URL}/api/auth/register`, () => {
    return new HttpResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true'
      }
    })
  }),
]