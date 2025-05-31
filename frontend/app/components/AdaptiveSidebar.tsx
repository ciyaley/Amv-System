import React, { useState, useMemo, useCallback } from 'react'
import { XMarkIcon, Bars3Icon } from '@heroicons/react/24/outline'
import { SidebarSearch } from './SidebarSearch'
import { CategorySection } from './CategorySection'
import { VirtualScrollContainer } from './VirtualScrollContainer'
import { useAdaptiveLayout } from '../hooks/useAdaptiveLayout'
import type { MemoData } from '../hooks/useMemos'

export interface AdaptiveSidebarProps {
  items: MemoData[]
  selectedItem?: string
  onItemSelect?: (item: MemoData) => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
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

const filterItems = (items: MemoData[], query: string): MemoData[] => {
  if (!query.trim()) return items
  
  const lowercaseQuery = query.toLowerCase()
  return items.filter(item => 
    item.title.toLowerCase().includes(lowercaseQuery) ||
    item.text?.toLowerCase().includes(lowercaseQuery) ||
    item.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
    item.category?.toLowerCase().includes(lowercaseQuery)
  )
}

export const AdaptiveSidebar: React.FC<AdaptiveSidebarProps> = ({
  items,
  selectedItem,
  onItemSelect,
  searchQuery = '',
  onSearchChange,
  isLoading = false,
  isMobile = false,
  isOpen = true,
  onToggle,
  className = ''
}) => {
  const [manualDensity, setManualDensity] = useState<'detailed' | 'standard' | 'dense' | undefined>()
  const [previewItem, setPreviewItem] = useState<MemoData | null>(null)

  const filteredItems = useMemo(() => filterItems(items, searchQuery), [items, searchQuery])
  const layoutConfig = useAdaptiveLayout(filteredItems.length, { manualDensity })
  const groupedItems = useMemo(() => groupItemsByCategory(filteredItems), [filteredItems])

  const handleSearch = useCallback((query: string) => {
    onSearchChange?.(query)
  }, [onSearchChange])

  const handleDensityChange = useCallback((density: 'detailed' | 'standard' | 'dense') => {
    setManualDensity(density)
  }, [])

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