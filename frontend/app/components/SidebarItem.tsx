import React, { useRef, useCallback } from 'react'
import type { MemoData } from '../types/tools'

export interface SidebarItemProps {
  item: MemoData
  density: 'detailed' | 'standard' | 'dense'
  isSelected?: boolean
  onClick?: (item: MemoData) => void
  onPreview?: (item: MemoData | null) => void
  onToggleVisibility?: (id: string) => void
  onFocusOnCanvas?: (id: string) => void
  previewDelay?: number
  className?: string
}

const getItemIcon = (type: string): string => {
  switch (type) {
    case 'memo': return '📄'
    case 'url': return '🔗'
    case 'image': return '🖼️'
    default: return '📄'
  }
}


const getImportanceClass = (importance?: string): string => {
  switch (importance) {
    case 'high': return 'bg-red-500'
    case 'medium': return 'bg-yellow-500'
    case 'low': return 'bg-gray-400'
    default: return 'bg-gray-400'
  }
}

const formatTime = (dateString: string): string => {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 60) return `${diffMinutes}分前`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  
  // 同じ日の場合は時刻表示
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  }
  
  return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  item,
  density,
  isSelected = false,
  onClick,
  onPreview,
  onToggleVisibility,
  onFocusOnCanvas,
  previewDelay = 300,
  className = ''
}) => {
  const hoverTimer = useRef<NodeJS.Timeout | undefined>(undefined)
  const itemRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = useCallback(() => {
    if (onPreview && previewDelay > 0) {
      hoverTimer.current = setTimeout(() => {
        onPreview(item)
      }, previewDelay)
    }
  }, [item, onPreview, previewDelay])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current)
    }
    if (onPreview) {
      onPreview(null)
    }
  }, [onPreview])

  const handleClick = () => {
    if (onClick) {
      onClick(item)
    }
  }

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onToggleVisibility) {
      onToggleVisibility(item.id)
    }
  }

  const handleFocusOnCanvas = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onFocusOnCanvas) {
      onFocusOnCanvas(item.id)
    }
  }

  const icon = getItemIcon(item.type)
  const importanceClass = getImportanceClass(item.importance)
  const timeText = formatTime(item.updated)
  
  // Handle edge cases
  const displayTitle = item.title || '無題のメモ'
  const displayText = item.text || '内容なし'
  const isVisible = item.visible !== false // デフォルトはtrue

  // 非表示メモのスタイル
  const hiddenStyle = !isVisible ? 'opacity-50 bg-gray-100' : ''

  if (density === 'dense') {
    return (
      <div
        ref={itemRef}
        className={`flex items-center p-2 cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-blue-50 border-l-3 border-blue-500' : ''} ${hiddenStyle} ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label={`${displayTitle} を開く`}
        data-testid={`sidebar-memo-item-${item.id}`}
        title={displayTitle}
      >
        <span className="text-lg mr-2" aria-hidden="true">{icon}</span>
        <span className="text-sm truncate flex-1">{displayTitle}</span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">{timeText}</span>
          {!isVisible && (
            <button
              onClick={handleFocusOnCanvas}
              className="text-xs text-blue-500 hover:text-blue-700"
              title="画面に表示"
              aria-label="キャンバスにフォーカス"
              data-testid="focus-on-canvas-button"
            >
              👁
            </button>
          )}
          <button
            onClick={handleToggleVisibility}
            className="text-xs text-gray-500 hover:text-gray-700"
            title={isVisible ? "隠す" : "表示"}
            aria-label={isVisible ? "メモを隠す" : "メモを表示"}
            data-testid="toggle-visibility-button"
          >
            {isVisible ? "🙈" : "👁‍🗨"}
          </button>
        </div>
        <div 
          className={`w-2 h-2 rounded-full ml-2 ${importanceClass}`} 
          data-testid="importance-dot"
          aria-hidden="true"
        />
      </div>
    )
  }

  if (density === 'standard') {
    return (
      <div
        ref={itemRef}
        className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
          isSelected ? 'bg-blue-50 border-l-3 border-blue-500' : ''
        } ${hiddenStyle} ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label={`${displayTitle} を開く`}
        data-testid="sidebar-item-main"
        data-selected={isSelected}
      >
        <span className="text-lg mr-3 flex-shrink-0" aria-hidden="true">{icon}</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900 truncate">{displayTitle}</span>
          <div className="text-xs text-gray-600 truncate line-clamp-1">{displayText}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-500">{timeText}</span>
          {!isVisible && (
            <button
              onClick={handleFocusOnCanvas}
              className="text-xs text-blue-500 hover:text-blue-700"
              title="画面に表示"
              aria-label="キャンバスにフォーカス"
              data-testid="focus-on-canvas-button"
            >
              👁
            </button>
          )}
          <button
            onClick={handleToggleVisibility}
            className="text-xs text-gray-500 hover:text-gray-700"
            title={isVisible ? "隠す" : "表示"}
            aria-label={isVisible ? "メモを隠す" : "メモを表示"}
            data-testid="toggle-visibility-button"
          >
            {isVisible ? "🙈" : "👁‍🗨"}
          </button>
          {item.category && (
            <span className="text-xs text-gray-500" data-testid="category-icon">
              📄 {item.category}
            </span>
          )}
          <div 
            className={`w-3 h-3 ${importanceClass}`}
            data-testid="importance-indicator"
            aria-hidden="true"
          />
        </div>
      </div>
    )
  }

  // detailed density
  return (
    <div
      ref={itemRef}
      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 ${
        isSelected ? 'bg-blue-50 border-l-3 border-blue-500' : ''
      } ${hiddenStyle} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${displayTitle} を開く`}
      data-testid="sidebar-item-main"
      data-selected={isSelected}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0 mt-1" aria-hidden="true">{icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">{displayTitle}</h4>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
            {displayText === '内容なし' ? displayText : `${displayText.substring(0, 100)}...`}
          </p>
          
          {/* タグ表示 */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2" data-testid="tags-container">
              {item.tags.map(tag => (
                <span 
                  key={tag}
                  className="px-2 py-1 bg-gray-100 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{timeText}</span>
              <div 
                className={`w-3 h-3 ${importanceClass}`}
                data-testid="importance-indicator"
                aria-label="重要度"
              />
              {item.category && (
                <span className="text-xs text-gray-500">📄 {item.category}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!isVisible && (
                <button
                  onClick={handleFocusOnCanvas}
                  className="text-xs text-blue-500 hover:text-blue-700"
                  title="画面に表示"
                  aria-label="キャンバスにフォーカス"
                  data-testid="focus-on-canvas-button"
                >
                  👁
                </button>
              )}
              <button
                onClick={handleToggleVisibility}
                className="text-xs text-gray-500 hover:text-gray-700"
                title={isVisible ? "隠す" : "表示"}
                aria-label={isVisible ? "メモを隠す" : "メモを表示"}
                data-testid="toggle-visibility-button"
              >
                {isVisible ? "🙈" : "👁‍🗨"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}