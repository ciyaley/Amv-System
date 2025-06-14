"use client";

import { useRef, useState, useEffect, useCallback, useMemo, memo } from "react";
import { toast } from "sonner";
import { useCanvasStore } from "../hooks/useCanvas";
import { useMemos } from "../hooks/useMemos";
import { type MemoData } from "../types/tools";

interface Props { 
  memo: MemoData 
}

const MemoWindowComponent = ({ memo }: Props) => {
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

  // 🔧 修正: コンポーネントアンマウント時のタイマークリーンアップ
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
        deleteTimerRef.current = null;
      }
    };
  }, []);

  // メモ化されたスタイル計算
  const appearance = useMemo(() => ({
    backgroundColor: memo.appearance?.backgroundColor || '#ffeaa7',
    borderColor: memo.appearance?.borderColor || '#fdcb6e',
    cornerRadius: memo.appearance?.cornerRadius || 8,
    shadowEnabled: memo.appearance?.shadowEnabled !== false
  }), [memo.appearance]);


  // メモの更新時にローカル状態を同期
  useEffect(() => {
    setLocalTitle(memo.title);
    setLocalText(memo.text);
  }, [memo.title, memo.text]);

  // 新しく作成されたメモは自動的に編集モードに
  useEffect(() => {
    if (memo.text === "" && memo.title === "新しいメモ") {
      setEditing(true);
    }
  }, [memo.text, memo.title]);

  // 🔧 修正: グローバルイベントリスナーのクリーンアップ管理
  const activeListenersRef = useRef<(() => void)[]>([]);
  
  useEffect(() => {
    return () => {
      // コンポーネントアンマウント時に全てのイベントリスナーをクリーンアップ
      activeListenersRef.current.forEach(cleanup => cleanup());
      activeListenersRef.current = [];
    };
  }, []);

  /** ── ドラッグ（最適化版） ────────────────── */
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // ヘッダーコントロール、レイヤー操作、リサイズハンドルからのドラッグを無効化
    if (target.closest('.memo-header-controls') || 
        target.closest('button') || 
        target.closest('.cursor-se-resize')) {
      return;
    }
    
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
      // クリーンアップリストから削除
      activeListenersRef.current = activeListenersRef.current.filter(cleanup => cleanup !== up);
    };
    
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    
    // アクティブなリスナーのクリーンアップ関数を記録
    activeListenersRef.current.push(up);
  }, [memo.id, memo.x, memo.y, zoom, updateMemoPosition]);

  /** ── リサイズ（最適化版） ────────────────── */
  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
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
      // クリーンアップリストから削除
      activeListenersRef.current = activeListenersRef.current.filter(cleanup => cleanup !== up);
    };
    
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    
    // アクティブなリスナーのクリーンアップ関数を記録
    activeListenersRef.current.push(up);
  }, [memo.id, memo.w, memo.h, zoom, updateMemoSize]);

  /** ── 編集完了時の自動保存（最適化版） ────────────────── */
  const handleSave = useCallback(() => {
    updateMemo(memo.id, { 
      title: localTitle || '無題のメモ',
      text: localText 
    });
    setEditing(false);
    // 自動保存のため、トーストは表示しない
  }, [memo.id, localTitle, localText, updateMemo]);

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
  const handleDeleteStart = useCallback(() => {
    // 既存のタイマーがあればクリア
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
    }
    
    deleteTimerRef.current = setTimeout(async () => {
      if (confirm('このメモを削除しますか？')) {
        try {
          await deleteMemo(memo.id);
          toast.success('メモを削除しました');
        } catch {
          toast.error('メモの削除に失敗しました');
        }
      }
      deleteTimerRef.current = null;
    }, 1000); // 1秒長押し
  }, [memo.id, deleteMemo]);

  const handleDeleteEnd = useCallback(() => {
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
  }, []);


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
      data-testid={`memo-window-${memo.id}`}
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
            data-testid="memo-title-input"
          />
        ) : (
          <h3 className="flex-1 px-2 text-sm font-medium truncate" data-testid="memo-title">{memo.title}</h3>
        )}
        
        <div className="memo-header-controls flex items-center space-x-1">
          {/* タグ表示トグル */}
          <button
            onClick={() => setShowTags(!showTags)}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 text-xs hover:bg-gray-200 rounded"
            title="タグ"
          >
            #
          </button>
          
          {/* 画面から隠すボタン */}
          <button
            onClick={() => toggleMemoVisibility(memo.id)}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 text-xs hover:bg-yellow-200 rounded"
            title="画面から隠す"
            data-testid="memo-hide-button"
          >
            👁
          </button>
          
          {/* 削除ボタン（長押し） */}
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              handleDeleteStart();
            }}
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
                  onMouseDown={(e) => e.stopPropagation()}
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
              onMouseDown={(e) => e.stopPropagation()}
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
          onMouseDown={(e) => e.stopPropagation()}
          className="px-2 py-0.5 text-xs hover:bg-gray-200 rounded"
          title="一段上げ"
        >
          ▲
        </button>
        <button 
          onClick={() => moveDown(memo.id)}
          onMouseDown={(e) => e.stopPropagation()}
          className="px-2 py-0.5 text-xs hover:bg-gray-200 rounded"
          title="一段下げ"
        >
          ▼
        </button>
        <button 
          onClick={() => bringToFront(memo.id)}
          onMouseDown={(e) => e.stopPropagation()}
          className="px-2 py-0.5 text-xs hover:bg-gray-200 rounded"
          title="最前面へ"
        >
          ⏶
        </button>
        <button 
          onClick={() => sendToBack(memo.id)}
          onMouseDown={(e) => e.stopPropagation()}
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
              data-testid={`memo-textarea-${memo.id}`}
            />
            <div className="flex justify-end mt-2 space-x-2">
              <button
                onClick={() => {
                  setLocalTitle(memo.title);
                  setLocalText(memo.text);
                  setEditing(false);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="px-3 py-1 text-sm bg-gray-300 rounded hover:bg-gray-400"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                onMouseDown={(e) => e.stopPropagation()}
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
        data-testid="memo-resize-handle"
      />
    </article>
  );
};

// React.memoでパフォーマンス最適化
export const MemoWindow = memo(MemoWindowComponent, (prevProps, nextProps) => {
  // メモのコンテンツが変更された場合のみ再レンダリング
  const prevMemo = prevProps.memo;
  const nextMemo = nextProps.memo;
  
  return (
    prevMemo.id === nextMemo.id &&
    prevMemo.title === nextMemo.title &&
    prevMemo.text === nextMemo.text &&
    prevMemo.x === nextMemo.x &&
    prevMemo.y === nextMemo.y &&
    prevMemo.w === nextMemo.w &&
    prevMemo.h === nextMemo.h &&
    prevMemo.zIndex === nextMemo.zIndex &&
    prevMemo.visible === nextMemo.visible &&
    JSON.stringify(prevMemo.appearance) === JSON.stringify(nextMemo.appearance) &&
    JSON.stringify(prevMemo.tags) === JSON.stringify(nextMemo.tags)
  );
});