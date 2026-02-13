'use client'

import { useState, useCallback } from 'react'
import Header from '@/components/Header'
import QueueTabs from '@/components/QueueTabs'
import LeadCard from '@/components/LeadCard'
import LeadDetail from '@/components/LeadDetail'
import CallCapture from '@/components/CallCapture'
import EmptyState from '@/components/EmptyState'
import { useLeads, useFilteredLeads, useQueueCounts } from '@/hooks/useLeads'
import { useUser } from '@/hooks/useUser'
import type { Lead, LeadQueue, LeadActivity, CallOutcome, DashboardFilters } from '@/types'
import { Loader2, LogIn } from 'lucide-react'

const GHL_LOCATION_ID = process.env.NEXT_PUBLIC_GHL_LOCATION_ID || ''

export default function Dashboard() {
  const { user, loading: userLoading, signInWithGoogle } = useUser()
  const { leads, loading: leadsLoading, claimLead, updateStatus, logCallOutcome, fetchActivity } = useLeads()

  const [activeTab, setActiveTab] = useState<LeadQueue | 'all'>('all')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [leadActivity, setLeadActivity] = useState<LeadActivity[]>([])
  const [showCallCapture, setShowCallCapture] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filters: DashboardFilters = {
    queue: activeTab,
    temperature: 'all',
    status: 'all',
    search: searchQuery,
    dateRange: 'all',
  }

  const filteredLeads = useFilteredLeads(leads, filters)
  const queueCounts = useQueueCounts(leads)

  const handleLeadClick = useCallback(
    async (lead: Lead) => {
      setSelectedLead(lead)
      try {
        const activity = await fetchActivity(lead.id)
        setLeadActivity(activity)
      } catch {
        setLeadActivity([])
      }
    },
    [fetchActivity]
  )

  const handleClaim = useCallback(
    async (leadId: string) => {
      if (!user) return
      try {
        await claimLead(leadId, user.id)
        setSelectedLead((prev) =>
          prev?.id === leadId
            ? { ...prev, claimed_by: user.id, claimed_by_name: user.name, status: 'claimed' as const, claimed_at: new Date().toISOString() }
            : prev
        )
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
        setSelectedLead(null)
      } catch (err) {
        console.error('Failed to log call:', err)
      }
    },
    [user, logCallOutcome]
  )

  const handleStatusChange = useCallback(
    async (leadId: string, status: Lead['status']) => {
      try {
        await updateStatus(leadId, status, user?.id)
        setSelectedLead((prev) =>
          prev?.id === leadId ? { ...prev, status } : prev
        )
      } catch (err) {
        console.error('Failed to update status:', err)
      }
    },
    [user, updateStatus]
  )

  // Auth loading
  if (userLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 px-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 text-2xl font-bold text-white">
          108
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Lead Intelligence</h1>
          <p className="mt-1 text-sm text-gray-500">
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
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <Header
        userName={user.name.split(' ')[0]}
        unreadCount={queueCounts.call_now}
        onMenuClick={() => setShowMenu(!showMenu)}
        onCallCaptureClick={() => setShowCallCapture(true)}
        onSearchChange={setSearchQuery}
      />

      {/* Queue Tabs */}
      <QueueTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={queueCounts}
      />

      {/* Lead List */}
      <main className="flex-1 px-4 py-4 space-y-3" style={{ paddingTop: 'calc(3.5rem + 3rem + 1rem)' }}>
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
      </main>

      {/* Lead Detail Panel */}
      {selectedLead && (
        <LeadDetail
          lead={selectedLead}
          activity={leadActivity}
          currentUserId={user.id}
          ghlLocationId={GHL_LOCATION_ID}
          onClose={() => setSelectedLead(null)}
          onClaim={handleClaim}
          onCallOutcome={handleCallOutcome}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Call Capture Modal */}
      {showCallCapture && (
        <CallCapture
          ghlLocationId={GHL_LOCATION_ID}
          onClose={() => setShowCallCapture(false)}
        />
      )}
    </div>
  )
}
