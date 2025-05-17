// frontend/app/workspace/WorkspaceCanvas.tsx
"use client";

import { useCanvasStore } from "@/app/hooks/useCanvas";
import { useThemeStore } from "@/app/hooks/useTheme";
import { useMemos } from "@/app/hooks/useMemos";
import { MemoWindow } from "./Memowindow";
import { useRef, useState, useEffect } from "react";

export const WorkspaceCanvas = () => {
  const {
    width,
    height,
    zoom,
    offsetX,
    offsetY,
    //panBy,
    setOffset,
    setZoom,
  } = useCanvasStore();
  const { bgColor, bgHandle, getBgImageUrl } = useThemeStore();
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const memos = useMemos((s) => s.memos);

  
  useEffect(() => {
    let url: string | null = null;
    (async () => {
      if (bgHandle) {
        url = await getBgImageUrl();
        setBgUrl(url);
      } else {
        setBgUrl(null);
      }
    })();
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [bgHandle, getBgImageUrl]);

  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  // ズーム
  const handleWheel = (e: React.WheelEvent) => {
    const delta = -e.deltaY / 500;
    setZoom(zoom + delta);
  };

  // 背景パン開始
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const el = e.target as HTMLElement;
    if (el.closest(".memo-window")) return;
    isPanning.current = true;
    last.current = { x: e.clientX, y: e.clientY };
  };

  // 背景パン中
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current || !last.current) return;
    const dx = (e.clientX - last.current.x) / zoom;
    const dy = (e.clientY - last.current.y) / zoom;
    last.current = { x: e.clientX, y: e.clientY };

    // clamp 用にビューポートサイズ取得
    const cr = containerRef.current;
    if (!cr) return;
    const { width: vw, height: vh } = cr.getBoundingClientRect();

    // 世界座標（背景）のサイズ
    const worldW = width * zoom;
    const worldH = height * zoom;

    // offsetX の許容範囲 [minX, maxX]
    // maxX = 0  (左端以上には寄せない)
    // minX = vw - worldW  (右端以下には寄せない)
    const minX = Math.min(vw - worldW, 0);
    const maxX = 0;
    const minY = Math.min(vh - worldH, 0);
    const maxY = 0;

    // clamp してセット
    const nextX = Math.max(minX, Math.min(offsetX + dx, maxX));
    const nextY = Math.max(minY, Math.min(offsetY + dy, maxY));
    setOffset(nextX, nextY);
  };

  // 背景パン終了
  const handleMouseUp = () => {
    isPanning.current = false;
    last.current = null;
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="absolute inset-0 overflow-hidden"
      style={{
        touchAction: "none",
        overscrollBehavior: "none",
      }}
    >
      <div
        className="relative"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
          transformOrigin: "0 0",
          backgroundColor: bgColor,
          backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
          backgroundSize: "cover",
        }}
      >
        {memos.map((m) => (
          <MemoWindow key={m.id} memo={m} />
        ))}
      </div>
    </div>
  );
};