//useMemos.ts - Extensible Toolbar Architecture
"use client";

import { create } from "zustand";
import { saveIndividualMemo } from "../../utils/fileAccess";
import { 
  persistMemo, 
  stopAutoSave, 
  clearAutoSaveTimers 
} from "./memoAutoSave";
import { useEncryptionStore } from "./useEncryptionStore";
import type { MemoData } from "../types/tools";
import { 
  loadMemosFromDisk, 
  mergeMemosWithExisting, 
  saveAllMemos, 
  saveMemoManually, 
  deleteMemoFromDisk 
} from "./memoFileOperations";
import { 
  createNewMemo, 
  updateMemoData, 
  normalize, 
  zIndexOperations,
  type MemoPosition 
} from "./memoOperations";

interface MemoState {
  memos: MemoData[];
  setMemos: (list: MemoData[]) => void;
  createMemo: (position?: MemoPosition) => void;
  updateMemo: (id: string, data: Partial<MemoData>) => void;
  updateMemoPosition: (id: string, x: number, y: number) => void;
  updateMemoSize: (id: string, w: number, h: number) => void;
  deleteMemo: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;
  loadMemosFromDisk: () => Promise<void>;
  saveAllMemos: () => Promise<void>;
  saveMemoManually: (id: string) => Promise<void>;
  clearAllMemos: () => void;
  toggleMemoVisibility: (id: string) => void;
  focusMemoOnCanvas: (id: string) => void;
  getVisibleMemos: () => MemoData[];
  getHiddenMemos: () => MemoData[];
  getMemoById: (id: string) => MemoData | undefined;
  saveMemo: (memo: MemoData) => Promise<void>;
  stopAutoSave: () => void;
}

export const useMemos = create<MemoState>((set, get) => {


  return {
    memos: [],
    
    setMemos: (list) => set({ memos: list }),

    createMemo: (position) => {
      if (process.env.NODE_ENV === 'development') {
      }
      
      const { password } = useEncryptionStore.getState();
      const isAuthenticated = !!password;
      const existingMemosCount = get().memos.length;
      
      const newMemo = createNewMemo(position, isAuthenticated, existingMemosCount);
      
      if (process.env.NODE_ENV === 'development') {
      }

      set((s) => ({
        memos: [...s.memos, newMemo]
      }));

      persistMemo(newMemo);
    },

    updateMemo: (id, data) => {
      const memo = get().memos.find(m => m.id === id);
      if (!memo) return;

      const updatedMemo = updateMemoData(memo, data);

      set((s) => ({
        memos: s.memos.map((m) => (m.id === id ? updatedMemo : m)),
      }));

      persistMemo(updatedMemo);
    },

    updateMemoPosition: (id, x, y) => {
      get().updateMemo(id, { x, y });
    },

    updateMemoSize: (id, w, h) => {
      get().updateMemo(id, { w, h });
    },

    deleteMemo: async (id) => {
      set((s) => ({ memos: s.memos.filter(m => m.id !== id) }));
      try {
        await deleteMemoFromDisk(id);
      } catch {
      }
    },

    bringToFront: (id) => {
      set((s) => ({ memos: zIndexOperations.bringToFront(s.memos, id) }));
      const memo = get().memos.find(m => m.id === id);
      if (memo) persistMemo(memo);
    },

    sendToBack: (id) => {
      set((s) => ({ memos: zIndexOperations.sendToBack(s.memos, id) }));
      const memo = get().memos.find(m => m.id === id);
      if (memo) persistMemo(memo);
    },

    moveUp: (id) => {
      set((s) => ({ memos: zIndexOperations.moveUp(s.memos, id) }));
      const memo = get().memos.find(m => m.id === id);
      if (memo) persistMemo(memo);
    },

    moveDown: (id) => {
      set((s) => ({ memos: zIndexOperations.moveDown(s.memos, id) }));
      const memo = get().memos.find(m => m.id === id);
      if (memo) persistMemo(memo);
    },

    loadMemosFromDisk: async () => {
      try {
        const currentMemos = get().memos;
        const loadedMemos = await loadMemosFromDisk();
        if (loadedMemos.length === 0) return;
        
        const mergedMemos = mergeMemosWithExisting(currentMemos, loadedMemos);
        set({ memos: mergedMemos });
      } catch {
      }
    },

    saveAllMemos: async () => {
      const memos = get().memos;
      await saveAllMemos(memos);
    },

    saveMemoManually: async (id: string) => {
      const memo = get().memos.find(m => m.id === id);
      if (!memo) return;
      await saveMemoManually(memo);
    },

    clearAllMemos: () => {
      clearAutoSaveTimers();
      set({ memos: [] });
      
      if (process.env.NODE_ENV === 'development') {
        if (typeof performance !== 'undefined' && 'memory' in performance) {
        }
      }
    },

    toggleMemoVisibility: (id: string) => {
      const memo = get().memos.find(m => m.id === id);
      if (!memo) return;

      const updatedMemo = {
        ...memo,
        visible: !memo.visible,
        updated: new Date().toISOString()
      };

      set((s) => ({
        memos: s.memos.map((m) => (m.id === id ? updatedMemo : m)),
      }));

      persistMemo(updatedMemo);
    },

    focusMemoOnCanvas: (id: string) => {
      const memo = get().memos.find(m => m.id === id);
      if (!memo) return;

      // メモを表示状態にして最前面に移動
      const updatedMemo = {
        ...memo,
        visible: true,
        zIndex: Math.max(...get().memos.map((m) => m.zIndex)) + 1,
        updated: new Date().toISOString()
      };

      set((s) => ({
        memos: normalize(
          s.memos.map((m) => (m.id === id ? updatedMemo : m))
        ),
      }));

      persistMemo(updatedMemo);
    },

    getVisibleMemos: () => {
      return get().memos.filter(memo => memo.visible !== false);
    },

    getHiddenMemos: () => {
      return get().memos.filter(memo => memo.visible === false);
    },
    
    getMemoById: (id: string) => {
      return get().memos.find(m => m.id === id);
    },
    
    saveMemo: async (memo: MemoData) => {
      try {
        await saveIndividualMemo(memo);
      } catch (error) {
        throw error;
      }
    },

    stopAutoSave
  };
});