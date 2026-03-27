'use client'

import type { DealStatus } from '@/types'

type FilterStatus = DealStatus | 'all'

const FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending_confirmation', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'contract_sent', label: 'Contract Sent' },
  { value: 'contract_signed', label: 'Signed' },
  { value: 'payment_sent', label: 'Payment Sent' },
  { value: 'payment_complete', label: 'Paid' },
  { value: 'scheduling', label: 'Scheduling' },
  { value: 'complete', label: 'Complete' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'expired', label: 'Expired' },
  { value: 'payment_failed', label: 'Failed' },
]

interface DealStatusFilterProps {
  activeFilter: FilterStatus
  onFilterChange: (filter: FilterStatus) => void
  counts: Record<string, number>
}

export default function DealStatusFilter({
  activeFilter,
  onFilterChange,
  counts,
}: DealStatusFilterProps) {
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
