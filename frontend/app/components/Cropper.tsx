// frontend/app/components/Cropper.tsx
"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

interface CropRect {
  x: number;     // 0～1 (親コンテナ幅に対する割合)
  y: number;     // 0～1
  width: number; // 0～1 (親コンテナ幅に対する割合)
}

interface CropperProps {
  imageUrl: string;
  aspectRatio: number;          // width/height 比
  crop: CropRect;
  onCropChange: (c: CropRect) => void;
}

export const Cropper: React.FC<CropperProps> = ({
  imageUrl,
  aspectRatio,
  crop,
  onCropChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // マウス操作状態
  const [mode, setMode] = useState<"move"|"resize"|null>(null);
  const lastPos = useRef<{ x: number; y: number }|null>(null);

  // マウスダウンでモード判定
  const onMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    // トリム枠の絶対座標
    const cLeft   = crop.x * rect.width;
    const cTop    = crop.y * rect.height;
    const cWidth  = crop.width * rect.width;
    const cHeight = cWidth / aspectRatio;
    // 枠内部なら「移動」、端付近なら「リサイズ」
    const inResizeZone = 
      Math.abs(clickX - (cLeft + cWidth)) < 10 &&
      Math.abs(clickY - (cTop + cHeight)) < 10;
    setMode(inResizeZone ? "resize" : "move");
    lastPos.current = { x: e.clientX, y: e.clientY };
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current || !lastPos.current || !mode) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };

    let { x, y, width } = crop;
    if (mode === "move") {
      x += dx / rect.width;
      y += dy / rect.height;
      // 決定的にコンテナ内に収める
      x = Math.max(0, Math.min(x, 1 - width));
      y = Math.max(0, Math.min(y, 1 - width / aspectRatio));
    } else {
      // リサイズ：幅を調整（height は比率から算出）
      width += dx / rect.width;
      width = Math.max(0.1, Math.min(width, 1 - x));
      // 範囲外には出ないよう clamp
      if (y + width / aspectRatio > 1) {
        width = (1 - y) * aspectRatio;
      }
    }

    onCropChange({ x, y, width });
  }, [mode, crop, aspectRatio, onCropChange]);

  const onMouseUp = useCallback(() => {
    setMode(null);
    lastPos.current = null;
    window.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("mousemove", onMouseMove);
  }, [onMouseMove]);

  useEffect(() => {
    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [onMouseMove, onMouseUp]);

  // 描画
  return (
    <div
      ref={containerRef}
      className="relative w-full h-64 bg-black bg-center bg-cover"
      style={{ backgroundImage: `url(${imageUrl})` }}
      onMouseDown={onMouseDown}
    >
      {/* 切り取り枠 */}
      <div
        className="absolute border-2 border-white/80"
        style={{
          left:   `${crop.x * 100}%`,
          top:    `${crop.y * 100}%`,
          width:  `${crop.width * 100}%`,
          height: `${(crop.width / aspectRatio) * 100}%`,
          cursor: mode === "resize" ? "nwse-resize" : "move",
        }}
      />
    </div>
  );
};