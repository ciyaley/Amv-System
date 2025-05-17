"use client";

import { useRef, useState } from "react";
import { useMemos, MemoData } from "@/app/hooks/useMemos";
import { useCanvasStore } from "@/app/hooks/useCanvas";

interface Props { memo: MemoData }

export const MemoWindow = ({ memo }: Props) => {
  const update = useMemos((s) => s.updateMemo);
  const { bringToFront, sendToBack, moveUp, moveDown } = useMemos();
  const { zoom } = useCanvasStore();
  const [editing, setEditing] = useState(false);
  const dragRef = useRef<HTMLElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  /** ── ドラッグ ────────────────── */
  const onMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = memo.x;
    const origY = memo.y;
    const move = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;
      update(memo.id, { x: origX + dx, y: origY + dy });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  /** ── リサイズ ────────────────── */
  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const origW = memo.w;
    const origH = memo.h;
    const move = (ev: MouseEvent) => {
      const dw = (ev.clientX - startX) / zoom;
      const dh = (ev.clientY - startY) / zoom;
      update(memo.id, { w: Math.max(120, origW + dw), h: Math.max(80, origH + dh) });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <article
      
      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e); }}
      onDoubleClick={() => setEditing((v) => !v)}
      className="memo-window absolute bg-white shadow rounded border overflow-hidden"
      style={{ zIndex: memo.zIndex, left: memo.x, top: memo.y, width: memo.w, height: memo.h }}
    >
      {/* ── レイヤー操作タブ ────────────────── */}
     <div className="flex space-x-1 bg-grey-100 p-1">
      <button onClick={() => moveUp(memo.id)} aria-label="一段上げ">
         ▲
       </button>
       <button onClick={() => moveDown(memo.id)} aria-label="一段下げ">
        ▼
       </button>
       <button onClick={() => bringToFront(memo.id)} aria-label="最前面へ">
         ⏶
       </button>
       <button onClick={() => sendToBack(memo.id)} aria-label="最背面へ">
         ⏷
       </button>
     </div>



      {editing ? (
        <textarea
          className="w-full h-full resize-none p-2 outline-none"
          value={memo.text}
          onChange={(e) => update(memo.id, { text: e.target.value })}
        />
      ) : (
        <pre className="p-2 whitespace-pre-wrap break-words">{memo.text || "（ダブルクリックで編集）"}</pre>
      )}

      {/* 右下リサイズハンドル */}
      <div
        ref={resizeRef}
        onMouseDown={onResizeMouseDown}
        className="absolute right-0 bottom-0 w-3 h-3 bg-slate-400 cursor-se-resize"
      />
    </article>
  );
};