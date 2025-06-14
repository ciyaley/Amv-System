/**
 * テストユーティリティ関数
 * テストの安定性と可読性を向上させるためのヘルパー関数集
 */

import { act } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * 非同期状態更新を安全にラップする関数
 * React Testing Libraryのact警告を防ぐ
 */
export const safeAct = async (callback: () => Promise<void> | void): Promise<void> => {
  await act(async () => {
    if (typeof callback === 'function') {
      const result = callback();
      if (result instanceof Promise) {
        await result;
      }
    }
  });
};

/**
 * 指定時間待機する関数（テスト用）
 */
export const waitFor = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * テスト用の高速タイマー（実際の時間を消費しない）
 */
export const fastForward = async (ms: number): Promise<void> => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await new Promise(resolve => setTimeout(resolve, 0));
  });
};

/**
 * Zustandストアのリセット用ヘルパー
 */
export const resetStores = (...stores: Array<{ getState: () => unknown; setState: (state: unknown) => void; getInitialState?: () => unknown }>): void => {
  stores.forEach(store => {
    if (store && typeof store.getState === 'function' && typeof store.setState === 'function') {
      const initialState = store.getInitialState?.() || {};
      store.setState(initialState);
    }
  });
};

/**
 * Mock関数のクリア
 */
export const clearMocks = (...mocks: Array<{ mockClear: () => void }>): void => {
  mocks.forEach(mock => {
    if (mock && typeof mock.mockClear === 'function') {
      mock.mockClear();
    }
  });
};

/**
 * メモリリークを防ぐためのクリーンアップ
 */
export const cleanupMemory = (): Promise<void> => {
  // タイマーをクリア
  vi.clearAllTimers();
  
  // Promises をクリア
  return new Promise(resolve => {
    setTimeout(() => {
      if (typeof global.gc === 'function') {
        global.gc();
      }
      resolve(undefined);
    }, 0);
  });
};

/**
 * 安全なファイルハンドルモック作成
 */
export const createSafeFileHandle = (name: string, content: string = '{}'): FileSystemFileHandle => ({
  kind: 'file',
  name,
  createWritable: vi.fn().mockResolvedValue({
    write: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    abort: vi.fn().mockResolvedValue(undefined)
  }),
  getFile: vi.fn().mockResolvedValue(new File([content], name, { type: 'application/json' }))
} as any);

/**
 * 安全なディレクトリハンドルモック作成
 */
export const createSafeDirectoryHandle = (name: string, entries: Array<{ name: string; kind: 'file' | 'directory' }> = []): FileSystemDirectoryHandle => {
  const mockEntries = new Map(entries.map(entry => [entry.name, entry]));
  
  return {
    kind: 'directory',
    name,
    getDirectoryHandle: vi.fn().mockImplementation(async (subName: string, options?: { create?: boolean }) => {
      if (mockEntries.has(subName)) {
        return mockEntries.get(subName);
      }
      if (options?.create) {
        const newDir = createSafeDirectoryHandle(subName);
        mockEntries.set(subName, newDir);
        return newDir;
      }
      throw new DOMException('NotFoundError: Directory not found');
    }),
    getFileHandle: vi.fn().mockImplementation(async (fileName: string, options?: { create?: boolean }) => {
      if (mockEntries.has(fileName)) {
        return mockEntries.get(fileName);
      }
      if (options?.create) {
        const newFile = createSafeFileHandle(fileName);
        mockEntries.set(fileName, newFile);
        return newFile;
      }
      throw new DOMException('NotFoundError: File not found');
    }),
    removeEntry: vi.fn().mockImplementation(async (name: string) => {
      if (mockEntries.has(name)) {
        mockEntries.delete(name);
        return;
      }
      throw new DOMException('NotFoundError: Entry not found');
    })
  } as any;
};

/**
 * テスト実行時間を測定
 */
export const measureTime = async (testFunction: () => Promise<void> | void): Promise<number> => {
  const start = performance.now();
  
  if (typeof testFunction === 'function') {
    const result = testFunction();
    if (result instanceof Promise) {
      await result;
    }
  }
  
  return performance.now() - start;
};

/**
 * 条件が満たされるまで待機（最大タイムアウトあり）
 */
export const waitForCondition = async (
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (condition()) {
      return;
    }
    await waitFor(interval);
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
};