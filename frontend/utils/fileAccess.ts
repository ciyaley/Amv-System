import { encryptData, decryptData } from "./encryption";
import { useEncryptionStore }        from "@/app/hooks/useEncryptionStore";
import { saveDirHandle, loadDirHandle } from "./dirHandleStore";

const FOLDER_NAME       = "Amv-System";
const MEMO_FILENAME     = "memoData.json";
const LAYOUT_FILENAME   = "layoutData.json";

let dirHandle: FileSystemDirectoryHandle | null = null;

/* ① 永続ハンドル取得（なければ null） */
export async function getStoredDir(): Promise<FileSystemDirectoryHandle | null> {
  if (dirHandle) return dirHandle;
  dirHandle = await loadDirHandle();
  return dirHandle;
}

/* ② 初回のみディレクトリ選択 */
export async function requestDirectory(): Promise<FileSystemDirectoryHandle> {

  // @ts-ignore
  const picked: FileSystemDirectoryHandle = await window.showDirectoryPicker();
  // Amv-System サブフォルダを確保
  const ws = await picked.getDirectoryHandle(FOLDER_NAME, { create: true });
    const res = await ws.queryPermission()({ mode: "readwrite" });
  if (res !== "granted") throw new Error("permission denied");

  await saveDirHandle(ws);
  dirHandle = ws;
  return ws;
}

async function ensureDir(): Promise<FileSystemDirectoryHandle> {
  return (await getStoredDir()) ?? (await requestDirectory());
}

/* ③ ファイルハンドル取得 */
async function getFileHandle(type: "memo" | "layout") {
  const root = await ensureDir();
  const name = type === "memo" ? MEMO_FILENAME : LAYOUT_FILENAME;
  return root.getFileHandle(name, { create: true });
}

/* ④ 保存 */
export async function saveEncrypted(type: "memo" | "layout", data: any) {
  const pw = useEncryptionStore.getState().password;
  if (!pw) throw new Error("暗号鍵がありません。");
  const enc = await encryptData(data, pw);
  const h   = await getFileHandle(type);
  const w   = await h.createWritable();
  await w.write(JSON.stringify(enc));
  await w.close();
}

/* ⑤ 読み込み */
export async function loadEncrypted<T>(type: "memo" | "layout"): Promise<T | null> {
  const dir = await getStoredDir();     // 事前にハンドルが無ければ null
  if (!dir) return null;
  const name   = type === "memo" ? MEMO_FILENAME : LAYOUT_FILENAME;
  const handle = await dir.getFileHandle(name, { create: false }).catch(() => null);
  if (!handle) return null;

  const file  = await handle.getFile();
  if (!file.size) return null;

  const enc   = JSON.parse(await file.text());
  const pw    = useEncryptionStore.getState().password;
  if (!pw) throw new Error("暗号鍵がありません。");
  return decryptData<T>(enc, pw);
}