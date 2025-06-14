"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageHelpers, showMessage, getGlobalMessageHandler } from "../../utils/messageSystem";
import { useAuth } from "../hooks/useAuth";

interface AuthFormProps {
  mode?: "login" | "register";
}

export const AuthForm = ({ mode: initialMode = "login" }: AuthFormProps = {}) => {
  const router = useRouter();
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
        showMessage(MessageHelpers.loginSuccess({
          operation: 'login',
          component: 'AuthForm'
        }));
      } else {
        await register(email, password);
        showMessage(MessageHelpers.registerSuccess({
          operation: 'register',
          component: 'AuthForm'
        }));
      }
      // フォームをクリア
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      
      // ワークスペースにリダイレクト
      router.push("/workspace");
    } catch (err: unknown) {
      const context = {
        operation: mode === "login" ? 'login' : 'register',
        component: 'AuthForm'
      };

      const handler = getGlobalMessageHandler();
      if (handler) {
        const errorMessage = mode === "login" 
          ? MessageHelpers.loginFailed(context)
          : MessageHelpers.registerFailed(context);
        
        handler.show(errorMessage);
      }

      // フォームエラー表示のためのフォールバック
      let message = "エラーが発生しました";
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        message = String((err as { message: unknown }).message);
      } else if (typeof err === 'string') {
        message = err;
      }
      
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6" data-testid="auth-form">
      <div className="flex mb-6 space-x-2">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 px-4 py-2 rounded ${
            mode === "login" 
              ? "bg-blue-500 text-white" 
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
          data-testid="login-tab"
        >
          ログイン
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 px-4 py-2 rounded ${
            mode === "register" 
              ? "bg-blue-500 text-white" 
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
          data-testid="register-tab"
        >
          新規登録
        </button>
      </div>
      
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
            data-testid="email-input"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1" data-testid="auth-error">{errors.email}</p>
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
            data-testid="password-input"
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1" data-testid="auth-error">{errors.password}</p>
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
              data-testid="confirm-password-input"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1" data-testid="auth-error">{errors.confirmPassword}</p>
            )}
          </div>
        )}

        {errors.general && (
          <p className="text-red-500 text-sm text-center" data-testid="auth-error">{errors.general}</p>
        )}

        <button
          type="submit"
          className="w-full rounded bg-slate-800 p-2 text-white hover:bg-slate-700 disabled:opacity-50"
          disabled={loading}
          data-testid={loading ? "auth-loading" : mode === "login" ? "login-button" : "register-button"}
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