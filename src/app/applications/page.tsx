'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertCircle, RefreshCw, ClipboardList, Plus } from 'lucide-react'
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

export default function ApplicationsPage() {
  const [activeTab, setActiveTab] = useState<ApplicationTab>('review')
  const [selectedApp, setSelectedApp] = useState<ApplicationWithLead | null>(null)
  const [showIntakeForm, setShowIntakeForm] = useState(false)
  const [leads, setLeads] = useState<{ id: string; name: string }[]>([])
  const supabase = createClient()

  // Load leads for the intake form
  useEffect(() => {
    async function loadLeads() {
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
        <div className="page-header">
          <div className="page-header-inner">
            <h1 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Applications</h1>
            <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        </div>

        {activeTab === 'review' ? (
          <ReviewTab
            selectedApp={selectedApp}
            onSelectApp={setSelectedApp}
            onCloseApp={() => setSelectedApp(null)}
          />
        ) : (
          <div className="content-area py-6 overflow-x-auto">
            <PipelineBoard />
          </div>
        )}
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

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Loader2 size={24} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-20 gap-3">
        <AlertCircle size={32} strokeWidth={1.75} style={{ color: 'var(--color-danger)' }} />
        <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
        <button onClick={refresh} className="btn-secondary text-xs">
          <RefreshCw size={14} strokeWidth={1.75} />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="content-area py-6 pb-24">
      {/* Status filter chips */}
      <ApplicationStatusFilter
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        counts={statusCounts}
      />

      {/* Application list */}
      <div className="card-list-wide mt-4">
        {applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardList size={40} strokeWidth={1.75} style={{ color: 'var(--text-placeholder)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No applications found</p>
          </div>
        ) : (
          applications.map((app) => (
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
