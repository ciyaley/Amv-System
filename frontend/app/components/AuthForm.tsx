"use client";

import { useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { useModalStore } from "@/app/hooks/useModal";
import { toast } from "sonner";

type AuthFormProps = {
  mode: "login" | "register";
};

export const AuthForm = ({ mode }: AuthFormProps) => {
  const { login, register } = useAuth();
  const closeModal = useModalStore((state) => state.close);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
        toast.success("ログイン成功");
      } else {
        await register(email, password);
        toast.success("登録成功");
      }
      closeModal();
    } catch (err: any) {
      const message = err instanceof Error ? err.message : "エラーが発生しました";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="email"
          placeholder="メールアドレス"
          className="w-full rounded border px-3 py-2 dark:bg-slate-700"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <input
          type="password"
          placeholder="パスワード"
          className="w-full rounded border px-3 py-2 dark:bg-slate-700"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <button
        type="submit"
        className="w-full rounded bg-slate-800 p-2 text-white hover:bg-slate-700 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "送信中..." : mode === "login" ? "ログイン" : "登録"}
      </button>
    </form>
  );
};