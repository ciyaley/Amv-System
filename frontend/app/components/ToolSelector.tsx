"use client";

import { useState } from "react";
import { SquarePen } from "lucide-react"; 
import { useMemos } from "../hooks/useMemos";
import { useCanvasStore } from "@/app/hooks/useCanvas";

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
  const createMemo = useMemos((s) => s.createMemo);
  const { offsetX, offsetY, zoom } = useCanvasStore();

  // 中心キャンバス座標を計算
  const getCenterCoords = () => {
    const cx = (window.innerWidth / 2 - offsetX) / zoom;
    const cy = (window.innerHeight / 2 - offsetY) / zoom;
    return { cx, cy };
  };

  const handleToolClick = (toolId: string) => {
    setSelectedTool(toolId);

    const tool = tools.find((t) => t.id === toolId);
    if (!tool) return;

    const { cx, cy } = getCenterCoords();

    // デフォルトのメモ追加アクション
    if (toolId === "memo") {
      createMemo({ x: cx, y: cy });
    }

    // カスタム action があれば呼び出し
    if (tool.action) {
      tool.action();
    }
  };

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/80 rounded-full px-6 py-2 flex space-x-6 backdrop-blur-md ${className}`}
    >
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isSelected = selectedTool === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            className={`flex flex-col items-center text-xs text-white transition ${
              isSelected ? "opacity-100" : "opacity-70 hover:opacity-90"
            }`}
            aria-pressed={isSelected}
            aria-label={tool.label}
          >
            <Icon className="w-6 h-6 mb-1" />
            {tool.label}
          </button>
        );
      })}
    </div>
  );
};