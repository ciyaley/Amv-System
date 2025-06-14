import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useVirtualScroll } from '../useVirtualScroll'

// VirtualScroll Hook のテスト設計
describe('useVirtualScroll Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // IntersectionObserver のモック
    global.IntersectionObserver = vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })) as unknown as typeof IntersectionObserver
  })

  describe('基本計算機能', () => {
    it('should calculate visible range correctly for standard density', () => {
      const { result } = renderHook(() => useVirtualScroll({
        totalItems: 1000,
        itemHeight: 48,
        containerHeight: 400,
        overscan: 3,
        scrollTop: 0
      }))

      expect(result.current.startIndex).toBe(0)
      expect(result.current.endIndex).toBe(12) // Math.ceil(400/48) + 3 = 12
      expect(result.current.visibleItems).toBe(13)
    })

    it('should calculate visible range correctly for detailed density', () => {
      const { result } = renderHook(() => useVirtualScroll({
        totalItems: 1000,
        itemHeight: 80,
        containerHeight: 400,
        overscan: 3,
        scrollTop: 0
      }))

      expect(result.current.startIndex).toBe(0)
      expect(result.current.endIndex).toBe(8) // Math.ceil(400/80) + 3 = 8
      expect(result.current.visibleItems).toBe(9)
    })

    it('should calculate visible range correctly for dense density', () => {
      const { result } = renderHook(() => useVirtualScroll({
        totalItems: 1000,
        itemHeight: 32,
        containerHeight: 400,
        overscan: 3,
        scrollTop: 0
      }))

      expect(result.current.startIndex).toBe(0)
      expect(result.current.endIndex).toBe(16) // Math.ceil(400/32) + 3 = 16
      expect(result.current.visibleItems).toBe(17)
    })
  })

  describe('スクロール位置による範囲計算', () => {
    it('should update visible range when scrolled to middle', () => {
      const { result, rerender } = renderHook(
        ({ scrollTop }) => useVirtualScroll({
          totalItems: 1000,
          itemHeight: 48,
          containerHeight: 400,
          overscan: 3,
          scrollTop
        }),
        { initialProps: { scrollTop: 0 } }
      )

      // 中間位置にスクロール (アイテム50付近)
      rerender({ scrollTop: 2400 }) // 50 * 48 = 2400

      expect(result.current.startIndex).toBe(47) // 50 - 3 (overscan)
      expect(result.current.endIndex).toBe(59) // 50 + Math.ceil(400/48) + 3
    })

    it('should handle scroll near the end of list', () => {
      const { result, rerender } = renderHook(
        ({ scrollTop }) => useVirtualScroll({
          totalItems: 100,
          itemHeight: 48,
          containerHeight: 400,
          overscan: 3,
          scrollTop
        }),
        { initialProps: { scrollTop: 0 } }
      )

      // 最後付近にスクロール
      rerender({ scrollTop: 4320 }) // 90 * 48 = 4320

      expect(result.current.startIndex).toBe(87) // 90 - 3 (overscan)
      expect(result.current.endIndex).toBe(99) // 配列の最後でクランプ
      expect(result.current.visibleItems).toBe(13)
    })
  })

  describe('境界値テスト', () => {
    it('should handle empty list', () => {
      const { result } = renderHook(() => useVirtualScroll({
        totalItems: 0,
        itemHeight: 48,
        containerHeight: 400,
        overscan: 3,
        scrollTop: 0
      }))

      expect(result.current.startIndex).toBe(0)
      expect(result.current.endIndex).toBe(0)
      expect(result.current.visibleItems).toBe(0)
    })

    it('should handle single item', () => {
      const { result } = renderHook(() => useVirtualScroll({
        totalItems: 1,
        itemHeight: 48,
        containerHeight: 400,
        overscan: 3,
        scrollTop: 0
      }))

      expect(result.current.startIndex).toBe(0)
      expect(result.current.endIndex).toBe(0)
      expect(result.current.visibleItems).toBe(1)
    })

    it('should handle very large datasets', () => {
      const { result } = renderHook(() => useVirtualScroll({
        totalItems: 100000,
        itemHeight: 48,
        containerHeight: 400,
        overscan: 3,
        scrollTop: 2400000 // 50000 * 48
      }))

      expect(result.current.startIndex).toBe(49997) // 50000 - 3
      expect(result.current.endIndex).toBe(50009) // 50000 + ceil(400/48) + 3
      expect(result.current.totalHeight).toBe(4800000) // 100000 * 48
    })
  })

  describe('パフォーマンス最適化', () => {
    it('should memoize calculations when inputs do not change', () => {
      const { result, rerender } = renderHook(() => useVirtualScroll({
        totalItems: 1000,
        itemHeight: 48,
        containerHeight: 400,
        overscan: 3,
        scrollTop: 0
      }))

      const firstResult = result.current

      // 同じパラメータで再レンダリング
      rerender()

      expect(result.current).toBe(firstResult) // 同じ参照を返す
    })

    it('should recalculate when scroll position changes', () => {
      const { result, rerender } = renderHook(
        ({ scrollTop }) => useVirtualScroll({
          totalItems: 1000,
          itemHeight: 48,
          containerHeight: 400,
          overscan: 3,
          scrollTop
        }),
        { initialProps: { scrollTop: 0 } }
      )

      const firstResult = result.current

      rerender({ scrollTop: 480 }) // 10 * 48

      expect(result.current).not.toBe(firstResult) // 新しい参照
      expect(result.current.startIndex).not.toBe(firstResult.startIndex)
    })
  })

  describe('エラーハンドリング', () => {
    it('should handle negative scroll position', () => {
      const { result } = renderHook(() => useVirtualScroll({
        totalItems: 1000,
        itemHeight: 48,
        containerHeight: 400,
        overscan: 3,
        scrollTop: -100
      }))

      expect(result.current.startIndex).toBe(0)
      expect(result.current.endIndex).toBeGreaterThanOrEqual(0)
    })

    it('should handle zero or negative container height', () => {
      const { result } = renderHook(() => useVirtualScroll({
        totalItems: 1000,
        itemHeight: 48,
        containerHeight: 0,
        overscan: 3,
        scrollTop: 0
      }))

      expect(result.current.visibleItems).toBe(0)
    })

    it('should handle zero or negative item height', () => {
      const { result } = renderHook(() => useVirtualScroll({
        totalItems: 1000,
        itemHeight: 0,
        containerHeight: 400,
        overscan: 3,
        scrollTop: 0
      }))

      expect(result.current.visibleItems).toBe(0)
    })
  })
})