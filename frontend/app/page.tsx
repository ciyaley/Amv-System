"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "./hooks/useAuth";

export default function HomePage() {
  const router = useRouter();
  const { checkAutoLogin, isLoggedIn } = useAuth();
  const [isStarting, setIsStarting] = useState(false);

  // ログイン済みの場合は直接ワークスペースに遷移
  useEffect(() => {
    if (isLoggedIn) {
      router.push("/workspace");
    }
  }, [isLoggedIn, router]);

  // 🔧 修正: RDv1.1.5.1準拠 - 自動ログイン試行（始めるボタン）
  const handleStart = async () => {
    setIsStarting(true);
    
    try {
      // 自動ログインを試行
      await checkAutoLogin();
      
      // 短い遅延でログイン状態をチェック
      setTimeout(() => {
        const currentAuth = useAuth.getState();
        if (currentAuth.isLoggedIn) {
          router.push("/workspace");
        } else {
          toast.info("前回のログインデータがありません。ゲストモードで開始します。");
          router.push("/workspace?mode=guest");
        }
        setIsStarting(false);
      }, 500);
    } catch {
      toast.error("開始処理でエラーが発生しました。ゲストモードで開始します。");
      router.push("/workspace?mode=guest");
      setIsStarting(false);
    }
  };

  // 🆕 追加: RDv1.1.5.1準拠 - ゲスト参加（明示的ゲストモード）
  const handleGuestMode = () => {
    toast.info("ゲストモードで開始します。右上の保存ボタンでデータを保存できます。");
    router.push("/workspace?mode=guest");
  };

  if (isStarting) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white">
        <h1 className="text-3xl font-bold mb-6">Amv-System</h1>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p className="text-lg">前回のデータを確認中...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white">
      <h1 className="text-3xl font-bold mb-6">Amv-System</h1>
      <p className="mb-8 text-center text-lg">多機能作業スペースアプリへようこそ</p>
      
      {/* 🔧 修正: RDv1.1.5.1準拠 - メインアクションボタン */}
      <div className="space-y-4 flex flex-col items-center">
        <button
          onClick={handleStart}
          disabled={isStarting}
          className="rounded bg-blue-600 px-8 py-3 text-white hover:bg-blue-700 transition min-w-64 disabled:opacity-50 font-medium"
          data-testid="start-button"
        >
          始める
        </button>
        
        {/* 🆕 追加: RDv1.1.5.1準拠 - ゲスト参加ボタン */}
        <button
          onClick={handleGuestMode}
          disabled={isStarting}
          className="rounded bg-gray-600 px-8 py-3 text-white hover:bg-gray-700 transition min-w-64 disabled:opacity-50"
          data-testid="guest-mode-button"
        >
          ゲスト参加
        </button>
      </div>
      
      {/* 🔧 修正: RDv1.1.5.1準拠 - 説明テキスト更新 */}
      <div className="mt-8 text-sm text-gray-400 text-center max-w-lg">
        <div className="mb-4 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-white font-medium mb-2">💡 使い方</h3>
          <p className="mb-2">
            <strong className="text-blue-400">始める</strong>: 前回のログインデータを確認し、自動復元または新規開始
          </p>
          <p className="mb-2">
            <strong className="text-gray-300">ゲスト参加</strong>: 登録不要でお試し利用（手動保存が必要）
          </p>
        </div>
        <p className="text-xs text-gray-500">
          ゲストモードでは右上の「保存」ボタンでファイル保存できます
        </p>
      </div>
    </main>
  );
}
