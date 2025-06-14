"use client";

import { useState } from "react";
import { Cog } from "lucide-react";
import { useMemos } from "../hooks/useMemos";
import { useModalStore } from "../hooks/useModal";
import { type MemoData } from "../types/tools";
import { WorkspaceCanvas } from "../workspace/WorkspaceCanvas";
import { AdaptiveSidebar } from "./AdaptiveSidebar";
import { SearchToolbar } from "./SearchToolbar";
import { LayoutSelector } from "./ToolSelector";

interface AuthenticatedWorkspaceProps {
  className?: string;
}

export function AuthenticatedWorkspace({ className = "" }: AuthenticatedWorkspaceProps) {
  const openSettings = useModalStore((s) => s.open);
  const { memos, toggleMemoVisibility, focusMemoOnCanvas } = useMemos();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemoId, setSelectedMemoId] = useState<string>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchResults, setSearchResults] = useState<MemoData[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);

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

  // 検索結果の処理
  const handleSearchResults = (results: MemoData[]) => {
    setSearchResults(results);
    setIsSearchActive(results.length > 0);
  };

  // 表示するメモの決定（検索結果または全メモ）
  const displayMemos = isSearchActive ? searchResults : memos;

  return (
    <div className={`flex w-screen h-screen ${className}`} data-testid="authenticated-workspace">
      {/* 適応的サイドバー */}
      <AdaptiveSidebar
        items={displayMemos}
        selectedItem={selectedMemoId}
        onItemSelect={handleMemoSelect}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleVisibility={toggleMemoVisibility}
        onFocusOnCanvas={focusMemoOnCanvas}
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        className="flex-shrink-0"
        data-testid="authenticated-sidebar"
      />

      {/* メインコンテンツエリア */}
      <div className="flex-1 relative">
        {/* 上部検索ツールバー */}
        <div className="absolute top-4 left-4 z-10">
          <SearchToolbar 
            onSearchResults={handleSearchResults}
            className="max-w-md"
          />
        </div>

        {/* 右上のボタンエリア */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {/* 認証ユーザーは自動保存のみ：手動保存ボタンは表示しない */}
          <div className="text-xs text-gray-500 bg-white/90 px-2 py-1 rounded" data-testid="auto-save-indicator">
            自動保存中
          </div>
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