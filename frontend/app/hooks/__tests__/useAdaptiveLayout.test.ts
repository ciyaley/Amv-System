import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useAdaptiveLayout } from '../useAdaptiveLayout'

describe('useAdaptiveLayout Hook', () => {
  describe('レイアウトタイプの判定', () => {
    it('should return minimal layout for 0-10 items', () => {
      const { result } = renderHook(() => useAdaptiveLayout(5))
      
      expect(result.current.layoutType).toBe('minimal')
      expect(result.current.itemsPerPage).toBe(10)
      expect(result.current.showSearch).toBe(false)
      expect(result.current.virtualScrollEnabled).toBe(false)
    })

    it('should return standard layout for 11-50 items', () => {
      const { result } = renderHook(() => useAdaptiveLayout(30))
      
      expect(result.current.layoutType).toBe('standard')
      expect(result.current.itemsPerPage).toBe(25)
      expect(result.current.showSearch).toBe(true)
      expect(result.current.virtualScrollEnabled).toBe(false)
    })

    it('should return compact layout for 51-200 items', () => {
      const { result } = renderHook(() => useAdaptiveLayout(150))
      
      expect(result.current.layoutType).toBe('compact')
      expect(result.current.itemsPerPage).toBe(50)
      expect(result.current.showSearch).toBe(true)
      expect(result.current.virtualScrollEnabled).toBe(false)
      expect(result.current.defaultCollapsed).toBe(true)
    })

    it('should return dense layout for 200+ items', () => {
      const { result } = renderHook(() => useAdaptiveLayout(500))
      
      expect(result.current.layoutType).toBe('dense')
      expect(result.current.itemsPerPage).toBe(100)
      expect(result.current.showSearch).toBe(true)
      expect(result.current.virtualScrollEnabled).toBe(true)
      expect(result.current.defaultCollapsed).toBe(true)
    })
  })

  describe('密度設定の適用', () => {
    it('should override layout with manual density setting', () => {
      const { result } = renderHook(() => 
        useAdaptiveLayout(30, { manualDensity: 'detailed' })
      )
      
      expect(result.current.layoutType).toBe('standard')
      expect(result.current.density).toBe('detailed')
      expect(result.current.itemHeight).toBe(80) // 詳細表示の高さ
    })

    it('should apply standard density by default', () => {
      const { result } = renderHook(() => useAdaptiveLayout(30))
      
      expect(result.current.density).toBe('standard')
      expect(result.current.itemHeight).toBe(48) // 標準表示の高さ
    })

    it('should apply dense density setting', () => {
      const { result } = renderHook(() => 
        useAdaptiveLayout(30, { manualDensity: 'dense' })
      )
      
      expect(result.current.density).toBe('dense')
      expect(result.current.itemHeight).toBe(32) // 密集表示の高さ
    })
  })

  describe('レイアウト設定の計算', () => {
    it('should calculate correct item heights for each density', () => {
      const { result: detailed } = renderHook(() => 
        useAdaptiveLayout(10, { manualDensity: 'detailed' })
      )
      const { result: standard } = renderHook(() => 
        useAdaptiveLayout(10, { manualDensity: 'standard' })
      )
      const { result: dense } = renderHook(() => 
        useAdaptiveLayout(10, { manualDensity: 'dense' })
      )
      
      expect(detailed.current.itemHeight).toBe(80)
      expect(standard.current.itemHeight).toBe(48)
      expect(dense.current.itemHeight).toBe(32)
    })

    it('should provide correct preview settings', () => {
      const { result } = renderHook(() => useAdaptiveLayout(50))
      
      expect(result.current.previewDelay).toBe(300)
      expect(result.current.previewWidth).toBe(320)
      expect(result.current.previewMaxHeight).toBe(400)
    })

    it('should enable category grouping for standard layout and above', () => {
      const { result: minimal } = renderHook(() => useAdaptiveLayout(5))
      const { result: standard } = renderHook(() => useAdaptiveLayout(30))
      
      expect(minimal.current.enableCategoryGrouping).toBe(false)
      expect(standard.current.enableCategoryGrouping).toBe(true)
    })
  })

  describe('パフォーマンス最適化', () => {
    it('should memoize layout calculations', () => {
      const { result, rerender } = renderHook(
        ({ count }) => useAdaptiveLayout(count),
        { initialProps: { count: 30 } }
      )
      
      const firstResult = result.current
      
      // 同じ値で再レンダリング
      rerender({ count: 30 })
      
      expect(result.current).toBe(firstResult) // 同じ参照を返す
    })

    it('should recalculate when item count changes', () => {
      const { result, rerender } = renderHook(
        ({ count }) => useAdaptiveLayout(count),
        { initialProps: { count: 10 } }
      )
      
      expect(result.current.layoutType).toBe('minimal')
      
      rerender({ count: 100 })
      
      expect(result.current.layoutType).toBe('compact')
    })

    it('should recalculate when density changes', () => {
      const { result } = renderHook(() => useAdaptiveLayout(30, { manualDensity: 'standard' }))
      expect(result.current.itemHeight).toBe(48)
      
      const { result: detailedResult } = renderHook(() => useAdaptiveLayout(30, { manualDensity: 'detailed' }))
      expect(detailedResult.current.itemHeight).toBe(80)
    })
  })

  describe('仮想スクロール設定', () => {
    it('should provide virtual scroll configuration for large datasets', () => {
      const { result } = renderHook(() => useAdaptiveLayout(1000))
      
      expect(result.current.virtualScrollEnabled).toBe(true)
      expect(result.current.virtualScrollConfig).toEqual({
        itemHeight: 48, // デフォルトの標準密度
        bufferSize: 5,
        overscan: 3,
        scrollDebounce: 16 // 60fps
      })
    })

    it('should adjust virtual scroll item height based on density', () => {
      const { result } = renderHook(() => 
        useAdaptiveLayout(1000, { manualDensity: 'detailed' })
      )
      
      expect(result.current.virtualScrollConfig.itemHeight).toBe(80)
    })
  })
})