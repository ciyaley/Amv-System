// frontend/app/hooks/useAuth.ts
"use client";

import { create } from "zustand";
import { toast } from "sonner";
import { getStoredDir, requestDirectory } from "../../utils/fileAccess";
import { useEncryptionStore } from "./useEncryptionStore";

interface AuthState {
  isLoggedIn: boolean;
  uuid: string | null;
  email: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  checkAutoLogin: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  setAuth: (isLoggedIn: boolean, uuid: string | null, email: string | null) => void;
}

// パスワードバリデーション
function validatePassword(password: string): void {
  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters');
  }
  if (!/[a-zA-Z]/.test(password)) {
    throw new Error('Password must contain letters and numbers');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain letters and numbers');
  }
}

// API_BASE_URL設定
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export const useAuth = create<AuthState>((set) => ({
  isLoggedIn: false,
  uuid: null,
  email: null,
  

  /* ---------- register ---------- */
  register: async (email, password) => {
    // パスワードバリデーション
    validatePassword(password);
    
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "登録失敗");

    set({ isLoggedIn: true, uuid: data.uuid, email: data.email });
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
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "ログイン失敗");

    set({ isLoggedIn: true, uuid: data.uuid, email: data.email });
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

  /* ---------- checkAutoLogin ---------- */
  checkAutoLogin: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/autologin`, { 
        method: "GET", 
        credentials: "include" 
      });
      if (!res.ok) {
        // 401の場合は正常なフロー（未ログイン）
        if (res.status === 401) {
          return;
        }
        throw new Error("自動ログイン失敗");
      }
      const data = await res.json();
      set({ isLoggedIn: true, uuid: data.uuid, email: data.email });
      
      // パスワードが取得できた場合は暗号化ストアにも設定
      if (data.password) {
        useEncryptionStore.setState({ password: data.password });
      }
    } catch (error) {
      // エラーは握りつぶす（未ログイン状態として扱う）
      console.log('Auto-login check failed:', error);
    }
  },

  /* ---------- logout ---------- */
  logout: async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    set({ isLoggedIn: false, uuid: null, email: null });
    useEncryptionStore.setState({ password: null });
    // ハンドルは残す（ユーザーが再ログイン時に再利用可能）
  },
  
  /* ---------- deleteAccount ---------- */
  deleteAccount: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/delete`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "アカウント削除に失敗しました");
      }
      
      // アカウント削除後、ローカル状態もクリア
      set({ isLoggedIn: false, uuid: null, email: null });
      useEncryptionStore.setState({ password: null });
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    }
  },

  /* ---------- setAuth (for testing) ---------- */
  setAuth: (isLoggedIn, uuid, email) => {
    set({ isLoggedIn, uuid, email });
  },
}));
