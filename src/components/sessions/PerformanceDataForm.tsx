'use client'

import { useState } from 'react'
import { Activity, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface PerformanceDataFormProps {
  sessionId: string
  athleteName: string
  discipline: 'pitching' | 'hitting' | 'both'
  existingData?: PerformanceData
  onSaved: () => void
}

interface PerformanceData {
  // Pitching
  fastball_velo?: number | null
  breaking_velo?: number | null
  spin_rate?: number | null
  strike_pct?: number | null
  // Hitting
  exit_velo?: number | null
  launch_angle?: number | null
  bat_speed?: number | null
  hard_hit_pct?: number | null
  // General
  sprint_60?: number | null
  notes?: string
}

export default function PerformanceDataForm({
  sessionId,
  athleteName,
  discipline,
  existingData,
  onSaved,
}: PerformanceDataFormProps) {
  const [data, setData] = useState<PerformanceData>(existingData || {})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showPitching = discipline === 'pitching' || discipline === 'both'
  const showHitting = discipline === 'hitting' || discipline === 'both'

  const hasValues = Object.values(data).some((v) => v !== null && v !== undefined && v !== '')

  const updateField = (field: keyof PerformanceData, value: string) => {
    if (field === 'notes') {
      setData({ ...data, notes: value })
    } else {
      const num = value === '' ? null : parseFloat(value)
      setData({ ...data, [field]: num })
    }
  }

  const handleSave = async () => {
    if (!hasValues) return

    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ performance_data: data })
        .eq('id', sessionId)

      if (updateError) throw updateError

      setSaved(true)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="card p-4 border-gray-300 bg-gray-50">
        <p className="text-sm font-medium text-gray-700">Performance data saved</p>
      </div>
    )
  }

  return (
    <div className="card p-4 space-y-4 border-gray-300">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-gray-500" />
        <h3 className="text-sm font-bold text-gray-900">Performance Data — {athleteName}</h3>
      </div>
      <p className="text-xs text-gray-500">Optional. Record measurable data from this session.</p>

      {/* Pitching Metrics */}
      {showPitching && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-gray-400 mb-2">Pitching</h4>
          <div className="grid grid-cols-2 gap-3">
            <NumericInput
              label="Fastball Velo (mph)"
              value={data.fastball_velo}
              onChange={(v) => updateField('fastball_velo', v)}
              placeholder="87"
            />
            <NumericInput
              label="Breaking Velo (mph)"
              value={data.breaking_velo}
              onChange={(v) => updateField('breaking_velo', v)}
              placeholder="74"
            />
            <NumericInput
              label="Spin Rate (rpm)"
              value={data.spin_rate}
              onChange={(v) => updateField('spin_rate', v)}
              placeholder="2200"
            />
            <NumericInput
              label="Strike %"
              value={data.strike_pct}
              onChange={(v) => updateField('strike_pct', v)}
              placeholder="62"
            />
          </div>
        </div>
      )}

      {/* Hitting Metrics */}
      {showHitting && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-gray-400 mb-2">Hitting</h4>
          <div className="grid grid-cols-2 gap-3">
            <NumericInput
              label="Exit Velo (mph)"
              value={data.exit_velo}
              onChange={(v) => updateField('exit_velo', v)}
              placeholder="92"
            />
            <NumericInput
              label="Launch Angle"
              value={data.launch_angle}
              onChange={(v) => updateField('launch_angle', v)}
              placeholder="18"
            />
            <NumericInput
              label="Bat Speed (mph)"
              value={data.bat_speed}
              onChange={(v) => updateField('bat_speed', v)}
              placeholder="70"
            />
            <NumericInput
              label="Hard Hit %"
              value={data.hard_hit_pct}
              onChange={(v) => updateField('hard_hit_pct', v)}
              placeholder="40"
            />
          </div>
        </div>
      )}

      {/* General */}
      <div>
        <h4 className="text-xs font-semibold uppercase text-gray-400 mb-2">General</h4>
        <div className="grid grid-cols-2 gap-3">
          <NumericInput
            label="60-Yard Sprint (sec)"
            value={data.sprint_60}
            onChange={(v) => updateField('sprint_60', v)}
            placeholder="7.2"
          />
        </div>
        <div className="mt-3">
          <label className="text-xs text-gray-500 mb-1 block">Notes</label>
          <textarea
            value={data.notes || ''}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Any additional performance observations..."
            className="input w-full resize-none"
            rows={2}
          />
        </div>
      </div>

      {error && <p className="text-xs text-gray-900">{error}</p>}

      <button
        onClick={handleSave}
        disabled={!hasValues || saving}
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all',
          hasValues ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        )}
      >
        {saving ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
        ) : (
          <><Activity className="h-4 w-4" /> Save Performance Data</>
        )}
      </button>
    </div>
  )
}

function NumericInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: number | null | undefined
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        step="any"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input w-full"
      />
    </div>
  )
}
