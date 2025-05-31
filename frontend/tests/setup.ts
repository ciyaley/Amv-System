import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi, beforeAll, afterAll } from 'vitest'
import { server } from './mocks/server'

// MSWサーバーのセットアップ
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  cleanup()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock File System Access API
const createMockDirectoryHandle = (name: string): any => ({
  kind: 'directory',
  name,
  getDirectoryHandle: vi.fn().mockImplementation((subName: string) => 
    Promise.resolve(createMockDirectoryHandle(subName))
  ),
  getFileHandle: vi.fn().mockResolvedValue({
    kind: 'file',
    name: 'test.json',
    createWritable: vi.fn().mockResolvedValue({
      write: vi.fn(),
      close: vi.fn()
    }),
    getFile: vi.fn().mockResolvedValue(new File(['{}'], 'test.json'))
  }),
  removeEntry: vi.fn().mockResolvedValue(undefined),
  values: vi.fn().mockReturnValue([]),
  requestPermission: vi.fn().mockResolvedValue('granted'),
  queryPermission: vi.fn().mockResolvedValue('granted')
})

const mockDirHandle = createMockDirectoryHandle('test-dir')

if (!(window as any).showDirectoryPicker) {
  (window as any).showDirectoryPicker = vi.fn().mockResolvedValue(mockDirHandle)
}

// Mock IndexedDB (fake-indexeddb を使用)
import 'fake-indexeddb/auto'

// Mock crypto for tests
const crypto = {
  getRandomValues: (arr: any) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256)
    }
    return arr
  },
  subtle: {
    importKey: vi.fn().mockResolvedValue({}),
    deriveKey: vi.fn().mockResolvedValue({}),
    encrypt: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
    decrypt: vi.fn().mockResolvedValue(new ArrayBuffer(32))
  }
}

Object.defineProperty(window, 'crypto', {
  configurable: true,
  enumerable: true,
  value: crypto
})

// グローバルなTextEncoderとTextDecoderを追加
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// console.error をモック（テスト時のノイズを減らす）
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    // persistMemoのエラーは無視
    if (args[0]?.toString()?.includes('Failed to save memo')) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})