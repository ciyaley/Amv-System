"use client";

import { useState, useCallback } from "react";
import { SquarePen } from "lucide-react"; 
import { useCanvasStore } from "../hooks/useCanvas";
import { useMemos } from "../hooks/useMemos";

// 将来増えるツールもここに追加するだけでOK
const tools: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  // 必要なら任意のアクションを定義
  action?: () => void;
}[] = [
  {
    id: "memo",
    label: "メモ",
    icon: SquarePen,
    // centerX/centerY は handleToolClick で渡される
    action: () => {
      // addMemo は handleToolClick の中で bind される
      /* placeholder */
    },
  },
  // { id: "otherTool", label: "ツール2", icon: SomeIcon, action: (..) => {...} },
];

export const LayoutSelector: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [isCreatingMemo, setIsCreatingMemo] = useState(false);
  const { createMemo } = useMemos();
  const { offsetX, offsetY, zoom } = useCanvasStore();
  
  // Component rendering

  // 中心キャンバス座標を計算
  const getCenterCoords = useCallback(() => {
    const cx = (window.innerWidth / 2 - offsetX) / zoom;
    const cy = (window.innerHeight / 2 - offsetY) / zoom;
    return { cx, cy };
  }, [offsetX, offsetY, zoom]);

  // メモ作成処理を非同期関数として分離
  const handleMemoCreation = useCallback(async (cx: number, cy: number) => {
    try {
      setIsCreatingMemo(true);
      
      // Creating memo at center coordinates
      createMemo({ x: cx, y: cy });
      
    } catch {
      // エラーハンドリング: ユーザーにフィードバックを提供
      // 実際のプロダクションではtoastやエラーモーダルを表示
    } finally {
      // 🔧 改善: 少し遅延を入れて状態の安定化を図る
      setTimeout(() => {
        setIsCreatingMemo(false);
      }, 100);
    }
  }, [createMemo]);

  const handleToolClick = useCallback(async (toolId: string) => {
    
    // 重複実行防止
    if (isCreatingMemo) {
      return;
    }
    
    setSelectedTool(toolId);

    const tool = tools.find((t) => t.id === toolId);
    if (!tool) {
      return;
    }

    const { cx, cy } = getCenterCoords();

    // デフォルトのメモ追加アクション
    if (toolId === "memo") {
      await handleMemoCreation(cx, cy);
    }

    // カスタム action があれば呼び出し
    if (tool.action) {
      tool.action();
    }
  }, [isCreatingMemo, getCenterCoords, handleMemoCreation]);

  // Rendering tools

  // キーボードハンドラー
  const handleKeyDown = useCallback((e: React.KeyboardEvent, toolId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToolClick(toolId);
    }
  }, [handleToolClick]);

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/80 rounded-full px-6 py-2 flex space-x-6 backdrop-blur-md ${className}`}
      role="toolbar"
      aria-label="ツール選択"
    >
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isSelected = selectedTool === tool.id;
        const isButtonDisabled = tool.id === "memo" && isCreatingMemo;
        
        // Rendering button for tool
        
        return (
          <button
            key={tool.id}
            onClick={(e) => {
              // Button clicked
              
              e.preventDefault();
              e.stopPropagation();
              
              if (!isButtonDisabled) {
                try {
                  // 非同期処理なので await は使わない（onClick内では同期的に処理開始）
                  handleToolClick(tool.id);
                } catch {
                  // Tool execution error handled silently
                }
              } else {
              }
            }}
            onKeyDown={(e) => handleKeyDown(e, tool.id)}
            disabled={isButtonDisabled}
            className={`flex flex-col items-center text-xs text-white transition relative ${
              isSelected ? "opacity-100" : "opacity-70 hover:opacity-90"
            } ${isButtonDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
            aria-pressed={isSelected}
            aria-label={`${tool.label}${isButtonDisabled ? ' (処理中)' : ''}`}
            aria-disabled={isButtonDisabled}
            data-testid={tool.id === "memo" ? "create-memo-button" : `${tool.id}-button`}
            data-creating={isCreatingMemo}
            data-enabled={!isButtonDisabled}
            title={isButtonDisabled ? 'メモ作成中...' : tool.label}
          >
            <Icon className="w-6 h-6 mb-1" />
            {tool.label}
            {isButtonDisabled && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};