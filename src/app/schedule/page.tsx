'use client'

import { useState, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import RoleGate from '@/components/layout/RoleGate'
import DashboardLayout from '@/components/DashboardLayout'
import DateNavigator from '@/components/schedule/DateNavigator'
import DayScheduleView from '@/components/schedule/DayScheduleView'
import CoachDayView from '@/components/schedule/CoachDayView'
import SlotDetail from '@/components/schedule/SlotDetail'
import ExperienceForm from '@/components/schedule/ExperienceForm'
import SuggestionReview from '@/components/schedule/SuggestionReview'
import { useSchedule } from '@/hooks/useSchedule'
import { createClient } from '@/lib/supabase/client'
import type { ScheduleSlotEnriched, SlotSuggestion, UserRole, CoachTier } from '@/types'

function ScheduleContent() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlotEnriched | null>(null)
  const [showExperienceForm, setShowExperienceForm] = useState(false)
  const [userRole, setUserRole] = useState<UserRole>('admin')
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [userTier, setUserTier] = useState<CoachTier | undefined>()
  const [leads, setLeads] = useState<{ id: string; name: string }[]>([])
  const [suggestions, setSuggestions] = useState<SlotSuggestion[] | null>(null)

  const supabase = createClient()
  const { slots, loading, fetchSlots } = useSchedule()

  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  // Fetch user info
  useEffect(() => {
    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser?.email) return

      const { data } = await supabase
        .from('users')
        .select('id, role, name, coach_tier')
        .eq('email', authUser.email)
        .single()

      if (data) {
        setUserRole(data.role as UserRole)
        setUserId(data.id)
        setUserName(data.name)
        setUserTier((data.coach_tier as CoachTier) || undefined)
      }
    }
    loadUser()
  }, [supabase])

  // Fetch schedule for selected date (load the current week)
  useEffect(() => {
    fetchSlots(dateStr, dateStr)
  }, [dateStr, fetchSlots])

  // Fetch leads for experience form
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

  const handleSlotClick = useCallback((slot: ScheduleSlotEnriched) => {
    setSelectedSlot(slot)
  }, [])

  const handleCreateExperience = useCallback(
    async (data: {
      leadId: string
      startDate: string
      endDate: string
      skillFocus: 'hitting' | 'pitching' | 'two_way'
      notes?: string
    }) => {
      // Create experience via Supabase
      const start = new Date(data.startDate)
      const end = new Date(data.endDate)
      const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

      const { data: exp, error } = await supabase
        .from('experiences')
        .insert({
          lead_id: data.leadId,
          start_date: data.startDate,
          end_date: data.endDate,
          skill_focus: data.skillFocus,
          duration_days: durationDays,
          payment_status: 'pending',
          status: 'booked',
          notes: data.notes || null,
        })
        .select()
        .single()

      if (error) throw error

      // Then call suggest API and show suggestions
      if (exp) {
        const res = await fetch('/api/schedule/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ experience_id: exp.id }),
        })

        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.suggestions)
        } else {
          console.error('Failed to get suggestions')
        }
      }

      setShowExperienceForm(false)
      // Refresh schedule
      fetchSlots(dateStr, dateStr)
    },
    [supabase, dateStr, fetchSlots]
  )

  const handleAcceptSuggestions = useCallback(
    async (assignments: { date: string; timeBlock: string; coachId: string }[]) => {
      if (!suggestions) return

      // Build lookup: date|timeBlock -> slot_id from suggestions
      const slotIdMap = new Map<string, string>()
      for (const day of suggestions) {
        for (const block of day.blocks) {
          const slotId = block.slot_id
          if (slotId) {
            slotIdMap.set(`${day.date}|${block.time_block}`, slotId)
          }
        }
      }

      const payload = assignments
        .map((a) => ({
          schedule_slot_id: slotIdMap.get(`${a.date}|${a.timeBlock}`) || '',
          coach_id: a.coachId,
        }))
        .filter((a) => a.schedule_slot_id)

      const res = await fetch('/api/schedule/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments: payload }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to assign coaches')
      }

      setSuggestions(null)
      fetchSlots(dateStr, dateStr)
    },
    [suggestions, dateStr, fetchSlots]
  )

  // Filter slots for the selected date
  const daySlots = slots.filter((s) => s.date === dateStr)
  const coachSlots = userId
    ? daySlots.filter((s) => s.coach_id === userId)
    : []

  // Coach view: simplified "My Day"
  if (userRole === 'coach' && userId) {
    return (
      <>
        <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
        <CoachDayView
          coachName={userName}
          coachTier={userTier}
          date={selectedDate}
          slots={coachSlots}
          onSlotClick={handleSlotClick}
        />
        {selectedSlot && (
          <SlotDetail slot={selectedSlot} onClose={() => setSelectedSlot(null)} />
        )}
      </>
    )
  }

  // Admin/Coordinator/Manager view: master schedule
  return (
    <>
      <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-navy-500 border-t-transparent" />
        </div>
      ) : (
        <DayScheduleView slots={daySlots} onSlotClick={handleSlotClick} />
      )}

      {/* FAB: New Experience */}
      <button
        onClick={() => setShowExperienceForm(true)}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-navy-500 text-white shadow-lg hover:bg-navy-600 active:bg-navy-700 transition-colors"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Slot detail panel */}
      {selectedSlot && (
        <SlotDetail slot={selectedSlot} onClose={() => setSelectedSlot(null)} />
      )}

      {/* Experience creation form */}
      {showExperienceForm && (
        <ExperienceForm
          leads={leads}
          onSubmit={handleCreateExperience}
          onClose={() => setShowExperienceForm(false)}
        />
      )}

      {/* Suggestion review modal */}
      {suggestions && (
        <SuggestionReview
          suggestions={suggestions}
          onAccept={handleAcceptSuggestions}
          onClose={() => setSuggestions(null)}
        />
      )}
    </>
  )
}

export default function SchedulePage() {
  return (
    <RoleGate allowedRoles={['coordinator', 'coach', 'manager', 'admin']}>
      <DashboardLayout>
        <ScheduleContent />
      </DashboardLayout>
    </RoleGate>
  )
}
