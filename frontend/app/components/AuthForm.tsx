"use client";

import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";

interface AuthFormProps {
  mode?: "login" | "register";
}

export const AuthForm = ({ mode: initialMode = "login" }: AuthFormProps = {}) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    if (password.length < 12) return false;
    if (!/[a-zA-Z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // バリデーション
    const newErrors: typeof errors = {};
    
    if (!validateEmail(email)) {
      newErrors.email = "有効なメールアドレスを入力してください";
    }
    
    if (mode === "register") {
      if (!validatePassword(password)) {
        newErrors.password = "パスワードは12文字以上で、英字と数字を含む必要があります";
      }
      if (password !== confirmPassword) {
        newErrors.confirmPassword = "パスワードが一致しません";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
        toast.success("ログイン成功");
      } else {
        await register(email, password);
        toast.success("登録成功");
      }
      // フォームをクリア
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "エラーが発生しました";
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {mode === "login" ? "ログイン" : "新規登録"}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            className="w-full rounded border px-3 py-2 dark:bg-slate-700"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            className="w-full rounded border px-3 py-2 dark:bg-slate-700"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password}</p>
          )}
        </div>

        {mode === "register" && (
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
              パスワード（確認）
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="w-full rounded border px-3 py-2 dark:bg-slate-700"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
            )}
          </div>
        )}

        {errors.general && (
          <p className="text-red-500 text-sm text-center">{errors.general}</p>
        )}

        <button
          type="submit"
          className="w-full rounded bg-slate-800 p-2 text-white hover:bg-slate-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "処理中..." : mode === "login" ? "ログイン" : "登録"}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setErrors({});
          }}
          className="text-blue-500 hover:underline"
        >
          {mode === "login" ? "アカウントを作成" : "ログインに戻る"}
        </button>
      </div>
    </div>
  );
};