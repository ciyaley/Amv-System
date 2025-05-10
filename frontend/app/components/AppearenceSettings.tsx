// frontend/app/components/AppearanceSettings.tsx
"use client";

import { useThemeStore } from "@/app/hooks/useTheme"; // 後出予定

export const AppearanceSettings = () => {
  const { bgColor, setBgColor, bgHandle, pickBgImage } = useThemeStore();
  return (
    <div role="tabpanel" className="space-y-4">
      <label>
        背景色:
        <input
          type="color"
          value={bgColor}
          onChange={(e) => setBgColor(e.target.value)}
          className="ml-2 w-10 h-8 p-0 border-0"
          aria-label="背景色選択"
        />
      </label>
      <button
        onClick={pickBgImage}
        className="px-3 py-1 bg-slate-600 rounded hover:bg-slate-500"
      >
        画像を選択
      </button>
      {bgHandle && <p className="text-sm">選択済み: {bgHandle.name}</p>}
    </div>
  );
};