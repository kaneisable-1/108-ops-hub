'use client'

import { cn, getQueueLabel } from '@/lib/utils'
import type { LeadQueue } from '@/types'

interface QueueTab {
  id: LeadQueue | 'all'
  label: string
  count: number
  color: string
}

interface QueueTabsProps {
  activeTab: LeadQueue | 'all'
  onTabChange: (tab: LeadQueue | 'all') => void
  counts: Record<LeadQueue | 'all', number>
}

const TAB_CONFIG: { id: LeadQueue | 'all'; color: string }[] = [
  { id: 'all', color: 'text-gray-700 border-gray-900' },
  { id: 'call_now', color: 'text-red-600 border-red-500' },
  { id: 'follow_up', color: 'text-amber-600 border-amber-500' },
  { id: 'nurture', color: 'text-blue-600 border-blue-500' },
  { id: 'not_a_fit', color: 'text-gray-400 border-gray-400' },
]

export default function QueueTabs({ activeTab, onTabChange, counts }: QueueTabsProps) {
  const tabs: QueueTab[] = TAB_CONFIG.map(({ id, color }) => ({
    id,
    label: id === 'all' ? 'All' : getQueueLabel(id),
    count: counts[id] || 0,
    color,
  }))

  return (
    <div className="sticky top-14 z-40 border-b border-gray-200 bg-white pt-safe">
      <nav className="flex overflow-x-auto scrollbar-hide" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer',
                isActive
                  ? tab.color
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                  isActive ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                )}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
