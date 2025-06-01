// frontend/app/components/GeneralSettings.tsx
"use client";

import { useCanvasStore } from "../hooks/useCanvas";
import { useAuth } from "../hooks/useAuth";
import { useState, useEffect } from "react";
import { getStoredDir, requestDirectory } from "../../utils/fileAccess";
import { toast } from "sonner";

export const GeneralSettings = () => {
  const { width, height, zoom, setWidth, setHeight, setZoom, resetPan } =
    useCanvasStore();
  const { isLoggedIn } = useAuth();
  const [directoryPath, setDirectoryPath] = useState<string>('未選択');
  const [isLoading, setIsLoading] = useState(false);

  // ディレクトリ情報を取得
  const checkCurrentDirectory = async () => {
    try {
      const dir = await getStoredDir();
      if (dir) {
        setDirectoryPath(dir.name || 'フォルダが選択済み');
      } else {
        setDirectoryPath('未選択');
      }
    } catch {
      setDirectoryPath('未選択');
    }
  };

  // コンポーネント初期化時にディレクトリ状態をチェック
  useEffect(() => {
    if (isLoggedIn) {
      checkCurrentDirectory();
    }
  }, [isLoggedIn]);

  const handleSelectDirectory = async () => {
    setIsLoading(true);
    try {
      await requestDirectory();
      await checkCurrentDirectory();
      toast.success('保存フォルダが設定されました');
    } catch (error) {
      console.error('Directory selection failed:', error);
      toast.error('フォルダの選択に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div role="tabpanel" className="space-y-6">
      {/* ファイル保存場所設定（ログイン時のみ表示） */}
      {isLoggedIn && (
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">ファイル保存設定</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">保存フォルダ:</label>
                <p className="text-sm text-gray-500 mt-1">{directoryPath}</p>
              </div>
              <button
                onClick={handleSelectDirectory}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? '選択中...' : 'フォルダを選択'}
              </button>
            </div>
            <p className="text-xs text-gray-400">
              メモとワークスペースの保存先フォルダを選択できます。
            </p>
          </div>
        </div>
      )}

      {/* キャンバス設定 */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">キャンバス設定</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="canvas-width">幅:</label>
            <input
              id="canvas-width"
              type="number"
              value={width}
              onChange={(e) => setWidth(+e.target.value)}
              className="w-24 p-1 border rounded text-black"
            />
            px
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="canvas-height">高さ:</label>
            <input
              id="canvas-height"
              type="number"
              value={height}
              onChange={(e) => setHeight(+e.target.value)}
              className="w-24 p-1 border rounded text-black"
            />
            px
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="canvas-zoom">初期ズーム:</label>
            <input
              id="canvas-zoom"
              type="number"
              step="0.1"
              min="0.1"
              max="5"
              value={zoom}
              onChange={(e) => setZoom(+e.target.value)}
              className="w-20 p-1 border rounded text-black"
            />
            倍
          </div>

          <button
            onClick={resetPan}
            className="px-3 py-1 bg-slate-600 rounded hover:bg-slate-500"
          >
            初期位置に戻す
          </button>
        </div>
      </div>
    </div>
  );
};