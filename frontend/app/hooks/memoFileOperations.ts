/**
 * Memo File Operations - Disk I/O operations
 * Extensible Toolbar Architecture
 */

import { saveIndividualMemo, deleteMemoFile } from "../../utils/fileAccess";
import { useEncryptionStore } from "./useEncryptionStore";
import type { MemoData } from "../types/tools";

/**
 * Load memos from disk with cross-session access
 */
export const loadMemosFromDisk = async (): Promise<MemoData[]> => {
  try {
    // ログイン状態チェック - 未ログイン時は読み込まない
    const { password } = useEncryptionStore.getState();
    if (!password) {
      return [];
    }
    
    if (process.env.NODE_ENV === 'development') {
    }
    
    // ファイルシステムからメモを読み込む
    const { loadAllMemos } = await import("../../utils/fileAccess");
    const memos = await loadAllMemos();
    
    if (process.env.NODE_ENV === 'development') {
      // Debug information about loaded memos
    }
    
    // メモの位置を修正（左上に固まるのを防ぐ）
    const validatedMemos = memos.map((memo, index) => ({
      ...memo,
      x: typeof memo.x === 'number' && memo.x >= 0 ? memo.x : 100 + (index % 5) * 50,
      y: typeof memo.y === 'number' && memo.y >= 0 ? memo.y : 100 + Math.floor(index / 5) * 50,
      visible: memo.visible !== false // デフォルトはtrue
    }));
    
    if (process.env.NODE_ENV === 'development') {
    }
    
    return validatedMemos;
  } catch {
    return [];
  }
};

/**
 * Merge loaded memos with existing memos
 */
export const mergeMemosWithExisting = (
  currentMemos: MemoData[], 
  loadedMemos: MemoData[]
): MemoData[] => {
  // 重複防止: より厳密なチェックとマージ処理
  if (currentMemos.length > 0) {
    const currentIds = new Set(currentMemos.map(m => m.id));
    const newMemos = loadedMemos.filter(m => !currentIds.has(m.id));
    
    if (newMemos.length === 0) {
      if (process.env.NODE_ENV === 'development') {
      }
      return currentMemos;
    }
    
    // 既存メモと新しいメモをマージ
    const mergedMemos = [...currentMemos, ...newMemos];
    
    if (process.env.NODE_ENV === 'development') {
    }
    
    return mergedMemos;
  }
  
  return loadedMemos;
};

/**
 * Save all memos to disk
 */
export const saveAllMemos = async (memos: MemoData[]): Promise<void> => {
  for (const memo of memos) {
    try {
      await saveIndividualMemo(memo);
    } catch {
    }
  }
};

/**
 * Save individual memo manually
 */
export const saveMemoManually = async (memo: MemoData): Promise<void> => {
  try {
    await saveIndividualMemo(memo);
  } catch (error) {
    throw error;
  }
};

/**
 * Delete memo from disk
 */
export const deleteMemoFromDisk = async (id: string): Promise<void> => {
  try {
    await deleteMemoFile(id);
  } catch (error) {
    throw error;
  }
};