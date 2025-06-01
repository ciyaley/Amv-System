import { encryptData, decryptData } from "./encryption";
import { useEncryptionStore } from "../app/hooks/useEncryptionStore";
import { saveDirHandle, loadDirHandle } from "./dirHandleStore";
import type { MemoData } from "../app/hooks/useMemos";

const FOLDER_NAME = "Amv_system";
const MEMOS_DIR = "memos";
const URLS_DIR = "urls";
const ASSETS_DIR = "assets";
const EXPORTS_DIR = "exports";
const WORKSPACE_FILENAME = "workspace.json";
const SETTINGS_FILENAME = "settings.json";

// 禁止文字を安全な文字に置換
const sanitizeFilename = (filename: string | undefined): string => {
  if (!filename || typeof filename !== 'string') {
    return 'untitled';
  }
  
  const forbidden = /[<>:"/\\|?*\[\]\{\}\(\)#]/g;
  const sanitized = filename
    .replace(forbidden, '_')
    .replace(/^\./, '_') // 先頭ピリオド
    .replace(/[\s\.]+$/, '') // 末尾スペース・ピリオド
    .slice(0, 255); // 255文字制限
  
  return sanitized || 'untitled';
};

let dirHandle: FileSystemDirectoryHandle | null = null;

/* ハンドルの有効性を確認する関数 */
async function validateHandle(handle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    // 複数の方法でハンドルの有効性をチェック
    await (handle as any).requestPermission({ mode: "readwrite" });
    
    // 実際にディレクトリにアクセスして有効性を確認
    for await (const _ of (handle as any).values()) {
      // 最初のエントリだけチェックして即座に抜ける
      break;
    }
    
    return true;
  } catch (error) {
    console.warn('File handle validation failed:', error);
    return false;
  }
}

/* ① 永続ハンドル取得（なければ null） */
export async function getStoredDir(): Promise<FileSystemDirectoryHandle | null> {
  if (dirHandle) {
    // ハンドルの有効性をチェック
    if (await validateHandle(dirHandle)) {
      return dirHandle;
    } else {
      // ハンドルが無効な場合はリセット
      dirHandle = null;
    }
  }
  
  dirHandle = await loadDirHandle();
  if (dirHandle) {
    // 読み込んだハンドルの有効性もチェック
    if (await validateHandle(dirHandle)) {
      return dirHandle;
    } else {
      dirHandle = null;
    }
  }
  
  return dirHandle;
}

/* ② 初回のみディレクトリ選択 */
export async function requestDirectory(): Promise<FileSystemDirectoryHandle> {
  try {
    // @ts-ignore
    const picked: FileSystemDirectoryHandle = await window.showDirectoryPicker();
    
    // Amv_system サブフォルダを確保
    const ws = await picked.getDirectoryHandle(FOLDER_NAME, { create: true });
    
    // パーミッション確認
    const res = await (ws as any).requestPermission({ mode: "readwrite" });
    if (res !== "granted") throw new Error("permission denied");

    // ディレクトリ構造を作成
    await ws.getDirectoryHandle(MEMOS_DIR, { create: true });
    await ws.getDirectoryHandle(URLS_DIR, { create: true });
    await ws.getDirectoryHandle(ASSETS_DIR, { create: true });
    await ws.getDirectoryHandle(EXPORTS_DIR, { create: true });

    await saveDirHandle(ws);
    dirHandle = ws;
    return ws;
  } catch (error) {
    // 🚫 要件定義に従った適切なエラーハンドリング
    if (error instanceof DOMException && error.name === 'AbortError') {
      // ユーザーがキャンセルした場合
      throw new Error('USER_CANCELLED');
    }
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      // 権限が拒否された場合
      throw new Error('PERMISSION_DENIED');
    }
    if (error instanceof DOMException && error.name === 'SecurityError') {
      // セキュリティエラー
      throw new Error('SECURITY_ERROR');
    }
    
    // その他のエラー
    console.error('Directory selection failed:', error);
    throw error;
  }
}

async function ensureDir(): Promise<FileSystemDirectoryHandle> {
  const stored = await getStoredDir();
  if (stored) return stored;
  
  // ディレクトリが未設定でパスワードもない場合はエラー
  const { password } = useEncryptionStore.getState();
  if (!password) {
    throw new Error("未ログイン状態では手動保存のみ利用できます。ディレクトリを選択してください。");
  }
  
  return await requestDirectory();
}

/* ③ ワークスペース保存・読み込み */
export async function saveWorkspace(data: any) {
  const root = await ensureDir();
  const handle = await root.getFileHandle(WORKSPACE_FILENAME, { create: true });
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

export async function loadWorkspace(): Promise<any | null> {
  const dir = await getStoredDir();
  if (!dir) return null;
  
  try {
    const handle = await dir.getFileHandle(WORKSPACE_FILENAME);
    const file = await handle.getFile();
    if (!file.size) return null;
    return JSON.parse(await file.text());
  } catch {
    return null;
  }
}

/* ④ メモの個別保存 */
export async function saveIndividualMemo(memo: MemoData) {
  try {
    const root = await ensureDir();
    
    // ハンドルの有効性を再チェック
    if (!(await validateHandle(root))) {
      throw new Error("ディレクトリハンドルが無効になっています。再度ディレクトリを選択してください。");
    }
    
    // 権限確認とメモディレクトリ取得
    const permission = await (root as any).requestPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      throw new Error("ファイルへの書き込み権限が許可されていません");
    }
    
    const memosDir = await root.getDirectoryHandle(MEMOS_DIR, { create: true });
    
    // 既存ファイルのチェックと削除
    const metadata = await loadMemoMetadata();
    const existingFilename = metadata[memo.id];
    
    if (existingFilename) {
      try {
        // 既存ファイルを削除
        await memosDir.removeEntry(existingFilename);
        if (process.env.NODE_ENV === 'development') {
          console.log(`Removed existing file: ${existingFilename}`);
        }
      } catch (e) {
        // ファイルが既に存在しない場合は無視
        if (process.env.NODE_ENV === 'development') {
          console.log(`File ${existingFilename} does not exist, continuing...`);
        }
      }
    }
    
    // 新しいファイル名を生成（IDベース）
    let finalFilename = `${memo.id}.json`;
    
    // タイトルベースの読みやすいファイル名も試行
    if (memo.title && memo.title.trim()) {
      const titleFilename = `${sanitizeFilename(memo.title)}_${memo.id.slice(-8)}.json`;
      finalFilename = titleFilename;
    }
    
    const handle = await memosDir.getFileHandle(finalFilename, { create: true });
    
    // WritableStreamの作成時もエラーハンドリング
    let writable: FileSystemWritableFileStream;
    try {
      writable = await handle.createWritable();
    } catch (error) {
      // InvalidStateErrorなどに対応
      dirHandle = null; // ハンドルをリセット
      throw new Error(`ファイル書き込みストリームの作成に失敗しました: ${error}`);
    }
    
    try {
      // ログイン時は暗号化、未ログイン時は平文
      const pw = useEncryptionStore.getState().password;
      let dataToWrite: string;
      
      if (pw) {
        const encrypted = await encryptData(memo, pw);
        dataToWrite = JSON.stringify(encrypted);
      } else {
        dataToWrite = JSON.stringify(memo, null, 2);
      }
      
      await writable.write(dataToWrite);
      await writable.close();
      
      // メタデータを保存（ファイル名とIDの対応）
      await saveMemoMetadata(memo.id, finalFilename);
    } catch (writeError) {
      // 書き込みエラー時はストリームを確実に閉じる
      try {
        await writable.abort();
      } catch (abortError) {
        console.warn('Failed to abort writable stream:', abortError);
      }
      throw writeError;
    }
  } catch (error) {
    // 全体のエラーハンドリング
    console.error('Failed to save memo:', error);
    
    // InvalidStateErrorの場合はハンドルをリセット
    if (error instanceof DOMException && error.name === 'InvalidStateError') {
      dirHandle = null;
      throw new Error('ファイルハンドルの状態が無効になりました。再度ディレクトリを選択してください。');
    }
    
    throw error;
  }
}

/* ⑤ メモのメタデータ管理 */
interface MemoMetadata {
  [memoId: string]: string; // memoId -> filename
}

async function loadMemoMetadata(): Promise<MemoMetadata> {
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
        // ファイル名からIDを抽出して追加
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
    if (process.env.NODE_ENV === 'development') {
      console.log('Metadata cleanup failed:', e);
    }
  }
  
  const handle = await root.getFileHandle('.memo_metadata.json', { create: true });
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(metadata, null, 2));
  await writable.close();
}

/* ⑥ メモの読み込み */
/* ⑤ AMV-systemファイル構造チェック */
export async function checkAmvSystemStructure(): Promise<boolean> {
  try {
    const dir = await getStoredDir();
    if (!dir) return false;
    
    // 既存ファイル・フォルダの存在チェック
    const existingItems: string[] = [];
    
    // @ts-ignore
    for await (const entry of dir.values()) {
      existingItems.push(entry.name);
    }
    
    // memosフォルダの存在チェック
    const hasMemosDir = existingItems.includes('memos');
    
    // 最低限memosフォルダがあればAMV-system構造と判定
    if (hasMemosDir) {
      if (process.env.NODE_ENV === 'development') {
        console.log('AMV-system structure detected:', {
          hasMemosDir,
          existingItems
        });
      }
      return true;
    }
    
    return false;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Failed to check AMV-system structure:', error);
    }
    return false;
  }
}

/* ⑥ メモの読み込み */
export async function loadAllMemos(): Promise<MemoData[]> {
  const dir = await getStoredDir();
  if (!dir) return [];
  
  try {
    const memosDir = await dir.getDirectoryHandle(MEMOS_DIR);
    const memos: MemoData[] = [];
    const loadedIds = new Set<string>(); // 重複防止
    const pw = useEncryptionStore.getState().password;
    
    // @ts-ignore
    for await (const entry of memosDir.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json') && !entry.name.startsWith('.')) {
        try {
          const file = await entry.getFile();
          const content = await file.text();
          const data = JSON.parse(content);
          
          let memo: MemoData | null = null;
          
          // 暗号化されているかチェック
          if (data.encryptedData && data.salt && data.iv) {
            if (pw) {
              memo = await decryptData<MemoData>(data, pw);
            }
          } else {
            // 平文の場合
            memo = data as MemoData;
          }
          
          // 重複チェック：同じIDのメモは1つだけ
          if (memo && memo.id && !loadedIds.has(memo.id)) {
            memos.push(memo);
            loadedIds.add(memo.id);
          } else if (memo && memo.id && loadedIds.has(memo.id)) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`Skipping duplicate memo ID: ${memo.id} from file: ${entry.name}`);
            }
          }
        } catch (e) {
          console.error(`Failed to load memo ${entry.name}:`, e);
        }
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Loaded ${memos.length} unique memos from ${loadedIds.size} files`);
    }
    
    return memos;
  } catch {
    return [];
  }
}

/* ⑦ メモの削除 */
export async function deleteMemoFile(memoId: string) {
  const dir = await getStoredDir();
  if (!dir) return;
  
  const metadata = await loadMemoMetadata();
  const filename = metadata[memoId];
  if (!filename) return;
  
  try {
    const memosDir = await dir.getDirectoryHandle(MEMOS_DIR);
    await memosDir.removeEntry(filename);
    
    // メタデータからも削除
    delete metadata[memoId];
    const root = await ensureDir();
    const handle = await root.getFileHandle('.memo_metadata.json', { create: true });
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(metadata, null, 2));
    await writable.close();
  } catch (e) {
    console.error("Failed to delete memo file:", e);
  }
}

/* ⑧ 旧形式の保存・読み込み（後方互換性のため残す） */
export async function saveEncrypted(type: "memo" | "layout", data: any) {
  const pw = useEncryptionStore.getState().password;
  if (!pw) throw new Error("暗号鍵がありません。");
  const enc = await encryptData(data, pw);
  const root = await ensureDir();
  const name = type === "memo" ? "memoData.json" : "layoutData.json";
  const h = await root.getFileHandle(name, { create: true });
  const w = await h.createWritable();
  await w.write(JSON.stringify(enc));
  await w.close();
}

export async function loadEncrypted<T>(type: "memo" | "layout"): Promise<T | null> {
  const dir = await getStoredDir();
  if (!dir) return null;
  const name = type === "memo" ? "memoData.json" : "layoutData.json";
  const handle = await dir.getFileHandle(name, { create: false }).catch(() => null);
  if (!handle) return null;

  const file = await handle.getFile();
  if (!file.size) return null;

  const enc = JSON.parse(await file.text());
  const pw = useEncryptionStore.getState().password;
  if (!pw) throw new Error("暗号鍵がありません。");
  return decryptData<T>(enc, pw);
}

/* ⑩ ログアウト時のデータクリア */
export function clearFileSystemCache(): void {
  // ディレクトリハンドルをクリア
  dirHandle = null;
  
  // メモリキャッシュもクリア（他にキャッシュがあれば追加）
  console.log('File system cache cleared');
}

/* ⑪ ハンドルの状態リセット */
export function resetDirectoryHandle(): void {
  dirHandle = null;
  console.log('Directory handle reset');
}

/* ⑫ アカウント関連付けファイル管理 */
interface AccountOwnership {
  accountUuid: string;
  createdAt: string;
  lastAccessAt: string;
  directoryPath: string;
  version: string;
}

export async function saveAccountAssociation(accountUuid: string, directoryPath: string): Promise<void> {
  try {
    const root = await ensureDir();
    
    const accountData: AccountOwnership = {
      accountUuid,
      createdAt: new Date().toISOString(),
      lastAccessAt: new Date().toISOString(),
      directoryPath,
      version: "2.0"
    };

    const handle = await root.getFileHandle('.amv_account.json', { create: true });
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(accountData, null, 2));
    await writable.close();

    if (process.env.NODE_ENV === 'development') {
      console.log(`Account association saved for ${accountUuid}`);
    }
  } catch (error) {
    console.error('Failed to save account association:', error);
  }
}

export async function validateAccountOwnership(directory: FileSystemDirectoryHandle, accountUuid: string): Promise<boolean> {
  try {
    const accountFile = await directory.getFileHandle('.amv_account.json');
    const file = await accountFile.getFile();
    const data: AccountOwnership = JSON.parse(await file.text());
    return data.accountUuid === accountUuid;
  } catch {
    return false; // ファイルが存在しない、または形式が不正
  }
}

/* ⑬ ディレクトリ復元API */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export async function saveDirectoryAssociation(accountUuid: string, directoryPath: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/directory/associate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        directoryPath,
        lastAccessTime: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to save directory association: ${response.statusText}`);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`Directory association saved to backend for ${accountUuid}`);
    }
  } catch (error) {
    console.error('Failed to save directory association to backend:', error);
    // バックエンド保存に失敗してもローカル処理は続行
  }
}

export async function fetchAccountDirectory(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/directory/current`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // ディレクトリ関連付けが存在しない
      }
      throw new Error(`Failed to fetch directory: ${response.statusText}`);
    }

    const data = await response.json();
    return data.directoryPath;
  } catch (error) {
    console.error('Failed to fetch account directory:', error);
    return null;
  }
}

/* ⑭ 自動ディレクトリ復元 */
export async function restoreAccountDirectory(accountUuid: string): Promise<boolean> {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Attempting to restore directory for account: ${accountUuid}`);
    }

    // 1. バックエンドから関連付けディレクトリを取得
    const savedPath = await fetchAccountDirectory();
    if (!savedPath) {
      if (process.env.NODE_ENV === 'development') {
        console.log('No saved directory path found');
      }
      return false;
    }

    // 2. 保存済みハンドルの有効性確認
    const storedHandle = await getStoredDir();
    if (!storedHandle || !await validateHandle(storedHandle)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('No valid stored handle found');
      }
      return false;
    }

    // 3. AMV-system構造とアカウント整合性確認
    if (!await validateAccountOwnership(storedHandle, accountUuid)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Account ownership validation failed');
      }
      return false;
    }

    // 4. ディレクトリハンドルを設定
    dirHandle = storedHandle;

    if (process.env.NODE_ENV === 'development') {
      console.log(`Successfully restored directory for account: ${accountUuid}`);
    }

    return true;
  } catch (error) {
    console.error('Directory restoration failed:', error);
    return false;
  }
}

/* ⑮ ゲストモード用：フォルダパス記憶機能 */
const GUEST_FOLDER_KEY = 'amv-guest-folder-path';

export function saveGuestFolderPath(directoryPath: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(GUEST_FOLDER_KEY, directoryPath);
  }
}

export function getGuestFolderPath(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(GUEST_FOLDER_KEY);
  }
  return null;
}

export function clearGuestFolderPath(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(GUEST_FOLDER_KEY);
  }
}

/* ⑯ ゲストモード用：フォルダパス比較 */
export async function isCurrentDirectorySameAsGuest(): Promise<boolean> {
  try {
    const savedPath = getGuestFolderPath();
    if (!savedPath) return false;

    const currentDir = await getStoredDir();
    if (!currentDir) return false;

    // ディレクトリ名での簡易比較（完全なパス比較は技術的に困難）
    return currentDir.name === savedPath.split('/').pop() || 
           currentDir.name === savedPath.split('\\').pop();
  } catch {
    return false;
  }
}

/* ⑨ 設定ファイルの保存・読み込み */
export async function saveSettings(settings: any): Promise<void> {
  try {
    const root = await ensureDir();
    
    // ハンドルの有効性を再チェック
    if (!(await validateHandle(root))) {
      throw new Error("ディレクトリハンドルが無効になっています");
    }
    
    const handle = await root.getFileHandle(SETTINGS_FILENAME, { create: true });
    
    let writable: FileSystemWritableFileStream;
    try {
      writable = await handle.createWritable();
    } catch (error) {
      // InvalidStateErrorなどに対応
      dirHandle = null;
      throw new Error(`設定ファイル書き込みストリームの作成に失敗しました: ${error}`);
    }
    
    try {
      await writable.write(JSON.stringify(settings, null, 2));
      await writable.close();
    } catch (writeError) {
      try {
        await writable.abort();
      } catch (abortError) {
        console.warn('Failed to abort settings writable stream:', abortError);
      }
      throw writeError;
    }
  } catch (error) {
    console.warn('Failed to save settings to file system:', error);
    
    // InvalidStateErrorの場合はハンドルをリセット
    if (error instanceof DOMException && error.name === 'InvalidStateError') {
      dirHandle = null;
    }
    
    // フォールバック: ディレクトリが選択されていない場合は localStorage を使用
    if (typeof window !== 'undefined') {
      localStorage.setItem('amv-system-settings', JSON.stringify(settings));
    }
  }
}

export async function loadSettings(): Promise<any | null> {
  try {
    const dir = await getStoredDir();
    if (!dir) {
      // ディレクトリが設定されていない場合は localStorage から読み込み
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('amv-system-settings');
        if (stored) {
          const settings = JSON.parse(stored);
          return settings;
        }
      }
      return null;
    }
    
    const handle = await dir.getFileHandle(SETTINGS_FILENAME);
    const file = await handle.getFile();
    if (!file.size) return null;
    return JSON.parse(await file.text());
  } catch (error) {
    // ファイルが存在しない場合や読み込みエラーの場合
    // フォールバック: localStorage から読み込みを試行
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('amv-system-settings');
        if (stored) {
          const settings = JSON.parse(stored);
          // ファイルシステムが利用可能になったら設定をマイグレーション
          setTimeout(async () => {
            try {
              await saveSettings(settings);
              // マイグレーション成功後、localStorage から削除
              localStorage.removeItem('amv-system-settings');
            } catch (e) {
              console.warn('Settings migration failed:', e);
            }
          }, 1000);
          return settings;
        }
      } catch (e) {
        console.warn('Failed to load settings from localStorage:', e);
      }
    }
    return null;
  }
}