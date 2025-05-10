
"use client";

import { SettingsModal } from "@/app/components/SettingsModal";
import { useAuth } from "@/app/hooks/useAuth";
import { useModalStore } from "@/app/hooks/useModal";
import { useEffect } from "react";
import { toast } from "sonner";
import { Cog } from "lucide-react";
import { LayoutSelector } from "@/app/components/ToolSelector";

export default function WorkspacePage() {
  const { autoLogin, user } = useAuth();
  const openSettings = useModalStore((state) => state.open);

  useEffect(() => {
    autoLogin()
      .then(() => {
        if (user) {
          toast.success("自動ログイン成功");
        }
      })
      .catch(() => {
        toast.warning("未ログイン状態です");
      });
  }, []);

  return (
    <>
      {/* SettingsModal はトップレベルに置く（最前面確保） */}
      <SettingsModal />

      {/* メインコンテンツ */}
      <div className="flex min-h-screen flex-col bg-slate-900 text-white relative">
        {/* 上部ヘッダー */}
        <header className="flex justify-between items-center p-4">
          <div /> {/* 左スペース（今後ロゴとか置ける） */}
          <button onClick={openSettings}>
            <Cog className="w-6 h-6 text-white hover:text-gray-300" />
          </button>
        </header>

        {/* 本体エリア */}
        <div className="flex flex-grow overflow-hidden">
          {/* 左サイド（ログ管理パネル） */}
          <aside className="w-64 bg-slate-800 p-4 overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">ログ管理</h2>
            <ul className="space-y-2">
              <li>サンプルログ1</li>
              <li>サンプルログ2</li>
            </ul>
          </aside>

          {/* メイン作業エリア */}
          <section className="flex-grow flex flex-col items-center justify-center overflow-y-auto p-4">
            <h1 className="text-2xl font-bold">
              {user ? "ようこそ、ワークスペースへ！" : "ゲストモード：ワークスペース"}
            </h1>

            {/* ツール選択エリア */}
            <LayoutSelector />
          </section>
        </div>
      </div>
    </>
  );
}