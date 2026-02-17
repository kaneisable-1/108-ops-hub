'use client'

import { useState, useRef, useCallback } from 'react'
import {
  X,
  Sparkles,
  Phone,
  Loader2,
  ExternalLink,
  Check,
  Camera,
  Type,
  PenLine,
  ArrowLeft,
  Save,
  User,
  Mail,
  MapPin,
  Calendar,
} from 'lucide-react'
import { cn, getGHLContactUrl, formatPhoneNumber, getServiceLabel, getCallOutcomeLabel } from '@/lib/utils'
import type { AITriageResult, ServiceMatch, LeadTemperature } from '@/types'

interface CallCaptureProps {
  ghlLocationId: string
  onClose: () => void
  onLeadCreated?: (leadId: string, ghlContactId: string) => void
}

type IntakeMode = 'paste' | 'screenshot' | 'manual'
type CaptureStep = 'intake' | 'processing' | 'review' | 'done'

interface ExtractedFields {
  contact_name: string
  contact_phone: string
  contact_email: string
  athlete_name: string
  athlete_age: string
  athlete_position: string
  athlete_level: string
  location: string
}

interface ReviewData {
  fields: ExtractedFields
  classification: {
    temperature: LeadTemperature
    fit_score: string
    service_match: string
    intent: string
  }
  routing: {
    queue: string
    priority: number
    reason: string
  }
  summary: string
  suggested_response: string
  tags: string[]
}

export default function CallCapture({ ghlLocationId, onClose, onLeadCreated }: CallCaptureProps) {
  const [mode, setMode] = useState<IntakeMode>('paste')
  const [step, setStep] = useState<CaptureStep>('intake')
  const [rawText, setRawText] = useState('')
  const [reviewData, setReviewData] = useState<ReviewData | null>(null)
  const [ghlContactId, setGhlContactId] = useState<string | null>(null)
  const [leadId, setLeadId] = useState<string | null>(null)
  const [existingContact, setExistingContact] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Manual entry state
  const [manualFields, setManualFields] = useState<ExtractedFields>({
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    athlete_name: '',
    athlete_age: '',
    athlete_position: '',
    athlete_level: '',
    location: '',
  })

  // ─── AI Text Extraction ─────────────────────────────
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
      const triage: AITriageResult = data.triage

      // Map to editable fields
      setReviewData({
        fields: {
          contact_name: triage.extracted.contact_name || '',
          contact_phone: triage.extracted.contact_phone || '',
          contact_email: triage.extracted.contact_email || '',
          athlete_name: triage.extracted.athlete_name || '',
          athlete_age: triage.extracted.athlete_age ? String(triage.extracted.athlete_age) : '',
          athlete_position: triage.extracted.athlete_position || '',
          athlete_level: triage.extracted.athlete_level || '',
          location: triage.extracted.location || '',
        },
        classification: {
          temperature: triage.classification.temperature,
          fit_score: triage.classification.fit_score,
          service_match: triage.classification.service_match,
          intent: triage.classification.intent,
        },
        routing: triage.routing,
        summary: triage.content.summary,
        suggested_response: triage.content.suggested_response,
        tags: triage.tags,
      })
      setGhlContactId(data.ghl_contact_id)
      setLeadId(data.lead_id)
      if (data.existing_contact) {
        setExistingContact(data.existing_contact)
      }
      setStep('review')
    } catch {
      setError('Failed to extract contact info. Try again.')
      setStep('intake')
    }
  }

  // ─── Screenshot Upload ──────────────────────────────
  const handleScreenshotSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScreenshotFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setScreenshotPreview(reader.result as string)
    reader.readAsDataURL(file)
  }, [])

  const handleScreenshotExtract = async () => {
    if (!screenshotFile) return
    setStep('processing')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', screenshotFile)

      const res = await fetch('/api/call-capture/extract-image', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Screenshot extraction failed')

      const data = await res.json()
      const triage: AITriageResult = data.triage

      setReviewData({
        fields: {
          contact_name: triage.extracted.contact_name || '',
          contact_phone: triage.extracted.contact_phone || '',
          contact_email: triage.extracted.contact_email || '',
          athlete_name: triage.extracted.athlete_name || '',
          athlete_age: triage.extracted.athlete_age ? String(triage.extracted.athlete_age) : '',
          athlete_position: triage.extracted.athlete_position || '',
          athlete_level: triage.extracted.athlete_level || '',
          location: triage.extracted.location || '',
        },
        classification: {
          temperature: triage.classification.temperature,
          fit_score: triage.classification.fit_score,
          service_match: triage.classification.service_match,
          intent: triage.classification.intent,
        },
        routing: triage.routing,
        summary: triage.content.summary,
        suggested_response: triage.content.suggested_response,
        tags: triage.tags,
      })
      setGhlContactId(data.ghl_contact_id)
      setLeadId(data.lead_id)
      if (data.existing_contact) setExistingContact(data.existing_contact)
      setStep('review')
    } catch {
      setError('Failed to extract from screenshot. Try pasting the text instead.')
      setStep('intake')
    }
  }

  // ─── Manual Entry Submit ────────────────────────────
  const handleManualSubmit = async () => {
    if (!manualFields.contact_name.trim() || !manualFields.contact_phone.trim()) return
    setStep('processing')
    setError(null)

    try {
      const res = await fetch('/api/call-capture/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualFields),
      })

      if (!res.ok) throw new Error('Manual entry failed')

      const data = await res.json()
      setGhlContactId(data.ghl_contact_id)
      setLeadId(data.lead_id)
      if (data.existing_contact) setExistingContact(data.existing_contact)

      // For manual entry, go straight to done (no AI classification)
      setStep('done')
    } catch {
      setError('Failed to create contact. Try again.')
      setStep('intake')
    }
  }

  // ─── Review Field Update ────────────────────────────
  const updateField = (key: keyof ExtractedFields, value: string) => {
    if (!reviewData) return
    setReviewData({
      ...reviewData,
      fields: { ...reviewData.fields, [key]: value },
    })
  }

  // ─── Confirm & Call ─────────────────────────────────
  const handleConfirmAndCall = async () => {
    if (!reviewData) return
    await saveEdits()
    // Open GHL contact page for calling
    if (ghlContactId) {
      const url = getGHLContactUrl(ghlContactId, ghlLocationId)
      window.open(url, '_blank')
    }
    setStep('done')
  }

  // ─── Confirm & Save ────────────────────────────────
  const handleConfirmAndSave = async () => {
    if (!reviewData) return
    await saveEdits()
    setStep('done')
  }

  // Save any field edits back to the API
  const saveEdits = async () => {
    if (!reviewData || !leadId) return
    try {
      await fetch('/api/call-capture/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          ghl_contact_id: ghlContactId,
          fields: reviewData.fields,
        }),
      })
    } catch (err) {
      console.error('Failed to save edits:', err)
    }
  }

  // ─── GHL URL for done step ─────────────────────────
  const ghlUrl = ghlContactId ? getGHLContactUrl(ghlContactId, ghlLocationId) : null

  // ─── Reset to start over ───────────────────────────
  const handleStartOver = () => {
    setStep('intake')
    setRawText('')
    setReviewData(null)
    setGhlContactId(null)
    setLeadId(null)
    setExistingContact(null)
    setError(null)
    setScreenshotFile(null)
    setScreenshotPreview(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy-500/40" onClick={onClose} />

      {/* Panel — slide-up bottom sheet */}
      <div className="relative mt-12 flex flex-1 flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:mt-20">
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="h-1 w-10 rounded-full bg-steel-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-steel-100 px-5 pb-3">
          <div className="flex items-center gap-2">
            {step === 'review' && (
              <button
                onClick={handleStartOver}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-steel-400 hover:bg-steel-100 cursor-pointer"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-50">
              <Phone className="h-4 w-4 text-navy-500" />
            </div>
            <div>
              <h2 className="font-bold text-navy-500">
                {step === 'done' ? 'Lead Created' : 'New Lead'}
              </h2>
              <p className="text-xs text-steel-400">
                {step === 'intake' && mode === 'paste' && 'Paste text to extract info'}
                {step === 'intake' && mode === 'screenshot' && 'Upload a screenshot'}
                {step === 'intake' && mode === 'manual' && 'Enter contact info'}
                {step === 'processing' && 'Analyzing with AI...'}
                {step === 'review' && 'Review & edit before saving'}
                {step === 'done' && 'Contact saved to CRM'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-steel-400 hover:bg-steel-100 cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-safe">
          {/* ═══ INTAKE STEP ═══ */}
          {step === 'intake' && (
            <>
              {/* Mode Tabs */}
              <div className="flex rounded-lg bg-steel-100 p-1 gap-1">
                <ModeTab
                  active={mode === 'paste'}
                  onClick={() => setMode('paste')}
                  icon={<Type className="h-4 w-4" />}
                  label="Paste"
                />
                <ModeTab
                  active={mode === 'screenshot'}
                  onClick={() => setMode('screenshot')}
                  icon={<Camera className="h-4 w-4" />}
                  label="Screenshot"
                />
                <ModeTab
                  active={mode === 'manual'}
                  onClick={() => setMode('manual')}
                  icon={<PenLine className="h-4 w-4" />}
                  label="Manual"
                />
              </div>

              {/* Text Paste Mode */}
              {mode === 'paste' && (
                <>
                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`Paste the lead's message, text, or DM here...\n\nExample:\nHi, my son Jake is 14 and pitches for Farragut. He's throwing about 65 mph and we'd love training at 108. We're in Nashville, about 2.5 hours away. - Sarah Johnson (615) 555-0123`}
                    rows={7}
                    className="input resize-none text-sm"
                    autoFocus
                  />
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button
                    onClick={handleExtract}
                    disabled={!rawText.trim()}
                    className="btn-primary w-full py-3"
                  >
                    <Sparkles className="h-4 w-4" />
                    Extract with AI
                  </button>
                </>
              )}

              {/* Screenshot Mode */}
              {mode === 'screenshot' && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleScreenshotSelect}
                    className="hidden"
                  />
                  {screenshotPreview ? (
                    <div className="space-y-3">
                      <img
                        src={screenshotPreview}
                        alt="Screenshot preview"
                        className="w-full rounded-lg border border-steel-200 max-h-64 object-contain bg-steel-50"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setScreenshotFile(null)
                            setScreenshotPreview(null)
                          }}
                          className="btn-secondary flex-1"
                        >
                          Retake
                        </button>
                        <button
                          onClick={handleScreenshotExtract}
                          className="btn-primary flex-1 py-3"
                        >
                          <Sparkles className="h-4 w-4" />
                          Extract with AI
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-steel-300 bg-steel-50 py-12 text-steel-500 hover:bg-steel-100 hover:border-navy-300 transition-colors cursor-pointer"
                    >
                      <Camera className="h-8 w-8 text-steel-400" />
                      <span className="text-sm font-medium">Tap to take photo or upload</span>
                      <span className="text-xs text-steel-400">Screenshot of DM, text, or form</span>
                    </button>
                  )}
                  {error && <p className="text-sm text-red-600">{error}</p>}
                </>
              )}

              {/* Manual Entry Mode */}
              {mode === 'manual' && (
                <>
                  <div className="space-y-3">
                    <ManualInput
                      icon={<User className="h-4 w-4" />}
                      label="Name"
                      required
                      value={manualFields.contact_name}
                      onChange={(v) => setManualFields({ ...manualFields, contact_name: v })}
                      placeholder="Parent or contact name"
                    />
                    <ManualInput
                      icon={<Phone className="h-4 w-4" />}
                      label="Phone"
                      required
                      value={manualFields.contact_phone}
                      onChange={(v) => setManualFields({ ...manualFields, contact_phone: v })}
                      placeholder="(615) 555-0123"
                      type="tel"
                    />
                    <ManualInput
                      icon={<Mail className="h-4 w-4" />}
                      label="Email"
                      value={manualFields.contact_email}
                      onChange={(v) => setManualFields({ ...manualFields, contact_email: v })}
                      placeholder="Optional"
                      type="email"
                    />
                    <ManualInput
                      icon={<User className="h-4 w-4" />}
                      label="Athlete Name"
                      value={manualFields.athlete_name}
                      onChange={(v) => setManualFields({ ...manualFields, athlete_name: v })}
                      placeholder="Optional"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <ManualInput
                        label="Age"
                        value={manualFields.athlete_age}
                        onChange={(v) => setManualFields({ ...manualFields, athlete_age: v })}
                        placeholder="14"
                        type="number"
                      />
                      <ManualInput
                        label="Position"
                        value={manualFields.athlete_position}
                        onChange={(v) => setManualFields({ ...manualFields, athlete_position: v })}
                        placeholder="Pitcher"
                      />
                    </div>
                    <ManualInput
                      icon={<MapPin className="h-4 w-4" />}
                      label="Location"
                      value={manualFields.location}
                      onChange={(v) => setManualFields({ ...manualFields, location: v })}
                      placeholder="Nashville, TN"
                    />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button
                    onClick={handleManualSubmit}
                    disabled={!manualFields.contact_name.trim() || !manualFields.contact_phone.trim()}
                    className="btn-primary w-full py-3"
                  >
                    <Save className="h-4 w-4" />
                    Create Lead
                  </button>
                </>
              )}
            </>
          )}

          {/* ═══ PROCESSING STEP ═══ */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-navy-400" />
                <Sparkles className="absolute -right-1 -top-1 h-5 w-5 text-amber-500" />
              </div>
              <div className="text-center">
                <p className="font-medium text-navy-500">Analyzing lead...</p>
                <p className="text-sm text-steel-400 mt-1">Extracting info & classifying</p>
              </div>
            </div>
          )}

          {/* ═══ REVIEW STEP — Editable Fields ═══ */}
          {step === 'review' && reviewData && (
            <>
              {/* Existing contact warning */}
              {existingContact && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Existing Contact Found</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Matched to &quot;{existingContact.name}&quot; — will update existing record
                    </p>
                  </div>
                </div>
              )}

              {/* Contact Info — Editable */}
              <div className="card p-4 space-y-3">
                <h4 className="text-sm font-semibold text-navy-500">Contact Info</h4>
                <div className="space-y-2">
                  <EditableField
                    label="Name"
                    value={reviewData.fields.contact_name}
                    onChange={(v) => updateField('contact_name', v)}
                  />
                  <EditableField
                    label="Phone"
                    value={reviewData.fields.contact_phone}
                    onChange={(v) => updateField('contact_phone', v)}
                    type="tel"
                  />
                  <EditableField
                    label="Email"
                    value={reviewData.fields.contact_email}
                    onChange={(v) => updateField('contact_email', v)}
                    type="email"
                  />
                  <EditableField
                    label="Location"
                    value={reviewData.fields.location}
                    onChange={(v) => updateField('location', v)}
                  />
                </div>
              </div>

              {/* Athlete — Editable */}
              {(reviewData.fields.athlete_name || reviewData.fields.athlete_age || reviewData.fields.athlete_position) && (
                <div className="card p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-navy-500">Athlete</h4>
                  <div className="space-y-2">
                    <EditableField
                      label="Name"
                      value={reviewData.fields.athlete_name}
                      onChange={(v) => updateField('athlete_name', v)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <EditableField
                        label="Age"
                        value={reviewData.fields.athlete_age}
                        onChange={(v) => updateField('athlete_age', v)}
                        type="number"
                      />
                      <EditableField
                        label="Position"
                        value={reviewData.fields.athlete_position}
                        onChange={(v) => updateField('athlete_position', v)}
                      />
                    </div>
                    <EditableField
                      label="Level"
                      value={reviewData.fields.athlete_level}
                      onChange={(v) => updateField('athlete_level', v)}
                    />
                  </div>
                </div>
              )}

              {/* AI Classification — read-only summary */}
              <div className="card p-4 space-y-2">
                <h4 className="text-sm font-semibold text-navy-500">AI Classification</h4>
                <div className="flex flex-wrap gap-2">
                  <span className={cn(
                    'badge',
                    reviewData.classification.temperature === 'hot' && 'badge-hot',
                    reviewData.classification.temperature === 'warm' && 'badge-warm',
                    reviewData.classification.temperature === 'cold' && 'badge-cold',
                  )}>
                    {reviewData.classification.temperature.toUpperCase()}
                  </span>
                  <span className="badge bg-steel-100 text-steel-600">
                    {reviewData.classification.fit_score.replace(/_/g, ' ')}
                  </span>
                  <span className="badge bg-navy-50 text-navy-600">
                    {getServiceLabel(reviewData.classification.service_match as ServiceMatch)}
                  </span>
                </div>
                <p className="text-sm text-steel-500 mt-1">{reviewData.summary}</p>
              </div>

              {/* Dual Action Buttons — Per Spec */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleConfirmAndCall}
                  className="btn-primary flex-1 py-3"
                >
                  <Phone className="h-4 w-4" />
                  Confirm & Call
                </button>
                <button
                  onClick={handleConfirmAndSave}
                  className="btn-secondary flex-1 py-3"
                >
                  <Save className="h-4 w-4" />
                  Confirm & Save
                </button>
              </div>
            </>
          )}

          {/* ═══ DONE STEP ═══ */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50 ring-4 ring-green-100">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-navy-500">Lead Created!</h3>
                <p className="text-sm text-steel-400 mt-1">
                  Contact saved to GHL and added to pipeline
                </p>
              </div>

              {/* Action buttons */}
              <div className="w-full space-y-2 mt-2">
                {ghlUrl && (
                  <a
                    href={ghlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    Call in GHL
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <button
                  onClick={handleStartOver}
                  className="btn-secondary w-full py-3"
                >
                  <Sparkles className="h-4 w-4" />
                  Add Another Lead
                </button>
                <button
                  onClick={onClose}
                  className="btn-ghost w-full py-3"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Mode Tab Button ───────────────────────────────────
function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all cursor-pointer',
        active
          ? 'bg-white text-navy-500 shadow-sm'
          : 'text-steel-500 hover:text-steel-700'
      )}
    >
      {icon}
      {label}
    </button>
  )
}

// ─── Editable Field (Review Step) ──────────────────────
function EditableField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-steel-400 uppercase tracking-wide mb-0.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-steel-200 bg-steel-50 px-3 py-1.5 text-sm font-medium text-navy-500 focus:border-navy-400 focus:outline-none focus:ring-1 focus:ring-navy-500/20 transition-colors"
        placeholder={`Add ${label.toLowerCase()}`}
      />
    </div>
  )
}

// ─── Manual Entry Input ────────────────────────────────
function ManualInput({
  icon,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = 'text',
}: {
  icon?: React.ReactNode
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  type?: string
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-xs font-medium text-steel-500 mb-1">
        {icon}
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input"
        required={required}
      />
    </div>
  )
}
