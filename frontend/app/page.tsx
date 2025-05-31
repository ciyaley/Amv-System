"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "./hooks/useAuth";

export default function HomePage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const handleStart = () => {
    router.push("/workspace");
  };

  const handleGuestMode = () => {
    router.push("/workspace?mode=guest");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white">
      <h1 className="text-3xl font-bold mb-6">Amv-System</h1>
      <p className="mb-8 text-center text-lg">多機能作業スペースアプリへようこそ</p>
      
      <div className="space-y-4 flex flex-col items-center">
        <button
          onClick={handleStart}
          className="rounded bg-white px-6 py-3 text-black hover:bg-gray-200 transition min-w-48"
        >
          {isLoggedIn ? "ワークスペースへ" : "ログイン・登録"}
        </button>
        
        {!isLoggedIn && (
          <button
            onClick={handleGuestMode}
            className="rounded border border-white px-6 py-3 text-white hover:bg-white hover:text-black transition min-w-48"
          >
            ゲストモードで開始
          </button>
        )}
      </div>
      
      <div className="mt-8 text-sm text-gray-400 text-center max-w-md">
        <p className="mb-2">
          {isLoggedIn 
            ? "ログイン済み：自動保存が有効です" 
            : "ゲストモード：手動保存のみ"
          }
        </p>
      </div>
    </main>
  );
}
