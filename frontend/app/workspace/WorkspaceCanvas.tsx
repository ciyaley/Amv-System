// frontend/app/workspace/WorkspaceCanvas.tsx
"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useCanvasStore } from "../hooks/useCanvas";
import { useMemos } from "../hooks/useMemos";
import { useThemeStore } from "../hooks/useTheme";
import { MemoWindow } from "./Memowindow";

export const WorkspaceCanvas = () => {
  const {
    width,
    height,
    zoom,
    offsetX,
    offsetY,
    setOffset,
    setZoom,
  } = useCanvasStore();
  const { bgColor, bgHandle, getBgImageUrl } = useThemeStore();
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const memosState = useMemos();
  
  // 🔧 修正: getVisibleMemos関数を使用してメモ取得
  const visibleMemos = useMemo(() => {
    
    // getVisibleMemos関数が利用可能な場合はそれを使用
    if (memosState.getVisibleMemos && typeof memosState.getVisibleMemos === 'function') {
      const visibleFromFunction = memosState.getVisibleMemos();
      return visibleFromFunction;
    }
    
    // フォールバック: 直接フィルタリング
    const filtered = memosState.memos.filter(m => m.visible !== false);
    return filtered;
  }, [memosState]);

  // 🔧 修正: メモリリーク対策 - 状態でURL管理
  useEffect(() => {
    let isCancelled = false;
    
    (async () => {
      if (bgHandle && !isCancelled) {
        try {
          const url = await getBgImageUrl();
          if (!isCancelled) {
            setBgUrl(url);
          }
        } catch {
          if (!isCancelled) {
            setBgUrl(null);
          }
        }
      } else if (!isCancelled) {
        setBgUrl(null);
      }
    })();
    
    return () => {
      isCancelled = true;
    };
  }, [bgHandle, getBgImageUrl]);

  // 🔧 修正: 背景URLのクリーンアップを分離
  useEffect(() => {
    return () => {
      if (bgUrl) {
        URL.revokeObjectURL(bgUrl);
      }
    };
  }, [bgUrl]);

  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  
  // 🔧 修正: グローバルイベントリスナーのクリーンアップ管理
  const globalListenersRef = useRef<(() => void)[]>([]);
  
  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      globalListenersRef.current.forEach(cleanup => cleanup());
      globalListenersRef.current = [];
    };
  }, []);

  // 🔧 修正: useCallbackでイベントハンドラーを最適化
  const handleWheel = useCallback((e: React.WheelEvent) => {
    const delta = -e.deltaY / 500;
    setZoom(zoom + delta);
  }, [zoom, setZoom]);

  // 背景パン開始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const el = e.target as HTMLElement;
    if (el.closest(".memo-window")) return;
    isPanning.current = true;
    last.current = { x: e.clientX, y: e.clientY };
  }, []);

  // 🔧 修正: エラーハンドリングとユーザーフィードバック強化
  const handleDoubleClick = useCallback(async (e: React.MouseEvent) => {
    const el = e.target as HTMLElement;
    if (el.closest(".memo-window")) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // クリック位置をキャンバス座標に変換
    const x = (e.clientX - rect.left - offsetX) / zoom;
    const y = (e.clientY - rect.top - offsetY) / zoom;
    
    const newMemo = {
      id: `memo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'New Memo',
      content: '',
      text: '',
      x,
      y,
      w: 300,
      h: 200,
      zIndex: 1,
      type: 'memo' as const,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      sourceType: 'guest' as const
    };
    
    try {
      memosState.createMemo({ x: newMemo.x, y: newMemo.y });
      toast.success('新しいメモを作成しました');
    } catch {
      toast.error('メモの作成に失敗しました');
    }
  }, [offsetX, offsetY, zoom, memosState]);

  // 🔧 修正: パン中のイベントハンドラー最適化
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
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
  }, [zoom, width, height, offsetX, offsetY, setOffset]);

  // 背景パン終了
  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    last.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      className="absolute inset-0 overflow-hidden"
      style={{
        touchAction: "none",
        overscrollBehavior: "none",
      }}
      data-testid="workspace-canvas"
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
        {visibleMemos.map((m) => (
          <MemoWindow key={m.id} memo={m} />
        ))}
      </div>
    </div>
  );
};