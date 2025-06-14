import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { XMarkIcon, Bars3Icon } from '@heroicons/react/24/outline'
import { searchEngine } from '../../utils/searchEngine'
import { useAdaptiveLayout } from '../hooks/useAdaptiveLayout'
import { useSettings } from '../hooks/useSettings'
import { CategorySection } from './CategorySection'
import { SidebarSearch } from './SidebarSearch'
import { VirtualScrollContainer } from './VirtualScrollContainer'
import type { MemoData } from '../types/tools'

export interface AdaptiveSidebarProps {
  items: MemoData[]
  selectedItem?: string
  onItemSelect?: (item: MemoData) => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
  onToggleVisibility?: (id: string) => void
  onFocusOnCanvas?: (id: string) => void
  isLoading?: boolean
  isMobile?: boolean
  isOpen?: boolean
  onToggle?: () => void
  className?: string
}

interface DensityControlsProps {
  currentDensity: 'detailed' | 'standard' | 'dense'
  onDensityChange: (density: 'detailed' | 'standard' | 'dense') => void
}

const DensityControls: React.FC<DensityControlsProps> = ({ currentDensity, onDensityChange }) => (
  <div className="flex items-center gap-1 p-2 border-b border-gray-200">
    <span className="text-xs text-gray-500 mr-2">密度:</span>
    {(['detailed', 'standard', 'dense'] as const).map((density) => {
      const icons = { detailed: '⋮⋮⋮', standard: '⋮⋮', dense: '⋮' }
      return (
        <button
          key={density}
          onClick={() => onDensityChange(density)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            currentDensity === density
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          aria-label={`${density}表示`}
          aria-pressed={currentDensity === density}
          tabIndex={1}
        >
          {icons[density]}
        </button>
      )
    })}
  </div>
)

const groupItemsByCategory = (items: MemoData[]): Record<string, MemoData[]> => {
  const grouped: Record<string, MemoData[]> = {}
  
  items.forEach(item => {
    const category = item.category || 'Uncategorized'
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push(item)
  })
  
  return grouped
}

// TF-IDF検索エンジンを使用（インポート済み）

// TF-IDF検索エンジンを使用した高度検索
const searchItems = (items: MemoData[], query: string): MemoData[] => {
  if (!query.trim()) return items
  
  // 短いクエリ（1-2文字）の場合はファジー検索を使用
  if (query.trim().length <= 2) {
    const fuzzyResults = searchEngine.fuzzySearch(query, items, {
      maxResults: 100,
      threshold: 0.2
    });
    return fuzzyResults.map((result: { memo: MemoData }) => result.memo);
  }
  
  // 長いクエリの場合はTF-IDF検索を使用
  const searchResults = searchEngine.search(query, items);
  
  return searchResults.map((result: { memo: MemoData }) => result.memo);
}

export const AdaptiveSidebar: React.FC<AdaptiveSidebarProps> = ({
  items,
  selectedItem,
  onItemSelect,
  searchQuery = '',
  onSearchChange,
  onToggleVisibility,
  onFocusOnCanvas,
  isLoading = false,
  isMobile = false,
  isOpen = true,
  onToggle,
  className = ''
}) => {
  const { settings, updateSetting } = useSettings()
  const [manualDensity, setManualDensity] = useState<'detailed' | 'standard' | 'dense' | undefined>()
  const [previewItem, setPreviewItem] = useState<MemoData | null>(null)

  // TF-IDF検索エンジンによる高度検索
  const filteredItems = useMemo(() => searchItems(items, searchQuery), [items, searchQuery])
  
  // メモが変更されたら検索エンジンのインデックスを更新
  useEffect(() => {
    if (items.length > 0) {
      searchEngine.indexMemos(items);
    }
  }, [items])
  
  // 検索状態を考慮したレイアウト設定（元のアイテム数で基本設定を決定）
  const effectiveDensity = manualDensity || settings.sidebarDensity
  const baseLayoutConfig = useAdaptiveLayout(items.length, { 
    manualDensity: effectiveDensity,
    forceVirtualScroll: searchQuery.trim().length > 0 ? filteredItems.length >= settings.virtualScrollThreshold : undefined
  })
  
  // 検索時は表示設定を強制的に有効化
  const layoutConfig = {
    ...baseLayoutConfig,
    showSearch: baseLayoutConfig.showSearch || settings.showSearchByDefault || searchQuery.trim().length > 0,
    enableCategoryGrouping: true,
    defaultCollapsed: settings.sidebarCollapsed && searchQuery.trim().length === 0 // 検索時は展開
  }
  
  const groupedItems = useMemo(() => groupItemsByCategory(filteredItems), [filteredItems])

  const handleSearch = useCallback((query: string) => {
    onSearchChange?.(query)
  }, [onSearchChange])

  const handleDensityChange = useCallback((density: 'detailed' | 'standard' | 'dense') => {
    setManualDensity(density)
    updateSetting('sidebarDensity', density)
  }, [updateSetting])

  const handleItemPreview = useCallback((item: MemoData | null) => {
    setPreviewItem(item)
  }, [])

  if (!isOpen) {
    if (isMobile) {
      return (
        <button
          onClick={onToggle}
          className="fixed top-4 left-4 z-50 p-2 bg-white border border-gray-300 rounded-md shadow-sm"
          aria-label="サイドバーを開く"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>
      )
    }
    return null
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white">
      {/* ヘッダー */}
      <div className="flex-shrink-0">
        {isMobile && (
          <div className="flex justify-end p-2 border-b border-gray-200">
            <button
              onClick={onToggle}
              className="p-1 hover:bg-gray-100 rounded"
              aria-label="サイドバーを閉じる"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}
        
        <DensityControls
          currentDensity={layoutConfig.density}
          onDensityChange={handleDensityChange}
        />
        
        {layoutConfig.showSearch && (
          <div className="p-3 border-b border-gray-200">
            <SidebarSearch
              onSearch={handleSearch}
              isLoading={isLoading}
              placeholder="検索..."
              initialQuery={searchQuery}
            />
          </div>
        )}
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 overflow-hidden">
        {Object.keys(groupedItems).length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? '検索結果がありません' : 'アイテムがありません'}
          </div>
        ) : layoutConfig.virtualScrollEnabled ? (
          /* 仮想スクロール表示（200件以上） */
          <VirtualScrollContainer
            items={filteredItems}
            itemHeight={layoutConfig.itemHeight}
            height={600} // 固定高さ（後でコンテナサイズに基づいて動的にする）
            onItemSelect={onItemSelect}
            density={layoutConfig.density}
          />
        ) : (
          /* 通常のカテゴリ表示（200件未満） */
          <div className="overflow-y-auto h-full">
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <CategorySection
                key={category}
                category={category}
                items={categoryItems}
                density={layoutConfig.density}
                defaultExpanded={!layoutConfig.defaultCollapsed || searchQuery.length > 0}
                selectedItem={selectedItem}
                onItemClick={onItemSelect}
                onItemPreview={handleItemPreview}
                onToggleVisibility={onToggleVisibility}
                onFocusOnCanvas={onFocusOnCanvas}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onToggle}
          aria-hidden="true"
          data-testid="sidebar-backdrop"
        />
      )}
      
      <aside
        className={`
          ${isMobile 
            ? 'fixed top-0 left-0 h-full w-80 z-50 transform transition-transform duration-300 ease-in-out' +
              (isOpen ? ' translate-x-0' : ' -translate-x-full')
            : 'w-80 border-r border-gray-200'
          }
          ${className}
        `}
        role="complementary"
        aria-label="アイテム一覧"
        data-testid="adaptive-sidebar"
      >
        {sidebarContent}
      </aside>

      {/* プレビューパネル（デスクトップのみ） */}
      {!isMobile && previewItem && (
        <div 
          className="absolute left-80 top-0 w-80 bg-white border border-gray-200 shadow-lg rounded-md p-4 z-10"
          style={{ maxHeight: layoutConfig.previewMaxHeight }}
        >
          <h3 className="font-medium text-gray-900 mb-2">{previewItem.title}</h3>
          <p className="text-sm text-gray-600">{previewItem.text}</p>
          {previewItem.tags && previewItem.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {previewItem.tags.map(tag => (
                <span 
                  key={tag}
                  className="px-2 py-1 bg-gray-100 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}