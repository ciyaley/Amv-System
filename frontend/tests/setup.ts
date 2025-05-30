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
const mockDirHandle = {
  kind: 'directory',
  name: 'test-dir',
  getDirectoryHandle: vi.fn().mockResolvedValue({
    kind: 'directory',
    name: 'memos',
    getFileHandle: vi.fn().mockResolvedValue({
      kind: 'file',
      name: 'test.json',
      createWritable: vi.fn().mockResolvedValue({
        write: vi.fn(),
        close: vi.fn()
      }),
      getFile: vi.fn().mockResolvedValue(new File(['{}'], 'test.json'))
    }),
    values: vi.fn().mockReturnValue([])
  }),
  getFileHandle: vi.fn().mockResolvedValue({
    kind: 'file',
    name: 'test.json',
    createWritable: vi.fn().mockResolvedValue({
      write: vi.fn(),
      close: vi.fn()
    }),
    getFile: vi.fn().mockResolvedValue(new File(['{}'], 'test.json'))
  }),
  requestPermission: vi.fn().mockResolvedValue('granted'),
  queryPermission: vi.fn().mockResolvedValue('granted')
}

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
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    importKey: vi.fn(),
    deriveBits: vi.fn(),
    digest: vi.fn(),
  }
}

Object.defineProperty(window, 'crypto', {
  value: crypto,
  writable: true,
})