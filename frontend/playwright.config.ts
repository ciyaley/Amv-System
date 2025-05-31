import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  timeout: 60000, // 60秒のタイムアウト
  expect: {
    timeout: 30000, // expectアサーションのタイムアウト
  },
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    headless: true, // ヘッドレスモードを強制
    video: 'off', // パフォーマンス向上のためビデオ記録オフ
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev -- --port 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 180000, // 3分のタイムアウト
    stdout: 'ignore',
    stderr: 'pipe',
    ignoreHTTPSErrors: true,
  },
})