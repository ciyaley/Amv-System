"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import { saveEncrypted, loadEncrypted } from "../../utils/fileAccess"; // ← 絶対パスで正しく

export interface MemoData {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  zIndex: number;
}

interface MemoState {
  memos: MemoData[];
  addMemo: (x: number, y: number) => void;
  updateMemo: (id: string, data: Partial<MemoData>) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;
}

export const useMemos = create<MemoState>((set, get) => {
  // ▶︎ 起動時の復元
  (async () => {
    try {
      const loaded = await loadEncrypted<{ memos: MemoData[] }>("memo");
      if (loaded?.memos) set({ memos: loaded.memos });
    } catch (e) {
      console.error("memo load error", e);
    }
  })();

  // ZIndex を 1 から順に再振り直す関数
  const normalize = (list: MemoData[]) =>
    list
      .sort((a, b) => a.zIndex - b.zIndex)
      .map((m, i) => ({ ...m, zIndex: i + 1 }));

  // 保存ヘルパー
  const persist = () => {
    const current = get().memos;
    saveEncrypted("memo", { memos: current }).catch(console.error);
  };

  return {
    memos: [],

    addMemo: (x, y) => {
      set((s) => {
        const base = s.memos.length
          ? Math.max(...s.memos.map((m) => m.zIndex))
          : 0;
        return {
          memos: normalize([
            ...s.memos,
            { id: nanoid(), x, y, w: 240, h: 160, text: "", zIndex: base + 1 },
          ]),
        };
      });
      persist();
    },

    updateMemo: (id, data) => {
      set((s) => ({
        memos: s.memos.map((m) => (m.id === id ? { ...m, ...data } : m)),
      }));
      persist();
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
      persist();
    },

    sendToBack: (id) => {
      set((s) => ({
        memos: normalize(
          s.memos.map((m) => (m.id === id ? { ...m, zIndex: 0 } : m))
        ),
      }));
      persist();
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
      persist();
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
      persist();
    },
  };
});