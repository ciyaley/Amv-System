"use client";

import { useEffect, useState } from "react";
import { Cog } from "lucide-react";
import { toast } from "sonner";
import { SettingsModal } from "@/app/components/SettingsModal";
import { LayoutSelector } from "@/app/components/ToolSelector";
import { useAuth } from "@/app/hooks/useAuth";
import { useModalStore } from "@/app/hooks/useModal";
import { useLoadAfterLogin } from "@/app/hooks/useLoadAfterLogin";
import { WorkspaceCanvas } from "./WorkspaceCanvas";

export default function WorkspacePage() {
  const { autoLogin, user } = useAuth();
  const openSettings = useModalStore((s) => s.open);
  useLoadAfterLogin();   // ← 追加

  useEffect(() => {
    autoLogin()
      .then(() => {
        if (user) toast.success("自動ログイン成功");
      })
      .catch(() => {
        toast.warning("未ログイン状態です");
      });
  }, []);

  return (
    <>
      <SettingsModal />

      {/* 全画面ワークスペース */}
      <div className="relative w-screen h-screen"
      />
        {/* ログ管理パネル（fixed） */}
        <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-800 p-4 overflow-y-auto z-10">
          <h2 className="text-lg font-bold mb-4 text-white">ログ管理</h2>
          <ul className="space-y-2 text-white">
            <li>サンプルログ1</li>
            <li>サンプルログ2</li>
          </ul>
        </aside>

        {/* 設定ボタン（fixed） */}
        <button
          onClick={openSettings}
          className="fixed top-4 right-4 z-10"
          aria-label="設定を開く"
        >
          <Cog className="w-6 h-6 text-white hover:text-gray-300" />
        </button>

        {/* キャンバス本体 */}
        <WorkspaceCanvas />

        {/* ツール選択バー（fixed） */}
        <LayoutSelector className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-10"/>
      
    </>
  );
}