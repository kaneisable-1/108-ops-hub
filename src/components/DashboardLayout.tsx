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

  const total = queueCounts?.all ?? 0
  const callNow = queueCounts?.call_now ?? 0
  const followUp = queueCounts?.follow_up ?? 0
  const nurture = queueCounts?.nurture ?? 0

  return (
    <div className="min-h-screen bg-steel-50">
      <Sidebar queueCounts={queueCounts} />

      {/* Main content area */}
      <main
        className={cn(
          'min-h-screen transition-[margin-left] duration-200 ease-in-out',
          sidebarOpen ? 'md:ml-[260px]' : 'md:ml-16'
        )}
      >
        {/* Mobile header bar */}
        <div className="flex items-center gap-3 border-b border-steel-200 bg-white px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-steel-200 text-steel-500 cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-navy-500">108 Ops</h1>
        </div>

        {/* HUD Stats Bar */}
        <div className="border-b border-steel-200 bg-white px-4 py-3 md:px-6">
          <div className="grid grid-cols-4 gap-3 md:gap-4">
            <HudStat label="Total" value={total} />
            <HudStat label="Call Now" value={callNow} accent="red" />
            <HudStat label="Today" value={followUp} accent="amber" />
            <HudStat label="Nurture" value={nurture} />
          </div>
        </div>

        {children}
      </main>
    </div>
  )
}

// ─── HUD Stat Cell ──────────────────────────────────────

function HudStat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'red' | 'amber'
}) {
  return (
    <div className="text-center">
      <p
        className={cn(
          'text-xl font-bold tabular-nums md:text-2xl',
          accent === 'red' && value > 0
            ? 'text-red-600'
            : accent === 'amber' && value > 0
              ? 'text-amber-600'
              : 'text-navy-500'
        )}
      >
        {value}
      </p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-steel-400 md:text-xs">
        {label}
      </p>
    </div>
  )
}
