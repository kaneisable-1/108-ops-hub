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
        'fixed bottom-6 right-4 left-4 z-30 mx-auto max-w-2xl pb-safe transition-[left] duration-200 ease-apple',
        sidebarOpen ? 'md:left-[276px]' : 'md:left-20'
      )}
    >
      <div
        className="relative flex items-center rounded-lg px-4 py-3 backdrop-blur-xl transition-shadow duration-200 ease-apple"
        style={{
          background: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <Search size={18} strokeWidth={1.75} className="mr-3 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search leads..."
          className="flex-1 bg-transparent text-base outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        {searchQuery ? (
          <button
            onClick={() => setSearchQuery('')}
            className="ml-2 btn-icon p-1.5"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        ) : (
          <kbd
            className="ml-2 hidden sm:inline-block rounded-sm px-2 py-0.5 text-xs font-medium"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-tertiary)',
              border: '1px solid var(--border-light)',
            }}
          >
            /
          </kbd>
        )}
      </div>
    </div>
  )
}
