import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useVirtualScroll } from '../hooks/useVirtualScroll'
import type { MemoData } from '../hooks/useMemos'

export interface VirtualScrollContainerProps {
  items: MemoData[]
  itemHeight: number
  height: number
  onItemSelect?: (item: MemoData) => void
  onScroll?: (scrollTop: number) => void
  density?: 'detailed' | 'standard' | 'dense'
  renderItem?: React.ComponentType<{ item: MemoData }>
  className?: string
}

// デフォルトのアイテムレンダラー
const DefaultItemRenderer: React.FC<{ item: MemoData; onSelect?: (item: MemoData) => void }> = ({ 
  item, 
  onSelect 
}) => (
  <div
    role="listitem"
    className="flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
    onClick={() => onSelect?.(item)}
    data-testid={`item-${item.id}`}
  >
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium text-gray-900 truncate">
        {item.title}
      </div>
      <div className="text-xs text-gray-600 truncate">
        {item.text}
      </div>
    </div>
    <div className="text-xs text-gray-500 ml-2">
      {item.category}
    </div>
  </div>
)

export const VirtualScrollContainer: React.FC<VirtualScrollContainerProps> = ({
  items,
  itemHeight,
  height,
  onItemSelect,
  onScroll,
  density = 'standard',
  renderItem: CustomItemRenderer,
  className = ''
}) => {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()

  // 仮想スクロールの計算
  const { startIndex, endIndex, visibleItems, totalHeight, offsetY } = useVirtualScroll({
    totalItems: items.length,
    itemHeight,
    containerHeight: height,
    overscan: 3,
    scrollTop
  })

  // スクロールイベントのデバウンス処理
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement
    const newScrollTop = target.scrollTop

    // 即座に状態更新（スムーズなスクロール）
    setScrollTop(newScrollTop)

    // デバウンス処理（16ms = 60fps）
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    scrollTimeoutRef.current = setTimeout(() => {
      onScroll?.(newScrollTop)
    }, 16)
  }, [onScroll])

  // キーボードナビゲーション
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!containerRef.current) return

    const container = containerRef.current
    const currentScrollTop = container.scrollTop

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        container.scrollTop = Math.min(
          currentScrollTop + itemHeight,
          totalHeight - height
        )
        break

      case 'ArrowUp':
        event.preventDefault()
        container.scrollTop = Math.max(currentScrollTop - itemHeight, 0)
        break

      case 'PageDown':
        event.preventDefault()
        container.scrollTop = Math.min(
          currentScrollTop + height,
          totalHeight - height
        )
        break

      case 'PageUp':
        event.preventDefault()
        container.scrollTop = Math.max(currentScrollTop - height, 0)
        break

      case 'Home':
        event.preventDefault()
        container.scrollTop = 0
        break

      case 'End':
        event.preventDefault()
        container.scrollTop = totalHeight - height
        break
    }
  }, [itemHeight, totalHeight, height])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  // 可視アイテムの生成
  const visibleItemsToRender = React.useMemo(() => {
    if (visibleItems === 0) return []

    return items.slice(startIndex, endIndex + 1).map((item, index) => {
      const actualIndex = startIndex + index
      return { item, index: actualIndex }
    })
  }, [items, startIndex, endIndex, visibleItems])

  // 空の場合の処理
  if (items.length === 0) {
    return (
      <div
        role="list"
        aria-label="仮想スクロールリスト"
        className={`w-full ${className}`}
        style={{ height }}
      >
        <div className="flex items-center justify-center h-full text-gray-500">
          アイテムがありません
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      role="list"
      aria-label="仮想スクロールリスト"
      tabIndex={0}
      className={`w-full overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
    >
      {/* 仮想スクロールコンテナ */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* 可視アイテムのコンテナ */}
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItemsToRender.map(({ item, index }) => {
            const ItemComponent = CustomItemRenderer || DefaultItemRenderer

            if (CustomItemRenderer) {
              return (
                <div key={item.id} style={{ height: itemHeight }}>
                  <ItemComponent item={item} />
                </div>
              )
            }

            return (
              <div key={item.id} style={{ height: itemHeight }}>
                <DefaultItemRenderer item={item} onSelect={onItemSelect} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}