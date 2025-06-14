/**
 * Tool System Type Definitions
 * 
 * Extensible Toolbar Architecture - Core Types
 * 過去の失敗を回避したシンプルな型定義
 */

import type { ReactElement } from 'react';

// ReactElement を実際に使用
export type ToolIcon = ReactElement;

// ツール実行コンテキスト
export interface ToolContext {
  canvasPosition: { x: number; y: number };
  canvasState: {
    offsetX: number;
    offsetY: number;
    zoom: number;
  };
  user?: {
    uuid: string;
    email: string;
    isLoggedIn: boolean;
  };
}

// ツールアクション定義
export interface ToolAction {
  execute: (context: ToolContext) => Promise<void> | void;
  canExecute?: (context: ToolContext) => boolean;
  shortcuts?: string[]; // キーボードショートカット
}

// ツール設定
export interface ToolConfig {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  category?: 'core' | 'plugin' | 'custom';
  version?: string;
  enabled?: boolean;
  priority?: number; // 表示順序 (0が最優先)
}

// 完全なツール定義
export interface Tool extends ToolConfig {
  action: ToolAction;
}

// プラグイン定義
export interface ToolPlugin {
  name: string;
  version: string;
  tools: Tool[];
  dependencies?: string[];
  initialize?: () => Promise<void>;
  cleanup?: () => Promise<void>;
}

// ツール実行結果
export interface ToolExecutionResult {
  success: boolean;
  error?: string;
  data?: ToolExecutionData;
}

export interface ToolExecutionData {
  memoId?: string;
  position?: { x: number; y: number };
  content?: string;
  metadata?: Record<string, unknown>;
}

// 統一MemoData型定義 - 全ての互換性を含む
export interface MemoData {
  id: string;
  type: 'memo';
  title: string;
  content: string;              // メインコンテンツ
  text: string;                 // Legacy互換性 (content と同期)
  x: number;                    // xy座標は直接操作（Value Object化しない）
  y: number;
  w: number;
  h: number;
  zIndex: number;
  visible?: boolean;
  created: string;
  updated: string;
  createdAt?: string;           // Clean Architecture互換性
  updatedAt?: string;           // Clean Architecture互換性
  sourceType: 'authenticated' | 'guest';
  
  // 拡張プロパティ（オプション）
  importance?: 'high' | 'medium' | 'low';
  category?: string;
  tags?: string[];
  decorations?: Array<{
    start: number;
    end: number;
    type: 'color' | 'bold' | 'italic' | 'underline';
    value?: string;
  }>;
  appearance?: {
    backgroundColor?: string;
    borderColor?: string;
    cornerRadius?: number;
    shadowEnabled?: boolean;
  };
  linkedUrls?: string[];
  linkedImages?: string[];
  isGuestFile?: boolean;        // ゲストファイルフラグ
}