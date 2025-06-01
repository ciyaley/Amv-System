"use client";

import { useRef, useState, useEffect } from "react";
import { useMemos, MemoData } from "../hooks/useMemos";
import { useCanvasStore } from "../hooks/useCanvas";
import { toast } from "sonner";

interface Props { 
  memo: MemoData 
}

export const MemoWindow = ({ memo }: Props) => {
  const { updateMemo, updateMemoPosition, updateMemoSize, deleteMemo, bringToFront, sendToBack, moveUp, moveDown, toggleMemoVisibility } = useMemos();
  const { zoom } = useCanvasStore();
  const [editing, setEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(memo.title);
  const [localText, setLocalText] = useState(memo.text);
  const [showTags, setShowTags] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const dragRef = useRef<HTMLElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const deleteTimerRef = useRef<NodeJS.Timeout | null>(null);

  // メモの更新時にローカル状態を同期
  useEffect(() => {
    setLocalTitle(memo.title);
    setLocalText(memo.text);
  }, [memo.title, memo.text]);

  /** ── ドラッグ ────────────────── */
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.memo-header-controls')) return;
    
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = memo.x;
    const origY = memo.y;
    
    const move = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;
      updateMemoPosition(memo.id, origX + dx, origY + dy);
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
      updateMemoSize(memo.id, Math.max(180, origW + dw), Math.max(120, origH + dh));
    };
    
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  /** ── 編集完了時の自動保存 ────────────────── */
  const handleSave = () => {
    updateMemo(memo.id, { 
      title: localTitle || '無題のメモ',
      text: localText 
    });
    setEditing(false);
    // 自動保存のため、トーストは表示しない
  };

  /** ── タグの追加 ────────────────── */
  const handleAddTag = () => {
    if (tagInput.trim() && !memo.tags?.includes(tagInput.trim())) {
      const newTags = [...(memo.tags || []), tagInput.trim()];
      updateMemo(memo.id, { tags: newTags });
      setTagInput("");
      toast.success(`タグ「${tagInput.trim()}」を追加しました`);
    }
  };

  /** ── タグの削除 ────────────────── */
  const handleRemoveTag = (tag: string) => {
    const newTags = memo.tags?.filter(t => t !== tag) || [];
    updateMemo(memo.id, { tags: newTags });
    toast.info(`タグ「${tag}」を削除しました`);
  };

  /** ── メモの削除（長押し） ────────────────── */
  const handleDeleteStart = () => {
    deleteTimerRef.current = setTimeout(() => {
      if (confirm('このメモを削除しますか？')) {
        deleteMemo(memo.id);
        toast.success('メモを削除しました');
      }
    }, 1000); // 1秒長押し
  };

  const handleDeleteEnd = () => {
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
    }
  };

  const appearance = memo.appearance || {
    backgroundColor: '#ffeaa7',
    borderColor: '#fdcb6e',
    cornerRadius: 8,
    shadowEnabled: true
  };

  return (
    <article
      ref={dragRef}
      onMouseDown={onMouseDown}
      className="memo-window absolute overflow-hidden select-none"
      style={{ 
        zIndex: memo.zIndex, 
        left: memo.x, 
        top: memo.y, 
        width: memo.w, 
        height: memo.h,
        backgroundColor: appearance.backgroundColor,
        border: `2px solid ${appearance.borderColor}`,
        borderRadius: appearance.cornerRadius,
        boxShadow: appearance.shadowEnabled ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none'
      }}
    >
      {/* ── ヘッダー ────────────────── */}
      <div className="memo-header flex items-center justify-between p-2 bg-white bg-opacity-50 border-b">
        {editing ? (
          <input
            type="text"
            className="flex-1 px-2 py-1 text-sm font-medium bg-transparent outline-none"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            placeholder="タイトル"
          />
        ) : (
          <h3 className="flex-1 px-2 text-sm font-medium truncate">{memo.title}</h3>
        )}
        
        <div className="memo-header-controls flex items-center space-x-1">
          {/* タグ表示トグル */}
          <button
            onClick={() => setShowTags(!showTags)}
            className="p-1 text-xs hover:bg-gray-200 rounded"
            title="タグ"
          >
            #
          </button>
          
          {/* 画面から隠すボタン */}
          <button
            onClick={() => toggleMemoVisibility(memo.id)}
            className="p-1 text-xs hover:bg-yellow-200 rounded"
            title="画面から隠す"
          >
            👁
          </button>
          
          {/* 削除ボタン（長押し） */}
          <button
            onMouseDown={handleDeleteStart}
            onMouseUp={handleDeleteEnd}
            onMouseLeave={handleDeleteEnd}
            className="p-1 text-xs hover:bg-red-200 rounded"
            title="長押しで削除"
          >
            ×
          </button>
        </div>
      </div>

      {/* ── タグセクション ────────────────── */}
      {showTags && (
        <div className="p-2 bg-white bg-opacity-30 border-b">
          <div className="flex flex-wrap gap-1 mb-2">
            {memo.tags?.map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs bg-white bg-opacity-70 rounded-full flex items-center"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex">
            <input
              type="text"
              className="flex-1 px-2 py-1 text-xs bg-white bg-opacity-50 rounded-l outline-none"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="新しいタグ"
            />
            <button
              onClick={handleAddTag}
              className="px-2 py-1 text-xs bg-white bg-opacity-70 rounded-r hover:bg-opacity-100"
            >
              追加
            </button>
          </div>
        </div>
      )}

      {/* ── レイヤー操作 ────────────────── */}
      <div className="flex justify-center space-x-1 p-1 bg-white bg-opacity-30">
        <button 
          onClick={() => moveUp(memo.id)} 
          className="px-2 py-0.5 text-xs hover:bg-gray-200 rounded"
          title="一段上げ"
        >
          ▲
        </button>
        <button 
          onClick={() => moveDown(memo.id)} 
          className="px-2 py-0.5 text-xs hover:bg-gray-200 rounded"
          title="一段下げ"
        >
          ▼
        </button>
        <button 
          onClick={() => bringToFront(memo.id)} 
          className="px-2 py-0.5 text-xs hover:bg-gray-200 rounded"
          title="最前面へ"
        >
          ⏶
        </button>
        <button 
          onClick={() => sendToBack(memo.id)} 
          className="px-2 py-0.5 text-xs hover:bg-gray-200 rounded"
          title="最背面へ"
        >
          ⏷
        </button>
      </div>

      {/* ── 本文エリア ────────────────── */}
      <div 
        className="memo-content flex-1 overflow-auto"
        onDoubleClick={() => setEditing(true)}
        style={{ height: `calc(100% - ${showTags ? '140px' : '80px'})` }}
      >
        {editing ? (
          <div className="h-full flex flex-col p-2">
            <textarea
              className="flex-1 w-full resize-none p-2 bg-white bg-opacity-50 rounded outline-none"
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              placeholder="メモの内容"
            />
            <div className="flex justify-end mt-2 space-x-2">
              <button
                onClick={() => {
                  setLocalTitle(memo.title);
                  setLocalText(memo.text);
                  setEditing(false);
                }}
                className="px-3 py-1 text-sm bg-gray-300 rounded hover:bg-gray-400"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
              >
                完了
              </button>
            </div>
          </div>
        ) : (
          <pre className="p-3 whitespace-pre-wrap break-words text-sm">
            {memo.text || "（ダブルクリックで編集）"}
          </pre>
        )}
      </div>

      {/* 右下リサイズハンドル */}
      <div
        ref={resizeRef}
        onMouseDown={onResizeMouseDown}
        className="absolute right-0 bottom-0 w-4 h-4 cursor-se-resize"
        style={{ 
          background: `linear-gradient(135deg, transparent 50%, ${appearance.borderColor} 50%)`
        }}
      />
    </article>
  );
};