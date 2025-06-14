/**
 * 型エラー修正スクリプト
 * TypeScriptの型エラーを体系的に修正
 */

// 1. File System Access API の型定義を追加
declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  }
}

// 2. テスト用のグローバル型定義を追加
declare global {
  var URL: {
    createObjectURL: (obj: Blob | MediaSource) => string;
    revokeObjectURL: (url: string) => void;
    prototype: URL;
    canParse(url: string | URL, base?: string | URL): boolean;
    parse(url: string | URL, base?: string | URL): URL | null;
    new (url: string | URL, base?: string | URL): URL;
  };
}

// 3. MemoData型の統一
export interface CleanMemoData {
  id: string;
  type: 'memo';
  title: string;
  importance?: 'high' | 'medium' | 'low';
  category?: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  tags?: string[];
  created: string;
  updated: string;
  decorations?: Array<Record<string, unknown>>;
  appearance?: Record<string, unknown>;
  linkedUrls?: string[];
  linkedImages?: string[];
  visible?: boolean;
  sourceType?: 'authenticated' | 'guest';
  isGuestFile?: boolean;
}

export {};