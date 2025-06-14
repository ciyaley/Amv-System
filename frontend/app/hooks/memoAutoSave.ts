/**
 * Memo Auto-Save System
 * Extensible Toolbar Architecture
 */

import { saveIndividualMemo } from "../../utils/fileSystem";
import { useEncryptionStore } from "./useEncryptionStore";
import type { MemoData } from "../types/tools";

// Auto-save configuration
const BATCH_SAVE_DELAY = 500; // デバウンス遅延
const MAX_CONCURRENT_SAVES = 3; // 同時保存数制限

// Auto-save state management
const saveTimers = new Map<string, NodeJS.Timeout>();
let activeSaveCount = 0;

/**
 * Stop all auto-save timers
 */
export const stopAutoSave = () => {
  saveTimers.forEach((timer) => {
    clearTimeout(timer);
  });
  saveTimers.clear();
};

/**
 * Clear all auto-save timers (for cleanup)
 */
export const clearAutoSaveTimers = () => {
  saveTimers.forEach(timer => clearTimeout(timer));
  saveTimers.clear();
  activeSaveCount = 0;
};

/**
 * Persist memo with auto-save logic
 */
export const persistMemo = async (memo: MemoData) => {
  // 自動保存はログイン時のみ
  const { password } = useEncryptionStore.getState();
  if (!password) return;

  // 既存のタイマーをクリア（デバウンス）
  const existingTimer = saveTimers.get(memo.id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // 制御された遅延保存実行（デバウンス + 並行制御）
  const timer = setTimeout(async () => {
    if (activeSaveCount >= MAX_CONCURRENT_SAVES) {
      // 🔧 修正: 最大再試行回数制限で無限ループを防止
      const retryCount = (memo as any).__retryCount || 0;
      if (retryCount < 3) {
        const retryMemo = { ...memo } as any;
        retryMemo.__retryCount = retryCount + 1;
        saveTimers.set(memo.id, setTimeout(() => {
          persistMemo(retryMemo);
        }, BATCH_SAVE_DELAY));
      }
      return;
    }
    
    activeSaveCount++;
    try {
      await saveIndividualMemo(memo);
      if (process.env.NODE_ENV === 'development') {
      }
    } catch {
    } finally {
      activeSaveCount--;
      saveTimers.delete(memo.id);
    }
  }, BATCH_SAVE_DELAY);

  saveTimers.set(memo.id, timer);
};

/**
 * Get auto-save statistics (for debugging)
 */
export const getAutoSaveStats = () => ({
  activeTimers: saveTimers.size,
  activeSaveCount,
  maxConcurrentSaves: MAX_CONCURRENT_SAVES,
  batchSaveDelay: BATCH_SAVE_DELAY
});