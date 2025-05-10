import { create } from "zustand";

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

  login: async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'ログイン失敗');
    }

    set({ isLoggedIn: true, user: { email: data.email } });
  },

  register: async (email, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || '登録失敗');
    }

    set({ isLoggedIn: true, user: { email: data.email } });
  },

  autoLogin: async () => {
    const res = await fetch('/api/autologin', {
  method: 'GET',
  credentials: 'include',     
    });

    if (!res.ok) {
      throw new Error('自動ログイン失敗');
      
    }

    const data = await res.json();
    set({ isLoggedIn: true, user: { email: data.email } });
  },

  logout: () => {
    set({ isLoggedIn: false, user: null });
    // 将来ここで /api/auth/logout を呼ぶとより堅牢に
  },
}));