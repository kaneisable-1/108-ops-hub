'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Sparkles, Phone, Loader2, Copy, ExternalLink, Check, ImagePlus, Trash2, CheckCircle2, RotateCcw, ArrowRight } from 'lucide-react'
import { cn, getGHLContactUrl, formatPhoneNumber } from '@/lib/utils'
import type { AITriageResult } from '@/types'

interface CallCaptureProps {
  ghlLocationId: string
  onClose: () => void
  onLeadCreated?: (leadId: string) => void
}

type CaptureStep = 'paste' | 'processing' | 'review' | 'done'

export default function CallCapture({ ghlLocationId, onClose, onLeadCreated }: CallCaptureProps) {
  const [step, setStep] = useState<CaptureStep>('paste')
  const [rawText, setRawText] = useState('')
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageName, setImageName] = useState<string | null>(null)
  const [result, setResult] = useState<AITriageResult | null>(null)
  const [ghlContactId, setGhlContactId] = useState<string | null>(null)
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      // Extract base64 portion (after "data:image/...;base64,")
      const base64 = dataUrl.split(',')[1]
      setImageBase64(base64)
      setImagePreview(dataUrl)
      setImageName(file.name)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const removeImage = () => {
    setImageBase64(null)
    setImagePreview(null)
    setImageName(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleExtract = async () => {
    if (!rawText.trim() && !imageBase64) return
    setStep('processing')
    setError(null)

    try {
      const res = await fetch('/api/call-capture/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawText || undefined,
          image: imageBase64 || undefined,
        }),
      })

      if (!res.ok) throw new Error('Extraction failed')

      const data = await res.json()
      setResult(data.triage)
      setGhlContactId(data.ghl_contact_id)
      setCreatedLeadId(data.lead_id || null)
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

  const handleDone = () => {
    setStep('done')
  }

  const handleViewLead = () => {
    if (createdLeadId && onLeadCreated) {
      onLeadCreated(createdLeadId)
    }
    onClose()
  }

  const handleAddAnother = () => {
    setStep('paste')
    setRawText('')
    setImageBase64(null)
    setImagePreview(null)
    setImageName(null)
    setResult(null)
    setGhlContactId(null)
    setCreatedLeadId(null)
    setError(null)
    setCopied(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const ghlUrl = ghlContactId ? getGHLContactUrl(ghlContactId, ghlLocationId) : null
  const hasInput = rawText.trim() || imageBase64

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel — bottom sheet on mobile, offset on desktop */}
      <div
        className="relative mt-12 sm:mt-20 flex flex-1 flex-col overflow-hidden rounded-t-3xl shadow-2xl"
        style={{ background: 'var(--bg-primary)' }}
      >
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="h-1 w-10 rounded-full" style={{ background: 'var(--border-default)' }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pb-4"
          style={{ borderBottom: '1px solid var(--border-light)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: 'var(--accent-blue-subtle)', color: 'var(--accent-blue)' }}
            >
              <Phone className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Call Capture</h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {step === 'paste' && 'Paste text or upload screenshot'}
                {step === 'processing' && 'Analyzing with AI...'}
                {step === 'review' && 'Review extracted info'}
                {step === 'done' && 'Lead created!'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl cursor-pointer transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content — scrollable with safe area bottom padding */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 pb-safe">
          {/* Step 1: Paste */}
          {step === 'paste' && (
            <>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste the lead's message, text, or DM here...&#10;&#10;Example:&#10;Hi, my son Jake is 14 and pitches for Farragut Middle School. He's throwing about 65 mph and we'd love to get him to 108 for training. We're in Nashville so about 2.5 hours away. What programs do you have? - Sarah Johnson (615) 555-0123"
                rows={5}
                className="input resize-none text-base !max-w-full"
                autoFocus
              />

              {/* Image Upload Zone */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file)
                }}
              />

              {imagePreview ? (
                <div className="card p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={imagePreview}
                      alt="Upload preview"
                      className="h-16 w-16 rounded-lg object-cover"
                      style={{ border: '1px solid var(--border-light)' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {imageName}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        Screenshot attached
                      </p>
                    </div>
                    <button
                      onClick={removeImage}
                      className="btn-ghost p-2"
                      aria-label="Remove image"
                    >
                      <Trash2 className="h-4 w-4" style={{ color: 'var(--status-red)' }} />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-xl py-6 cursor-pointer transition-all duration-200',
                    isDragging ? 'scale-[1.01]' : ''
                  )}
                  style={{
                    border: `2px dashed ${isDragging ? 'var(--accent-blue)' : 'var(--border-default)'}`,
                    background: isDragging ? 'var(--accent-blue-subtle)' : 'var(--bg-secondary)',
                  }}
                >
                  <ImagePlus
                    className="h-6 w-6"
                    style={{ color: isDragging ? 'var(--accent-blue)' : 'var(--text-tertiary)' }}
                  />
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Drop screenshot or tap to upload
                  </p>
                </div>
              )}

              {error && (
                <p className="text-sm" style={{ color: 'var(--status-red)' }}>{error}</p>
              )}
              <button
                onClick={handleExtract}
                disabled={!hasInput}
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
              <Loader2 className="h-10 w-10 animate-spin" style={{ color: 'var(--accent-blue)' }} />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {imageBase64 ? 'Reading screenshot & classifying lead...' : 'Extracting contact info & classifying lead...'}
              </p>
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
                    className="btn-secondary flex-1"
                  >
                    <Phone className="h-4 w-4" />
                    Open in GHL
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <button onClick={handleDone} className="btn-primary w-full">
                <CheckCircle2 className="h-4 w-4" />
                Confirm & Save
              </button>
            </>
          )}

          {/* Step 4: Done */}
          {step === 'done' && result && (
            <div className="flex flex-col items-center justify-center py-12 gap-5">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: 'var(--status-green-bg, rgba(52, 199, 89, 0.12))' }}
              >
                <CheckCircle2
                  className="h-8 w-8"
                  style={{ color: 'var(--status-green)' }}
                />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Lead Created
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {result.extracted.contact_name || result.extracted.athlete_name || 'New lead'} added to{' '}
                  <span className="font-medium capitalize">
                    {result.routing.queue.replace('_', ' ')}
                  </span>{' '}
                  queue
                </p>
              </div>

              <div className="w-full space-y-2 mt-2">
                <button onClick={handleViewLead} className="btn-primary w-full">
                  <ArrowRight className="h-4 w-4" />
                  View Lead
                </button>
                <button onClick={handleAddAnother} className="btn-secondary w-full">
                  <RotateCcw className="h-4 w-4" />
                  Add Another
                </button>
              </div>
            </div>
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
      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <p
        className={cn('font-medium capitalize')}
        style={{ color: highlight ? 'var(--accent-blue)' : 'var(--text-primary)' }}
      >
        {value}
      </p>
    </div>
  )
}
