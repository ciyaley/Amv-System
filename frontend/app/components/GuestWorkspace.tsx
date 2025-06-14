"use client";

import { useState, useEffect } from "react";
import { Cog, Save } from "lucide-react";
import { toast } from "sonner";
import "../../utils/fileAccess"; // Import order fix
import { MessageHelpers, showMessage, handleErrorWithMessage, getGlobalMessageHandler } from "../../utils/messageSystem";
import { useMemos } from "../hooks/useMemos";
import { useModalStore } from "../hooks/useModal";
import { type MemoData } from "../types/tools";
import { WorkspaceCanvas } from "../workspace/WorkspaceCanvas";
import { AdaptiveSidebar } from "./AdaptiveSidebar";
import { LayoutSelector } from "./ToolSelector";

interface GuestWorkspaceProps {
  className?: string;
}

export function GuestWorkspace({ className = "" }: GuestWorkspaceProps) {
  const openSettings = useModalStore((s) => s.open);
  const { memos, setMemos, saveAllMemos, toggleMemoVisibility, focusMemoOnCanvas } = useMemos();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemoId, setSelectedMemoId] = useState<string>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasTriedAutoRestore, setHasTriedAutoRestore] = useState(false);

  // メモ選択時の処理
  const handleMemoSelect = (memo: MemoData) => {
    setSelectedMemoId(memo.id);
    // キャンバス上でのメモ表示やフォーカス処理
    if (process.env.NODE_ENV === 'development') {
    }
  };

  // サイドバー切り替え
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // 🆕 RDv1.1.5.1: ゲストワークスペース初期化時の自動復元
  useEffect(() => {
    const tryAutoRestore = async () => {
      if (hasTriedAutoRestore) return;
      
      setHasTriedAutoRestore(true);
      
      // 🔧 修正: メモ作成中の場合は自動復元を延期（より安全な実装）
      if (memos.length > 0) {
        return;
      }
      
      try {
        // Attempting auto-restore
        
        // 既に選択されているディレクトリがあるかチェック
        const { getStoredDir, restoreFromGuestFolder } = await import("../../utils/fileAccess");
        const currentDir = await getStoredDir();
        
        if (!currentDir) {
          // No current directory set, skipping auto-restore
          return;
        }
        
        // ゲストフォルダからの自動復元を試行
        const restoredMemos = await restoreFromGuestFolder();
        
        if (restoredMemos.length > 0) {
          // Auto-restored memos from guest folder
          
          // 復元されたメモをワークスペースに設定（型変換）
          const convertedMemos = restoredMemos.map(memo => ({
            ...memo,
            type: 'memo' as const,
            content: memo.content || memo.text || '',
            text: memo.text || memo.content || '',
            created: memo.created || new Date().toISOString(),
            updated: memo.updated || new Date().toISOString(),
            sourceType: memo.sourceType || 'guest' as const
          }));
          
          // 🔧 修正: 既存メモとマージして上書きを防ぐ
          const currentMemos = memos;
          if (currentMemos.length > 0) {
            // 既存メモがある場合はマージ
            const existingIds = new Set(convertedMemos.map(m => m.id));
            const newMemos = currentMemos.filter(m => !existingIds.has(m.id));
            setMemos([...convertedMemos, ...newMemos]);
          } else {
            // 既存メモがない場合のみ復元データを設定
            setMemos(convertedMemos);
          }
          
          // 🆕 RDv1.1.5.1: 統一メッセージシステム使用
          showMessage(MessageHelpers.autoRestoreSuccess(
            { 
              operation: 'guest_auto_restore', 
              component: 'GuestWorkspace' 
            }, 
            restoredMemos.length
          ));
        } else {
          // No data to restore from guest folder
        }
        
      } catch {
        // エラーは静かに処理（ユーザーには表示しない）
      }
    };

    // 🔧 改善: より短い遅延でパフォーマンス向上
    const timer = setTimeout(tryAutoRestore, 300);
    return () => clearTimeout(timer);
  }, [hasTriedAutoRestore, memos, setMemos]); // Include all dependencies

  // 手動保存（ゲストモード用の一括保存）
  const handleManualSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      // 仕様通り：保存ボタン押下時にフォルダ選択
      const { 
        requestDirectory
      } = await import("../../utils/fileAccess");
      
      toast.info("AMV-Systemの保存先フォルダを選択してください");
      await requestDirectory();
      
      // 🆕 RDv1.1.5.1: 強化されたゲストモード永続化
      const { restoreFromGuestFolder } = await import("../../utils/fileAccess");
      
      // 高精度復元を試行
      const restoredMemos2 = await restoreFromGuestFolder();
      
      if (restoredMemos2.length > 0) {
        // 既存データの復元に成功
        // Restored memos from guest folder
        
        // 復元データをワークスペースに設定（型変換）
        const convertedMemos = restoredMemos2.map(memo => ({
          ...memo,
          type: 'memo' as const,
          content: memo.content || memo.text || '',
          text: memo.text || memo.content || '',
          created: memo.created || new Date().toISOString(),
          updated: memo.updated || new Date().toISOString(),
          sourceType: memo.sourceType || 'guest' as const
        }));
        setMemos(convertedMemos);
        
        // 現在のメモリ上のメモがあれば追加マージ
        if (memos.length > 0) {
          const existingIds = new Set(restoredMemos2.map(m => m.id));
          const newMemos = memos.filter(m => !existingIds.has(m.id));
          
          if (newMemos.length > 0) {
            // 新規メモを追加してマージ保存（型変換）
            const allMemos = [...convertedMemos, ...newMemos];
            setMemos(allMemos);
            await saveAllMemos();
            
            // 🆕 RDv1.1.5.1: データマージ成功メッセージ
            showMessage(MessageHelpers.existingDataMerged(
              { 
                operation: 'guest_data_merge', 
                component: 'GuestWorkspace' 
              }, 
              newMemos.length
            ));
          } else {
            // 新規メモがない場合は復元のみ
            showMessage(MessageHelpers.autoRestoreSuccess(
              { 
                operation: 'guest_manual_restore', 
                component: 'GuestWorkspace' 
              }, 
              restoredMemos2.length
            ));
          }
        } else {
          // メモリ上のメモのみ保存
          if (memos.length > 0) {
            await saveAllMemos();
            showMessage(MessageHelpers.manualSaveSuccess(
              { 
                operation: 'guest_manual_save', 
                component: 'GuestWorkspace' 
              }, 
              memos.length
            ));
          }
        }
      } else {
        // 復元失敗または新規フォルダの場合
        if (memos.length > 0) {
          toast.info("新規AMV-systemファイル構造を作成します");
          await saveAllMemos();
          showMessage(MessageHelpers.manualSaveSuccess(
            { 
              operation: 'guest_new_save', 
              component: 'GuestWorkspace' 
            }, 
            memos.length
          ));
        } else {
          toast.info("AMV-systemフォルダを準備しました");
        }
      }
      
      // 🆕 RDv1.1.5.1: 強化されたフォルダパス記憶（ゲストモード用）
      try {
        const { getStoredDir } = await import("../../utils/fileAccess");
        const currentDir = await getStoredDir();
        
        if (currentDir) {
          // フォルダパスをローカルストレージに保存
          if (typeof window !== 'undefined') {
            localStorage.setItem('amv_guest_folder_path', currentDir.name);
          }
          // Guest folder path saved
        }
      } catch {
      }
      
    } catch (error: unknown) {
      // 🆕 RDv1.1.5.1: 統一エラーハンドリング
      if (error instanceof Error && error.message === 'USER_CANCELLED') {
        showMessage(MessageHelpers.directorySelectionCancelled({
          operation: 'guest_save_cancelled',
          component: 'GuestWorkspace'
        }));
        setIsSaving(false);
        return;
      }
      
      const handler = getGlobalMessageHandler();
      if (handler) {
        handleErrorWithMessage(error, {
          operation: 'guest_manual_save',
          component: 'GuestWorkspace'
        }, handler);
      } else {
        // フォールバック: 従来のtoast
        if (error instanceof Error) {
          toast.error("保存に失敗しました: " + error.message);
        } else {
          toast.error("保存に失敗しました: 不明なエラー");
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`flex w-screen h-screen ${className}`} data-testid="guest-workspace">
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
          {/* ゲストユーザーは手動保存ボタンのみ表示 */}
          <button
            onClick={handleManualSave}
            disabled={isSaving}
            className="p-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
            title="一括保存"
            data-testid="manual-save-button"
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            onClick={openSettings}
            className="p-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            aria-label="設定を開く"
            data-testid="settings-button"
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
  );
}