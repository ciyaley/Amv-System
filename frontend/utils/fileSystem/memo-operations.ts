// utils/fileSystem/memo-operations.ts - メモ関連操作
// Extracted from operations.ts for better maintainability

import { encryptData, decryptData } from "../encryption";
import { useEncryptionStore } from "../../app/hooks/useEncryptionStore";
import type { MemoData } from "../../app/types/tools";
import { 
  getStoredDir, 
  validateHandle, 
  sanitizeFilename, 
  MEMOS_DIR, 
  ensureDir,
  checkFileSystemEnabled
} from "./core-modular";

// ====================================================================================
// MEMO METADATA MANAGEMENT
// ====================================================================================

interface MemoMetadata {
  [memoId: string]: string; // memoId -> filename
}

export async function loadMemoMetadata(): Promise<MemoMetadata> {
  const root = await getStoredDir();
  if (!root) return {};
  
  try {
    const handle = await root.getFileHandle('.memo_metadata.json');
    const file = await handle.getFile();
    if (!file.size) return {};
    return JSON.parse(await file.text());
  } catch {
    return {};
  }
}

async function saveMemoMetadata(memoId: string, filename: string) {
  const root = await ensureDir();
  const metadata = await loadMemoMetadata();
  metadata[memoId] = filename;
  
  // 古いメタデータのクリーンアップ（存在しないファイルのエントリを削除）
  try {
    const memosDir = await root.getDirectoryHandle(MEMOS_DIR);
    const validIds = new Set<string>();
    
    // @ts-ignore
    for await (const entry of memosDir.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json') && !entry.name.startsWith('.')) {
        const idMatch = entry.name.match(/([a-zA-Z0-9_-]+)\.json$/);
        if (idMatch && metadata[idMatch[1]]) {
          validIds.add(idMatch[1]);
        }
      }
    }
    
    // 存在しないファイルのメタデータを削除
    Object.keys(metadata).forEach(id => {
      if (id !== memoId && !validIds.has(id)) {
        delete metadata[id];
      }
    });
  } catch (e) {
    // メタデータクリーンアップが失敗してもメイン処理は続行
  }
  
  const handle = await root.getFileHandle('.memo_metadata.json', { create: true });
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(metadata, null, 2));
  await writable.close();
}

// ====================================================================================
// MEMO CRUD OPERATIONS
// ====================================================================================

export async function saveIndividualMemo(memo: MemoData) {
  try {
    const root = await ensureDir();
    
    if (!(await validateHandle(root))) {
      throw new Error("ディレクトリハンドルが無効になっています。再度ディレクトリを選択してください。");
    }
    
    const permission = await (root as any).requestPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      throw new Error("ファイルへの書き込み権限が許可されていません");
    }
    
    const memosDir = await root.getDirectoryHandle(MEMOS_DIR, { create: true });
    
    const { password } = useEncryptionStore.getState();
    const shouldEncrypt = !!password;
    
    const cleanTitle = sanitizeFilename(memo.title || memo.id);
    const filename = `${cleanTitle}_${memo.id}.json`;
    
    // 既存ファイルチェックと削除
    try {
      await memosDir.removeEntry(filename);
    } catch {
      // ファイルが存在しない場合は無視
    }
    
    // 暗号化処理
    const memoToSave = { ...memo };
    if (shouldEncrypt && password) {
      const encryptedContent = await encryptData(memo.content || memo.text || '', password);
      const encryptedTitle = await encryptData(memo.title || '', password);
      memoToSave.content = JSON.stringify(encryptedContent);
      memoToSave.title = JSON.stringify(encryptedTitle);
    }
    
    const fileHandle = await memosDir.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    
    try {
      await writable.write(JSON.stringify(memoToSave, null, 2));
      await writable.close();
    } catch (writeError) {
      try {
        await writable.abort();
      } catch (abortError) {
        // Ignore abort errors
      }
      throw writeError;
    }
    
    await saveMemoMetadata(memo.id, filename);
    
  } catch (error) {
    throw error;
  }
}

export async function loadAllMemos(): Promise<MemoData[]> {
  if (!checkFileSystemEnabled()) {
    return [];
  }

  try {
    const root = await getStoredDir();
    if (!root) return [];
    
    const memosDir = await root.getDirectoryHandle(MEMOS_DIR);
    const memos: MemoData[] = [];
    const { password } = useEncryptionStore.getState();
    const loadedIds = new Set<string>();
    
    // @ts-ignore
    for await (const entry of memosDir.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json') && !entry.name.startsWith('.')) {
        try {
          const file = await entry.getFile();
          if (!file.size) continue;
          
          const data = JSON.parse(await file.text());
          
          if (data.id && loadedIds.has(data.id)) {
            continue;
          }
          
          // 復号化処理
          if (password && data.content && data.title) {
            try {
              const contentToDecode = typeof data.content === 'string' && data.content.startsWith('{') 
                ? JSON.parse(data.content) 
                : data.content;
              const titleToDecode = typeof data.title === 'string' && data.title.startsWith('{') 
                ? JSON.parse(data.title) 
                : data.title;
              
              data.content = await decryptData(contentToDecode, password);
              data.title = await decryptData(titleToDecode, password);
            } catch (decryptError) {
              // 復号化に失敗した場合は暗号化されたデータのまま読み込み
            }
          }
          
          // データ正規化
          if (!data.id) {
            const idMatch = entry.name.match(/([a-zA-Z0-9_-]+)\.json$/);
            data.id = idMatch ? idMatch[1] : `memo_${Date.now()}`;
          }
          
          if (!data.type) data.type = 'memo';
          if (typeof data.x !== 'number') data.x = 100;
          if (typeof data.y !== 'number') data.y = 100;
          if (typeof data.w !== 'number') data.w = 300;
          if (typeof data.h !== 'number') data.h = 200;
          if (typeof data.zIndex !== 'number') data.zIndex = 1;
          
          // 後方互換性
          if (!data.content && data.text) {
            data.content = data.text;
          }
          if (!data.text && data.content) {
            data.text = data.content;
          }
          
          loadedIds.add(data.id);
          memos.push(data);
        } catch (error) {
          // ファイル読み込みエラーは無視して続行
        }
      }
    }
    
    return memos;
  } catch (error) {
    return [];
  }
}

export async function deleteMemoFile(memoId: string): Promise<boolean> {
  try {
    const root = await getStoredDir();
    if (!root) return false;
    
    const memosDir = await root.getDirectoryHandle(MEMOS_DIR);
    const metadata = await loadMemoMetadata();
    
    const filename = metadata[memoId];
    if (filename) {
      try {
        await memosDir.removeEntry(filename);
        
        delete metadata[memoId];
        const handle = await root.getFileHandle('.memo_metadata.json', { create: true });
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(metadata, null, 2));
        await writable.close();
        
        return true;
      } catch (error) {
        // ファイル削除エラー
      }
    }
    
    // メタデータにない場合は直接検索
    // @ts-ignore
    for await (const entry of memosDir.values()) {
      if (entry.kind === 'file' && entry.name.includes(memoId)) {
        try {
          await memosDir.removeEntry(entry.name);
          return true;
        } catch (error) {
          // ファイル削除エラー
        }
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}