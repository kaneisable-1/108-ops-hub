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
  getTemperatureDotClass,
  getServiceLabel,
  getCallOutcomeLabel,
  getGHLContactUrl,
  formatPhoneNumber,
} from '@/lib/utils'
import type { Lead, LeadActivity, CallOutcome } from '@/types'

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
          'fixed inset-0 z-40 transition-all duration-300 ease-apple',
          isOpen
            ? 'backdrop pointer-events-auto'
            : 'bg-transparent pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Panel — full-width on mobile, side panel on desktop */}
      <div
        className={cn(
          'panel-right z-50 w-full sm:w-[420px] md:w-[480px]',
          'transform transition-transform duration-300 ease-apple flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ borderLeft: '1px solid var(--border-light)' }}
      >
        {lead && (
          <>
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border-light)' }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2
                    className="truncate text-lg font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {lead.contact_name || 'Unknown Contact'}
                  </h2>
                  <span className={cn('status-dot', getTemperatureDotClass(lead.lead_temperature))} />
                  <span
                    className="text-xs font-medium capitalize"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {lead.lead_temperature}
                  </span>
                </div>
                {lead.athlete_name && (
                  <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Athlete: {lead.athlete_name}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="btn-icon shrink-0"
                aria-label="Close"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            {/* Scrollable content — pb-safe for iPhone home indicator */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-5 py-4 space-y-4 pb-safe">
              {/* Quick Actions */}
              <div className="flex gap-2">
                {!isClaimed && (
                  <button onClick={() => onClaim(lead.id)} className="btn-primary flex-1">
                    <User size={16} strokeWidth={1.75} />
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
                    <Phone size={16} strokeWidth={1.75} />
                    Call in GHL
                    <ExternalLink size={12} strokeWidth={1.75} />
                  </a>
                )}
                {isClaimedByMe && (
                  <button
                    onClick={() => setShowCallOutcome(!showCallOutcome)}
                    className="btn-secondary"
                  >
                    <CheckCircle size={16} strokeWidth={1.75} />
                    Log Call
                  </button>
                )}
              </div>

              {/* Call Outcome Form */}
              {showCallOutcome && (
                <div
                  className="card p-4 space-y-3 animate-fade-in"
                  style={{ border: '1px solid var(--accent-blue-glow)', background: 'var(--accent-blue-tint)' }}
                >
                  <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Call Outcome</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {CALL_OUTCOMES.map((outcome) => (
                      <button
                        key={outcome}
                        onClick={() => setSelectedOutcome(outcome)}
                        className={cn(
                          'rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ease-apple cursor-pointer',
                        )}
                        style={
                          selectedOutcome === outcome
                            ? { background: 'var(--accent-blue)', color: '#FFFFFF', boxShadow: 'var(--shadow-sm)' }
                            : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }
                        }
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
              <div className="card p-4 space-y-3">
                <p className="contact-section-label">Contact Info</p>
                {/* Contact Action Icons */}
                <div className="contact-actions">
                  {lead.contact_phone && (
                    <a href={`tel:${lead.contact_phone}`} className="contact-action-icon" title="Call">
                      <Phone size={16} strokeWidth={1.75} />
                    </a>
                  )}
                  {lead.contact_email && (
                    <a href={`mailto:${lead.contact_email}`} className="contact-action-icon" title="Email">
                      <Mail size={16} strokeWidth={1.75} />
                    </a>
                  )}
                </div>
                <div className="space-y-2.5">
                  {lead.contact_phone && (
                    <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <Phone size={14} strokeWidth={1.75} style={{ color: 'var(--text-tertiary)' }} />
                      {formatPhoneNumber(lead.contact_phone)}
                    </div>
                  )}
                  {lead.contact_email && (
                    <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <Mail size={14} strokeWidth={1.75} style={{ color: 'var(--text-tertiary)' }} />
                      {lead.contact_email}
                    </div>
                  )}
                  {lead.location && (
                    <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <MapPin size={14} strokeWidth={1.75} style={{ color: 'var(--text-tertiary)' }} />
                      {lead.location}
                      {lead.distance_hours && (
                        <span style={{ color: 'var(--text-tertiary)' }}>({lead.distance_hours}h away)</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Athlete Details */}
              {lead.athlete_name && (
                <div className="card p-4 space-y-2">
                  <p className="contact-section-label flex items-center gap-1">
                    <Zap size={12} strokeWidth={1.75} style={{ color: 'var(--accent-blue)' }} />
                    Athlete Details
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {lead.athlete_name && <Detail label="Name" value={lead.athlete_name} />}
                    {lead.athlete_age && <Detail label="Age" value={String(lead.athlete_age)} />}
                    {lead.athlete_position && <Detail label="Position" value={lead.athlete_position} />}
                    {lead.athlete_level && <Detail label="Level" value={lead.athlete_level.replace('_', ' ')} />}
                    {lead.athlete_velocity && <Detail label="Velocity" value={lead.athlete_velocity} />}
                    {lead.athlete_school_team && <Detail label="School/Team" value={lead.athlete_school_team} />}
                  </div>
                </div>
              )}

              {/* AI Summary */}
              {lead.ai_summary && (
                <div className="card p-4 space-y-2">
                  <p className="contact-section-label">AI Summary</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {lead.ai_summary}
                  </p>
                  {lead.suggested_response && (
                    <div
                      className="mt-2 rounded-md p-3"
                      style={{
                        background: 'color-mix(in srgb, var(--color-success) 6%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--color-success) 15%, transparent)',
                      }}
                    >
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-success)' }}>
                        Suggested Response
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {lead.suggested_response}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Classification */}
              <div className="card p-4 space-y-2">
                <p className="contact-section-label">Classification</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Detail label="Temperature" value={lead.lead_temperature} />
                  {lead.fit_score && <Detail label="Fit Score" value={lead.fit_score.replace('_', ' ')} />}
                  {lead.service_match && <Detail label="Service" value={getServiceLabel(lead.service_match)} />}
                  {lead.intent && <Detail label="Intent" value={lead.intent.replace(/_/g, ' ')} />}
                  {lead.channel && <Detail label="Channel" value={lead.channel.replace(/_/g, ' ')} />}
                </div>
                {lead.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {lead.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs font-medium px-2 py-0.5 rounded-sm"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Original Message */}
              {lead.original_message && (
                <div className="card p-4 space-y-2">
                  <p className="contact-section-label flex items-center gap-1">
                    <MessageSquare size={12} strokeWidth={1.75} />
                    Original Message
                  </p>
                  <p
                    className="text-sm whitespace-pre-wrap leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {lead.original_message}
                  </p>
                </div>
              )}

              {/* Status Actions */}
              <div className="card p-4 space-y-3">
                <p className="contact-section-label">Status</p>
                <div className="flex gap-2 flex-wrap">
                  {(['new', 'claimed', 'contacted', 'converted', 'lost'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => onStatusChange(lead.id, s)}
                      className="rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-all duration-200 ease-apple cursor-pointer"
                      style={
                        lead.status === s
                          ? { background: 'var(--accent-blue)', color: '#FFFFFF', boxShadow: 'var(--shadow-sm)' }
                          : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="card p-4 space-y-3">
                <p className="contact-section-label flex items-center gap-1">
                  <Clock size={12} strokeWidth={1.75} />
                  Activity
                </p>
                {activity.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No activity yet</p>
                ) : (
                  <div className="space-y-3">
                    {activity.map((act) => (
                      <div key={act.id} className="flex gap-3 text-sm">
                        <div
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{ background: 'var(--text-tertiary)' }}
                        />
                        <div className="min-w-0">
                          <p style={{ color: 'var(--text-secondary)' }}>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              {act.user_name || 'System'}
                            </span>
                            {' '}
                            {act.action}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {formatRelativeTime(act.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <p className="font-medium capitalize" style={{ color: 'var(--text-secondary)' }}>{value}</p>
    </div>
  )
}
