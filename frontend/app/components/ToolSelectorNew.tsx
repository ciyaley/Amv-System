/**
 * New Tool Selector - Extensible Toolbar Architecture
 * 
 * 軽量で拡張可能なツールバー
 * 過去のClean Architecture複雑さを排除
 */

"use client";

import { useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useCanvasStore } from "../hooks/useCanvas";
import { useToolRegistry } from "../tools/hooks/useToolRegistry";
import type { ToolContext, Tool } from "../types/tools";

interface ToolButtonProps {
  tool: Tool;
  onClick: () => void;
  isDisabled?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  tool,
  onClick,
  isDisabled = false
}) => {
  const Icon = tool.icon;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`flex flex-col items-center text-xs text-white transition relative ${
        isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer opacity-70 hover:opacity-90"
      }`}
      aria-label={tool.label}
      aria-disabled={isDisabled}
      data-testid={`${tool.id}-button`}
      title={tool.description || tool.label}
    >
      <Icon className="w-6 h-6 mb-1" />
      {tool.label}
    </button>
  );
};

export const ToolSelectorNew: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const { tools, loading, error } = useToolRegistry();
  const { offsetX, offsetY, zoom } = useCanvasStore();
  const authState = useAuth();

  // コンテキスト生成
  const createToolContext = useCallback((): ToolContext => {
    const cx = (window.innerWidth / 2 - offsetX) / zoom;
    const cy = (window.innerHeight / 2 - offsetY) / zoom;
    
    return {
      canvasPosition: { x: cx, y: cy },
      canvasState: { offsetX, offsetY, zoom },
      user: authState.isLoggedIn ? {
        uuid: authState.uuid || '',
        email: authState.email || '',
        isLoggedIn: true
      } : undefined
    };
  }, [offsetX, offsetY, zoom, authState]);

  // ツール実行
  const handleToolClick = useCallback(async (toolId: string) => {
    const tool = tools.find(t => t.id === toolId);
    if (!tool) {
      return;
    }

    const context = createToolContext();
    
    // 実行可能性チェック
    if (tool.action.canExecute && !tool.action.canExecute(context)) {
      return;
    }

    try {
      await tool.action.execute(context);
    } catch {
      // Tool execution error handled silently
    }
  }, [tools, createToolContext]);

  if (loading) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/80 rounded-full px-6 py-2 backdrop-blur-md">
        <span className="text-white text-sm">Loading tools...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-800/80 rounded-full px-6 py-2 backdrop-blur-md">
        <span className="text-white text-sm">Error: {error}</span>
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/80 rounded-full px-6 py-2 backdrop-blur-md">
        <span className="text-white text-sm">No tools available</span>
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/80 rounded-full px-6 py-2 flex space-x-6 backdrop-blur-md ${className}`}
      role="toolbar"
      aria-label="ツール選択"
    >
      {tools.map((tool) => (
        <ToolButton
          key={tool.id}
          tool={tool}
          onClick={() => handleToolClick(tool.id)}
        />
      ))}
    </div>
  );
};