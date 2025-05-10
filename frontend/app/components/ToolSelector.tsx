"use client";

import { useState } from "react";
import { SquarePen } from "lucide-react"; // 仮：lucide-react使用

const tools = [
  { id: "memo", label: "メモ", icon: SquarePen },
  // 必要に応じて今後追加可能
];

export const LayoutSelector = () => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/80 rounded-full px-6 py-2 flex space-x-6 backdrop-blur-md">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isSelected = selectedTool === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => setSelectedTool(tool.id)}
            className={`flex flex-col items-center text-xs text-white transition ${
              isSelected ? "opacity-100" : "opacity-70 hover:opacity-90"
            }`}
          >
            <Icon className="w-6 h-6 mb-1" />
            {tool.label}
          </button>
        );
      })}
    </div>
  );
};
