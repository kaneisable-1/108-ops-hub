'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react'
import { useCoachAvailability } from '@/hooks/useCoachAvailability'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { CoachTier } from '@/types'

interface CoachInfo {
  id: string
  name: string
  coach_tier: CoachTier | null
}

const TIER_COLORS: Record<CoachTier, string> = {
  S1: 'text-navy-900',
  S2: 'text-steel-500',
  J1: 'text-steel-400',
}

export default function CoachAvailabilityManager() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [coaches, setCoaches] = useState<CoachInfo[]>([])
  const [loadingCoaches, setLoadingCoaches] = useState(true)
  const [selectedCell, setSelectedCell] = useState<{ coachId: string; date: string } | null>(null)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const supabase = createClient()
  const { availability, loading: loadingAvail, fetchAvailability, setAvailability } = useCoachAvailability()

  const startDate = format(weekStart, 'yyyy-MM-dd')
  const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd')
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Fetch coaches
  useEffect(() => {
    async function loadCoaches() {
      setLoadingCoaches(true)
      const { data } = await supabase
        .from('users')
        .select('id, name, coach_tier')
        .eq('is_coach', true)
        .order('name', { ascending: true })

      setCoaches(
        (data || []).map((c) => ({
          id: c.id,
          name: c.name,
          coach_tier: c.coach_tier as CoachTier | null,
        }))
      )
      setLoadingCoaches(false)
    }
    loadCoaches()
  }, [supabase])

  // Fetch availability when week changes
  useEffect(() => {
    fetchAvailability(startDate, endDate)
  }, [startDate, endDate, fetchAvailability])

  // Build lookup: "coachId|date" -> available
  const availabilityMap = useMemo(() => {
    const map = new Map<string, { available: boolean; reason?: string }>()
    for (const a of availability) {
      map.set(`${a.coach_id}|${a.date}`, { available: a.available, reason: a.reason })
    }
    return map
  }, [availability])

  const getStatus = (coachId: string, date: string) => {
    const entry = availabilityMap.get(`${coachId}|${date}`)
    if (!entry) return 'default' // no entry = available by default
    return entry.available ? 'available' : 'unavailable'
  }

  const handleCellClick = (coachId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    setSelectedCell({ coachId, date: dateStr })
    const entry = availabilityMap.get(`${coachId}|${dateStr}`)
    setReason((entry as Record<string, unknown>)?.reason as string || '')
  }

  const handleSetAvailability = async (available: boolean) => {
    if (!selectedCell) return
    setSaving(true)
    try {
      await setAvailability(selectedCell.coachId, selectedCell.date, available, reason || undefined)
      await fetchAvailability(startDate, endDate)
      setSelectedCell(null)
      setReason('')
    } catch (err) {
      console.error('Failed to set availability:', err)
    } finally {
      setSaving(false)
    }
  }

  const isLoading = loadingCoaches || loadingAvail

  return (
    <div className="space-y-4">
      {/* Week Navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          className="rounded-lg p-2 hover:bg-steel-100"
        >
          <ChevronLeft className="h-5 w-5 text-steel-600" />
        </button>
        <h3 className="text-sm font-semibold text-navy-500">
          {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </h3>
        <button
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          className="rounded-lg p-2 hover:bg-steel-100"
        >
          <ChevronRight className="h-5 w-5 text-steel-600" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-navy-500" />
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-steel-500 py-2 px-2 w-32">Coach</th>
                {weekDays.map((day) => (
                  <th
                    key={day.toISOString()}
                    className={cn(
                      'text-center text-xs font-medium py-2 px-1',
                      isSameDay(day, new Date()) ? 'text-navy-600' : 'text-steel-500'
                    )}
                  >
                    <div>{format(day, 'EEE')}</div>
                    <div className={cn(
                      'text-sm mt-0.5',
                      isSameDay(day, new Date()) && 'bg-navy-500 text-white rounded-full w-7 h-7 flex items-center justify-center mx-auto'
                    )}>
                      {format(day, 'd')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coaches.map((coach) => (
                <tr key={coach.id} className="border-t border-steel-100">
                  <td className="py-2 px-2">
                    <div className="text-sm font-medium text-navy-500 truncate max-w-[120px]">
                      {coach.name}
                    </div>
                    {coach.coach_tier && (
                      <span className={cn('text-xs font-semibold', TIER_COLORS[coach.coach_tier])}>
                        {coach.coach_tier}
                      </span>
                    )}
                  </td>
                  {weekDays.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const status = getStatus(coach.id, dateStr)
                    return (
                      <td key={dateStr} className="text-center py-2 px-1">
                        <button
                          onClick={() => handleCellClick(coach.id, day)}
                          className={cn(
                            'w-10 h-10 rounded-lg text-xs font-medium transition-colors mx-auto flex items-center justify-center',
                            status === 'unavailable'
                              ? 'bg-navy-900 text-white hover:bg-navy-700'
                              : status === 'available'
                              ? 'bg-steel-100 text-steel-700 hover:bg-steel-200'
                              : 'bg-steel-50 text-steel-400 hover:bg-steel-100'
                          )}
                        >
                          {status === 'unavailable' ? 'Off' : status === 'available' ? 'On' : '—'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {selectedCell && (
        <>
          <div className="fixed inset-0 z-40 bg-navy-500/40" onClick={() => setSelectedCell(null)} />
          <div className="fixed inset-x-4 bottom-1/4 z-50 max-w-md mx-auto rounded-2xl bg-white p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-navy-500">
                Set Availability — {selectedCell.date}
              </h3>
              <button onClick={() => setSelectedCell(null)} className="rounded-full p-1 hover:bg-steel-100">
                <X className="h-4 w-4 text-steel-500" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-steel-600 mb-1">Reason (optional)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Travel, Personal day"
                className="input text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleSetAvailability(false)}
                disabled={saving}
                className="btn-secondary flex-1 text-sm"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unavailable'}
              </button>
              <button
                onClick={() => handleSetAvailability(true)}
                disabled={saving}
                className="btn-primary flex-1 text-sm"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Available'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
