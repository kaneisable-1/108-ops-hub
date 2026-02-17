'use client'

import { useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'

export default function SearchBar() {
  const {
    state: { searchQuery },
    setSearchQuery,
  } = useDashboard()

  const inputRef = useRef<HTMLInputElement>(null)

  // Global keyboard shortcut: press "/" to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(
          (e.target as HTMLElement)?.tagName ?? ''
        )
      ) {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur()
        if (searchQuery) setSearchQuery('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchQuery, setSearchQuery])

  return (
    <div className="border-b border-steel-200 bg-white px-4 py-2.5 md:px-6">
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-steel-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search leads..."
          className="w-full rounded-lg border border-steel-200 bg-steel-50 py-2 pl-9 pr-10 text-sm text-navy-500 placeholder-steel-400 outline-none transition-colors focus:border-navy-300 focus:bg-white focus:ring-1 focus:ring-navy-200"
        />
        {searchQuery ? (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 flex h-6 w-6 items-center justify-center rounded text-steel-400 hover:bg-steel-100 hover:text-steel-600 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="absolute right-3 hidden rounded border border-steel-200 bg-steel-50 px-1.5 py-0.5 text-[10px] font-medium text-steel-400 sm:inline-block">
            /
          </kbd>
        )}
      </div>
    </div>
  )
}
