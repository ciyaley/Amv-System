// frontend/app/hooks/useAuth.ts
"use client";

import { create } from "zustand";
import { toast } from "sonner";
import { saveDirHandle, loadDirHandle } from "../../utils/dirHandleStore";
import { getStoredDir, requestDirectory } from "../../utils/fileAccess";
import { useEncryptionStore } from "@/app/hooks/useEncryptionStore";

interface AuthState {
  isLoggedIn: boolean;
  user: { email: string } | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  autoLogin: () => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  isLoggedIn: false,
  user: null,
  

  /* ---------- register ---------- */
  register: async (email, password) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "登録失敗");

    set({ isLoggedIn: true, user: { email: data.email } });
    useEncryptionStore.setState({ password });

    // ディレクトリが未設定なら選択してもらう
    if (!await getStoredDir()) {
      try {
        await requestDirectory();
      } catch {
        toast.warning("保存フォルダが選択されていません。後で設定から指定できます。");
      }
    }
  },

  /* ---------- login ---------- */
  login: async (email, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "ログイン失敗");

    set({ isLoggedIn: true, user: { email: data.email } });
    useEncryptionStore.setState({ password });

    // ハンドルが無ければ初回選択
    if (!await getStoredDir()) {
      try {
        await requestDirectory();
      } catch {
        toast.warning("保存フォルダが選択されていません。後で設定から指定できます。");
      }
    }
  },

  /* ---------- autoLogin ---------- */
  autoLogin: async () => {
    const res = await fetch("/api/autologin", { method: "GET", credentials: "include" });
    if (!res.ok) throw new Error("自動ログイン失敗");
    const data = await res.json();
    set({ isLoggedIn: true, user: { email: data.email } });
  },

  /* ---------- logout ---------- */
  logout: () => {
    set({ isLoggedIn: false, user: null });
    useEncryptionStore.setState({ password: null });
    // ハンドルは残す（ユーザーが再ログイン時に再利用可能）
  },
}));
