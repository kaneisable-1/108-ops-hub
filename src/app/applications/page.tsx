'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Loader2, AlertCircle, RefreshCw, ClipboardList, Plus, Search } from 'lucide-react'
import RoleGate from '@/components/layout/RoleGate'
import DashboardLayout from '@/components/DashboardLayout'
import TabSwitcher, { type ApplicationTab } from '@/components/applications/TabSwitcher'
import ApplicationStatusFilter from '@/components/applications/ApplicationStatusFilter'
import ApplicationCard from '@/components/applications/ApplicationCard'
import ApplicationReviewPanel from '@/components/applications/ApplicationReviewPanel'
import ApplicationIntakeForm from '@/components/applications/ApplicationIntakeForm'
import PipelineBoard from '@/components/applications/PipelineBoard'
import { useApplications, type ApplicationWithLead } from '@/hooks/useApplications'
import { createClient } from '@/lib/supabase/client'
import { isPreviewMode, MOCK_LEADS } from '@/lib/mock-data'

export default function ApplicationsPage() {
  const [activeTab, setActiveTab] = useState<ApplicationTab>('review')
  const [selectedApp, setSelectedApp] = useState<ApplicationWithLead | null>(null)
  const [showIntakeForm, setShowIntakeForm] = useState(false)
  const [leads, setLeads] = useState<{ id: string; name: string }[]>([])
  const supabase = createClient()

  // Load leads for the intake form
  useEffect(() => {
    async function loadLeads() {
      if (isPreviewMode()) {
        const mockLeads = MOCK_LEADS
          .filter((l) => ['new', 'claimed', 'contacted', 'converted'].includes(l.status))
          .map((l) => ({ id: l.id, name: l.athlete_name || l.contact_name || 'Unknown' }))
        setLeads(mockLeads)
        return
      }
      const { data } = await supabase
        .from('leads')
        .select('id, athlete_name, contact_name')
        .in('status', ['new', 'claimed', 'contacted', 'converted'])
        .order('contact_name', { ascending: true })
        .limit(100)

      if (data) {
        setLeads(
          data.map((l) => ({
            id: l.id,
            name: l.athlete_name || l.contact_name || 'Unknown',
          }))
        )
      }
    }
    loadLeads()
  }, [supabase])

  const handleCreateApplication = useCallback(
    async (data: {
      leadId: string
      trainingGoals: string
      currentTeam: string
      howHeard: string
      injuryHistory: string
      parentGuardian: string
      videoUrl?: string
    }) => {
      const res = await fetch('/api/applications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: data.leadId,
          training_goals: data.trainingGoals,
          current_team: data.currentTeam,
          how_heard: data.howHeard,
          injury_history: data.injuryHistory,
          parent_guardian: data.parentGuardian,
          video_url: data.videoUrl,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to create application')
      }
    },
    []
  )

  return (
    <RoleGate allowedRoles={['coordinator', 'manager', 'admin']}>
      <DashboardLayout>
      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 pt-4">
          <h1 className="text-xl font-bold text-gray-900 mb-3">Applications</h1>
          <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Content */}
        {activeTab === 'review' ? (
          <ReviewTab
            selectedApp={selectedApp}
            onSelectApp={setSelectedApp}
            onCloseApp={() => setSelectedApp(null)}
          />
        ) : (
          <div className="flex-1 overflow-x-auto p-4">
            <PipelineBoard />
          </div>
        )}

        {/* FAB: New Application */}
        <button
          onClick={() => setShowIntakeForm(true)}
          className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg hover:bg-brand-600 active:bg-brand-700 transition-colors"
        >
          <Plus className="h-6 w-6" />
        </button>

        {/* Application intake form */}
        {showIntakeForm && (
          <ApplicationIntakeForm
            leads={leads}
            onSubmit={handleCreateApplication}
            onClose={() => setShowIntakeForm(false)}
          />
        )}
      </div>
      </DashboardLayout>
    </RoleGate>
  )
}

function ReviewTab({
  selectedApp,
  onSelectApp,
  onCloseApp,
}: {
  selectedApp: ApplicationWithLead | null
  onSelectApp: (app: ApplicationWithLead) => void
  onCloseApp: () => void
}) {
  const {
    applications,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    statusCounts,
    makeDecision,
    refresh,
  } = useApplications()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return applications
    const q = searchQuery.toLowerCase()
    return applications.filter(
      (app) =>
        (app.athlete_name && app.athlete_name.toLowerCase().includes(q)) ||
        (app.contact_name && app.contact_name.toLowerCase().includes(q)) ||
        (app.athlete_level && app.athlete_level.toLowerCase().includes(q)) ||
        (app.review_notes && app.review_notes.toLowerCase().includes(q))
    )
  }, [applications, searchQuery])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-20 gap-3">
        <AlertCircle className="h-8 w-8 text-gray-400" />
        <p className="text-sm text-gray-900">{error}</p>
        <button onClick={refresh} className="btn-secondary text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 pb-24">
      {/* Search bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by athlete, contact, team..."
          className="input w-full pl-10 text-sm"
        />
      </div>

      {/* Status filter chips */}
      <ApplicationStatusFilter
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        counts={statusCounts}
      />

      {/* Application list */}
      <div className="mt-4 space-y-3">
        {filteredApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardList className="h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">No applications found</p>
          </div>
        ) : (
          filteredApps.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onClick={onSelectApp}
            />
          ))
        )}
      </div>

      {/* Review panel */}
      {selectedApp && (
        <ApplicationReviewPanel
          application={selectedApp}
          onClose={onCloseApp}
          onDecision={async (appId, decision, reviewedBy, reviewNotes, decisionReason) => {
            await makeDecision(appId, decision, reviewedBy, reviewNotes, decisionReason)
          }}
        />
      )}
    </div>
  )
}
