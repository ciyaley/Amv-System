// frontend/app/hooks/useTheme.ts
"use client";

import { create } from "zustand";

export interface ThemeState {
  bgColor: string;
  bgHandle: FileSystemFileHandle | null;
  setBgColor: (color: string) => void;
  pickBgImage: () => Promise<void>;
  getBgImageUrl: () => Promise<string | null>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  // デフォルト背景色（ダークテーマに合わせて濃紺）
  bgColor: "#0f172a",
  bgHandle: null,

  setBgColor: (color) => set({ bgColor: color }),

  pickBgImage: async () => {
    if (!("showOpenFilePicker" in window)) {
      alert("このブラウザは File System Access API をサポートしていません");
      return;
    }
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: "画像ファイル",
            accept: { "image/*": [".png", ".jpg", ".jpeg", ".gif"] },
          },
        ],
        multiple: false,
      });
      set({ bgHandle: handle });
    } catch {
      // ユーザーがキャンセルした場合は何もしない
    }
  },

  getBgImageUrl: async () => {
    const handle = get().bgHandle;
    if (!handle) return null;
    const file = await handle.getFile();
    return URL.createObjectURL(file);
  },
}));