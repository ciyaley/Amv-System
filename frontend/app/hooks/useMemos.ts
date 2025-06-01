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
  visible?: boolean; // 画面表示制御（デフォルト: true）
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
  clearAllMemos: () => void;
  toggleMemoVisibility: (id: string) => void;
  focusMemoOnCanvas: (id: string) => void;
  getVisibleMemos: () => MemoData[];
  getHiddenMemos: () => MemoData[];
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

  // デバウンス用のタイマーを管理
  const saveTimers = new Map<string, NodeJS.Timeout>();

  const persistMemo = async (memo: MemoData) => {
    try {
      // 自動保存はログイン時のみ
      const { password } = useEncryptionStore.getState();
      if (!password) return;

      // 既存のタイマーをクリア（デバウンス）
      const existingTimer = saveTimers.get(memo.id);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // 500ms後に保存実行（デバウンス）
      const timer = setTimeout(async () => {
        try {
          await saveIndividualMemo(memo);
          if (process.env.NODE_ENV === 'development') {
            console.log(`Auto-saved memo: ${memo.id}`);
          }
        } catch (error) {
          console.error(`Failed to auto-save memo ${memo.id}:`, error);
        }
        saveTimers.delete(memo.id);
      }, 500);

      saveTimers.set(memo.id, timer);
    } catch (error) {
      console.error("Failed to setup auto-save:", error);
    }
  };


  return {
    memos: [],
    
    setMemos: (list) => set({ memos: list }),

    createMemo: (position) => {
      // 開発環境でのみログ出力
      if (process.env.NODE_ENV === 'development') {
        console.log('Creating new memo at position:', position);
      }
      
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
        visible: true, // デフォルトで表示
        appearance: {
          backgroundColor: '#ffeaa7',
          borderColor: '#fdcb6e',
          cornerRadius: 8,
          shadowEnabled: true
        }
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Created memo ${newMemo.id} at (${newMemo.x}, ${newMemo.y})`);
      }

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
        // ログイン状態チェック - 未ログイン時は読み込まない
        const { password } = useEncryptionStore.getState();
        if (!password) {
          console.log('Skipping memo loading: not logged in');
          return;
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Loading memos from disk...');
        }
        const currentMemos = get().memos;
        if (process.env.NODE_ENV === 'development') {
          console.log(`Current memo count before loading: ${currentMemos.length}`);
        }
        
        const memos = await loadAllMemos();
        if (process.env.NODE_ENV === 'development') {
          console.log(`Loaded memo count from disk: ${memos.length}`);
        }
        
        // 重複防止: より厳密なチェック
        if (currentMemos.length > 0) {
          const currentIds = new Set(currentMemos.map(m => m.id));
          const hasNewMemos = memos.some(m => !currentIds.has(m.id));
          
          if (!hasNewMemos && memos.length <= currentMemos.length) {
            if (process.env.NODE_ENV === 'development') {
              console.log('Skipping duplicate memo loading - no new memos found');
            }
            return;
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`Loading ${memos.length} memos, ${memos.filter(m => !currentIds.has(m.id)).length} are new`);
          }
        }
        
        // メモの位置を修正（左上に固まるのを防ぐ）
        const validatedMemos = memos.map((memo, index) => ({
          ...memo,
          x: typeof memo.x === 'number' && memo.x >= 0 ? memo.x : 100 + (index % 5) * 50,
          y: typeof memo.y === 'number' && memo.y >= 0 ? memo.y : 100 + Math.floor(index / 5) * 50,
          visible: memo.visible !== false // デフォルトはtrue
        }));
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`Setting ${validatedMemos.length} validated memos`);
        }
        set({ memos: validatedMemos });
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
    },

    clearAllMemos: () => {
      // 保存中のタイマーをすべてクリア
      saveTimers.forEach(timer => clearTimeout(timer));
      saveTimers.clear();
      
      set({ memos: [] });
      console.log('All memos cleared from memory');
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
    }
  };
});