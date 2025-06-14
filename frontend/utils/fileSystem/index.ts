// utils/fileSystem/index.ts - ファイルシステム統合エクスポート

// Core operations
export * from './core';

// Memo operations
export * from './memoOperations';

// Workspace operations
export * from './workspaceOperations';

// Guest mode operations
export * from './guestModeOperations';

// Account operations
export * from './accountOperations';

// Data integrity
export * from './dataIntegrity';

// Error recovery
export * from './errorRecovery';

// General operations
export * from './generalOperations';

// Legacy exports for backward compatibility
export { encryptData, decryptData } from '../encryption';

// 旧形式の保存・読み込み（後方互換性のため残す）
import { useEncryptionStore } from "../../app/hooks/useEncryptionStore";
import { encryptData, decryptData } from "../encryption";
import { ensureDir, getStoredDir } from "./core";

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

// 認証済みモード機能のダミー実装（後方互換性）
export async function enableAutoSave(_onSave: (memo: any) => void): Promise<void> {
  // 最小実装
}

export async function disableAutoSave(): Promise<void> {
  // 最小実装
}

export async function saveWithEncryption(memo: any, _password: string): Promise<void> {
  const { saveIndividualMemo } = await import('./memoOperations');
  await saveIndividualMemo(memo);
}

export async function loadWithDecryption(memoId: string, _password: string): Promise<any | null> {
  const { loadMemoMetadata } = await import('./memoOperations');
  const { loadIndividualFile } = await import('./generalOperations');
  try {
    const metadata = await loadMemoMetadata();
    const filename = metadata[memoId];
    if (!filename) return null;
    
    return await loadIndividualFile(filename, 'memos');
  } catch {
    return null;
  }
}