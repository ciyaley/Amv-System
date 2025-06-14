// frontend/app/hooks/useAuth.ts
"use client";

import { create } from "zustand";
import { handleApiError, handleApiResponse } from "../../utils/errorHandling";
import { clearFileSystemCache } from "../../utils/fileAccess";
import { useEncryptionStore } from "./useEncryptionStore";


interface AuthState {
  isLoggedIn: boolean;
  uuid: string | null;
  email: string | null;
  isLogoutInProgress: boolean; // 🔧 追加: ログアウト状態管理
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

// タイムアウト設定（ミリ秒）
const API_TIMEOUT = 10000; // 10秒

// AbortControllerを使ったタイムアウト制御付きfetch
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs: number = API_TIMEOUT): Promise<Response> => {
  // テスト環境ではAbortControllerを使わない（MSW互換性のため）
  if (process.env.NODE_ENV === 'test') {
    return fetch(url, options);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Network timeout after ${timeoutMs}ms - check your network connection`);
    }
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      throw new Error('Network error - please check your connection');
    }
    throw error;
  }
};

export const useAuth = create<AuthState>((set) => ({
  isLoggedIn: false,
  uuid: null,
  email: null,
  isLogoutInProgress: false, // 🔧 追加: 初期値
  

  /* ---------- register ---------- */
  register: async (email, password) => {
    try {
      // パスワードバリデーション
      validatePassword(password);
      
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      
      const data = await handleApiResponse(res) as { uuid: string; email: string; password?: string; token?: string };

      // 🔧 修正: JWTトークンの確認（バックエンドで設定済み）
      if (data.token) {
        
        // バックエンドでクッキー設定済みのため、フロントでは確認のみ
        setTimeout(() => {
          const currentCookies = document.cookie;
          const hasToken = currentCookies.includes('token=');
          
          if (!hasToken) {
          }
        }, 100);
      }

      set({ isLoggedIn: true, uuid: data.uuid, email: data.email });
      
      // 🔑 バックエンドから返されたパスワードを設定（優先）
      const finalPassword = data.password || password;
      useEncryptionStore.setState({ password: finalPassword });

      // 🆕 RDv1.1.4 Task 1.2: ファイルシステム操作の再開
      try {
        const { enableFileSystemOperations } = await import('../../utils/fileAccess');
        enableFileSystemOperations();
      } catch {
      }

      // ✅ 修正: 登録時のディレクトリ選択も自動復元で処理
      // useLoadAfterLoginフックで自動ディレクトリ復元が実行される
    } catch (error) {
      handleApiError(error, "登録に失敗しました");
      throw error;
    }
  },

  /* ---------- login ---------- */
  login: async (email, password) => {
    try {
      
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      
      
      const data = await handleApiResponse(res) as { uuid: string; email: string; password?: string; token?: string };

      // 🔧 修正: JWTトークンの確認（バックエンドで設定済み）
      if (data.token) {
        
        // バックエンドでクッキー設定済みのため、フロントでは確認のみ
        setTimeout(() => {
          const currentCookies = document.cookie;
          const hasToken = currentCookies.includes('token=');
          
          if (!hasToken) {
          }
        }, 100);
      }

      set({ isLoggedIn: true, uuid: data.uuid, email: data.email });
      
      // 🔑 バックエンドから返されたパスワードを設定（優先）
      const finalPassword = data.password || password;
      useEncryptionStore.setState({ password: finalPassword });

      // 🆕 RDv1.1.4 Task 1.2: ファイルシステム操作の再開
      try {
        const { enableFileSystemOperations } = await import('../../utils/fileAccess');
        enableFileSystemOperations();
      } catch {
        // Silently ignore filesystem operations errors
      }

      // ✅ 修正: ログイン時のディレクトリ選択は自動復元で処理
      // useLoadAfterLoginフックで自動ディレクトリ復元が実行される
    } catch (error) {
      handleApiError(error, "ログインに失敗しました");
      throw error;
    }
  },

  /* ---------- checkAutoLogin ---------- */
  checkAutoLogin: async () => {
    try {
      
      // 🔍 デバッグ: 現在のクッキー状況をチェック
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';').map(c => c.trim());
        // Debug: Check if token cookie exists
        cookies.find(c => c.startsWith('token='));
      }
      
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/autologin`, { 
        method: "GET", 
        credentials: "include" 
      });
      
      if (!res.ok) {
        // 401の場合は正常なフロー（未ログイン）
        if (res.status === 401) {
          return;
        }
        throw new Error(`自動ログイン失敗: ${res.status}`);
      }
      
      const data = await res.json() as { uuid: string; email: string; password?: string };
      
      set({ isLoggedIn: true, uuid: data.uuid, email: data.email });
      
      // パスワードが取得できた場合は暗号化ストアにも設定
      if (data.password) {
        useEncryptionStore.setState({ password: data.password });
      } else {
      }

      // 🆕 RDv1.1.4 Task 1.2: ファイルシステム操作の再開
      try {
        const { enableFileSystemOperations } = await import('../../utils/fileAccess');
        enableFileSystemOperations();
      } catch {
        // Silently ignore filesystem operations errors
      }
    } catch {
      // エラーは握りつぶす（未ログイン状態として扱う）
    }
  },

  /* ---------- logout ---------- */
  logout: async () => {
    const currentState = useAuth.getState();
    const uuid = currentState.uuid;
    
    
    // 🚀 RDv1.1.5.1: ログアウト前にディレクトリ関連付けを保存
    if (uuid) {
      try {
        const { getStoredDir } = await import('../../utils/fileAccess');
        const { saveDirectoryAssociationForAccount } = 
          await import('../../utils/fileSystem/index');
        
        const currentDir = await getStoredDir();
        if (currentDir) {
          
          // RDv1.1.5.1: 新しいディレクトリサービスを使用
          try {
            await saveDirectoryAssociationForAccount(uuid, currentDir);
          } catch {
            // Silently ignore directory association errors
          }
          
          // Legacy support: 旧形式の保存も継続
          const { saveDirectoryAssociation } = 
            await import('../../utils/fileSystem');
          await saveDirectoryAssociation(currentDir, uuid);
        }
      } catch {
        // Silently ignore directory operations errors
      }
    }

    // 🛑 RDv1.1.4 Task 1.1: ファイル読み取り処理の完全停止
    try {
      // ファイルシステムアクセスの停止
      const { stopFileSystemOperations } = await import('../../utils/fileAccess');
      if (stopFileSystemOperations) {
        await stopFileSystemOperations();
      }
    } catch {
      // Silently ignore filesystem stop errors
    }

    // 🛑 RDv1.1.4 Task 1.1: 自動保存タイマーの停止
    try {
      const { useMemos } = await import('./useMemos');
      const { stopAutoSave } = useMemos.getState();
      if (stopAutoSave) {
        stopAutoSave();
      }
    } catch {
      // Silently ignore auto-save stop errors
    }

    // 🛑 RDv1.1.4 Task 1.1: useLoadAfterLoginフックの無効化
    set({ isLogoutInProgress: true }); // 🔧 修正: Zustandで状態管理

    try {
      await fetchWithTimeout(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Silently ignore logout API errors
    }
    
    // 🧹 RDv1.1.4 Task 1.1: 完全な状態クリア
    set({ isLoggedIn: false, uuid: null, email: null });
    useEncryptionStore.setState({ password: null });
    
    // ファイルシステムキャッシュをクリア（メモ情報が残る問題を修正）
    clearFileSystemCache();
    
    // メモデータもクリア（動的インポートでuseMemos循環参照を回避）
    try {
      const { useMemos } = await import('./useMemos');
      useMemos.getState().clearAllMemos();
    } catch {
      // Silently ignore memo clearing errors
    }
    
    // 🧹 RDv1.1.4 Task 1.1: 追加のローカルストレージクリア
    try {
      if (typeof window !== 'undefined') {
        // 認証関連データのクリア
        localStorage.removeItem('auth_state');
        localStorage.removeItem('encryption_key');
        localStorage.removeItem('last_login_time');
        
        // セッション関連データのクリア
        sessionStorage.removeItem('workspace_state');
        sessionStorage.removeItem('canvas_state');
        
      }
    } catch {
      // Silently ignore localStorage clearing errors
    }
    
    // 画面をリロードして未ログイン状態に完全リセット
    if (typeof window !== 'undefined') {
      // 🔧 修正: クッキーを確実に削除（バックエンドでも削除済み）
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; samesite=lax';
      document.cookie = 'token=; path=/; max-age=0; samesite=lax';
      
      // 🔧 修正: ログアウト状態をリセット（リダイレクト前に）
      set({ isLogoutInProgress: false });
      
      
      // ホームページにリダイレクト
      window.location.href = '/';
    }
    
  },
  
  /* ---------- deleteAccount ---------- */
  deleteAccount: async () => {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/auth/delete`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        throw new Error(data.message || "アカウント削除に失敗しました");
      }
      
      // アカウント削除後、ローカル状態もクリア
      set({ isLoggedIn: false, uuid: null, email: null });
      useEncryptionStore.setState({ password: null });
      
      // ファイルシステムキャッシュをクリア
      clearFileSystemCache();
      
      // メモデータもクリア
      try {
        const { useMemos } = await import('./useMemos');
        useMemos.getState().clearAllMemos();
      } catch {
        // Silently ignore memo clearing errors
      }
      
      // 全ローカルストレージクリア
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        // 🔧 修正: クッキーを確実に削除（バックエンドでも削除済み）
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; samesite=lax';
        document.cookie = 'token=; path=/; max-age=0; samesite=lax';
        // ホームページにリダイレクト
        window.location.href = '/';
      }
    } catch (error) {
      throw error;
    }
  },

  /* ---------- setAuth (for testing) ---------- */
  setAuth: (isLoggedIn, uuid, email) => {
    set({ isLoggedIn, uuid, email });
  },
  
}));
