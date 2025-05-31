"use client";

import { useEffect, useState } from "react";
import { Cog, Save, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { SettingsModal } from "@/app/components/SettingsModal";
import { LayoutSelector } from "@/app/components/ToolSelector";
import { AdaptiveSidebar } from "@/app/components/AdaptiveSidebar";
import { useAuth } from "@/app/hooks/useAuth";
import { useModalStore } from "@/app/hooks/useModal";
import { useLoadAfterLogin } from "@/app/hooks/useLoadAfterLogin";
import { useMemos, type MemoData } from "@/app/hooks/useMemos";
import { WorkspaceCanvas } from "./WorkspaceCanvas";
import { requestDirectory } from "../../utils/fileAccess";

export default function WorkspacePage() {
  const { checkAutoLogin, isLoggedIn } = useAuth();
  const openSettings = useModalStore((s) => s.open);
  const { memos, saveAllMemos } = useMemos();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemoId, setSelectedMemoId] = useState<string>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  useLoadAfterLogin();

  useEffect(() => {
    checkAutoLogin()
      .then(() => {
        if (isLoggedIn) toast.success("自動ログイン成功");
      })
      .catch(() => {
        toast.info("未ログイン状態です");
      });
  }, [checkAutoLogin, isLoggedIn]);

  // メモ選択時の処理
  const handleMemoSelect = (memo: MemoData) => {
    setSelectedMemoId(memo.id);
    // キャンバス上でのメモ表示やフォーカス処理
    console.log('Selected memo:', memo);
  };

  // サイドバー切り替え
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // 手動保存
  const handleManualSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      await saveAllMemos();
      toast.success(`${memos.length}個のメモを保存しました`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      toast.error("保存に失敗しました: " + errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // ディレクトリ選択
  const handleSelectDirectory = async () => {
    try {
      await requestDirectory();
      toast.success("保存フォルダを設定しました");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      toast.error("フォルダ選択に失敗しました: " + errorMessage);
    }
  };


  return (
    <>
      <SettingsModal />

      {/* 全画面ワークスペース */}
      <div className="flex w-screen h-screen">
        {/* 適応的サイドバー */}
        <AdaptiveSidebar
          items={memos}
          selectedItem={selectedMemoId}
          onItemSelect={handleMemoSelect}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isOpen={isSidebarOpen}
          onToggle={toggleSidebar}
          className="flex-shrink-0"
        />

        {/* メインコンテンツエリア */}
        <div className="flex-1 relative">
          {/* 右上のボタンエリア */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            {!isLoggedIn && (
              <>
                <button
                  onClick={handleSelectDirectory}
                  className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  title="保存フォルダを選択"
                >
                  <FolderOpen className="w-4 h-4" />
                </button>
                <button
                  onClick={handleManualSave}
                  disabled={isSaving}
                  className="p-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                  title="手動保存"
                >
                  <Save className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={openSettings}
              className="p-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              aria-label="設定を開く"
            >
              <Cog className="w-4 h-4" />
            </button>
          </div>

          {/* キャンバス本体 */}
          <WorkspaceCanvas />

          {/* ツール選択バー（fixed） */}
          <LayoutSelector className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10"/>
        </div>
      </div>
    </>
  );
}