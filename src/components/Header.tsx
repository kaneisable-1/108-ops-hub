'use client'

import { useState } from 'react'
import { Menu, Bell, Phone, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  userName: string
  unreadCount: number
  onMenuClick: () => void
  onCallCaptureClick: () => void
  onSearchChange: (query: string) => void
}

export default function Header({
  userName,
  unreadCount,
  onMenuClick,
  onCallCaptureClick,
  onSearchChange,
}: HeaderProps) {
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    onSearchChange(value)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm pt-safe">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {!showSearch && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
                108
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900 leading-tight">Lead Intel</h1>
                <p className="text-xs text-gray-500 leading-tight">Hi, {userName}</p>
              </div>
            </div>
          )}
        </div>

        {/* Search expanded */}
        {showSearch && (
          <div className="flex flex-1 items-center gap-2 mx-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search leads..."
                className="input pl-9 py-2"
              />
            </div>
            <button
              onClick={() => {
                setShowSearch(false)
                handleSearchChange('')
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 cursor-pointer"
              aria-label="Close search"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Right side */}
        {!showSearch && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSearch(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 cursor-pointer"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            <button
              onClick={onCallCaptureClick}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-brand-600 transition-colors hover:bg-brand-50 active:bg-brand-100 cursor-pointer"
              aria-label="Call Capture"
            >
              <Phone className="h-5 w-5" />
            </button>

            <button
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-gray-100 active:bg-gray-200 cursor-pointer',
                unreadCount > 0 ? 'text-brand-600' : 'text-gray-600'
              )}
              aria-label={`${unreadCount} notifications`}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
