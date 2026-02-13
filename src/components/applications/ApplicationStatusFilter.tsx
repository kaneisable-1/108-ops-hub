'use client'

import { cn } from '@/lib/utils'
import type { Application } from '@/types'

type FilterStatus = Application['status'] | 'all'

const FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'need_more_info', label: 'More Info' },
]

interface ApplicationStatusFilterProps {
  activeFilter: FilterStatus
  onFilterChange: (filter: FilterStatus) => void
  counts: Record<string, number>
}

export default function ApplicationStatusFilter({
  activeFilter,
  onFilterChange,
  counts,
}: ApplicationStatusFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {FILTERS.map((filter) => {
        const count = counts[filter.value] ?? 0
        const isActive = activeFilter === filter.value

        return (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            )}
          >
            {filter.label}
            <span
              className={cn(
                'text-xs font-semibold',
                isActive ? 'text-white/80' : 'text-gray-400'
              )}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
