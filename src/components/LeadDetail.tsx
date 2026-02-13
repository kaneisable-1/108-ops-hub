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
  ChevronDown,
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

interface LeadDetailProps {
  lead: Lead
  activity: LeadActivity[]
  currentUserId: string
  ghlLocationId: string
  onClose: () => void
  onClaim: (leadId: string) => void
  onCallOutcome: (leadId: string, outcome: CallOutcome, notes: string) => void
  onStatusChange: (leadId: string, status: Lead['status']) => void
}

export default function LeadDetail({
  lead,
  activity,
  currentUserId,
  ghlLocationId,
  onClose,
  onClaim,
  onCallOutcome,
  onStatusChange,
}: LeadDetailProps) {
  const [showCallOutcome, setShowCallOutcome] = useState(false)
  const [callNotes, setCallNotes] = useState('')
  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome | null>(null)

  const isClaimed = !!lead.claimed_by
  const isClaimedByMe = lead.claimed_by === currentUserId
  const ghlUrl = getGHLContactUrl(lead.ghl_contact_id, ghlLocationId)

  const handleSubmitCallOutcome = () => {
    if (selectedOutcome) {
      onCallOutcome(lead.id, selectedOutcome, callNotes)
      setShowCallOutcome(false)
      setCallNotes('')
      setSelectedOutcome(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative mt-16 flex flex-1 flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl">
        {/* Handle bar */}
        <div className="flex justify-center py-2">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">
                {lead.contact_name || 'Unknown Contact'}
              </h2>
              <span className={getTemperatureBadgeClass(lead.lead_temperature)}>
                {lead.lead_temperature.toUpperCase()}
              </span>
            </div>
            {lead.athlete_name && (
              <p className="mt-0.5 text-sm text-gray-500">
                Athlete: {lead.athlete_name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-safe">
          {/* Quick Actions */}
          <div className="flex gap-2">
            {!isClaimed && (
              <button
                onClick={() => onClaim(lead.id)}
                className="btn-primary flex-1"
              >
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
            <div className="card p-4 space-y-3 border-brand-200 bg-brand-50/30">
              <h4 className="font-semibold text-gray-900">Call Outcome</h4>
              <div className="grid grid-cols-2 gap-2">
                {CALL_OUTCOMES.map((outcome) => (
                  <button
                    key={outcome}
                    onClick={() => setSelectedOutcome(outcome)}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                      selectedOutcome === outcome
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
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
          <div className="card p-4 space-y-3">
            <h4 className="font-semibold text-gray-900">Contact Info</h4>
            {lead.contact_phone && (
              <a
                href={`tel:${lead.contact_phone}`}
                className="flex items-center gap-3 text-sm text-gray-700 hover:text-brand-600"
              >
                <Phone className="h-4 w-4 text-gray-400" />
                {formatPhoneNumber(lead.contact_phone)}
              </a>
            )}
            {lead.contact_email && (
              <a
                href={`mailto:${lead.contact_email}`}
                className="flex items-center gap-3 text-sm text-gray-700 hover:text-brand-600"
              >
                <Mail className="h-4 w-4 text-gray-400" />
                {lead.contact_email}
              </a>
            )}
            {lead.location && (
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <MapPin className="h-4 w-4 text-gray-400" />
                {lead.location}
                {lead.distance_hours && (
                  <span className="text-gray-400">({lead.distance_hours}h away)</span>
                )}
              </div>
            )}
          </div>

          {/* Athlete Details */}
          {lead.athlete_name && (
            <div className="card p-4 space-y-2">
              <h4 className="font-semibold text-gray-900">
                <Zap className="mr-1 inline h-4 w-4 text-brand-500" />
                Athlete Details
              </h4>
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
              <h4 className="font-semibold text-gray-900">AI Summary</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{lead.ai_summary}</p>
              {lead.suggested_response && (
                <div className="mt-2 rounded-xl bg-green-50 p-3">
                  <p className="text-xs font-medium text-green-700 mb-1">Suggested Response:</p>
                  <p className="text-sm text-green-800">{lead.suggested_response}</p>
                </div>
              )}
            </div>
          )}

          {/* Classification */}
          <div className="card p-4 space-y-2">
            <h4 className="font-semibold text-gray-900">Classification</h4>
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
                  <span key={tag} className="badge bg-gray-100 text-gray-600">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Original Message */}
          {lead.original_message && (
            <div className="card p-4 space-y-2">
              <h4 className="font-semibold text-gray-900">
                <MessageSquare className="mr-1 inline h-4 w-4" />
                Original Message
              </h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                {lead.original_message}
              </p>
            </div>
          )}

          {/* Status Actions */}
          <div className="card p-4 space-y-3">
            <h4 className="font-semibold text-gray-900">Status</h4>
            <div className="flex gap-2 flex-wrap">
              {(['new', 'claimed', 'contacted', 'converted', 'lost'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(lead.id, s)}
                  className={cn(
                    'rounded-xl px-3 py-1.5 text-sm font-medium capitalize transition-colors cursor-pointer',
                    lead.status === s
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="card p-4 space-y-3">
            <h4 className="font-semibold text-gray-900">
              <Clock className="mr-1 inline h-4 w-4" />
              Activity
            </h4>
            {activity.length === 0 ? (
              <p className="text-sm text-gray-400">No activity yet</p>
            ) : (
              <div className="space-y-3">
                {activity.map((act) => (
                  <div key={act.id} className="flex gap-3 text-sm">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gray-300" />
                    <div>
                      <p className="text-gray-700">
                        <span className="font-medium">{act.user_name || 'System'}</span>
                        {' '}
                        {act.action}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatRelativeTime(act.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium text-gray-700 capitalize">{value}</p>
    </div>
  )
}
