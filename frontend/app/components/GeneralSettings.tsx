// frontend/app/components/GeneralSettings.tsx
"use client";

import { useCanvasStore } from "../hooks/useCanvas"; // 後出予定

export const GeneralSettings = () => {
  const { width, height, zoom, setWidth, setHeight, setZoom } = useCanvasStore();
  return (
    <div role="tabpanel" className="space-y-4">
      <label>
        作業エリア幅:
        <input
          type="number"
          value={width}
          onChange={(e) => setWidth(+e.target.value)}
          className="ml-2 w-24 p-1 border rounded text-black"
        />
        px
      </label>
      <label>
        作業エリア高:
        <input
          type="number"
          value={height}
          onChange={(e) => setHeight(+e.target.value)}
          className="ml-2 w-24 p-1 border rounded text-black"
        />
        px
      </label>
      <label>
        初期ズーム倍率:
        <input
          type="number"
          step="0.1"
          min="0.1"
          max="5"
          value={zoom}
          onChange={(e) => setZoom(+e.target.value)}
          className="ml-2 w-20 p-1 border rounded text-black"
        />
        倍
      </label>
    </div>
  );
};