// frontend/utils/errorHandling.ts
import { toast } from "sonner";

// バックエンドエラーコード
export const ERROR_CODES = {
  // API レスポンスエラー (A001-A006)
  A001: 'VALIDATION_FAILED',
  A002: 'AUTHENTICATION_FAILED',
  A003: 'CSRF_TOKEN_MISMATCH',
  A004: 'RESOURCE_NOT_FOUND',
  A005: 'FILE_CONFLICT',
  A006: 'INTERNAL_SERVER_ERROR',
  
  // ファイルシステムエラー (F001-F004)
  F001: 'FILE_SYSTEM_API_UNSUPPORTED',
  F002: 'DIRECTORY_ACCESS_DENIED',
  F003: 'FILE_ENCRYPTION_FAILED',
  F004: 'FILE_DECRYPTION_FAILED',
  
  // 検索・MCP エラー (S001-S002, M001-M002)
  S001: 'SEARCH_INDEX_BUILD_FAILED',
  S002: 'TINY_SEGMENTER_INIT_FAILED',
  M001: 'MCP_SERVER_START_FAILED',
  M002: 'MCP_TOOL_CALL_FAILED',
} as const;

// ユーザー向けエラーメッセージ
const USER_ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.A001]: 'ゅうりょく値が正しくありません。もう一度確認してください。',
  [ERROR_CODES.A002]: 'ログインが必要です。再度ログインしてください。',
  [ERROR_CODES.A003]: 'セキュリティエラーが発生しました。ページを再読み込みしてください。',
  [ERROR_CODES.A004]: '要求されたリソースが見つかりません。',
  [ERROR_CODES.A005]: 'ファイルが既に存在します。別の名前を選択してください。',
  [ERROR_CODES.A006]: 'サーバーでエラーが発生しました。しばらく待ってから再試行してください。',
  
  [ERROR_CODES.F001]: 'お使いのブラウザはファイル保存機能をサポートしていません。',
  [ERROR_CODES.F002]: 'フォルダへのアクセスが拒否されました。権限を確認してください。',
  [ERROR_CODES.F003]: 'ファイルの暗号化に失敗しました。パスワードを確認してください。',
  [ERROR_CODES.F004]: 'ファイルの復号に失敗しました。パスワードを確認してください。',
  
  [ERROR_CODES.S001]: '検索インデックスの構築に失敗しました。',
  [ERROR_CODES.S002]: '日本語解析システムの初期化に失敗しました。',
  [ERROR_CODES.M001]: 'AI連携機能の起動に失敗しました。',
  [ERROR_CODES.M002]: 'AI機能の呼び出しに失敗しました。',
};

// APIエラーインターフェース
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface APIResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  error?: APIError;
}

// エラーコードからユーザー向けメッセージを取得
export function mapErrorCodeToMessage(code: string): string {
  return USER_ERROR_MESSAGES[code] || '予期しないエラーが発生しました。';
}

// APIエラーをトースト通知に変換
export function handleApiError(error: APIError | Error | unknown, fallbackMessage?: string): void {
  if ((error as any)?.code && USER_ERROR_MESSAGES[(error as any).code]) {
    toast.error(USER_ERROR_MESSAGES[(error as any).code]);
  } else if ((error as any)?.message) {
    toast.error((error as any).message);
  } else {
    toast.error(fallbackMessage || '予期しないエラーが発生しました。');
  }
}

// Fetch APIレスポンスをハンドリング
export async function handleApiResponse<T>(response: Response): Promise<T> {
  const data: APIResponse<T> = await response.json();
  
  if (data.status === 'error' && data.error) {
    // TDD: 特定のエラーコードに対する分かりやすいメッセージ
    if (data.error.code === '1002') {
      throw new Error('User already exists');
    }
    if (data.error.code === '1001') {
      throw new Error('Invalid credentials');
    }
    throw data.error;
  }
  
  if (!response.ok) {
    throw {
      code: ERROR_CODES.A006,
      message: `HTTP ${response.status}: ${response.statusText}`,
    };
  }
  
  return data.data || data as T;
}

// 非同期操作のエラーハンドリングヘルパー
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage?: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    handleApiError(error, errorMessage);
    return null;
  }
}

// File System Access APIエラーの変換
export function handleFileSystemError(error: Error | unknown): void {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'AbortError':
        // ユーザーキャンセルは通知しない
        return;
      case 'NotAllowedError':
        handleApiError({ code: ERROR_CODES.F002 });
        return;
      case 'SecurityError':
        handleApiError({ code: ERROR_CODES.F002 });
        return;
      default:
        handleApiError({ code: ERROR_CODES.F001 });
        return;
    }
  }
  
  // その他のエラー
  handleApiError(error, 'ファイル操作中にエラーが発生しました。');
}