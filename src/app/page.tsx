'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import SearchBar from '@/components/SearchBar'
import LeadCard from '@/components/LeadCard'
import LeadDetailPanel from '@/components/LeadDetailPanel'
import CallCapture from '@/components/CallCapture'
import EmptyState from '@/components/EmptyState'
import { useLeads, useFilteredLeads, useQueueCounts } from '@/hooks/useLeads'
import { useUser } from '@/hooks/useUser'
import { useDashboard } from '@/contexts/DashboardContext'
import { createClient } from '@/lib/supabase/client'
import type { Lead, LeadActivity, CallOutcome, PipelineStage, DashboardFilters } from '@/types'
import { Loader2, Plus } from 'lucide-react'

const GHL_LOCATION_ID = process.env.NEXT_PUBLIC_GHL_LOCATION_ID || ''

export default function Dashboard() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const { leads, loading: leadsLoading, claimLead, updateStatus, logCallOutcome, fetchActivity, refresh } = useLeads()
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
    async (leadId: string, outcome: CallOutcome, notes: string, extra?: { follow_up_date?: string; lead_temperature?: string; service_match?: string }) => {
      if (!user) return
      try {
        await logCallOutcome(leadId, outcome, notes, user.id, extra)
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

  const handlePipelineStageChange = useCallback(
    async (leadId: string, stage: PipelineStage) => {
      try {
        const supabase = createClient()
        const { error } = await supabase
          .from('leads')
          .update({ pipeline_stage: stage })
          .eq('id', leadId)
        if (error) throw error

        await supabase.from('lead_activity').insert({
          lead_id: leadId,
          user_id: user?.id || null,
          action: `moved to pipeline stage: ${stage}`,
        })

        refresh()
      } catch (err) {
        console.error('Failed to update pipeline stage:', err)
      }
    },
    [user, refresh]
  )

  // Auth loading
  if (userLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-steel-50">
        <Loader2 className="h-8 w-8 animate-spin text-navy-400" />
      </div>
    )
  }

  // Not authenticated — redirect to login (middleware is primary guard, this is fallback)
  if (!user) {
    router.push('/login')
    return (
      <div className="flex h-screen items-center justify-center bg-steel-50">
        <Loader2 className="h-8 w-8 animate-spin text-navy-400" />
      </div>
    )
  }

  return (
    <DashboardLayout queueCounts={queueCounts}>
      {/* Search Bar — inline at top */}
      <SearchBar />

      {/* Lead List */}
      <div className="px-4 py-3 space-y-2 md:px-6 pb-24">
        {leadsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-navy-400" />
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

      {/* Floating Action Button — New Lead */}
      <button
        onClick={() => setShowCallCapture(true)}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-navy-500 text-white shadow-lg transition-all hover:bg-navy-400 active:scale-95 active:bg-navy-600 cursor-pointer md:bottom-8 md:right-8"
        aria-label="Add new lead"
      >
        <Plus className="h-6 w-6" />
      </button>

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
        onPipelineStageChange={handlePipelineStageChange}
      />

      {/* Call Capture Modal */}
      {showCallCapture && (
        <CallCapture
          ghlLocationId={GHL_LOCATION_ID}
          onClose={() => {
            setShowCallCapture(false)
            refresh()
          }}
        />
      )}
    </DashboardLayout>
  )
}
