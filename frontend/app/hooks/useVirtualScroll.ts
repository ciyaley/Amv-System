import { useMemo } from 'react'

export interface VirtualScrollConfig {
  totalItems: number
  itemHeight: number
  containerHeight: number
  overscan?: number
  scrollTop: number
}

export interface VirtualScrollResult {
  startIndex: number
  endIndex: number
  visibleItems: number
  totalHeight: number
  offsetY: number
}

export const useVirtualScroll = ({
  totalItems,
  itemHeight,
  containerHeight,
  overscan = 3,
  scrollTop
}: VirtualScrollConfig): VirtualScrollResult => {
  return useMemo(() => {
    // エラーハンドリング
    if (totalItems <= 0 || itemHeight <= 0 || containerHeight <= 0) {
      return {
        startIndex: 0,
        endIndex: 0,
        visibleItems: 0,
        totalHeight: 0,
        offsetY: 0
      }
    }

    // 負のスクロール位置を正規化
    const normalizedScrollTop = Math.max(0, scrollTop)

    // 可視範囲の計算
    const startIndex = Math.max(0, Math.floor(normalizedScrollTop / itemHeight) - overscan)
    
    // コンテナに表示可能なアイテム数
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    
    // 終了インデックス（配列の範囲内でクランプ）
    const endIndex = Math.min(
      totalItems - 1,
      startIndex + visibleCount + overscan
    )

    // 実際の可視アイテム数
    const visibleItems = Math.max(0, endIndex - startIndex + 1)

    // 総高さ
    const totalHeight = totalItems * itemHeight

    // 表示オフセット（仮想スクロールでの上部余白）
    const offsetY = startIndex * itemHeight

    return {
      startIndex,
      endIndex,
      visibleItems,
      totalHeight,
      offsetY
    }
  }, [totalItems, itemHeight, containerHeight, overscan, scrollTop])
}