//useMemos.ts
"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import { saveIndividualMemo, loadAllMemos, deleteMemoFile } from "../../utils/fileAccess";
import { useEncryptionStore } from "./useEncryptionStore";

export interface MemoPosition {
  x: number;
  y: number;
}

export interface MemoDecoration {
  start: number;
  end: number;
  type: 'color' | 'bold' | 'italic' | 'underline';
  value?: string;
}

export interface MemoAppearance {
  backgroundColor?: string;
  borderColor?: string;
  cornerRadius?: number;
  shadowEnabled?: boolean;
}

export interface MemoData {
  id: string;
  type: 'memo';
  title: string;
  importance?: 'high' | 'medium' | 'low';
  category?: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  tags?: string[];
  created: string;
  updated: string;
  decorations?: MemoDecoration[];
  appearance?: MemoAppearance;
  linkedUrls?: string[];
  linkedImages?: string[];
}

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
}

export const useMemos = create<MemoState>((set, get) => {
  const normalize = (list: MemoData[]) =>
    list
      .sort((a, b) => a.zIndex - b.zIndex)
      .map((m, i) => ({ ...m, zIndex: i + 1 }));

  const generateTitle = (text: string): string => {
    // テキストの最初の行または最初の20文字をタイトルとして使用
    const firstLine = text.split('\n')[0].trim();
    return firstLine.slice(0, 20) || '新しいメモ';
  };

  const persistMemo = async (memo: MemoData) => {
    try {
      // 自動保存はログイン時のみ
      const { password } = useEncryptionStore.getState();
      if (password) {
        await saveIndividualMemo(memo);
      }
    } catch (error) {
      console.error("Failed to save memo:", error);
    }
  };


  return {
    memos: [],
    
    setMemos: (list) => set({ memos: list }),

    createMemo: (position) => {
      const now = new Date().toISOString();
      const newMemo: MemoData = {
        id: `memo_${nanoid()}`,
        type: 'memo',
        title: '新しいメモ',
        text: '',
        x: position?.x ?? Math.random() * 500,
        y: position?.y ?? Math.random() * 300,
        w: 240,
        h: 160,
        zIndex: get().memos.length + 1,
        tags: [],
        created: now,
        updated: now,
        appearance: {
          backgroundColor: '#ffeaa7',
          borderColor: '#fdcb6e',
          cornerRadius: 8,
          shadowEnabled: true
        }
      };

      set((s) => ({
        memos: [...s.memos, newMemo]
      }));

      persistMemo(newMemo);
    },

    updateMemo: (id, data) => {
      const memo = get().memos.find(m => m.id === id);
      if (!memo) return;

      const updatedMemo = {
        ...memo,
        ...data,
        updated: new Date().toISOString()
      };

      // タイトルが空の場合、テキストから自動生成
      if (data.text !== undefined && !data.title) {
        updatedMemo.title = generateTitle(data.text);
      }

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
      set((s) => ({
        memos: s.memos.filter(m => m.id !== id)
      }));

      try {
        await deleteMemoFile(id);
      } catch (error) {
        console.error("Failed to delete memo file:", error);
      }
    },

    bringToFront: (id) => {
      set((s) => ({
        memos: normalize(
          s.memos.map((m) =>
            m.id === id
              ? { ...m, zIndex: Math.max(...s.memos.map((m2) => m2.zIndex)) + 1 }
              : m
          )
        ),
      }));
      
      const memo = get().memos.find(m => m.id === id);
      if (memo) persistMemo(memo);
    },

    sendToBack: (id) => {
      set((s) => ({
        memos: normalize(s.memos.map((m) => (m.id === id ? { ...m, zIndex: 0 } : m))),
      }));
      
      const memo = get().memos.find(m => m.id === id);
      if (memo) persistMemo(memo);
    },

    moveUp: (id) => {
      set((s) => {
        const sorted = normalize(s.memos);
        const idx = sorted.findIndex((m) => m.id === id);
        if (idx < sorted.length - 1) {
          [sorted[idx].zIndex, sorted[idx + 1].zIndex] = [
            sorted[idx + 1].zIndex,
            sorted[idx].zIndex,
          ];
        }
        return { memos: normalize(sorted) };
      });
      
      const memo = get().memos.find(m => m.id === id);
      if (memo) persistMemo(memo);
    },

    moveDown: (id) => {
      set((s) => {
        const sorted = normalize(s.memos);
        const idx = sorted.findIndex((m) => m.id === id);
        if (idx > 0) {
          [sorted[idx].zIndex, sorted[idx - 1].zIndex] = [
            sorted[idx - 1].zIndex,
            sorted[idx].zIndex,
          ];
        }
        return { memos: normalize(sorted) };
      });
      
      const memo = get().memos.find(m => m.id === id);
      if (memo) persistMemo(memo);
    },

    loadMemosFromDisk: async () => {
      try {
        const memos = await loadAllMemos();
        set({ memos });
      } catch (error) {
        console.error("Failed to load memos:", error);
      }
    },

    saveAllMemos: async () => {
      const memos = get().memos;
      for (const memo of memos) {
        try {
          await saveIndividualMemo(memo);
        } catch (error) {
          console.error(`Failed to save memo ${memo.id}:`, error);
        }
      }
    },

    saveMemoManually: async (id: string) => {
      const memo = get().memos.find(m => m.id === id);
      if (!memo) return;
      
      try {
        await saveIndividualMemo(memo);
      } catch (error) {
        console.error(`Failed to save memo ${id}:`, error);
        throw error;
      }
    }
  };
});