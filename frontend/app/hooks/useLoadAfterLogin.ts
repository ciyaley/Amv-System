// frontend/app/hooks/useLoadAfterLogin.ts
"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import {
  loadWorkspace,
  requestDirectory,
  loadAllMemos
} from "../../utils/fileAccess";
import {
  attemptDirectoryRestore,
  saveDirectoryAssociationForAccount,
  saveDirectoryAssociation
} from "../../utils/fileSystem/index";
import { useAuth } from "./useAuth";
import { useCanvasStore, type LayoutState } from "./useCanvas";
import { useEncryptionStore } from "./useEncryptionStore";
import { useMemos } from "./useMemos";
import type { MemoData } from "../types/tools";

export const useLoadAfterLogin = (enabled: boolean = true) => {
  const { isLoggedIn, uuid, isLogoutInProgress } = useAuth();
  const password = useEncryptionStore((s) => s.password);
  const { loadMemosFromDisk, setMemos, memos } = useMemos();
  const setLayout = useCanvasStore((s) => s.setLayout);

  useEffect(() => {
    if (!enabled) return; // 🔧 修正: 無効時は何もしない
    
    (async () => {

      // 🔧 修正: Zustandでログアウト状態をチェック
      if (isLogoutInProgress) {
        return;
      }


      // ログイン状態チェック
      if (!isLoggedIn || !uuid) {
        // ゲストモードでは既存のメモを保持し、何もしない
        return;
      }

      // パスワードチェック
      if (!password) {
        toast.warning('パスワード情報がありません。設定から再ログインまたは手動でディレクトリを選択してください。');

        // 🔧 修正: パスワードが無い場合でも現在のメモ状態を保持
        // ディスクからの読み込みは行わず、現在のメモリ上のメモを保持
        
        // メモ数が0の場合のみディスクから読み込み
        if (memos.length === 0) {
          try {
            const existingMemos = await loadAllMemos();

            if (existingMemos.length > 0) {
              // 型を統一してからsetMemos呼び出し
              const convertedMemos = existingMemos.map(memo => ({
                ...memo,
                content: memo.content || memo.text || '',
                text: memo.text || memo.content || '',
              }));
              setMemos(convertedMemos);

              // 暗号化されていないゲストメモのみが読み込める
              const guestCount = existingMemos.filter(m => m.sourceType === 'guest').length;

              if (guestCount > 0) {
                toast.success(`${guestCount}個の既存メモを検出しました（ゲストモード作成）`);
              } else {
                toast.info('暗号化されたメモが見つかりました。設定から再ログインして復号化してください');
              }
            } else {
            }
          } catch {
          }
        } else {
        }

        return;
      }

      // 🚀 RDv1.1.5.1: 自動ログイン時のアカウント別ディレクトリ復元

      // 🚀 RDv1.1.5.1: 強化されたディレクトリ復元を試行
      let autoRestoreSuccessful = false;
      try {
        const restoreResult = await attemptDirectoryRestore(uuid);

        if (restoreResult.success) {
          // 自動復元成功 - データを読み込み
          try {
            // 🔧 修正: メモ復元の詳細ログと確実な反映
            await loadMemosFromDisk();

            // 🔧 修正: loadMemosFromDisk実行後に少し待機してからストア状態確認
            await new Promise(resolve => setTimeout(resolve, 100));

            // メモ数を取得してメッセージ表示（RDv1.1.5.1 5.2準拠）

            // 🔧 修正: メモ読み込み状況を非同期で再確認
            await new Promise(resolve => setTimeout(resolve, 200));
            const currentMemoCount = memos.length;
            
            if (currentMemoCount === 0) {
              try {
                const existingMemos = await loadAllMemos();

                if (existingMemos.length > 0) {
                  // 型を統一してからsetMemos呼び出し（競合状態を防ぐ）
                  const convertedMemos = existingMemos.map(memo => ({
                    ...memo,
                    content: memo.content || memo.text || '',
                    text: memo.text || memo.content || '',
                  }));
                  
                  // 🛡️ CRITICAL FIX: 時系列順序でのマージ処理
                  const currentMemos = memos || [];
                  if (currentMemos.length > 0) {
                    const diskMemosMap = new Map(convertedMemos.map(m => [m.id, m]));
                    const currentMemosMap = new Map(currentMemos.map(m => [m.id, m]));
                    
                    // すべてのIDを収集
                    const allIds = new Set([...diskMemosMap.keys(), ...currentMemosMap.keys()]);
                    
                    // ID順でマージ（より新しいupdatedAtを優先）
                    const mergedMemos = Array.from(allIds).map(id => {
                      const diskMemo = diskMemosMap.get(id);
                      const currentMemo = currentMemosMap.get(id);
                      
                      if (diskMemo && currentMemo) {
                        // 両方に存在する場合は更新時刻で判定
                        const diskTime = new Date(diskMemo.updatedAt || diskMemo.created || 0).getTime();
                        const currentTime = new Date(currentMemo.updatedAt || currentMemo.created || 0).getTime();
                        return currentTime >= diskTime ? currentMemo : diskMemo;
                      }
                      
                      return diskMemo || currentMemo;
                    }).filter(Boolean);
                    
                    // 時系列順でソート
                    const validMemos = mergedMemos.filter((memo): memo is MemoData => memo != null);
                    
                    validMemos.sort((a, b) => {
                      const aTime = new Date(a.created || 0).getTime();
                      const bTime = new Date(b.created || 0).getTime();
                      return aTime - bTime;
                    });
                    
                    setMemos(validMemos);
                  } else {
                    setMemos(convertedMemos);
                  }
                  
                  // 状態確認のための待機
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              } catch {
                // Silently ignore direct load errors
              }
            } else {
            }

            // ワークスペース設定復元
            const workspace = await loadWorkspace();
            if (workspace?.layout && typeof workspace.layout === 'object' && 
                'width' in workspace.layout && 'height' in workspace.layout &&
                'zoom' in workspace.layout && 'offsetX' in workspace.layout && 'offsetY' in workspace.layout) {
              setLayout(workspace.layout as LayoutState);
            }

            // 最終的なメモ数で表示

            if (restoreResult.restoredDirectory) {
              toast.success(`前回のワークスペースを復元しました（${memos.length}個のメモ）\\nディレクトリ: ${restoreResult.restoredDirectory.name}`);
            } else {
              toast.success(`前回のワークスペースを復元しました（${memos.length}個のメモ）`);
            }

            autoRestoreSuccessful = true;
          } catch {
            toast.warning("データ復元中にエラーが発生しました。手動でフォルダを選択してください。");
          }
        } else {
          // エラーメッセージに基づいたユーザー向け通知
          if (restoreResult.error?.includes('no longer accessible')) {
            toast.info('前回使用したフォルダにアクセスできません。フォルダを再選択してください。');
          } else if (restoreResult.error?.includes('different account')) {
            toast.warning('フォルダは別のアカウントに関連付けられています。新しいフォルダを選択してください。');
          } else {
            toast.info('データを読み込むためフォルダを指定してください');
          }
        }
      } catch {
        toast.info('データを読み込むためフォルダを指定してください');
      }

      // 自動復元が成功した場合は手動選択をスキップ
      if (autoRestoreSuccessful) {
        return;
      }

      // 自動復元失敗時：スマートな手動フォルダ選択
      const { getLastDirectoryInfo } = await import('../../utils/dirHandleStore');
      const lastDirInfo = getLastDirectoryInfo();
      // Skip backend directory lookup for now - not implemented
      const savedPath = null;

      // ユーザーガイダンスの改善
      if (savedPath && lastDirInfo) {
        const lastUsedDate = new Date(lastDirInfo.savedAt).toLocaleDateString('ja-JP');
        toast.info(`以前使用していた「${savedPath}」フォルダを再選択してください（最終使用: ${lastUsedDate}）`, {
          duration: 8000
        });
      } else if (lastDirInfo) {
        const lastUsedDate = new Date(lastDirInfo.savedAt).toLocaleDateString('ja-JP');
        toast.info(`以前使用していた「${lastDirInfo.name}」フォルダを再選択してください（最終使用: ${lastUsedDate}）`, {
          duration: 8000
        });
      } else {
        // 初回ログイン
        toast.info("AMV-Systemのデータ保存先フォルダを選択してください", {
          duration: 6000
        });
      }

      try {
        // RDv1.1.5.1: 手動ディレクトリ選択の強化
        const directoryHandle = await requestDirectory();
        if (!directoryHandle) {
          return;
        }


        // RDv1.1.5.1: アカウント関連付けを保存（ローカル＋バックエンド）
        try {
          await saveDirectoryAssociationForAccount(uuid, directoryHandle);

          // Legacy support: 旧形式の保存も継続
          await saveDirectoryAssociation(directoryHandle, uuid);
        } catch {
          // Silently ignore directory association errors
        }

        // 🔧 修正: フォルダ選択後の既存AMV-systemファイル構造チェックを強化
        try {
          const existingMemos = await loadAllMemos();

          if (existingMemos.length > 0) {
            // 🔧 修正: 現在のメモ状態をチェックしてから決定
            const currentMemos = memos;
            
            // 既存メモがある場合は重複を避けて追加
            if (currentMemos.length > 0) {
              const currentIds = new Set(currentMemos.map(m => m.id));
              const newMemos = existingMemos.filter(memo => !currentIds.has(memo.id));
              
              if (newMemos.length > 0) {
                const convertedNewMemos = newMemos.map(memo => ({
                  ...memo,
                  content: memo.content || memo.text || '',
                  text: memo.text || memo.content || '',
                }));
                setMemos([...currentMemos, ...convertedNewMemos]);
              } else {
              }
            } else {
              // メモが存在しない場合のみ全て設定
              const convertedMemos = existingMemos.map(memo => ({
                ...memo,
                content: memo.content || memo.text || '',
                text: memo.text || memo.content || '',
              }));
              setMemos(convertedMemos);
            }

            // 🔧 修正: ストア反映後に状態確認
            await new Promise(resolve => setTimeout(resolve, 100));

            // 🔧 修正: ワークスペース設定も復元
            try {
              const workspace = await loadWorkspace();
              if (workspace?.layout && typeof workspace.layout === 'object' && 
                  'width' in workspace.layout && 'height' in workspace.layout &&
                  'zoom' in workspace.layout && 'offsetX' in workspace.layout && 'offsetY' in workspace.layout) {
                setLayout(workspace.layout as LayoutState);
              }
            } catch {
              // Silently ignore workspace errors
            }

            // メモのソース別統計
            const authenticatedCount = existingMemos.filter(m => m.sourceType === 'authenticated').length;
            const guestCount = existingMemos.filter(m => m.sourceType === 'guest').length;


            if (authenticatedCount > 0 && guestCount > 0) {
              toast.success(`${existingMemos.length}個の既存メモを復元しました（認証済み${authenticatedCount}個、ゲスト${guestCount}個）`);
            } else if (authenticatedCount > 0) {
              toast.success(`${existingMemos.length}個の既存メモを復元しました（認証済み）`);
            } else {
              toast.success(`${existingMemos.length}個の既存メモを復元しました（ゲストモード作成）`);
            }
          } else {
            toast.success("フォルダを設定しました。新規ワークスペースを開始します");
          }
        } catch {
          toast.warning("既存ファイルの確認でエラーが発生しましたが、フォルダは設定されました");
        }
      } catch (error: unknown) {
        // 🚫 要件定義に従った適切なエラーハンドリング
        if (error instanceof Error) {
          if (error.message === 'USER_CANCELLED') {
            toast.warning("フォルダ選択がキャンセルされました。設定からいつでも指定できます。");
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
        toast.error("フォルダの選択でエラーが発生しました。設定から再度指定してください。");
        return;
      }

      // ▼ メモ復元（新形式）
      try {
        await loadMemosFromDisk();
        toast.success("メモを復元しました");
      } catch {
        // Silently ignore memo loading errors
      }

      // ▼ ワークスペース設定復元
      try {
        const workspace = await loadWorkspace();
        if (workspace?.layout && typeof workspace.layout === 'object' && 
            'width' in workspace.layout && 'height' in workspace.layout &&
            'zoom' in workspace.layout && 'offsetX' in workspace.layout && 'offsetY' in workspace.layout) {
          setLayout(workspace.layout as LayoutState);
        }
      } catch {
        // Silently ignore workspace loading errors
      }
    })();
  }, [enabled, isLoggedIn, isLogoutInProgress, password, uuid, loadMemosFromDisk, setLayout, setMemos, memos]);
};
