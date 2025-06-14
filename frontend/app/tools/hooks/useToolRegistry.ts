/**
 * Tool Registry React Hook
 * 
 * ツールバー用のReactフック
 * シンプルで軽量な実装
 */

import { useEffect, useState, useCallback } from 'react';
import { ToolRegistry } from '../registry/ToolRegistry';
import type { Tool } from '../../types/tools';

export const useToolRegistry = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const registry = ToolRegistry.getInstance();

  // ツール読み込み
  useEffect(() => {
    const loadTools = async () => {
      try {
        setLoading(true);
        
        // コアツールの動的読み込み
        await import('../core/memo/memo.tool.config');
        
        setTools(registry.getActiveTools());
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadTools();
  }, [registry]);

  // ツール更新
  const refreshTools = useCallback(() => {
    setTools(registry.getActiveTools());
  }, [registry]);

  // ツール登録
  const registerTool = useCallback((tool: Tool) => {
    try {
      registry.registerTool(tool);
      refreshTools();
    } catch {
      // Silently ignore tool registration errors
    }
  }, [registry, refreshTools]);

  return {
    tools,
    loading,
    error,
    refreshTools,
    registerTool,
    getTool: registry.getTool.bind(registry),
    stats: registry.getStats()
  };
};