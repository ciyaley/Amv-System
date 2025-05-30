// frontend/app/hooks/useLoadAfterLogin.ts
"use client";

import { useEffect } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { useEncryptionStore } from "@/app/hooks/useEncryptionStore";
import { loadWorkspace, getStoredDir, requestDirectory } from "../../utils/fileAccess";
import { useMemos } from "./useMemos";
import { useCanvasStore } from "./useCanvas";
import { toast } from "sonner";

export const useLoadAfterLogin = () => {
  const { isLoggedIn } = useAuth();
  const password = useEncryptionStore((s) => s.password);
  const loadMemosFromDisk = useMemos((s) => s.loadMemosFromDisk);
  const setLayout = useCanvasStore((s) => s.setLayout);

  useEffect(() => {
    (async () => {
      if (!isLoggedIn || !password) return;

      // ディレクトリハンドルを確認
      if (!await getStoredDir()) {
        try {
          await requestDirectory();
        } catch {
          toast.warning("保存フォルダが選択されていません。設定から指定してください。");
          return; // フォルダ無しでは復元不可
        }
      }

      // ▼ メモ復元（新形式）
      try {
        await loadMemosFromDisk();
        toast.success("メモを復元しました");
      } catch (e) {
        console.error("memo load after login error", e);
      }

      // ▼ ワークスペース設定復元
      try {
        const workspace = await loadWorkspace();
        if (workspace?.canvas) {
          setLayout(workspace.canvas);
        }
      } catch (e) {
        console.error("workspace load after login error", e);
      }
    })();
  }, [isLoggedIn, password, loadMemosFromDisk, setLayout]);
};
