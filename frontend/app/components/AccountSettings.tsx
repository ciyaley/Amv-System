// frontend/app/components/AccountSettings.tsx
"use client";

import { useState } from "react";
import { TabGroup, TabList, TabPanels, Tab, TabPanel } from "@headlessui/react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import { AuthForm } from "./AuthForm";

export const AccountSettings = () => {
  const { isLoggedIn, email, logout, deleteAccount } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("ログアウトしました");
    } catch {
      toast.error("ログアウトに失敗しました");
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmEmail !== email) {
      toast.error("メールアドレスが一致しません");
      return;
    }
    
    setIsDeleting(true);
    try {
      await deleteAccount();
      toast.success("アカウントを削除しました");
      setConfirmEmail("");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "アカウント削除に失敗しました";
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoggedIn) {
    return (
      <div role="tabpanel" className="space-y-6">
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-green-800 dark:text-green-200">
            ログイン済み
          </h3>
          <p className="text-green-600 dark:text-green-300">
            {email} でログインしています
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            data-testid="logout-button"
          >
            ログアウト
          </button>

          <div className="border-t pt-4">
            <h4 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
              危険な操作
            </h4>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg space-y-3">
              <p className="text-sm text-red-700 dark:text-red-300">
                アカウントを削除すると、すべてのデータが失われます。この操作は取り消せません。
              </p>
              <input
                type="email"
                placeholder="確認のためメールアドレスを入力"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="w-full px-3 py-2 border border-red-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-slate-700 dark:border-red-600"
                data-testid="confirm-email-input"
              />
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || confirmEmail !== email}
                className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-testid="delete-account-button"
              >
                {isDeleting ? "削除中..." : "アカウントを削除"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div role="tabpanel" className="space-y-4">
      <TabGroup>
        <TabList className="flex space-x-2">
          <Tab as="button">ログイン</Tab>
          <Tab as="button">登録</Tab>
        </TabList>
        <TabPanels className="mt-4">
          <TabPanel>
            <AuthForm mode="login" />
          </TabPanel>
          <TabPanel>
            <AuthForm mode="register" />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
};