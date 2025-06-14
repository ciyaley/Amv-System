/**
 * MemoData Test Helper
 * 統一されたMemoData生成でテストファイル間の型不整合を解消
 */

import type { MemoData } from '../../app/types/tools';

export function createMockMemoData(overrides: Partial<MemoData> = {}): MemoData {
  const timestamp = new Date().toISOString();
  
  return {
    id: `mock-memo-${Date.now()}`,
    type: 'memo',
    title: 'Test Memo',
    content: 'Test content',
    text: 'Test content', // Legacy互換性
    x: 100,
    y: 100,
    w: 200,
    h: 150,
    zIndex: 1,
    visible: true,
    created: timestamp,
    updated: timestamp,
    sourceType: 'guest',
    ...overrides
  };
}

export function createAuthenticatedMemoData(overrides: Partial<MemoData> = {}): MemoData {
  return createMockMemoData({
    sourceType: 'authenticated',
    ...overrides
  });
}

export function createGuestMemoData(overrides: Partial<MemoData> = {}): MemoData {
  return createMockMemoData({
    sourceType: 'guest',
    isGuestFile: true,
    ...overrides
  });
}

export function createMemoDataArray(count: number, overrides: Partial<MemoData> = {}): MemoData[] {
  return Array.from({ length: count }, (_, index) => 
    createMockMemoData({
      id: `mock-memo-${index}`,
      title: `Test Memo ${index + 1}`,
      x: 100 + (index * 50),
      y: 100 + (index * 50),
      ...overrides
    })
  );
}