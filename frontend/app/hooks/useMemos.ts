// frontend/app/hooks/useMemos.ts
"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";

export interface MemoData {
  id: string;
  x: number;      // キャンバス座標
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
  const normalize = (list: MemoData[]) =>
    list
      .sort((a, b) => a.zIndex - b.zIndex)
      .map((m, i) => ({ ...m, zIndex: i + 1 })); // 1-based

  return {
    memos: [],

    addMemo: (x, y) =>
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
      }),

    updateMemo: (id, data) =>
      set((s) => ({
        memos: s.memos.map((m) => (m.id === id ? { ...m, ...data } : m)),
      })),

    bringToFront: (id) =>
      set((s) => ({
        memos: normalize(
          s.memos.map((m) =>
            m.id === id
              ? { ...m, zIndex: Math.max(...s.memos.map((m2) => m2.zIndex)) + 1 }
              : m
          )
        ),
      })),

    sendToBack: (id) =>
      set((s) => ({
        memos: normalize(
          s.memos.map((m) =>
            m.id === id
              ? { ...m, zIndex: 0 }
              : m
          )
        ),
      })),

    moveUp: (id) =>
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
      }),

    moveDown: (id) =>
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
      }),
  };
});