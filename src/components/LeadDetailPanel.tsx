'use client'

import { useState } from 'react'
import {
  X,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  User,
  Clock,
  MessageSquare,
  Zap,
  CheckCircle,
} from 'lucide-react'
import {
  cn,
  formatRelativeTime,
  getTemperatureBadgeClass,
  getServiceLabel,
  getCallOutcomeLabel,
  getGHLContactUrl,
  formatPhoneNumber,
} from '@/lib/utils'
import { PIPELINE_STAGES, STAGE_LABELS, STAGE_COLORS } from '@/hooks/usePipeline'
import type { Lead, LeadActivity, CallOutcome, PipelineStage } from '@/types'

const CALL_OUTCOMES: CallOutcome[] = [
  'booked',
  'follow_up_scheduled',
  'not_interested',
  'no_answer',
  'left_voicemail',
  'wrong_number',
  'price_objection',
  'needs_more_info',
]

interface LeadDetailPanelProps {
  lead: Lead | null
  activity: LeadActivity[]
  currentUserId: string
  ghlLocationId: string
  isOpen: boolean
  onClose: () => void
  onClaim: (leadId: string) => void
  onCallOutcome: (leadId: string, outcome: CallOutcome, notes: string) => void
  onStatusChange: (leadId: string, status: Lead['status']) => void
  onPipelineStageChange?: (leadId: string, stage: PipelineStage) => void
}

export default function LeadDetailPanel({
  lead,
  activity,
  currentUserId,
  ghlLocationId,
  isOpen,
  onClose,
  onClaim,
  onCallOutcome,
  onStatusChange,
  onPipelineStageChange,
}: LeadDetailPanelProps) {
  const [showCallOutcome, setShowCallOutcome] = useState(false)
  const [callNotes, setCallNotes] = useState('')
  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome | null>(null)

  const isClaimed = !!lead?.claimed_by
  const isClaimedByMe = lead?.claimed_by === currentUserId
  const ghlUrl = lead ? getGHLContactUrl(lead.ghl_contact_id, ghlLocationId) : ''

  const handleSubmitCallOutcome = () => {
    if (selectedOutcome && lead) {
      onCallOutcome(lead.id, selectedOutcome, callNotes)
      setShowCallOutcome(false)
      setCallNotes('')
      setSelectedOutcome(null)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 transition-all duration-200',
          isOpen
            ? 'bg-navy-500/40 pointer-events-auto'
            : 'bg-transparent pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] md:w-[480px] bg-white border-l border-steel-200 shadow-2xl',
          'transform transition-transform duration-200 ease-out overflow-hidden flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {lead && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-steel-100 px-5 py-4 bg-steel-50/50">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-xl font-bold text-navy-500">
                    {lead.contact_name || 'Unknown Contact'}
                  </h2>
                  <span className={cn('shrink-0', getTemperatureBadgeClass(lead.lead_temperature))}>
                    {lead.lead_temperature.toUpperCase()}
                  </span>
                </div>
                {lead.athlete_name && (
                  <p className="mt-0.5 text-sm text-steel-500">
                    Athlete: {lead.athlete_name}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-steel-400 hover:bg-steel-100 cursor-pointer"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Quick Actions */}
              <div className="flex gap-2">
                {!isClaimed && (
                  <button onClick={() => onClaim(lead.id)} className="btn-primary flex-1">
                    <User className="h-4 w-4" />
                    Claim Lead
                  </button>
                )}
                {isClaimedByMe && (
                  <a
                    href={ghlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex-1"
                  >
                    <Phone className="h-4 w-4" />
                    Call in GHL
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {isClaimedByMe && (
                  <button
                    onClick={() => setShowCallOutcome(!showCallOutcome)}
                    className="btn-secondary"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Log Call
                  </button>
                )}
              </div>

              {/* Call Outcome Form */}
              {showCallOutcome && (
                <div className="card p-4 space-y-3 border-navy-200 bg-navy-50/30">
                  <h4 className="text-sm font-semibold text-navy-500">Call Outcome</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {CALL_OUTCOMES.map((outcome) => (
                      <button
                        key={outcome}
                        onClick={() => setSelectedOutcome(outcome)}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                          selectedOutcome === outcome
                            ? 'border-navy-400 bg-navy-50 text-navy-700'
                            : 'border-steel-200 bg-white text-steel-600 hover:bg-steel-50'
                        )}
                      >
                        {getCallOutcomeLabel(outcome)}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    placeholder="Call notes..."
                    rows={3}
                    className="input resize-none"
                  />
                  <button
                    onClick={handleSubmitCallOutcome}
                    disabled={!selectedOutcome}
                    className="btn-primary w-full"
                  >
                    Save Call Outcome
                  </button>
                </div>
              )}

              {/* Contact Info */}
              <section className="card p-4 space-y-2.5">
                <SectionTitle>Contact Info</SectionTitle>
                {lead.contact_phone && (
                  <a
                    href={`tel:${lead.contact_phone}`}
                    className="flex items-center gap-3 text-sm text-steel-600 hover:text-navy-500 transition-colors"
                  >
                    <Phone className="h-4 w-4 text-steel-400" />
                    {formatPhoneNumber(lead.contact_phone)}
                  </a>
                )}
                {lead.contact_email && (
                  <a
                    href={`mailto:${lead.contact_email}`}
                    className="flex items-center gap-3 text-sm text-steel-600 hover:text-navy-500 transition-colors"
                  >
                    <Mail className="h-4 w-4 text-steel-400" />
                    {lead.contact_email}
                  </a>
                )}
                {lead.location && (
                  <div className="flex items-center gap-3 text-sm text-steel-600">
                    <MapPin className="h-4 w-4 text-steel-400" />
                    {lead.location}
                    {lead.distance_hours && (
                      <span className="text-steel-400">({lead.distance_hours}h away)</span>
                    )}
                  </div>
                )}
              </section>

              {/* Athlete Details */}
              {lead.athlete_name && (
                <section className="card p-4 space-y-2">
                  <SectionTitle icon={<Zap className="h-3.5 w-3.5 text-amber-500" />}>
                    Athlete Details
                  </SectionTitle>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    {lead.athlete_name && <Detail label="Name" value={lead.athlete_name} />}
                    {lead.athlete_age && <Detail label="Age" value={String(lead.athlete_age)} />}
                    {lead.athlete_position && <Detail label="Position" value={lead.athlete_position} />}
                    {lead.athlete_level && <Detail label="Level" value={lead.athlete_level.replace('_', ' ')} />}
                    {lead.athlete_velocity && <Detail label="Velocity" value={lead.athlete_velocity} />}
                    {lead.athlete_school_team && <Detail label="School/Team" value={lead.athlete_school_team} />}
                  </div>
                </section>
              )}

              {/* AI Summary */}
              {lead.ai_summary && (
                <section className="card p-4 space-y-2">
                  <SectionTitle>AI Summary</SectionTitle>
                  <p className="text-sm text-steel-600 leading-relaxed">{lead.ai_summary}</p>
                  {lead.suggested_response && (
                    <div className="mt-2 rounded-lg bg-navy-50 border border-navy-100 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400 mb-1">Suggested Response</p>
                      <p className="text-sm text-navy-700">{lead.suggested_response}</p>
                    </div>
                  )}
                </section>
              )}

              {/* Classification */}
              <section className="card p-4 space-y-2">
                <SectionTitle>Classification</SectionTitle>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <Detail label="Temperature" value={lead.lead_temperature} />
                  {lead.fit_score && <Detail label="Fit Score" value={lead.fit_score.replace('_', ' ')} />}
                  {lead.service_match && <Detail label="Service" value={getServiceLabel(lead.service_match)} />}
                  {lead.intent && <Detail label="Intent" value={lead.intent.replace(/_/g, ' ')} />}
                  {lead.channel && <Detail label="Channel" value={lead.channel.replace(/_/g, ' ')} />}
                </div>
                {lead.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {lead.tags.map((tag) => (
                      <span key={tag} className="badge bg-steel-100 text-steel-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              {/* Original Message */}
              {lead.original_message && (
                <section className="card p-4 space-y-2">
                  <SectionTitle icon={<MessageSquare className="h-3.5 w-3.5" />}>
                    Original Message
                  </SectionTitle>
                  <p className="text-sm text-steel-600 whitespace-pre-wrap leading-relaxed">
                    {lead.original_message}
                  </p>
                </section>
              )}

              {/* Status Actions */}
              <section className="card p-4 space-y-3">
                <SectionTitle>Status</SectionTitle>
                <div className="flex gap-2 flex-wrap">
                  {(['new', 'claimed', 'contacted', 'converted', 'lost'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => onStatusChange(lead.id, s)}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors cursor-pointer',
                        lead.status === s
                          ? 'bg-navy-500 text-white'
                          : 'bg-steel-100 text-steel-600 hover:bg-steel-200'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </section>

              {/* Pipeline Stage */}
              {onPipelineStageChange && (
                <section className="card p-4 space-y-3">
                  <SectionTitle>Pipeline Stage</SectionTitle>
                  <div className="flex gap-1.5 flex-wrap">
                    {PIPELINE_STAGES.map((stage) => {
                      const colors = STAGE_COLORS[stage]
                      const isCurrent = lead.pipeline_stage === stage
                      return (
                        <button
                          key={stage}
                          onClick={() => onPipelineStageChange(lead.id, stage)}
                          className={cn(
                            'rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer',
                            isCurrent
                              ? `${colors.bg} ${colors.text} ${colors.border} ring-2 ring-offset-1 ring-navy-300`
                              : 'bg-white text-steel-500 border-steel-200 hover:bg-steel-50'
                          )}
                        >
                          {STAGE_LABELS[stage]}
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Activity Timeline */}
              <section className="card p-4 space-y-3">
                <SectionTitle icon={<Clock className="h-3.5 w-3.5" />}>Activity</SectionTitle>
                {activity.length === 0 ? (
                  <p className="text-sm text-steel-400">No activity yet</p>
                ) : (
                  <div className="space-y-3">
                    {activity.map((act) => (
                      <div key={act.id} className="flex gap-3 text-sm">
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-steel-300" />
                        <div>
                          <p className="text-steel-600">
                            <span className="font-medium text-navy-500">{act.user_name || 'System'}</span>
                            {' '}
                            {act.action}
                          </p>
                          <p className="text-xs text-steel-400">
                            {formatRelativeTime(act.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <h4 className="flex items-center gap-1.5 text-sm font-semibold text-navy-500">
      {icon}
      {children}
    </h4>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-steel-400 uppercase tracking-wide">{label}</p>
      <p className="font-medium text-navy-500 capitalize">{value}</p>
    </div>
  )
}
