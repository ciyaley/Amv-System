import React, { useState, useCallback, useRef } from 'react'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'

export interface SidebarSearchProps {
  onSearch: (query: string) => void
  isLoading?: boolean
  placeholder?: string
  className?: string
  debounceMs?: number
  initialQuery?: string
  enableAdvancedSearch?: boolean
}

export const SidebarSearch: React.FC<SidebarSearchProps> = ({
  onSearch,
  isLoading = false,
  placeholder = '検索...',
  className = '',
  debounceMs = 300,
  initialQuery = ''
}) => {
  const [query, setQuery] = useState(initialQuery)
  const [hasSearched, setHasSearched] = useState(false)
  const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  const debouncedSearch = useCallback((searchQuery: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(() => {
      onSearch(searchQuery)
      setHasSearched(searchQuery.length > 0)
    }, debounceMs)
  }, [onSearch, debounceMs])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    debouncedSearch(value)
  }

  const clearSearch = () => {
    setQuery('')
    onSearch('')
    setHasSearched(false)
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      clearSearch()
    }
  }

  return (
    <div className={`relative ${className}`} role="search">
      <div className="relative">
        <MagnifyingGlassIcon 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="アイテムを検索"
          aria-describedby={hasSearched ? 'search-results-status' : undefined}
          tabIndex={0}
          data-testid="sidebar-search-input"
        />
        {(query || isLoading) && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
            aria-label="検索をクリア"
            type="button"
          >
            {isLoading ? (
              <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
            ) : (
              <XMarkIcon className="h-4 w-4 text-gray-400" />
            )}
          </button>
        )}
      </div>
      
      {hasSearched && (
        <div 
          id="search-results-status" 
          className="sr-only" 
          role="status" 
          aria-live="polite"
        >
          検索結果が更新されました
        </div>
      )}
    </div>
  )
}