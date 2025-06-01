"use client";

import { useEffect, useState } from "react";
import { Cog, Save } from "lucide-react";
import { toast } from "sonner";
import { SettingsModal } from "../components/SettingsModal";
import { LayoutSelector } from "../components/ToolSelector";
import { AdaptiveSidebar } from "../components/AdaptiveSidebar";
import { useAuth } from "../hooks/useAuth";
import { useModalStore } from "../hooks/useModal";
import { useLoadAfterLogin } from "../hooks/useLoadAfterLogin";
import { useMemos, type MemoData } from "../hooks/useMemos";
import { WorkspaceCanvas } from "./WorkspaceCanvas";

export default function WorkspacePage() {
  const { checkAutoLogin, isLoggedIn } = useAuth();
  const openSettings = useModalStore((s) => s.open);
  const { memos, saveAllMemos, toggleMemoVisibility, focusMemoOnCanvas } = useMemos();
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

  // 手動保存（ゲスト参加時の一括保存）
  const handleManualSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      // 仕様通り：保存ボタン押下時にフォルダ選択
      const { 
        requestDirectory, 
        loadAllMemos, 
        checkAmvSystemStructure,
        saveGuestFolderPath,
        isCurrentDirectorySameAsGuest
      } = await import("../../utils/fileAccess");
      
      toast.info("AMV-Systemの保存先フォルダを選択してください");
      await requestDirectory();
      
      // 🆕 ゲストモード：同一フォルダかチェック
      const isSameFolder = await isCurrentDirectorySameAsGuest();
      
      // 既存AMV-systemファイル構造をチェック
      const hasAmvStructure = await checkAmvSystemStructure();
      
      if (hasAmvStructure) {
        // 既存AMV-system構造が検出された場合
        try {
          const existingMemos = await loadAllMemos();
          
          if (isSameFolder && existingMemos.length > 0) {
            // 同一フォルダでデータが存在する場合：復元+マージ
            toast.success(`前回保存したデータを復元しました（${existingMemos.length}個のメモ）`);
            
            // 既存データをワークスペースに復元表示
            const { useMemos } = await import("../hooks/useMemos");
            useMemos.getState().setMemos(existingMemos);
            
            // 現在のメモリ上のメモがあれば追加マージ
            if (memos.length > 0) {
              const existingIds = new Set(existingMemos.map(m => m.id));
              const newMemos = memos.filter(m => !existingIds.has(m.id));
              
              if (newMemos.length > 0) {
                const allMemos = [...existingMemos, ...newMemos];
                useMemos.getState().setMemos(allMemos);
                await saveAllMemos();
                toast.success(`${newMemos.length}個の新規メモを追加保存しました`);
              }
            }
          } else {
            // 異なるフォルダまたは初回：通常のマージ処理
            toast.success(`既存AMV-systemファイルを検出しました。${existingMemos.length}個のメモを復元します。`);
            
            // 既存データと現在のメモをマージ（重複排除）
            const existingIds = new Set(existingMemos.map(m => m.id));
            const newMemos = memos.filter(m => !existingIds.has(m.id));
            const allMemos = [...existingMemos, ...newMemos];
            
            // ストア更新
            const { useMemos } = await import("../hooks/useMemos");
            useMemos.getState().setMemos(allMemos);
            
            // マージ後のデータを保存
            await saveAllMemos();
            toast.success(`${newMemos.length}個の新規メモを既存データに追加保存しました`);
          }
        } catch (e) {
          console.error('Failed to merge with existing data:', e);
          toast.error("既存データとの統合に失敗しました");
        }
      } else {
        // 新規フォルダの場合
        toast.info("新規AMV-systemファイル構造を作成します");
        await saveAllMemos();
        toast.success(`${memos.length}個のメモを新規保存しました`);
      }
      
      // 🆕 フォルダパスを記憶（ゲストモード用）
      try {
        const currentDir = await import("../../utils/fileAccess").then(m => m.getStoredDir());
        if (currentDir) {
          saveGuestFolderPath(currentDir.name); // ディレクトリ名を保存
        }
      } catch (e) {
        console.warn('Failed to save guest folder path:', e);
      }
      
    } catch (error: unknown) {
      // 🚫 要件定義に従った適切なエラーハンドリング
      if (error instanceof Error) {
        if (error.message === 'USER_CANCELLED') {
          toast.info("保存がキャンセルされました");
          setIsSaving(false);
          return;
        }
        if (error.message === 'PERMISSION_DENIED') {
          toast.error("フォルダアクセス権限が拒否されました。別のフォルダを選択してください。");
        } else if (error.message === 'SECURITY_ERROR') {
          toast.error("セキュリティエラーが発生しました。ブラウザ設定をご確認ください。");
        } else {
          toast.error("保存に失敗しました: " + error.message);
        }
      } else {
        toast.error("保存に失敗しました: 不明なエラー");
      }
    } finally {
      setIsSaving(false);
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
          onToggleVisibility={toggleMemoVisibility}
          onFocusOnCanvas={focusMemoOnCanvas}
          isOpen={isSidebarOpen}
          onToggle={toggleSidebar}
          className="flex-shrink-0"
        />

        {/* メインコンテンツエリア */}
        <div className="flex-1 relative">
          {/* 右上のボタンエリア */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            {!isLoggedIn && (
              <button
                onClick={handleManualSave}
                disabled={isSaving}
                className="p-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                title="一括保存"
              >
                <Save className="w-4 h-4" />
              </button>
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