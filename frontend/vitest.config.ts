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
    testTimeout: 30000 // 30秒に延長
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