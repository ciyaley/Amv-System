import { test, expect } from '@playwright/test'

test.describe('認証エラーハンドリング', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // ワークスペースに移動
    await page.click('text=ログイン・登録')
  })

  test('should display network error message when server is unreachable', async ({ page }) => {
    // ネットワークリクエストを失敗させる
    await page.route('**/api/auth/login', route => {
      route.abort('failed')
    })

    // 設定を開く
    await page.click('[aria-label="設定を開く"]')
    
    // アカウントタブに移動
    await page.click('text=アカウント')
    
    // ログインフォームに入力
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'ValidPassword123!')
    await page.click('button:has-text("ログイン")')
    
    // エラーメッセージが表示されることを確認
    await expect(page.locator('.text-red-500')).toBeVisible()
  })

  test('should display server error message for 500 responses', async ({ page }) => {
    // 500エラーをシミュレート
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'error', message: 'Internal Server Error' })
      })
    })

    // 設定を開く
    await page.click('[aria-label="設定を開く"]')
    
    // アカウントタブに移動
    await page.click('text=アカウント')
    
    // ログインフォームに入力
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'ValidPassword123!')
    await page.click('button:has-text("ログイン")')
    
    // エラーメッセージが表示されることを確認
    await expect(page.locator('.text-red-500')).toBeVisible()
  })

  test('should handle timeout gracefully', async ({ page }) => {
    // タイムアウトをシミュレート（10秒遅延）
    await page.route('**/api/auth/login', async route => {
      await new Promise(resolve => setTimeout(resolve, 10000))
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Should not reach' })
      })
    })

    // 設定を開く
    await page.click('[aria-label="設定を開く"]')
    
    // アカウントタブに移動
    await page.click('text=アカウント')
    
    // ログインフォームに入力
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'ValidPassword123!')
    await page.click('button:has-text("ログイン")')
    
    // ローディング状態が表示されることを確認
    await expect(page.locator('text=処理中...')).toBeVisible()
    await expect(page.locator('button:has-text("処理中...")').first()).toBeDisabled()
  })

  test('should handle invalid JSON response', async ({ page }) => {
    // 無効なJSONレスポンスをシミュレート
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'Invalid JSON response'
      })
    })

    // 設定を開く
    await page.click('[aria-label="設定を開く"]')
    
    // アカウントタブに移動
    await page.click('text=アカウント')
    
    // ログインフォームに入力
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'ValidPassword123!')
    await page.click('button:has-text("ログイン")')
    
    // JSON解析エラーが適切にハンドリングされることを確認
    await expect(page.locator('.text-red-500')).toBeVisible()
  })

  test('should handle registration network errors', async ({ page }) => {
    // ネットワークエラーをシミュレート
    await page.route('**/api/auth/register', route => {
      route.abort('failed')
    })

    // 設定を開く
    await page.click('[aria-label="設定を開く"]')
    
    // アカウントタブに移動
    await page.click('text=アカウント')
    
    // 登録フォームに切り替え
    await page.click('text=アカウントを作成')
    
    // 登録フォームに入力
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'ValidPassword123!')
    await page.fill('input[id="confirmPassword"]', 'ValidPassword123!')
    await page.click('button:has-text("登録")')
    
    // エラーメッセージが表示されることを確認
    await expect(page.locator('.text-red-500')).toBeVisible()
  })

  test('should recover from network errors when connection is restored', async ({ page }) => {
    let requestCount = 0
    
    // 最初はネットワークエラー、2回目は成功
    await page.route('**/api/auth/login', route => {
      requestCount++
      if (requestCount === 1) {
        route.abort('failed')
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Logged in successfully',
            uuid: 'test-uuid-123',
            email: 'test@example.com'
          })
        })
      }
    })

    // 設定を開く
    await page.click('[aria-label="設定を開く"]')
    
    // アカウントタブに移動
    await page.click('text=アカウント')
    
    // 最初のログイン試行（失敗）
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'ValidPassword123!')
    await page.click('button:has-text("ログイン")')
    
    // エラーメッセージが表示される
    await expect(page.locator('.text-red-500')).toBeVisible()
    
    // 2回目のログイン試行（成功）
    await page.click('button:has-text("ログイン")')
    
    // 成功トーストが表示されることを確認
    await expect(page.locator('text=ログイン成功')).toBeVisible()
  })
})