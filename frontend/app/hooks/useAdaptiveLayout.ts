import { useMemo } from 'react'

export interface AdaptiveLayoutConfig {
  layoutType: 'minimal' | 'standard' | 'compact' | 'dense'
  density: 'detailed' | 'standard' | 'dense'
  itemsPerPage: number
  itemHeight: number
  showSearch: boolean
  virtualScrollEnabled: boolean
  defaultCollapsed: boolean
  enableCategoryGrouping: boolean
  previewDelay: number
  previewWidth: number
  previewMaxHeight: number
  virtualScrollConfig: {
    itemHeight: number
    bufferSize: number
    overscan: number
    scrollDebounce: number
  }
}

export interface AdaptiveLayoutOptions {
  manualDensity?: 'detailed' | 'standard' | 'dense'
  forceVirtualScroll?: boolean
}

export const useAdaptiveLayout = (
  itemCount: number,
  options: AdaptiveLayoutOptions = {}
): AdaptiveLayoutConfig => {
  return useMemo(() => {
    // レイアウトタイプの決定
    let layoutType: AdaptiveLayoutConfig['layoutType']
    if (itemCount <= 10) {
      layoutType = 'minimal'
    } else if (itemCount <= 50) {
      layoutType = 'standard'
    } else if (itemCount <= 200) {
      layoutType = 'compact'
    } else {
      layoutType = 'dense'
    }

    // 密度設定（手動設定がある場合は優先）
    const density = options.manualDensity || 'standard'

    // 密度別の高さ設定
    const itemHeight = {
      detailed: 80,
      standard: 48,
      dense: 32
    }[density]

    // ページあたりアイテム数
    const itemsPerPage = {
      minimal: 10,
      standard: 25,
      compact: 50,
      dense: 100
    }[layoutType]

    // 検索機能の表示判定
    const showSearch = itemCount > 10

    // 仮想スクロールの有効化判定
    const virtualScrollEnabled = options.forceVirtualScroll !== undefined 
      ? options.forceVirtualScroll 
      : itemCount > 200

    // デフォルト折りたたみ設定
    const defaultCollapsed = itemCount > 50

    // カテゴリグループ機能の有効化
    const enableCategoryGrouping = itemCount > 10

    // プレビュー設定
    const previewDelay = 300
    const previewWidth = 320
    const previewMaxHeight = 400

    // 仮想スクロール設定
    const virtualScrollConfig = {
      itemHeight,
      bufferSize: 5,
      overscan: 3,
      scrollDebounce: 16 // 60fps
    }

    return {
      layoutType,
      density,
      itemsPerPage,
      itemHeight,
      showSearch,
      virtualScrollEnabled,
      defaultCollapsed,
      enableCategoryGrouping,
      previewDelay,
      previewWidth,
      previewMaxHeight,
      virtualScrollConfig
    }
  }, [itemCount, options.manualDensity, options.forceVirtualScroll])
}