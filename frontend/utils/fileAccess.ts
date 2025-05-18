// frontend/app/utils/fileAccess.ts
import { encryptData, decryptData } from "./encryption";
import { useEncryptionStore } from "@/app/hooks/useEncryptionStore";

const MEMO_FILENAME   = "memoData.json";
const LAYOUT_FILENAME = "layoutData.json";

let memoHandle: FileSystemFileHandle | null = null;
let layoutHandle: FileSystemFileHandle | null = null;

async function getHandle(type: "memo" | "layout"): Promise<FileSystemFileHandle> {
  if (type === "memo" && memoHandle)   return memoHandle;
  if (type === "layout" && layoutHandle) return layoutHandle;

  const handle = await (window as any).showSaveFilePicker({
    suggestedName: type === "memo" ? MEMO_FILENAME : LAYOUT_FILENAME,
    types: [{
      description: "JSON Files",
      accept: { "application/json": [".json"] },
    }],
  });

  if (type === "memo") memoHandle = handle;
  else                layoutHandle = handle;

  return handle;
}

export async function saveEncrypted(type: "memo" | "layout", data: any) {
  const pw = useEncryptionStore.getState().password;
  if (!pw) throw new Error("暗号鍵がありません。再ログインしてください。");

  const encrypted = await encryptData(data, pw);
  const handle = await getHandle(type);
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(encrypted));
  await writable.close();
}

export async function loadEncrypted<T>(type: "memo" | "layout"): Promise<T | null> {
  const handle = type === "memo" ? memoHandle : layoutHandle;
  if (!handle) return null;
  const file = await handle.getFile();
  const text = await file.text();
  const encrypted = JSON.parse(text) as {
    salt: string;
    iv: string;
    ciphertext: string;
  };
  const pw = useEncryptionStore.getState().password;
  if (!pw) throw new Error("暗号鍵がありません。再ログインしてください。");
  return decryptData<T>(encrypted, pw);
}