'use client'

import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDashboard } from '@/contexts/DashboardContext'
import Sidebar from '@/components/Sidebar'
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
        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarDrawerOpen(true)}
          className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md border border-gray-200 text-gray-600 md:hidden cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {children}
      </main>
    </div>
  )
}
