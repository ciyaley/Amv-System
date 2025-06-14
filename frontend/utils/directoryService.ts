// utils/directoryService.ts - ディレクトリ管理API連携サービス
export interface DirectoryMapping {
  directoryPath: string;
  lastAccessTime: string;
}

export interface DirectoryAssociationRequest {
  directoryPath: string;
}

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-url.com' 
  : 'http://localhost:8787';

/**
 * アカウントとディレクトリの関連付けを保存
 */
export async function saveDirectoryAssociation(directoryPath: string): Promise<boolean> {
  try {
    
    // 🔧 修正: クッキー状況をデバッグ
    const cookies = document.cookie;
    const hasToken = cookies.includes('token=');
    
    if (!hasToken) {
      return false;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/directory/associate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Cookie送信のため
      body: JSON.stringify({ directoryPath }),
    });

    if (response.status === 401) {
      return false;
    }

    if (!response.ok) {
      return false;
    }

    await response.json();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 現在ログイン中のアカウントに関連付けられたディレクトリを取得
 */
export async function getCurrentDirectoryMapping(): Promise<DirectoryMapping | null> {
  try {
    
    // 🔧 修正: クッキー状況をデバッグ
    const cookies = document.cookie;
    const hasToken = cookies.includes('token=');
    
    if (!hasToken) {
      return null;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/directory/current`, {
      method: 'GET',
      credentials: 'include', // Cookie送信のため
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      // 関連付けが存在しない場合
      return null;
    }

    if (response.status === 401) {
      // 認証失敗
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    
    return {
      directoryPath: result.directoryPath,
      lastAccessTime: result.lastAccessTime,
    };
  } catch (error) {
    return null;
  }
}

/**
 * ディレクトリ関連付けを削除
 */
export async function removeDirectoryAssociation(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/directory/remove`, {
      method: 'DELETE',
      credentials: 'include', // Cookie送信のため
    });

    if (!response.ok) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}