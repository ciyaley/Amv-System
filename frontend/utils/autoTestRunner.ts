/**
 * 自動テストランナー
 * 修正後の動作確認を自動化
 */

import { validateStorageState, formatValidationResult } from './storageValidator';

export interface AutoTestResult {
  timestamp: string;
  success: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
}

/**
 * ストレージ状態の自動テスト
 */
export async function runStorageTest(): Promise<AutoTestResult> {
  const timestamp = new Date().toISOString();
  
  try {
    
    const result = await validateStorageState();
    formatValidationResult(result);
    
    
    const testResult: AutoTestResult = {
      timestamp,
      success: result.isValid && result.errors.length === 0,
      errors: result.errors,
      warnings: result.warnings,
      details: result.info
    };
    
    if (testResult.success) {
    } else {
    }
    
    return testResult;
    
  } catch (error) {
    return {
      timestamp,
      success: false,
      errors: [`テスト実行エラー: ${error}`],
      warnings: [],
      details: {}
    };
  }
}

/**
 * JWT認証の詳細テスト
 */
export async function runJWTTest(): Promise<{
  cookieExists: boolean;
  autologinWorks: boolean;
  backendResponse: Record<string, unknown>;
  error?: string;
}> {
  try {
    
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
    
    // 1. autologin APIのテスト
    const response = await fetch(`${API_BASE_URL}/api/autologin`, {
      method: 'GET',
      credentials: 'include'
    });
    
    const autologinWorks = response.ok;
    let backendResponse = null;
    
    if (response.ok) {
      backendResponse = await response.json();
    } else {
      const errorText = await response.text();
      backendResponse = { error: errorText, status: response.status };
    }
    
    // 2. Cookie存在確認（間接的）
    const cookieExists = autologinWorks; // autologinが成功すればCookieが存在
    
    
    
    return {
      cookieExists,
      autologinWorks,
      backendResponse
    };
    
  } catch (error) {
    return {
      cookieExists: false,
      autologinWorks: false,
      backendResponse: {},
      error: String(error)
    };
  }
}

/**
 * 完全な自動テストスイート
 */
export async function runFullAutoTest(): Promise<void> {
  
  // 1. JWT認証テスト
  const jwtResult = await runJWTTest();
  
  // 2. ストレージテスト
  const storageResult = await runStorageTest();
  
  // 3. 総合判定
  const overallSuccess = jwtResult.autologinWorks && storageResult.success;
  
  
  if (!overallSuccess) {
    if (!jwtResult.autologinWorks) {
    }
    if (!storageResult.success) {
    }
  }
}

/**
 * 開発用：自動テストを定期実行
 */
export function startAutoTestWatcher(): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  
  let lastHash = '';
  const interval = setInterval(async () => {
    const currentResult = await runStorageTest();
    const currentHash = JSON.stringify(currentResult);
    
    if (currentHash !== lastHash) {
      await runFullAutoTest();
      lastHash = currentHash;
    }
  }, 5000);
  
  // 5分後に自動停止
  setTimeout(() => {
    clearInterval(interval);
  }, 300000);
}