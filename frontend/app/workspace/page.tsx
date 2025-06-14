"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "../hooks/useAuth";
import { useLoadAfterLogin } from "../hooks/useLoadAfterLogin";

// Dynamic imports for performance optimization
const SettingsModal = dynamic(() => import("../components/SettingsModal").then(mod => ({ default: mod.SettingsModal })), {
  loading: () => null, // Modal is hidden by default
  ssr: false
});

const AuthenticatedWorkspace = dynamic(() => import("../components/AuthenticatedWorkspace").then(mod => ({ default: mod.AuthenticatedWorkspace })), {
  loading: () => (
    <div className="flex w-screen h-screen bg-gray-100">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">認証済みワークスペースを読み込み中...</p>
        </div>
      </div>
    </div>
  ),
  ssr: false
});

const GuestWorkspace = dynamic(() => import("../components/GuestWorkspace").then(mod => ({ default: mod.GuestWorkspace })), {
  loading: () => (
    <div className="flex w-screen h-screen bg-gray-100">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">ゲストワークスペースを読み込み中...</p>
        </div>
      </div>
    </div>
  ),
  ssr: false
});

export default function WorkspacePage() {
  const { checkAutoLogin, isLoggedIn } = useAuth();
  const [forceGuestMode, setForceGuestMode] = useState(false);

  // URLクエリパラメータをチェック
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'guest') {
      setForceGuestMode(true);
    } else {
      // ゲストモードでない場合は自動ログインを試行
      checkAutoLogin();
    }
  }, [checkAutoLogin]);

  // ✅ 自動ログイン完了後にファイル復元を実行（ゲストモードでない場合のみ）
  // 🔧 修正: ゲストモード強制時はuseLoadAfterLoginを無効化
  const shouldExecuteLoadAfterLogin = !forceGuestMode;
  useLoadAfterLogin(shouldExecuteLoadAfterLogin);

  // ゲストモードが強制されている場合、または未ログインの場合
  const shouldShowGuestMode = forceGuestMode || !isLoggedIn;

  return (
    <>
      <SettingsModal />
      
      {/* 認証状態に応じたワークスペース表示 */}
      {shouldShowGuestMode ? (
        <GuestWorkspace />
      ) : (
        <AuthenticatedWorkspace />
      )}
    </>
  );
}