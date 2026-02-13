'use client'

import { useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDashboard } from '@/contexts/DashboardContext'

export default function SearchBar() {
  const {
    state: { searchQuery, sidebarOpen },
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
    <div
      className={cn(
        'fixed bottom-6 right-4 left-4 z-30 mx-auto max-w-2xl transition-[left] duration-200',
        sidebarOpen ? 'md:left-[276px]' : 'md:left-20'
      )}
    >
      <div className="relative flex items-center rounded-2xl border border-gray-200 bg-white/90 px-4 py-3 shadow-lg backdrop-blur-xl">
        <Search className="mr-3 h-5 w-5 shrink-0 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search leads..."
          className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
        />
        {searchQuery ? (
          <button
            onClick={() => setSearchQuery('')}
            className="ml-2 flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <kbd className="ml-2 hidden rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 sm:inline-block">
            /
          </kbd>
        )}
      </div>
    </div>
  )
}
