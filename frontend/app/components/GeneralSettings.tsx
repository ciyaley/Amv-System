// frontend/app/components/GeneralSettings.tsx
"use client";

import { useCanvasStore } from "@/app/hooks/useCanvas";

export const GeneralSettings = () => {
  const { width, height, zoom, setWidth, setHeight, setZoom, resetPan } =
    useCanvasStore();

  return (
    <div role="tabpanel" className="space-y-4">
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
  );
};