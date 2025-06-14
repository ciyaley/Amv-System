// utils/dirHandleStore.ts
// AMV_SYSTEM_SPECIFICATION.md 1.5準拠: localStorageでフォルダパス記憶

const DIRECTORY_PATH_KEY = 'amv-last-directory-path';
const DIRECTORY_NAME_KEY = 'amv-last-directory-name';

// クライアントサイドでのみlocalStorageを使用
const isClient = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

/**
 * 最後に選択したディレクトリの情報を保存
 * 仕様書1.5: フォルダパス記憶（localStorage）
 */
export async function saveDirectoryInfo(handle: FileSystemDirectoryHandle): Promise<void> {
  if (!isClient) {
    return;
  }
  
  try {
    // ディレクトリ名のみ保存（パスは取得困難なため）
    const directoryInfo = {
      name: handle.name,
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem(DIRECTORY_NAME_KEY, JSON.stringify(directoryInfo));
    
    if (process.env.NODE_ENV === 'development') {
    }
  } catch (error) {
  }
}

/**
 * 最後に選択したディレクトリの情報を取得
 */
export function getLastDirectoryInfo(): { name: string; savedAt: string } | null {
  if (!isClient) {
    return null;
  }
  
  try {
    const stored = localStorage.getItem(DIRECTORY_NAME_KEY);
    if (!stored) {
      return null;
    }
    
    return JSON.parse(stored);
  } catch (error) {
    return null;
  }
}

/**
 * ディレクトリ情報をクリア
 */
export function clearDirectoryInfo(): void {
  if (!isClient) {
    return;
  }
  
  try {
    localStorage.removeItem(DIRECTORY_NAME_KEY);
    localStorage.removeItem(DIRECTORY_PATH_KEY); // 旧キーも削除
  } catch (error) {
  }
}

/**
 * アカウント別のディレクトリ関連付け情報を保存
 * 仕様書2.5.2: アカウント別ディレクトリ管理
 */
export function saveAccountDirectoryAssociation(accountUuid: string, directoryName: string): void {
  if (!isClient) {
    return;
  }
  
  try {
    const associationInfo = {
      directoryName,
      accountUuid,
      lastAccessTime: new Date().toISOString()
    };
    
    localStorage.setItem(`amv-directory-${accountUuid}`, JSON.stringify(associationInfo));
  } catch (error) {
  }
}

/**
 * アカウント別のディレクトリ関連付け情報を取得
 */
export function getAccountDirectoryAssociation(accountUuid: string): { directoryName: string; lastAccessTime: string } | null {
  if (!isClient) {
    return null;
  }
  
  try {
    const stored = localStorage.getItem(`amv-directory-${accountUuid}`);
    if (!stored) {
      return null;
    }
    
    return JSON.parse(stored);
  } catch (error) {
    return null;
  }
}

/**
 * アカウント別のディレクトリ関連付け情報をクリア
 */
export function clearAccountDirectoryAssociation(accountUuid: string): void {
  if (!isClient) {
    return;
  }
  
  try {
    localStorage.removeItem(`amv-directory-${accountUuid}`);
  } catch (error) {
  }
}

// 下位互換のための関数（段階的移行用）
export async function saveDirHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await saveDirectoryInfo(handle);
}

export async function loadDirHandle(): Promise<FileSystemDirectoryHandle | null> {
  return null;
}

export async function clearDirHandle(): Promise<void> {
  clearDirectoryInfo();
}