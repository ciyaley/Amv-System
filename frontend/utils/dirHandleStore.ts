// utils/dirHandleStore.ts
import { openDB } from "idb";

const DB_NAME = "amv-system-handles";
const STORE   = "handles";
const KEY     = "workspaceDir";

async function db() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE);
    },
  });
}

export async function saveDirHandle(handle: FileSystemDirectoryHandle) {
  const d = await db();
  await d.put(STORE, handle, KEY);
}

export async function loadDirHandle(): Promise<FileSystemDirectoryHandle | null> {
  const d = await db();
  return (await d.get(STORE, KEY)) ?? null;
}

export async function clearDirHandle() {
  const d = await db();
  await d.delete(STORE, KEY);
}