// frontend/app/hooks/useLoadAfterLogin.ts
"use client";

import { useEffect } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { useEncryptionStore } from "@/app/hooks/useEncryptionStore";
import { loadEncrypted, getStoredDir, requestDirectory } from "../../utils/fileAccess";
import { useMemos } from "@/app/hooks/useMemos";
import { useCanvasStore } from "./useCanvas";
import { toast } from "sonner";

export const useLoadAfterLogin = () => {
  const { user } = useAuth();
  const password = useEncryptionStore((s) => s.password);
  const setMemos = useMemos((s) => s.setMemos);
  const setLayout = useCanvasStore((s) => s.setLayout);

  useEffect(() => {
    (async () => {
      if (!user || !password) return;

      
      // ディレクトリハンドルを確認
      if (!await getStoredDir()) {
        try {
          await requestDirectory();
        } catch {
          toast.warning("保存フォルダが選択されていません。設定から指定してください。");
          return; // フォルダ無しでは復元不可
        }
      }

      // ▼ メモ復元
      try {
        const memoData = await loadEncrypted<{ memos: any[] }>("memo");
        if (memoData?.memos) setMemos(memoData.memos);
      } catch (e) {
        console.error("memo load after login error", e);
      }

      // ▼ レイアウト復元
      try {
        const layout = await loadEncrypted<{ width: number; height: number; zoom: number; offsetX: number; offsetY: number }>("layout");
        if (layout) setLayout(layout);
      } catch (e) {
        console.error("layout load after login error", e);
      }
    })();
  }, [user, password, setMemos, setLayout]);
};
