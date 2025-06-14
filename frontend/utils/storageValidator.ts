/**
 * ストレージ情報のバリデーション機能
 * 期待するデータがストレージに正しく保存されているかをチェックし、
 * デバッグ情報を提供する
 */

import { useEncryptionStore } from "../app/hooks/useEncryptionStore";
import { getLastDirectoryInfo } from "./dirHandleStore";

interface DirectoryInfo {
  name: string;
  path?: string;
  timestamp?: number;
}

interface AmvSettings {
  version?: string;
  theme?: Record<string, unknown>;
  canvas?: Record<string, unknown>;
  [key: string]: unknown;
}

interface StorageValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  info: {
    localStorage: {
      directoryInfo: DirectoryInfo | null;
      encryptionState: boolean;
      amvSettings: AmvSettings | null;
      guestFolderPath: string | null;
    };
    fileSystemAccess: {
      hasActiveHandle: boolean;
      permissionGranted: boolean | null;
      directoryName: string | null;
    };
    authentication: {
      hasJWTCookie: boolean;
      hasEncryptionPassword: boolean;
      accountUuid: string | null;
    };
    crossSession: {
      canReadEncryptedFiles: boolean;
      canReadGuestFiles: boolean;
      mixedAccessEnabled: boolean;
    };
  };
}

export async function validateStorageState(): Promise<StorageValidationResult> {
  const result: StorageValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    info: {
      localStorage: {
        directoryInfo: null,
        encryptionState: false,
        amvSettings: null,
        guestFolderPath: null,
      },
      fileSystemAccess: {
        hasActiveHandle: false,
        permissionGranted: null,
        directoryName: null,
      },
      authentication: {
        hasJWTCookie: false,
        hasEncryptionPassword: false,
        accountUuid: null,
      },
      crossSession: {
        canReadEncryptedFiles: false,
        canReadGuestFiles: false,
        mixedAccessEnabled: false,
      },
    },
  };

  try {
    // 1. LocalStorage情報の確認
    await validateLocalStorage(result);
    
    // 2. File System Access API の確認
    await validateFileSystemAccess(result);
    
    // 3. 認証情報の確認
    await validateAuthentication(result);
    
    // 4. クロスセッション機能の確認
    await validateCrossSessionAccess(result);
    
    // 5. 整合性チェック
    validateConsistency(result);
    
  } catch (error) {
    result.isValid = false;
    result.errors.push(`バリデーション処理でエラーが発生しました: ${error}`);
  }

  return result;
}

async function validateLocalStorage(result: StorageValidationResult): Promise<void> {
  try {
    // ディレクトリ情報の確認
    const directoryInfo = getLastDirectoryInfo();
    result.info.localStorage.directoryInfo = directoryInfo;
    
    if (!directoryInfo) {
      result.warnings.push('ディレクトリ情報がlocalStorageに保存されていません');
    }
    
    // 暗号化状態の確認
    const { password } = useEncryptionStore.getState();
    result.info.localStorage.encryptionState = !!password;
    
    // AMV設定の確認
    const amvSettings = localStorage.getItem('amv-system-settings');
    if (amvSettings) {
      try {
        result.info.localStorage.amvSettings = JSON.parse(amvSettings);
      } catch {
        result.warnings.push('AMV設定ファイルのJSON形式が不正です');
      }
    }
    
    // ゲストフォルダパスの確認
    result.info.localStorage.guestFolderPath = localStorage.getItem('amv-guest-folder-path');
    
  } catch (error) {
    result.errors.push(`LocalStorage確認エラー: ${error}`);
  }
}

async function validateFileSystemAccess(result: StorageValidationResult): Promise<void> {
  try {
    const { getStoredDir } = await import('./fileAccess');
    const dirHandle = await getStoredDir();
    
    result.info.fileSystemAccess.hasActiveHandle = !!dirHandle;
    
    if (dirHandle) {
      result.info.fileSystemAccess.directoryName = dirHandle.name;
      
      // 権限確認
      try {
        const permission = await (dirHandle as any).requestPermission({ mode: 'readwrite' });
        result.info.fileSystemAccess.permissionGranted = permission === 'granted';
        
        if (permission !== 'granted') {
          result.errors.push('ファイルシステムアクセス権限が拒否されています');
        }
      } catch (error) {
        result.errors.push(`ファイルシステム権限確認エラー: ${error}`);
        result.info.fileSystemAccess.permissionGranted = false;
      }
    } else {
      result.warnings.push('アクティブなディレクトリハンドルがありません');
    }
    
  } catch (error) {
    result.errors.push(`ファイルシステムアクセス確認エラー: ${error}`);
  }
}

async function validateAuthentication(result: StorageValidationResult): Promise<void> {
  try {
    // 暗号化パスワードの確認
    const { password } = useEncryptionStore.getState();
    result.info.authentication.hasEncryptionPassword = !!password;
    
    // JWT Cookieの確認（httpOnlyのため間接的にチェック）
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
      const response = await fetch(`${API_BASE_URL}/api/autologin`, {
        method: 'GET',
        credentials: 'include'
      });
      result.info.authentication.hasJWTCookie = response.ok;
      
      if (response.ok) {
        const data = await response.json();
        result.info.authentication.accountUuid = data.uuid || null;
      }
    } catch (error) {
      result.info.authentication.hasJWTCookie = false;
      result.warnings.push('JWT Cookie状態の確認に失敗しました');
    }
    
    // 認証状態の一貫性チェック
    if (result.info.authentication.hasJWTCookie && !result.info.authentication.hasEncryptionPassword) {
      result.warnings.push('認証されていますが、暗号化パスワードが設定されていません');
    }
    
    if (!result.info.authentication.hasJWTCookie && result.info.authentication.hasEncryptionPassword) {
      result.warnings.push('暗号化パスワードは設定されていますが、認証が無効です');
    }
    
  } catch (error) {
    result.errors.push(`認証情報確認エラー: ${error}`);
  }
}

async function validateCrossSessionAccess(result: StorageValidationResult): Promise<void> {
  try {
    const { password } = useEncryptionStore.getState();
    const isAuthenticated = !!password;
    
    // 暗号化ファイル読み込み可能性
    result.info.crossSession.canReadEncryptedFiles = isAuthenticated;
    
    // ゲストファイル読み込み可能性（常にtrue）
    result.info.crossSession.canReadGuestFiles = true;
    
    // 混合アクセス機能（認証時のみ）
    result.info.crossSession.mixedAccessEnabled = isAuthenticated;
    
    // ディレクトリ内のファイル構造確認
    if (result.info.fileSystemAccess.hasActiveHandle) {
      try {
        const { validateDirectoryStructure } = await import('./fileSystem');
        const hasAmvStructure = await validateDirectoryStructure();
        
        if (!hasAmvStructure) {
          result.warnings.push('選択されたディレクトリにAMV-System構造が見つかりません');
        }
      } catch (error) {
        result.warnings.push(`AMV-System構造確認に失敗しました: ${error}`);
      }
    }
    
  } catch (error) {
    result.errors.push(`クロスセッション機能確認エラー: ${error}`);
  }
}

function validateConsistency(result: StorageValidationResult): void {
  // JWT期間（90日）の確認は、httpOnly Cookieのため直接確認不可
  // 代わりに、認証状態とアカウントUUIDの整合性をチェック
  if (result.info.authentication.hasJWTCookie && result.info.authentication.accountUuid) {
    // JWTが有効であることは autologin API の成功で確認済み
    if (process.env.NODE_ENV === 'development') {
    }
  }

  // ディレクトリ情報とファイルシステムアクセスの整合性
  if (result.info.localStorage.directoryInfo && !result.info.fileSystemAccess.hasActiveHandle) {
    result.warnings.push('LocalStorageにディレクトリ情報は保存されていますが、アクティブなハンドルがありません');
  }

  // 認証状態とファイルアクセス機能の整合性
  if (result.info.authentication.hasEncryptionPassword && !result.info.fileSystemAccess.hasActiveHandle) {
    result.warnings.push('認証済みですが、ファイルシステムアクセスが設定されていません');
  }
}

/**
 * バリデーション結果を人間に読みやすい形式で出力
 */
export function formatValidationResult(result: StorageValidationResult): string {
  const lines: string[] = [];
  
  lines.push('📊 AMV-System ストレージバリデーション結果');
  lines.push(''.padEnd(50, '='));
  
  // 全体の状態
  lines.push(`🔍 全体状態: ${result.isValid ? '✅ 正常' : '❌ 問題あり'}`);
  
  if (result.errors.length > 0) {
    lines.push('\n❌ エラー:');
    result.errors.forEach(error => lines.push(`  • ${error}`));
  }
  
  if (result.warnings.length > 0) {
    lines.push('\n⚠️  警告:');
    result.warnings.forEach(warning => lines.push(`  • ${warning}`));
  }
  
  // 詳細情報
  lines.push('\n📋 詳細情報:');
  lines.push(`  • LocalStorage ディレクトリ情報: ${result.info.localStorage.directoryInfo ? '保存済み' : '未保存'}`);
  lines.push(`  • 暗号化状態: ${result.info.localStorage.encryptionState ? '有効' : '無効'}`);
  lines.push(`  • ファイルシステムアクセス: ${result.info.fileSystemAccess.hasActiveHandle ? '有効' : '無効'}`);
  lines.push(`  • 権限状態: ${result.info.fileSystemAccess.permissionGranted === true ? '許可' : result.info.fileSystemAccess.permissionGranted === false ? '拒否' : '不明'}`);
  lines.push(`  • JWT認証: ${result.info.authentication.hasJWTCookie ? '有効' : '無効'}`);
  lines.push(`  • クロスセッション機能: ${result.info.crossSession.mixedAccessEnabled ? '有効' : '無効'}`);
  
  if (result.info.authentication.accountUuid) {
    lines.push(`  • アカウントUUID: ${result.info.authentication.accountUuid}`);
  }
  
  if (result.info.fileSystemAccess.directoryName) {
    lines.push(`  • ディレクトリ名: ${result.info.fileSystemAccess.directoryName}`);
  }
  
  return lines.join('\n');
}

/**
 * ストレージ状態をコンソールに出力（開発用）
 */
export async function debugStorageState(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') return;
  
  
  try {
    await validateStorageState();
  } catch (error) {
  }
  
}