// utils/fileSystem/account-operations.ts - アカウント関連操作
// Extracted from operations.ts for better maintainability

import type { MemoData } from "../../app/types/tools";
import { 
  getStoredDir,
  storeDirHandle,
  createAmvSystemStructure,
  requestDirectory
} from "./core-modular";
import { loadAllMemos, saveIndividualMemo } from "./memo-operations";

// ====================================================================================
// ACCOUNT OWNERSHIP MANAGEMENT
// ====================================================================================

interface AccountOwnership {
  accountUuid: string;
  createdAt: string;
  lastAccessAt: string;
  directoryPath?: string;
  version: string;
}

export async function validateAccountOwnership(
  directory: FileSystemDirectoryHandle, 
  accountUuid: string
): Promise<boolean> {
  try {
    const accountFile = await directory.getFileHandle('.amv_account.json');
    const file = await accountFile.getFile();
    const data: AccountOwnership = JSON.parse(await file.text());
    return data.accountUuid === accountUuid;
  } catch {
    return false;
  }
}

export async function saveDirectoryAssociation(
  directory: FileSystemDirectoryHandle,
  accountUuid: string,
  directoryPath?: string
): Promise<void> {
  try {
    const accountData: AccountOwnership = {
      accountUuid,
      createdAt: new Date().toISOString(),
      lastAccessAt: new Date().toISOString(),
      directoryPath: directoryPath || directory.name,
      version: "2.0"
    };
    
    const handle = await directory.getFileHandle('.amv_account.json', { create: true });
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(accountData, null, 2));
    await writable.close();
    
  } catch (error) {
    throw error;
  }
}

// ====================================================================================
// GUEST MODE OPERATIONS
// ====================================================================================

export async function restoreFromGuestFolder(): Promise<MemoData[]> {
  try {
    if (typeof window === 'undefined' || !(window as any).showDirectoryPicker) {
      return [];
    }
    
    const dirHandle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents',
      id: 'amv-guest-restore'
    });
    
    let amvDir: FileSystemDirectoryHandle;
    try {
      amvDir = await dirHandle.getDirectoryHandle('Amv_system');
    } catch {
      return [];
    }
    
    await storeDirHandle(amvDir);
    const memos = await loadAllMemos();
    
    return memos;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return [];
    }
    
    throw error;
  }
}

export async function saveMemosGuestMode(memos: MemoData[]): Promise<void> {
  try {
    let currentDir = await getStoredDir();
    
    if (!currentDir) {
      currentDir = await requestDirectory();
      if (!currentDir) {
        throw new Error('ディレクトリが選択されませんでした');
      }
    }
    
    await createAmvSystemStructure();
    
    // 各メモを個別に保存
    for (const memo of memos) {
      try {
        await saveIndividualMemo(memo);
      } catch (error) {
        // 個別のメモ保存エラーは継続して他のメモを保存
      }
    }
    
  } catch (error) {
    throw error;
  }
}

// ====================================================================================
// DIRECTORY RESTORE OPERATIONS
// ====================================================================================

interface DirectoryRestoreResult {
  success: boolean;
  restoredDirectory: FileSystemDirectoryHandle | null;
  memoCount: number;
  error?: string;
}

export async function attemptDirectoryRestore(accountUuid: string): Promise<DirectoryRestoreResult> {
  try {
    // 保存されたディレクトリハンドルを確認
    const currentDir = await getStoredDir();
    
    if (!currentDir) {
      return {
        success: false,
        restoredDirectory: null,
        memoCount: 0,
        error: 'No saved directory handle found'
      };
    }
    
    // アカウント所有権を確認
    const isOwner = await validateAccountOwnership(currentDir, accountUuid);
    if (!isOwner) {
      return {
        success: false,
        restoredDirectory: null,
        memoCount: 0,
        error: 'Directory is associated with a different account'
      };
    }
    
    // メモを読み込んで数を確認
    const memos = await loadAllMemos();
    
    return {
      success: true,
      restoredDirectory: currentDir,
      memoCount: memos.length
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('no longer accessible')) {
      return {
        success: false,
        restoredDirectory: null,
        memoCount: 0,
        error: 'Saved directory is no longer accessible'
      };
    }
    
    return {
      success: false,
      restoredDirectory: null,
      memoCount: 0,
      error: errorMessage
    };
  }
}

export async function saveDirectoryAssociationForAccount(
  accountUuid: string, 
  directory: FileSystemDirectoryHandle
): Promise<void> {
  try {
    await saveDirectoryAssociation(directory, accountUuid);
    await storeDirHandle(directory);
  } catch (error) {
    throw error;
  }
}