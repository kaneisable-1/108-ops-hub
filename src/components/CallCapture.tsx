'use client'

import { useState } from 'react'
import { X, Sparkles, Phone, Loader2, Copy, ExternalLink, Check } from 'lucide-react'
import { cn, getGHLContactUrl, formatPhoneNumber } from '@/lib/utils'
import type { AITriageResult } from '@/types'

interface CallCaptureProps {
  ghlLocationId: string
  onClose: () => void
}

type CaptureStep = 'paste' | 'processing' | 'review' | 'done'

export default function CallCapture({ ghlLocationId, onClose }: CallCaptureProps) {
  const [step, setStep] = useState<CaptureStep>('paste')
  const [rawText, setRawText] = useState('')
  const [result, setResult] = useState<AITriageResult | null>(null)
  const [ghlContactId, setGhlContactId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleExtract = async () => {
    if (!rawText.trim()) return
    setStep('processing')
    setError(null)

    try {
      const res = await fetch('/api/call-capture/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
      })

      if (!res.ok) throw new Error('Extraction failed')

      const data = await res.json()
      setResult(data.triage)
      setGhlContactId(data.ghl_contact_id)
      setStep('review')
    } catch (err) {
      setError('Failed to extract contact info. Try again.')
      setStep('paste')
    }
  }

  const handleCopyPhone = () => {
    if (result?.extracted.contact_phone) {
      navigator.clipboard.writeText(result.extracted.contact_phone)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const ghlUrl = ghlContactId ? getGHLContactUrl(ghlContactId, ghlLocationId) : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative mt-20 flex flex-1 flex-col overflow-hidden rounded-t-3xl shadow-2xl" style={{ background: 'var(--surface-card)' }}>
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 pb-4" style={{ borderColor: 'var(--surface-border)' }}>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15">
              <Phone className="h-4 w-4 text-brand-400" />
            </div>
            <div>
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Call Capture</h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {step === 'paste' && 'Paste lead text to extract info'}
                {step === 'processing' && 'Analyzing with AI...'}
                {step === 'review' && 'Review extracted info'}
                {step === 'done' && 'Contact created!'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/5 cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-safe">
          {/* Step 1: Paste */}
          {step === 'paste' && (
            <>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste the lead's message, text, or DM here...&#10;&#10;Example:&#10;Hi, my son Jake is 14 and pitches for Farragut Middle School. He's throwing about 65 mph and we'd love to get him to 108 for training. We're in Nashville so about 2.5 hours away. What programs do you have? - Sarah Johnson (615) 555-0123"
                rows={8}
                className="input resize-none text-sm"
                autoFocus
              />
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <button
                onClick={handleExtract}
                disabled={!rawText.trim()}
                className="btn-primary w-full"
              >
                <Sparkles className="h-4 w-4" />
                Extract with AI
              </button>
            </>
          )}

          {/* Step 2: Processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Extracting contact info & classifying lead...</p>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && result && (
            <>
              {/* Extracted Contact */}
              <div className="card p-4 space-y-2">
                <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Contact Info</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {result.extracted.contact_name && (
                    <ReviewField label="Name" value={result.extracted.contact_name} />
                  )}
                  {result.extracted.contact_phone && (
                    <ReviewField
                      label="Phone"
                      value={formatPhoneNumber(result.extracted.contact_phone)}
                    />
                  )}
                  {result.extracted.contact_email && (
                    <ReviewField label="Email" value={result.extracted.contact_email} />
                  )}
                  {result.extracted.location && (
                    <ReviewField label="Location" value={result.extracted.location} />
                  )}
                </div>
              </div>

              {/* Athlete */}
              {result.extracted.athlete_name && (
                <div className="card p-4 space-y-2">
                  <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Athlete</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <ReviewField label="Name" value={result.extracted.athlete_name} />
                    {result.extracted.athlete_age && (
                      <ReviewField label="Age" value={String(result.extracted.athlete_age)} />
                    )}
                    {result.extracted.athlete_position && (
                      <ReviewField label="Position" value={result.extracted.athlete_position} />
                    )}
                    {result.extracted.athlete_level && (
                      <ReviewField label="Level" value={result.extracted.athlete_level.replace('_', ' ')} />
                    )}
                  </div>
                </div>
              )}

              {/* Classification */}
              <div className="card p-4 space-y-2">
                <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>AI Classification</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <ReviewField
                    label="Temperature"
                    value={result.classification.temperature.toUpperCase()}
                    highlight
                  />
                  <ReviewField
                    label="Queue"
                    value={result.routing.queue.replace('_', ' ')}
                  />
                  <ReviewField
                    label="Fit Score"
                    value={result.classification.fit_score.replace('_', ' ')}
                  />
                  <ReviewField
                    label="Service Match"
                    value={result.classification.service_match.replace(/_/g, ' ')}
                  />
                </div>
                <p className="text-sm mt-2" style={{ color: 'var(--text-tertiary)' }}>{result.content.summary}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {result.extracted.contact_phone && (
                  <button onClick={handleCopyPhone} className="btn-secondary flex-1">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied!' : 'Copy Phone'}
                  </button>
                )}
                {ghlUrl && (
                  <a
                    href={ghlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex-1"
                  >
                    <Phone className="h-4 w-4" />
                    Open in GHL
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ReviewField({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className={cn('font-medium capitalize', highlight ? 'text-brand-400' : '')} style={highlight ? undefined : { color: 'var(--text-secondary)' }}>
        {value}
      </p>
    </div>
  )
}
