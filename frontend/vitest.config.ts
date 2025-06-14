import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      },
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/mockServiceWorker.js'
      ]
    },
    globals: true,
    css: true,
    // タイムアウト設定最適化
    testTimeout: 30000,        // タイムアウト延長
    hookTimeout: 5000,         // フックタイムアウト設定
    teardownTimeout: 3000,     // 後処理タイムアウト
    // 並列実行制御でメモリリーク・競合状態防止
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,      // 単一フォーク実行
        isolate: true,         // テスト間の完全分離
        execArgv: ['--max-old-space-size=4096']  // メモリ制限増加
      }
    },
    // メモリ使用量制御
    maxConcurrency: 1,         // 最大並列数制限
    maxWorkers: 1,             // ワーカー数制限
    minWorkers: 1,
    // ログレベル調整
    logHeapUsage: true,        // メモリ使用量ログ出力
    // retry設定
    retry: 2                   // 失敗時に2回リトライ
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app'),
      '@/components': path.resolve(__dirname, './app/components'),
      '@/hooks': path.resolve(__dirname, './app/hooks'),
      '@/utils': path.resolve(__dirname, './utils'),
      '@/stores': path.resolve(__dirname, './app/stores')
    }
  }
})