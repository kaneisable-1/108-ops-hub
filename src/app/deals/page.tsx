'use client'

import { useState } from 'react'
import { Handshake, Search } from 'lucide-react'
import RoleGate from '@/components/layout/RoleGate'
import DashboardLayout from '@/components/DashboardLayout'
import { useDeals, useFilteredDeals, useDealStatusCounts } from '@/hooks/useDeals'
import DealCard from '@/components/DealCard'
import DealStatusFilter from '@/components/deals/DealStatusFilter'
import type { Deal, DealStatus, DealFilters } from '@/types'
import { getDealStatusLabel, getDealStatusColor, formatCents, getServiceLabel, formatPhoneNumber, getBillingLabel, formatRelativeTime } from '@/lib/utils'

export default function DealsPage() {
  return (
    <RoleGate allowedRoles={['sales', 'manager', 'admin']}>
      <DashboardLayout>
        <DealsContent />
      </DashboardLayout>
    </RoleGate>
  )
}

function DealsContent() {
  const { deals, loading } = useDeals()
  const [filters, setFilters] = useState<DealFilters>({
    status: 'all',
    search: '',
    dateRange: 'all',
  })
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)

  const filtered = useFilteredDeals(deals, filters)
  const counts = useDealStatusCounts(deals)

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-inner">
          <div className="flex items-center gap-3">
            <Handshake size={20} strokeWidth={1.75} style={{ color: 'var(--accent-blue)' }} />
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Deals</h1>
            <span className="text-sm tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
              {filtered.length}
            </span>
          </div>
        </div>
      </div>

      <div className="content-area py-6 space-y-4">
        {/* Status filter tabs */}
        <DealStatusFilter
          activeFilter={filters.status}
          onFilterChange={(status) => setFilters((f) => ({ ...f, status }))}
          counts={counts}
        />

        {/* Search */}
        <div className="relative max-w-md">
          <Search
            size={16}
            strokeWidth={1.75}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-placeholder)' }}
          />
          <input
            type="text"
            placeholder="Search deals..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="w-full rounded-md py-2 pl-9 pr-4 text-sm outline-none transition-all duration-200"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-light)',
            }}
          />
        </div>

        {/* Deal list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl mx-auto"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <Handshake size={24} strokeWidth={1.75} style={{ color: 'var(--text-placeholder)' }} />
            </div>
            <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>No deals found</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-placeholder)' }}>
              Deals appear here when staff capture them via voice memo or the PWA
            </p>
          </div>
        ) : (
          <div className="card-list-wide">
            {filtered.map((deal) => (
              <div key={deal.id}>
                <DealCard deal={deal} onClick={setSelectedDeal} />

                {/* Expanded detail */}
                {selectedDeal?.id === deal.id && (
                  <DealDetailExpanded deal={deal} onClose={() => setSelectedDeal(null)} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DealDetailExpanded({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  return (
    <div
      className="card p-4 mt-1 space-y-3 animate-fade-in"
      style={{ borderLeft: '4px solid var(--accent-blue)' }}
    >
      {/* Status + package */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-sm ${getDealStatusColor(deal.status)}`}>
          {getDealStatusLabel(deal.status)}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {getServiceLabel(deal.package as Deal['package'])} — {formatCents(deal.price_cents)}
          {deal.billing_frequency ? ` ${getBillingLabel(deal.billing_frequency)}` : ''}
        </span>
      </div>

      {/* Athlete details */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {deal.athlete_phone && (
          <div>
            <span className="section-label">Phone</span>
            <p style={{ color: 'var(--text-secondary)' }}>{formatPhoneNumber(deal.athlete_phone)}</p>
          </div>
        )}
        {deal.athlete_email && (
          <div>
            <span className="section-label">Email</span>
            <p style={{ color: 'var(--text-secondary)' }}>{deal.athlete_email}</p>
          </div>
        )}
        {deal.athlete_level && (
          <div>
            <span className="section-label">Level</span>
            <p style={{ color: 'var(--text-secondary)' }}>{deal.athlete_level.replace('_', ' ')}</p>
          </div>
        )}
        {deal.sport && (
          <div>
            <span className="section-label">Sport</span>
            <p style={{ color: 'var(--text-secondary)' }}>{deal.sport}</p>
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div className="text-xs space-y-1" style={{ color: 'var(--text-tertiary)' }}>
        <div>Created: {formatRelativeTime(deal.created_at)}</div>
        {deal.confirmed_at && <div>Confirmed: {formatRelativeTime(deal.confirmed_at)}</div>}
        {deal.expires_at && <div>Expires: {formatRelativeTime(deal.expires_at)}</div>}
      </div>

      {/* AI confidence */}
      {deal.ai_confidence !== null && deal.ai_confidence !== undefined && (
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          AI confidence: {Math.round(deal.ai_confidence * 100)}%
        </div>
      )}

      {/* Notes */}
      {deal.notes && (
        <div>
          <h4 className="section-label mb-1">Notes</h4>
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{deal.notes}</p>
        </div>
      )}

      {/* GHL IDs */}
      {(deal.ghl_contact_id || deal.ghl_contract_id) && (
        <div className="text-xs space-y-0.5" style={{ color: 'var(--text-placeholder)' }}>
          {deal.ghl_contact_id && <div>GHL Contact: {deal.ghl_contact_id}</div>}
          {deal.ghl_contract_id && <div>GHL Contract: {deal.ghl_contract_id}</div>}
        </div>
      )}

      <button
        onClick={onClose}
        className="text-xs font-medium py-2 px-3 rounded-md transition-colors duration-200 ease-apple cursor-pointer"
        style={{ color: 'var(--text-placeholder)' }}
      >
        Collapse
      </button>
    </div>
  )
}
