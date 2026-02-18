'use client'

import { useState, useCallback, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import SearchBar from '@/components/SearchBar'
import LeadCard from '@/components/LeadCard'
import LeadDetailPanel from '@/components/LeadDetailPanel'
import CallCapture from '@/components/CallCapture'
import EmptyState from '@/components/EmptyState'
import { useLeads, useFilteredLeads, useQueueCounts } from '@/hooks/useLeads'
import { useUser } from '@/hooks/useUser'
import { useDashboard } from '@/contexts/DashboardContext'
import type { Lead, LeadActivity, CallOutcome, DashboardFilters } from '@/types'
import { Loader2, LogIn } from 'lucide-react'

const GHL_LOCATION_ID = process.env.NEXT_PUBLIC_GHL_LOCATION_ID || ''

export default function Dashboard() {
  const { user, loading: userLoading, signInWithGoogle } = useUser()
  const { leads, loading: leadsLoading, claimLead, updateStatus, logCallOutcome, fetchActivity } = useLeads()
  const {
    state: { activeTab, searchQuery, filters: ctxFilters, selectedLeadId, detailPanelOpen },
    openDetailPanel,
    closeDetailPanel,
  } = useDashboard()

  const [leadActivity, setLeadActivity] = useState<LeadActivity[]>([])
  const [showCallCapture, setShowCallCapture] = useState(false)

  // Build filters from DashboardContext state
  const filters: DashboardFilters = {
    queue: activeTab,
    temperature: 'all',
    status: 'all',
    search: searchQuery,
    dateRange: ctxFilters.timeRange,
    channel: ctxFilters.channel as DashboardFilters['channel'],
    serviceMatch: ctxFilters.serviceMatch as DashboardFilters['serviceMatch'],
  }

  const filteredLeads = useFilteredLeads(leads, filters)
  const queueCounts = useQueueCounts(leads)

  // Resolve selected lead from context
  const selectedLead = selectedLeadId ? leads.find((l) => l.id === selectedLeadId) || null : null

  // Fetch activity when a lead is selected
  useEffect(() => {
    if (!selectedLeadId) {
      setLeadActivity([])
      return
    }
    fetchActivity(selectedLeadId)
      .then(setLeadActivity)
      .catch(() => setLeadActivity([]))
  }, [selectedLeadId, fetchActivity])

  const handleLeadClick = useCallback(
    (lead: Lead) => {
      openDetailPanel(lead.id)
    },
    [openDetailPanel]
  )

  const handleClaim = useCallback(
    async (leadId: string) => {
      if (!user) return
      try {
        await claimLead(leadId, user.id)
      } catch (err) {
        console.error('Failed to claim:', err)
      }
    },
    [user, claimLead]
  )

  const handleCallOutcome = useCallback(
    async (leadId: string, outcome: CallOutcome, notes: string) => {
      if (!user) return
      try {
        await logCallOutcome(leadId, outcome, notes, user.id)
        closeDetailPanel()
      } catch (err) {
        console.error('Failed to log call:', err)
      }
    },
    [user, logCallOutcome, closeDetailPanel]
  )

  const handleStatusChange = useCallback(
    async (leadId: string, status: Lead['status']) => {
      try {
        await updateStatus(leadId, status, user?.id)
      } catch (err) {
        console.error('Failed to update status:', err)
      }
    },
    [user, updateStatus]
  )

  // Auth loading
  if (userLoading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--surface-primary)' }}>
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 px-8" style={{ background: 'var(--surface-primary)' }}>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 text-2xl font-bold text-white">
          108
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Lead Intelligence</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            AI-powered lead management for 108 Performance
          </p>
        </div>
        <button onClick={signInWithGoogle} className="btn-primary text-base px-8 py-3">
          <LogIn className="h-5 w-5" />
          Sign in with Google
        </button>
      </div>
    )
  }

  return (
    <DashboardLayout queueCounts={queueCounts}>
      {/* Search Bar */}
      <SearchBar />

      {/* Lead List */}
      <div className="px-4 py-4 space-y-3 pt-16 md:pt-4">
        {leadsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <EmptyState
            title={searchQuery ? 'No matches' : 'No leads yet'}
            description={
              searchQuery
                ? `No leads matching "${searchQuery}"`
                : activeTab === 'all'
                ? 'New leads will appear here when they come in'
                : `No leads in the ${activeTab.replace('_', ' ')} queue`
            }
          />
        ) : (
          filteredLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={handleLeadClick} />
          ))
        )}
      </div>

      {/* Lead Detail Panel (right slide) */}
      <LeadDetailPanel
        lead={selectedLead ?? null}
        activity={leadActivity}
        currentUserId={user.id}
        ghlLocationId={GHL_LOCATION_ID}
        isOpen={detailPanelOpen}
        onClose={closeDetailPanel}
        onClaim={handleClaim}
        onCallOutcome={handleCallOutcome}
        onStatusChange={handleStatusChange}
      />

      {/* Call Capture Modal */}
      {showCallCapture && (
        <CallCapture
          ghlLocationId={GHL_LOCATION_ID}
          onClose={() => setShowCallCapture(false)}
        />
      )}
    </DashboardLayout>
  )
}
