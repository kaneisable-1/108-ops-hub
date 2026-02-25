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
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      <Sidebar queueCounts={queueCounts} />

      {/* Main content area */}
      <main
        className={cn(
          'min-h-screen transition-[margin-left] duration-200 ease-apple',
          sidebarOpen ? 'md:ml-[260px]' : 'md:ml-16'
        )}
      >
        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarDrawerOpen(true)}
          className="fixed left-4 top-4 z-40 btn-icon shadow-sm md:hidden"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-light)',
          }}
          aria-label="Open menu"
        >
          <Menu size={20} strokeWidth={1.75} />
        </button>

        {children}
      </main>
    </div>
  )
}
