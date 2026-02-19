'use client'

import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDashboard } from '@/contexts/DashboardContext'
import Sidebar from '@/components/Sidebar'
import NotificationBell from '@/components/NotificationBell'
import type { LeadQueue } from '@/types'

interface DashboardLayoutProps {
  children: React.ReactNode
  queueCounts?: Record<LeadQueue | 'all', number>
}

export default function DashboardLayout({ children, queueCounts }: DashboardLayoutProps) {
  const {
    state: { sidebarOpen },
    setSidebarDrawerOpen,
  } = useDashboard()

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar queueCounts={queueCounts} />

      {/* Main content area */}
      <main
        className={cn(
          'min-h-screen transition-[margin-left] duration-200 ease-in-out',
          sidebarOpen ? 'md:ml-[260px]' : 'md:ml-16'
        )}
      >
        {/* Mobile top bar */}
        <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between px-4 py-3 md:hidden pointer-events-none">
          <button
            onClick={() => setSidebarDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md border border-gray-200 text-gray-600 cursor-pointer pointer-events-auto"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="pointer-events-auto">
            <NotificationBell />
          </div>
        </div>

        {/* Desktop notification bell */}
        <div className="hidden md:block fixed right-4 top-4 z-40">
          <NotificationBell />
        </div>

        {children}
      </main>
    </div>
  )
}
