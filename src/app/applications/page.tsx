'use client'

import { useState } from 'react'
import { Loader2, AlertCircle, RefreshCw, ClipboardList } from 'lucide-react'
import RoleGate from '@/components/layout/RoleGate'
import DashboardLayout from '@/components/DashboardLayout'
import TabSwitcher, { type ApplicationTab } from '@/components/applications/TabSwitcher'
import ApplicationStatusFilter from '@/components/applications/ApplicationStatusFilter'
import ApplicationCard from '@/components/applications/ApplicationCard'
import ApplicationReviewPanel from '@/components/applications/ApplicationReviewPanel'
import PipelineBoard from '@/components/applications/PipelineBoard'
import { useApplications, type ApplicationWithLead } from '@/hooks/useApplications'

export default function ApplicationsPage() {
  const [activeTab, setActiveTab] = useState<ApplicationTab>('review')
  const [selectedApp, setSelectedApp] = useState<ApplicationWithLead | null>(null)

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
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={refresh} className="btn-secondary text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 pb-24">
      {/* Status filter chips */}
      <ApplicationStatusFilter
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        counts={statusCounts}
      />

      {/* Application list */}
      <div className="mt-4 space-y-3">
        {applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardList className="h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">No applications found</p>
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
