'use client'

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
            className="flex shrink-0 items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ease-apple cursor-pointer"
            style={
              isActive
                ? {
                    background: 'var(--accent-blue)',
                    color: '#FFFFFF',
                    boxShadow: 'var(--shadow-sm)',
                  }
                : {
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-light)',
                  }
            }
          >
            {filter.label}
            <span
              className="text-xs font-semibold"
              style={{ color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--text-tertiary)' }}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
