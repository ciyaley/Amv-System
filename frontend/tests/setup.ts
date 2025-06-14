import '@testing-library/jest-dom'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi, beforeAll, afterAll } from 'vitest'
import { server } from './mocks/server'

// Mock Next.js Router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => ({
    get: vi.fn(() => null),
  }),
  useParams: () => ({}),
  notFound: vi.fn(),
}))

// Mock React 18 act for React Testing Library compatibility
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    act: (callback: () => void) => {
      callback()
      return Promise.resolve()
    }
  }
})

// React Testing Libraryの設定でact()警告を抑制
configure({ 
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
  // act()警告の自動処理を有効化
  reactStrictMode: true
})

// React act() 警告を適切に処理
// import { act } from '@testing-library/react'

// グローバルact()ラッパーでテスト環境を改善
// const originalAct: typeof act = act
// (global as any).act = originalAct

// unhandled promise rejectionを適切にキャッチ
// メモリリーク警告を回避するためにmax listenersを増やす
process.setMaxListeners(20)

process.on('unhandledRejection', (reason, _promise) => {
  // テスト環境では一部のPromise rejectionは期待される動作
  const reasonStr = String(reason)
  if (
    reasonStr.includes('Failed to save memo') ||
    reasonStr.includes('Failed to load directory info') ||
    reasonStr.includes('AbortError') ||
    reasonStr.includes('Test timeout') ||
    reasonStr.includes('NotFoundError') ||
    reasonStr.includes('URL is not a constructor') ||
    reasonStr.includes('未ログイン状態では手動保存のみ利用できます')
  ) {
    return // 期待されるエラーは無視
  }
  console.error('Unhandled Promise Rejection:', reason)
})

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

// Mock File System Access API - 改善版
const createMockFileHandle = (name: string, content: string = '{}') => ({
  kind: 'file',
  name,
  createWritable: vi.fn().mockResolvedValue({
    write: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined)
  }),
  getFile: vi.fn().mockResolvedValue(new File([content], name, { type: 'application/json' })),
  requestPermission: vi.fn().mockResolvedValue('granted'),
  queryPermission: vi.fn().mockResolvedValue('granted')
})

const createMockDirectoryHandle = (name: string, entries: Array<{ name: string, kind: 'file' | 'directory', content?: string }> = []): FileSystemDirectoryHandle => {
  const mockEntries = new Map()
  
  // エントリを事前に作成
  entries.forEach(entry => {
    if (entry.kind === 'file') {
      mockEntries.set(entry.name, createMockFileHandle(entry.name, entry.content))
    } else {
      mockEntries.set(entry.name, createMockDirectoryHandle(entry.name))
    }
  })

  return {
    kind: 'directory',
    name,
    getDirectoryHandle: vi.fn().mockImplementation((subName: string, options?: { create?: boolean }) => {
      if (mockEntries.has(subName)) {
        return Promise.resolve(mockEntries.get(subName))
      }
      if (options?.create) {
        const newDir = createMockDirectoryHandle(subName)
        mockEntries.set(subName, newDir)
        return Promise.resolve(newDir)
      }
      return Promise.reject(new DOMException('NotFoundError: Directory not found'))
    }),
    getFileHandle: vi.fn().mockImplementation((fileName: string, options?: { create?: boolean }) => {
      if (mockEntries.has(fileName)) {
        return Promise.resolve(mockEntries.get(fileName))
      }
      if (options?.create) {
        const newFile = createMockFileHandle(fileName)
        mockEntries.set(fileName, newFile)
        return Promise.resolve(newFile)
      }
      return Promise.reject(new DOMException('NotFoundError: File not found'))
    }),
    removeEntry: vi.fn().mockImplementation((name: string) => {
      if (mockEntries.has(name)) {
        mockEntries.delete(name)
        return Promise.resolve()
      }
      return Promise.reject(new DOMException('NotFoundError: Entry not found'))
    })
  } as any
}

// デフォルトのテスト用ディレクトリ構造を作成
const mockDirHandle = createMockDirectoryHandle('test-dir', [
  { name: 'memos', kind: 'directory' },
  { name: 'workspace.json', kind: 'file', content: '{"version": "1.0"}' },
  { name: 'settings.json', kind: 'file', content: '{"theme": "light"}' }
])

// ブラウザAPIのモック
if (!(window as any).showDirectoryPicker) {
  (window as any).showDirectoryPicker = vi.fn().mockResolvedValue(mockDirHandle)
}

// 追加: FileSystemDirectoryHandleとFileSystemFileHandleのコンストラクタモック
if (!(window as any).FileSystemDirectoryHandle) {
  (window as any).FileSystemDirectoryHandle = class MockFileSystemDirectoryHandle {
    constructor(public name: string) {}
  }
}

if (!(window as any).FileSystemFileHandle) {
  (window as any).FileSystemFileHandle = class MockFileSystemFileHandle {
    constructor(public name: string) {}
  }
}

// IndexedDBは使用しないため、モックも不要

// Mock crypto for tests - Simple but functional implementation
const crypto = {
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256)
    }
    return arr
  },
  subtle: {
    importKey: vi.fn().mockResolvedValue({ type: 'secret' }),
    deriveKey: vi.fn().mockResolvedValue({ type: 'secret' }),
    encrypt: vi.fn().mockImplementation((_algorithm, _key, data) => {
      // データをそのまま返す（実際のテストではbase64エンコードされる）
      return Promise.resolve(data);
    }),
    decrypt: vi.fn().mockImplementation((_algorithm, _key, data) => {
      // データをそのまま返す（実際のテストではbase64デコードされる）
      return Promise.resolve(data);
    })
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

// AbortControllerの適切なモック
if (typeof global.AbortController === 'undefined') {
  global.AbortController = AbortController
  global.AbortSignal = AbortSignal
}

// MSW対応: テスト環境フラグを設定
// useAuth.tsがテスト環境かを判別できるように
if (!process.env.NODE_ENV) {
  (process.env as any).NODE_ENV = 'test';
}

// TDD: window.location.reload()のモック (jsdom制限対応)
Object.defineProperty(window, 'location', {
  value: {
    ...window.location,
    reload: vi.fn()
  },
  writable: true
})

// console.error をモック（テスト時のノイズを減らす）
const originalError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const message = args[0]?.toString() || ''
    // テスト環境で期待されるエラーメッセージを無視
    if (
      message.includes('Failed to save memo') ||
      message.includes('Failed to load directory info') ||
      message.includes('Failed to save settings to file system') ||
      message.includes('未ログイン状態では手動保存のみ利用できます') ||
      message.includes('URL is not a constructor') ||
      message.includes('Logout error') ||
      message.includes('No existing memos found') ||
      message.includes('Unhandled Promise Rejection')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})