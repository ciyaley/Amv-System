// frontend/app/components/AppearanceSettings.tsx
"use client";

import { useThemeStore } from "../hooks/useTheme";
import { useEffect, useState } from "react";

export const AppearanceSettings = () => {
  const { bgColor, setBgColor, bgHandle, pickBgImage, getBgImageUrl } =
    useThemeStore();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // bgHandle が変わったらプレビューURLを更新
  useEffect(() => {
    let url: string | null = null;
    (async () => {
      const u = await getBgImageUrl();
      url = u;
      setPreviewUrl(u);
    })();
    // クリーンアップで ObjectURL を解放
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [bgHandle, getBgImageUrl]);

  return (
    <div role="tabpanel" className="space-y-4">
      <div className="flex items-center space-x-2">
        <label htmlFor="bg-color-picker" className="whitespace-nowrap">
          背景色:
        </label>
        <input
          id="bg-color-picker"
          type="color"
          value={bgColor}
          onChange={(e) => setBgColor(e.target.value)}
          className="w-10 h-8 p-0 border-0"
          aria-label="背景色選択"
        />
      </div>

      <div>
        <button
          onClick={pickBgImage}
          className="px-3 py-1 bg-slate-600 rounded hover:bg-slate-500"
        >
          背景画像を選択
        </button>
      </div>

      {previewUrl && (
        <div>
          <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
            プレビュー:
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="背景プレビュー"
            className="max-w-full h-auto rounded shadow"
          />
        </div>
      )}

      {!bgHandle && (
        <p className="text-sm text-gray-500">
          背景画像が選択されていません
        </p>
      )}
    </div>
  );
};