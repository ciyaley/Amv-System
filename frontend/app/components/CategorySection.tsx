import React, { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { SidebarItem } from './SidebarItem'
import type { MemoData } from '../hooks/useMemos'

export interface CategorySectionProps {
  category: string
  items: MemoData[]
  density: 'detailed' | 'standard' | 'dense'
  defaultExpanded?: boolean
  selectedItem?: string
  onItemClick?: (item: MemoData) => void
  onItemPreview?: (item: MemoData | null) => void
  className?: string
}

const getCategoryIcon = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'tech': return '📱'
    case 'memo': return '📝'
    case 'project': return '📋'
    case 'personal': return '👤'
    case 'work': return '💼'
    case 'study': return '📚'
    default: return '📁'
  }
}

const getInitialDisplayCount = (density: 'detailed' | 'standard' | 'dense'): number => {
  switch (density) {
    case 'detailed': return 3
    case 'standard': return 5
    case 'dense': return 10
    default: return 5
  }
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  items,
  density,
  defaultExpanded = true,
  selectedItem,
  onItemClick,
  onItemPreview,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [displayCount, setDisplayCount] = useState(getInitialDisplayCount(density))

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  const showMore = () => {
    setDisplayCount(prev => Math.min(prev + getInitialDisplayCount(density), items.length))
  }

  const categoryIcon = getCategoryIcon(category)
  const hasMoreItems = displayCount < items.length
  const visibleItems = isExpanded ? items.slice(0, displayCount) : []

  return (
    <div className={`border-b border-gray-100 ${className}`}>
      <button
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left"
        aria-expanded={isExpanded}
        aria-controls={`category-${category}-items`}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-gray-400" />
          )}
          <span className="text-lg" aria-hidden="true">{categoryIcon}</span>
          <span className="font-medium text-gray-900">{category}</span>
          <span className="text-sm text-gray-500">({items.length}件)</span>
        </div>
      </button>

      {isExpanded && (
        <div id={`category-${category}-items`} className="pb-2">
          {visibleItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              density={density}
              isSelected={selectedItem === item.id}
              onClick={onItemClick}
              onPreview={onItemPreview}
              className="ml-4"
            />
          ))}
          
          {hasMoreItems && (
            <button
              onClick={showMore}
              className="w-full ml-4 p-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors text-left"
              aria-label={`さらに${Math.min(getInitialDisplayCount(density), items.length - displayCount)}件表示`}
            >
              ... もっと見る ({items.length - displayCount}件)
            </button>
          )}
        </div>
      )}
    </div>
  )
}