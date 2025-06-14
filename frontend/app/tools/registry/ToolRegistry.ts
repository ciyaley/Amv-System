/**
 * Tool Registry - Central Tool Management
 * 
 * シンプルなツール登録・管理システム
 * Clean Architectureの複雑さを排除した軽量実装
 */

import type { Tool, ToolPlugin } from '../../types/tools';

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools = new Map<string, Tool>();
  private plugins = new Map<string, ToolPlugin>();

  private constructor() {
    // シングルトンパターン
  }

  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  /**
   * ツール登録 - ゼロ設定で追加
   */
  registerTool(tool: Tool): void {
    if (this.tools.has(tool.id)) {
      return;
    }
    
    // 基本バリデーション
    if (!tool.id || !tool.label || !tool.icon || !tool.action) {
      throw new Error(`Invalid tool configuration: ${JSON.stringify(tool)}`);
    }
    
    this.tools.set(tool.id, tool);
  }

  /**
   * プラグイン登録
   */
  async registerPlugin(plugin: ToolPlugin): Promise<void> {
    try {
      // 依存関係チェック
      if (plugin.dependencies) {
        for (const dep of plugin.dependencies) {
          if (!this.plugins.has(dep)) {
            throw new Error(`Missing dependency: ${dep}`);
          }
        }
      }

      // 初期化
      if (plugin.initialize) {
        await plugin.initialize();
      }

      // ツール登録
      plugin.tools.forEach(tool => this.registerTool(tool));
      
      this.plugins.set(plugin.name, plugin);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 有効なツール取得
   */
  getActiveTools(): Tool[] {
    return Array.from(this.tools.values())
      .filter(tool => tool.enabled !== false)
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }

  /**
   * ツール検索
   */
  getTool(id: string): Tool | undefined {
    return this.tools.get(id);
  }

  /**
   * 全ツール削除（テスト用）
   */
  clear(): void {
    this.tools.clear();
    this.plugins.clear();
  }

  /**
   * 統計情報
   */
  getStats() {
    return {
      totalTools: this.tools.size,
      totalPlugins: this.plugins.size,
      activeTools: this.getActiveTools().length
    };
  }
}