// frontend/app/hooks/useEncryptionStore.ts
"use client";

import { create } from "zustand";

interface EncryptionState {
  /** 現在メモリ上にあるパスワード（鍵素材） */
  password: string | null;
  /** パスワードをセットし、30分後に自動クリア */
  setPassword: (pw: string) => void;
  /** 即時にパスワードをクリア */
  clearPassword: () => void;
}

let clearTimer: number | undefined;

export const useEncryptionStore = create<EncryptionState>((set) => ({
  password: null,
  setPassword: (pw: string) => {
    // 既存タイマーがあればクリア
    if (clearTimer !== undefined) clearTimeout(clearTimer);
    set({ password: pw });
    // 30分後に自動クリア
    clearTimer = window.setTimeout(() => {
      set({ password: null });
      clearTimer = undefined;
    }, 30 * 60 * 1000);
  },
  clearPassword: () => {
    if (clearTimer !== undefined) {
      clearTimeout(clearTimer);
      clearTimer = undefined;
    }
    set({ password: null });
  },
}));