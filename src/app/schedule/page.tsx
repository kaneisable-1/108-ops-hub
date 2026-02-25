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
import { useSchedule } from '@/hooks/useSchedule'
import { createClient } from '@/lib/supabase/client'
import type { ScheduleSlotEnriched, UserRole, CoachTier } from '@/types'

function ScheduleContent() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlotEnriched | null>(null)
  const [showExperienceForm, setShowExperienceForm] = useState(false)
  const [userRole, setUserRole] = useState<UserRole>('admin')
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [userTier, setUserTier] = useState<CoachTier | undefined>()
  const [leads, setLeads] = useState<{ id: string; name: string }[]>([])

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

      // Then call suggest API
      if (exp) {
        const res = await fetch('/api/schedule/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ experience_id: exp.id }),
        })

        if (!res.ok) {
          console.error('Failed to get suggestions')
        }
      }

      // Refresh schedule
      fetchSlots(dateStr, dateStr)
    },
    [supabase, dateStr, fetchSlots]
  )

  // Filter slots for the selected date
  const daySlots = slots.filter((s) => s.date === dateStr)
  const coachSlots = userId
    ? daySlots.filter((s) => s.coach_id === userId)
    : []

  // Coach view: simplified "My Day"
  if (userRole === 'coach' && userId) {
    return (
      <div>
        <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
        <div className="content-area py-6">
          <CoachDayView
            coachName={userName}
            coachTier={userTier}
            date={selectedDate}
            slots={coachSlots}
            onSlotClick={handleSlotClick}
          />
        </div>
        {selectedSlot && (
          <SlotDetail slot={selectedSlot} onClose={() => setSelectedSlot(null)} />
        )}
      </div>
    )
  }

  // Admin/Coordinator/Manager view: master schedule
  return (
    <div>
      <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />

      <div className="content-area py-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
          <DayScheduleView slots={daySlots} onSlotClick={handleSlotClick} />
        )}
      </div>

      {/* FAB: New Experience */}
      <button
        onClick={() => setShowExperienceForm(true)}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 ease-apple active:scale-[0.95]"
        style={{ background: 'var(--accent-blue)' }}
      >
        <Plus size={24} strokeWidth={1.75} />
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
    </div>
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
