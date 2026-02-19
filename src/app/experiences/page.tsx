'use client'

import { useState, useMemo, useCallback } from 'react'
import { format, isPast, isFuture, isToday } from 'date-fns'
import Link from 'next/link'
import {
  Calendar,
  DollarSign,
  Search,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import RoleGate from '@/components/layout/RoleGate'
import DashboardLayout from '@/components/DashboardLayout'
import { useExperiences } from '@/hooks/useExperiences'
import { createClient } from '@/lib/supabase/client'
import { isPreviewMode, MOCK_LEADS } from '@/lib/mock-data'
import type { Experience } from '@/types'

type ExperienceTab = 'upcoming' | 'active' | 'past'
type PaymentStatus = Experience['payment_status']

const TAB_CONFIG: { key: ExperienceTab; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'active', label: 'Active' },
  { key: 'past', label: 'Past' },
]

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; icon: React.ReactNode; className: string }> = {
  pending: { label: 'Pending', icon: <Clock className="h-3 w-3" />, className: 'bg-gray-100 text-gray-600' },
  deposit_paid: { label: 'Deposit Paid', icon: <DollarSign className="h-3 w-3" />, className: 'bg-gray-200 text-gray-700' },
  paid_full: { label: 'Paid in Full', icon: <CheckCircle className="h-3 w-3" />, className: 'bg-gray-900 text-white' },
  payment_plan: { label: 'Payment Plan', icon: <CreditCard className="h-3 w-3" />, className: 'bg-gray-300 text-gray-800' },
}

const STATUS_CONFIG: Record<Experience['status'], { label: string; className: string }> = {
  booked: { label: 'Booked', className: 'bg-gray-200 text-gray-700' },
  arrived: { label: 'Arrived', className: 'bg-gray-700 text-white' },
  in_progress: { label: 'In Progress', className: 'bg-gray-900 text-white' },
  completed: { label: 'Completed', className: 'bg-gray-100 text-gray-600' },
  canceled: { label: 'Canceled', className: 'bg-gray-100 text-gray-400' },
}

interface ExperienceWithLead extends Experience {
  lead?: {
    id: string
    athlete_name: string | null
    contact_name: string | null
    contact_phone: string | null
    athlete_age: number | null
    athlete_level: string | null
  }
}

export default function ExperiencesPage() {
  return (
    <RoleGate allowedRoles={['coordinator', 'manager', 'admin']}>
      <DashboardLayout>
        <ExperiencesContent />
      </DashboardLayout>
    </RoleGate>
  )
}

function ExperiencesContent() {
  const { experiences, loading, error, refresh, updateExperience } = useExperiences()
  const [activeTab, setActiveTab] = useState<ExperienceTab>('upcoming')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExp, setSelectedExp] = useState<ExperienceWithLead | null>(null)
  const [leads, setLeads] = useState<Map<string, { athlete_name: string | null; contact_name: string | null; contact_phone: string | null; athlete_age: number | null; athlete_level: string | null }>>(new Map())
  const supabase = createClient()

  // Load lead info for experiences
  const loadLeadInfo = useCallback(async (exps: Experience[]) => {
    const leadIds = [...new Set(exps.map((e) => e.lead_id).filter(Boolean))]
    if (leadIds.length === 0) return

    if (isPreviewMode()) {
      const map = new Map<string, { athlete_name: string | null; contact_name: string | null; contact_phone: string | null; athlete_age: number | null; athlete_level: string | null }>()
      MOCK_LEADS.forEach((l) => {
        if (leadIds.includes(l.id)) {
          map.set(l.id, {
            athlete_name: l.athlete_name,
            contact_name: l.contact_name,
            contact_phone: l.contact_phone,
            athlete_age: l.athlete_age,
            athlete_level: l.athlete_level,
          })
        }
      })
      setLeads(map)
      return
    }

    const { data } = await supabase
      .from('leads')
      .select('id, athlete_name, contact_name, contact_phone, athlete_age, athlete_level')
      .in('id', leadIds)

    if (data) {
      const map = new Map<string, typeof data[0]>()
      data.forEach((l) => map.set(l.id, l))
      setLeads(map)
    }
  }, [supabase])

  // Load leads when experiences change
  useState(() => {
    if (experiences.length > 0) loadLeadInfo(experiences)
  })

  const today = new Date().toISOString().split('T')[0]

  const { upcoming, active, past } = useMemo(() => {
    const up: ExperienceWithLead[] = []
    const act: ExperienceWithLead[] = []
    const done: ExperienceWithLead[] = []

    for (const exp of experiences) {
      const enriched: ExperienceWithLead = {
        ...exp,
        lead: leads.get(exp.lead_id) ? { id: exp.lead_id, ...leads.get(exp.lead_id)! } : undefined,
      }

      if (exp.status === 'canceled' || exp.status === 'completed') {
        done.push(enriched)
      } else if (exp.start_date > today) {
        up.push(enriched)
      } else {
        act.push(enriched)
      }
    }

    return { upcoming: up, active: act, past: done }
  }, [experiences, leads, today])

  const currentList = activeTab === 'upcoming' ? upcoming : activeTab === 'active' ? active : past

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return currentList
    const q = searchQuery.toLowerCase()
    return currentList.filter((exp) => {
      const lead = exp.lead
      return (
        (lead?.athlete_name && lead.athlete_name.toLowerCase().includes(q)) ||
        (lead?.contact_name && lead.contact_name.toLowerCase().includes(q)) ||
        (exp.skill_focus && exp.skill_focus.toLowerCase().includes(q)) ||
        (exp.notes && exp.notes.toLowerCase().includes(q))
      )
    })
  }, [currentList, searchQuery])

  const handlePaymentUpdate = async (expId: string, status: PaymentStatus) => {
    try {
      await updateExperience(expId, { payment_status: status })
      if (selectedExp?.id === expId) {
        setSelectedExp({ ...selectedExp, payment_status: status })
      }
    } catch (err) {
      console.error('Failed to update payment:', err)
    }
  }

  const handleStatusUpdate = async (expId: string, status: Experience['status']) => {
    try {
      await updateExperience(expId, { status })
      if (selectedExp?.id === expId) {
        setSelectedExp({ ...selectedExp, status })
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <AlertCircle className="h-8 w-8 text-gray-400" />
        <p className="text-sm text-gray-900">{error}</p>
        <button onClick={refresh} className="btn-secondary text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-brand-500" />
            <h1 className="text-xl font-bold text-gray-900">Experiences</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="badge bg-gray-100 text-gray-600">{upcoming.length} upcoming</span>
            <span className="badge bg-gray-900 text-white">{active.length} active</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TAB_CONFIG.map((tab) => {
            const count = tab.key === 'upcoming' ? upcoming.length : tab.key === 'active' ? active.length : past.length
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2',
                  activeTab === tab.key
                    ? 'border-brand-500 text-brand-600 bg-brand-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                {tab.label}
                <span className="badge bg-gray-100 text-gray-600 text-[10px] min-w-[18px] justify-center">
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by athlete, skill..."
            className="input w-full pl-10 text-sm"
          />
        </div>

        {/* Experience list */}
        {filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Calendar className="h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">
              {searchQuery ? 'No experiences match your search' : `No ${activeTab} experiences`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredList.map((exp) => (
              <ExperienceCard
                key={exp.id}
                experience={exp}
                onClick={() => setSelectedExp(exp)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedExp && (
        <ExperienceDetailPanel
          experience={selectedExp}
          onClose={() => setSelectedExp(null)}
          onPaymentUpdate={handlePaymentUpdate}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  )
}

function ExperienceCard({
  experience,
  onClick,
}: {
  experience: ExperienceWithLead
  onClick: () => void
}) {
  const lead = experience.lead
  const athleteName = lead?.athlete_name || lead?.contact_name || 'Unknown'
  const statusCfg = STATUS_CONFIG[experience.status]
  const paymentCfg = PAYMENT_STATUS_CONFIG[experience.payment_status]
  const daysStr = experience.duration_days ? `${experience.duration_days}d` : ''

  return (
    <button onClick={onClick} className="card p-4 w-full text-left hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{athleteName}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {format(new Date(experience.start_date + 'T00:00:00'), 'MMM d')} —{' '}
            {format(new Date(experience.end_date + 'T00:00:00'), 'MMM d, yyyy')}
            {daysStr && <span className="ml-1 text-gray-400">({daysStr})</span>}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="badge bg-brand-50 text-brand-700 text-[10px] capitalize">
              {experience.skill_focus.replace('_', ' ')}
            </span>
            {lead?.athlete_level && (
              <span className="badge bg-gray-100 text-gray-600 text-[10px] capitalize">
                {lead.athlete_level.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={cn('badge text-[10px]', statusCfg.className)}>{statusCfg.label}</span>
          <span className={cn('badge text-[10px] flex items-center gap-1', paymentCfg.className)}>
            {paymentCfg.icon}
            {paymentCfg.label}
          </span>
        </div>
      </div>
    </button>
  )
}

function ExperienceDetailPanel({
  experience,
  onClose,
  onPaymentUpdate,
  onStatusUpdate,
}: {
  experience: ExperienceWithLead
  onClose: () => void
  onPaymentUpdate: (expId: string, status: PaymentStatus) => void
  onStatusUpdate: (expId: string, status: Experience['status']) => void
}) {
  const lead = experience.lead
  const athleteName = lead?.athlete_name || lead?.contact_name || 'Unknown'
  const statusCfg = STATUS_CONFIG[experience.status]
  const paymentCfg = PAYMENT_STATUS_CONFIG[experience.payment_status]

  const statusTransitions: Record<Experience['status'], Experience['status'][]> = {
    booked: ['arrived', 'canceled'],
    arrived: ['in_progress', 'canceled'],
    in_progress: ['completed', 'canceled'],
    completed: [],
    canceled: [],
  }

  const nextStatuses = statusTransitions[experience.status]

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white pb-safe shadow-xl">
        <div className="sticky top-0 z-10 bg-white px-4 pt-3 pb-2 border-b border-gray-100 rounded-t-3xl">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-gray-300" />
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{athleteName}</h2>
              <p className="text-xs text-gray-500">
                {format(new Date(experience.start_date + 'T00:00:00'), 'MMM d')} —{' '}
                {format(new Date(experience.end_date + 'T00:00:00'), 'MMM d, yyyy')}
              </p>
            </div>
            <span className={cn('badge text-xs', statusCfg.className)}>{statusCfg.label}</span>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Quick info */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCard label="Skill Focus" value={experience.skill_focus.replace('_', ' ')} />
            <InfoCard label="Duration" value={experience.duration_days ? `${experience.duration_days} days` : '—'} />
            <InfoCard label="Level" value={lead?.athlete_level?.replace('_', ' ') || '—'} />
            <InfoCard label="Age" value={lead?.athlete_age ? String(lead.athlete_age) : '—'} />
          </div>

          {/* Payment section */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase text-gray-400">Payment</h3>
              <span className={cn('badge text-xs flex items-center gap-1', paymentCfg.className)}>
                {paymentCfg.icon}
                {paymentCfg.label}
              </span>
            </div>

            {experience.price_cents != null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Total Price</span>
                <span className="font-semibold text-gray-900">${(experience.price_cents / 100).toFixed(2)}</span>
              </div>
            )}
            {experience.deposit_amount_cents != null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Deposit</span>
                <span className="text-gray-700">${(experience.deposit_amount_cents / 100).toFixed(2)}</span>
              </div>
            )}
            {experience.balance_due_cents != null && experience.balance_due_cents > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Balance Due</span>
                <span className="font-semibold text-gray-900">${(experience.balance_due_cents / 100).toFixed(2)}</span>
              </div>
            )}

            {/* Payment status buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              {(['pending', 'deposit_paid', 'paid_full', 'payment_plan'] as PaymentStatus[]).map((ps) => {
                const cfg = PAYMENT_STATUS_CONFIG[ps]
                const isCurrent = experience.payment_status === ps
                return (
                  <button
                    key={ps}
                    onClick={() => !isCurrent && onPaymentUpdate(experience.id, ps)}
                    disabled={isCurrent}
                    className={cn(
                      'badge text-xs transition-colors',
                      isCurrent ? cfg.className : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                    )}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Status transitions */}
          {nextStatuses.length > 0 && (
            <div className="flex gap-2">
              {nextStatuses.map((status) => {
                const cfg = STATUS_CONFIG[status]
                const isCancel = status === 'canceled'
                return (
                  <button
                    key={status}
                    onClick={() => onStatusUpdate(experience.id, status)}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      isCancel
                        ? 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                        : 'bg-brand-500 text-white hover:bg-brand-600'
                    )}
                  >
                    {isCancel ? 'Cancel' : `Mark ${cfg.label}`}
                  </button>
                )
              })}
            </div>
          )}

          {/* Notes */}
          {experience.notes && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Notes</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{experience.notes}</p>
            </div>
          )}

          {/* Link to athlete profile */}
          {lead && (
            <Link
              href={`/athletes/${lead.id}`}
              className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm text-gray-700">View Athlete Profile</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </Link>
          )}
        </div>
      </div>
    </>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-[10px] uppercase text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900 capitalize">{value}</p>
    </div>
  )
}
