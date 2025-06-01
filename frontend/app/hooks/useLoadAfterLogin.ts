// frontend/app/hooks/useLoadAfterLogin.ts
"use client";

import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { useEncryptionStore } from "./useEncryptionStore";
import { 
  loadWorkspace, 
  requestDirectory, 
  loadAllMemos,
  restoreAccountDirectory,
  saveAccountAssociation,
  saveDirectoryAssociation
} from "../../utils/fileAccess";
import { useMemos } from "./useMemos";
import { useCanvasStore } from "./useCanvas";
import { toast } from "sonner";

export const useLoadAfterLogin = () => {
  const { isLoggedIn, uuid } = useAuth();
  const password = useEncryptionStore((s) => s.password);
  const loadMemosFromDisk = useMemos((s) => s.loadMemosFromDisk);
  const setLayout = useCanvasStore((s) => s.setLayout);

  useEffect(() => {
    (async () => {
      // ログイン状態とパスワードの両方が必要
      if (!isLoggedIn || !password || !uuid) {
        // 未ログイン時はファイル読み込みを一切行わない
        console.log('Skipping file loading: not logged in or no password');
        return;
      }

      // 🚀 NEW: 自動ディレクトリ復元を試行
      try {
        const restored = await restoreAccountDirectory(uuid);
        if (restored) {
          // 自動復元成功
          try {
            const existingMemos = await loadAllMemos();
            const directoryName = "前回使用したディレクトリ";
            toast.success(`ワークスペースを自動復元しました（ディレクトリ: ${directoryName}、メモ: ${existingMemos.length}個）`);
            
            // メモ復元
            await loadMemosFromDisk();
            
            // ワークスペース設定復元
            const workspace = await loadWorkspace();
            if (workspace?.canvas) {
              setLayout(workspace.canvas);
            }
            
            return; // 自動復元成功時は手動フォルダ選択をスキップ
          } catch (e) {
            console.error("Failed to load data from restored directory:", e);
            toast.warning("データ復元中にエラーが発生しました。手動でフォルダを選択してください。");
          }
        }
      } catch (error) {
        console.log('Auto directory restoration failed:', error);
      }

      // 自動復元失敗時：手動フォルダ選択
      try {
        // 仕様通り：ログイン後にメッセージ表示してフォルダ選択
        toast.info("データを読み込むためフォルダを指定してください");
        
        await requestDirectory();
        const directoryName = "Manual Selection"; // 実際のパスは取得困難
        
        // アカウント関連付けを保存（ローカル＋バックエンド）
        try {
          await saveAccountAssociation(uuid, directoryName);
          await saveDirectoryAssociation(uuid, directoryName);
        } catch (e) {
          console.warn('Failed to save account association:', e);
        }
        
        // フォルダ選択後、既存AMV-systemファイル構造をチェック
        try {
          const existingMemos = await loadAllMemos();
          if (existingMemos.length > 0) {
            toast.success(`${existingMemos.length}個の既存メモを検出しました。復元します。`);
          } else {
            toast.info("新規ワークスペースを開始します");
          }
        } catch (e) {
          console.log('No existing memos found:', e);
          toast.info("新規ワークスペースを開始します");
        }
      } catch (error: unknown) {
        // 🚫 要件定義に従った適切なエラーハンドリング
        if (error instanceof Error) {
          if (error.message === 'USER_CANCELLED') {
            toast.warning("フォルダ選択がキャンセルされました。手動で保存する場合は保存ボタンを使用してください。");
            return;
          }
          if (error.message === 'PERMISSION_DENIED') {
            toast.error("フォルダアクセス権限が拒否されました。別のフォルダを選択してください。");
            return;
          }
          if (error.message === 'SECURITY_ERROR') {
            toast.error("セキュリティエラーが発生しました。ブラウザ設定をご確認ください。");
            return;
          }
        }
        toast.error("フォルダの選択でエラーが発生しました。再度お試しください。");
        return;
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
  }, [isLoggedIn, password, uuid, loadMemosFromDisk, setLayout]);
};
