// 統一エラーコードシステム
export interface APIError {
  code: string;
  message: string;
  details?: any;
}

// エラーコード定義
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

// エラーメッセージマッピング
export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.A001]: 'バリデーション失敗',
  [ERROR_CODES.A002]: '認証失敗またはJWT失効',
  [ERROR_CODES.A003]: 'CSRFトークン不一致',
  [ERROR_CODES.A004]: 'リソースが見つかりません',
  [ERROR_CODES.A005]: 'ファイル競合が発生しました',
  [ERROR_CODES.A006]: '内部サーバーエラー',
  
  [ERROR_CODES.F001]: 'File System Access API非対応',
  [ERROR_CODES.F002]: 'ディレクトリアクセス拒否',
  [ERROR_CODES.F003]: 'ファイル暗号化失敗',
  [ERROR_CODES.F004]: 'ファイル復号失敗',
  
  [ERROR_CODES.S001]: '検索インデックス構築失敗',
  [ERROR_CODES.S002]: 'TinySegmenter初期化失敗',
  [ERROR_CODES.M001]: 'MCPサーバー起動失敗',
  [ERROR_CODES.M002]: 'MCPツール呼び出し失敗',
};

export function createAPIError(code: string, details?: any): APIError {
  return {
    code,
    message: ERROR_MESSAGES[code] || '不明なエラー',
    details,
  };
}

export function createResponse(success: boolean, data?: any, error?: APIError) {
  if (success) {
    return Response.json({ status: 'success', data });
  } else {
    const statusCode = getHttpStatusFromErrorCode(error?.code || ERROR_CODES.A006);
    return Response.json({ status: 'error', error }, { status: statusCode });
  }
}

function getHttpStatusFromErrorCode(code: string): number {
  switch (code) {
    case ERROR_CODES.A001: return 400; // Bad Request
    case ERROR_CODES.A002: return 401; // Unauthorized
    case ERROR_CODES.A003: return 403; // Forbidden
    case ERROR_CODES.A004: return 404; // Not Found
    case ERROR_CODES.A005: return 409; // Conflict
    case ERROR_CODES.A006: return 500; // Internal Server Error
    default: return 500;
  }
}