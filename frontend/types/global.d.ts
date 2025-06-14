/**
 * グローバル型定義
 * プロジェクト全体で使用される型定義を統一
 */

// File System Access API の型定義
declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    showOpenFilePicker?: (options?: any) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?: (options?: any) => Promise<FileSystemFileHandle>;
  }
}

// テスト環境用のグローバル型定義
declare global {
  namespace globalThis {
    var URL: typeof URL & {
      createObjectURL: (obj: Blob | MediaSource) => string;
      revokeObjectURL: (url: string) => void;
    };
    var confirm: (message?: string) => boolean;
  }
}

export {};