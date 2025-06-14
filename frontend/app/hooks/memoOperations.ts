/**
 * Memo Operations - Core CRUD operations
 * Extensible Toolbar Architecture
 */

import { nanoid } from "nanoid";
import type { MemoData } from "../types/tools";

export interface MemoPosition {
  x: number;
  y: number;
}

/**
 * Z-Index normalization utility
 */
export const normalize = (list: MemoData[]) =>
  list
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((m, i) => ({ ...m, zIndex: i + 1 }));

/**
 * Generate memo title from text content
 */
export const generateTitle = (text: string): string => {
  const firstLine = text.split('\n')[0]?.trim() || '';
  return firstLine.slice(0, 20) || '新しいメモ';
};

/**
 * Create new memo with defaults
 */
export const createNewMemo = (
  position?: MemoPosition,
  isAuthenticated = false,
  existingMemosCount = 0
): MemoData => {
  const now = new Date().toISOString();
  
  return {
    id: `memo_${nanoid()}`,
    type: 'memo',
    title: '新しいメモ',
    text: '',
    content: '',
    x: position?.x ?? Math.random() * 500,
    y: position?.y ?? Math.random() * 300,
    w: 240,
    h: 160,
    zIndex: existingMemosCount + 1,
    tags: [],
    created: now,
    updated: now,
    visible: true,
    sourceType: isAuthenticated ? 'authenticated' : 'guest',
    isGuestFile: !isAuthenticated,
    appearance: {
      backgroundColor: '#ffeaa7',
      borderColor: '#fdcb6e',
      cornerRadius: 8,
      shadowEnabled: true
    }
  };
};

/**
 * Update memo with text/content synchronization
 */
export const updateMemoData = (
  memo: MemoData, 
  data: Partial<MemoData>
): MemoData => {
  const updatedMemo = {
    ...memo,
    ...data,
    updated: new Date().toISOString()
  };

  // タイトルが空の場合、テキストから自動生成
  if (data.text !== undefined && !data.title) {
    updatedMemo.title = generateTitle(data.text);
  }
  
  // text と content の同期
  if (data.text !== undefined) {
    updatedMemo.content = data.text;
  }
  if (data.content !== undefined) {
    updatedMemo.text = data.content;
  }

  return updatedMemo;
};

/**
 * Z-Index manipulation operations
 */
export const zIndexOperations = {
  bringToFront: (memos: MemoData[], id: string): MemoData[] => {
    return normalize(
      memos.map((m) =>
        m.id === id
          ? { ...m, zIndex: Math.max(...memos.map((m2) => m2.zIndex)) + 1 }
          : m
      )
    );
  },

  sendToBack: (memos: MemoData[], id: string): MemoData[] => {
    return normalize(memos.map((m) => (m.id === id ? { ...m, zIndex: 0 } : m)));
  },

  moveUp: (memos: MemoData[], id: string): MemoData[] => {
    const sorted = normalize(memos);
    const idx = sorted.findIndex((m) => m.id === id);
    if (idx >= 0 && idx < sorted.length - 1 && sorted[idx] && sorted[idx + 1]) {
      [sorted[idx]!.zIndex, sorted[idx + 1]!.zIndex] = [
        sorted[idx + 1]!.zIndex,
        sorted[idx]!.zIndex,
      ];
    }
    return normalize(sorted);
  },

  moveDown: (memos: MemoData[], id: string): MemoData[] => {
    const sorted = normalize(memos);
    const idx = sorted.findIndex((m) => m.id === id);
    if (idx > 0 && sorted[idx] && sorted[idx - 1]) {
      [sorted[idx]!.zIndex, sorted[idx - 1]!.zIndex] = [
        sorted[idx - 1]!.zIndex,
        sorted[idx]!.zIndex,
      ];
    }
    return normalize(sorted);
  }
};