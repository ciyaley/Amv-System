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

// 禁止文字を安全な文字に置換
const sanitizeFilename = (filename: string): string => {
  const forbidden = /[<>:"/\\|?*\[\]\{\}\(\)#]/g;
  const sanitized = filename
    .replace(forbidden, '_')
    .replace(/^\./, '_') // 先頭ピリオド
    .replace(/[\s\.]+$/, '') // 末尾スペース・ピリオド
    .slice(0, 255); // 255文字制限
  
  return sanitized || 'untitled';
};

let dirHandle: FileSystemDirectoryHandle | null = null;

/* ① 永続ハンドル取得（なければ null） */
export async function getStoredDir(): Promise<FileSystemDirectoryHandle | null> {
  if (dirHandle) {
    // ハンドルの有効性をチェック
    try {
      await (dirHandle as any).requestPermission({ mode: "readwrite" });
      return dirHandle;
    } catch {
      // ハンドルが無効な場合はリセット
      dirHandle = null;
    }
  }
  
  dirHandle = await loadDirHandle();
  if (dirHandle) {
    // 読み込んだハンドルの有効性もチェック
    try {
      await (dirHandle as any).requestPermission({ mode: "readwrite" });
      return dirHandle;
    } catch {
      dirHandle = null;
    }
  }
  
  return dirHandle;
}

/* ② 初回のみディレクトリ選択 */
export async function requestDirectory(): Promise<FileSystemDirectoryHandle> {
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
  const root = await ensureDir();
  
  // 権限確認とメモディレクトリ取得
  const permission = await (root as any).requestPermission({ mode: "readwrite" });
  if (permission !== "granted") {
    throw new Error("ファイルへの書き込み権限が許可されていません");
  }
  
  const memosDir = await root.getDirectoryHandle(MEMOS_DIR, { create: true });
  
  // ファイル名の生成（タイトルベース + 重複対応）
  let filename = sanitizeFilename(memo.title);
  let finalFilename = `${filename}.json`;
  let counter = 1;
  
  // 重複チェック
  while (true) {
    try {
      await memosDir.getFileHandle(finalFilename, { create: false });
      // ファイルが存在する場合は番号を付ける
      finalFilename = `${filename}${counter}.json`;
      counter++;
    } catch {
      // ファイルが存在しない場合はこのファイル名を使用
      break;
    }
  }
  
  const handle = await memosDir.getFileHandle(finalFilename, { create: true });
  const writable = await handle.createWritable();
  
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
  
  const handle = await root.getFileHandle('.memo_metadata.json', { create: true });
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(metadata, null, 2));
  await writable.close();
}

/* ⑥ メモの読み込み */
export async function loadAllMemos(): Promise<MemoData[]> {
  const dir = await getStoredDir();
  if (!dir) return [];
  
  try {
    const memosDir = await dir.getDirectoryHandle(MEMOS_DIR);
    const memos: MemoData[] = [];
    const pw = useEncryptionStore.getState().password;
    
    // @ts-ignore
    for await (const entry of memosDir.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json') && !entry.name.startsWith('.')) {
        try {
          const file = await entry.getFile();
          const content = await file.text();
          const data = JSON.parse(content);
          
          // 暗号化されているかチェック
          if (data.encryptedData && data.salt && data.iv) {
            if (pw) {
              const decrypted = await decryptData<MemoData>(data, pw);
              if (decrypted) memos.push(decrypted);
            }
          } else {
            // 平文の場合
            memos.push(data as MemoData);
          }
        } catch (e) {
          console.error(`Failed to load memo ${entry.name}:`, e);
        }
      }
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