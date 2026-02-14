'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Users,
  Dumbbell,
  Settings,
  Check,
  ExternalLink,
  Bell,
  BellOff,
  ChevronDown,
} from 'lucide-react'
import RoleGate from '@/components/layout/RoleGate'
import DashboardLayout from '@/components/DashboardLayout'
import CoachAvailabilityManager from '@/components/schedule/CoachAvailabilityManager'
import type { User, UserRole, CoachTier } from '@/types'
import { cn } from '@/lib/utils'

type AdminTab = 'users' | 'coaches' | 'settings'

const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
  { key: 'users', label: 'Users', icon: <Users className="h-4 w-4" /> },
  { key: 'coaches', label: 'Coaches', icon: <Dumbbell className="h-4 w-4" /> },
  { key: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
]

const ROLE_OPTIONS: UserRole[] = ['sales', 'coordinator', 'coach', 'manager', 'admin']
const TIER_OPTIONS: CoachTier[] = ['S1', 'S2', 'J1']

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  coordinator: 'bg-teal-100 text-teal-700',
  coach: 'bg-amber-100 text-amber-700',
  sales: 'bg-green-100 text-green-700',
}

const TIER_COLORS: Record<CoachTier, string> = {
  S1: 'bg-purple-100 text-purple-700',
  S2: 'bg-blue-100 text-blue-700',
  J1: 'bg-amber-100 text-amber-700',
}

interface SystemStats {
  leads_count: number
  applications_count: number
  sessions_count: number
  last_briefing_at: string | null
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users')

  return (
    <RoleGate allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="flex min-h-screen flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 pt-4">
            <h1 className="text-xl font-bold text-gray-900 mb-3">Admin</h1>
            {/* Tab bar */}
            <div className="flex gap-1">
              {TABS.map((tab) => (
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
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 p-4 pb-24">
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'coaches' && <CoachesTab />}
            {activeTab === 'settings' && <SettingsTab />}
          </div>
        </div>
      </DashboardLayout>
    </RoleGate>
  )
}

// ============================================
// Users Tab
// ============================================

function UsersTab() {
  const { users, loading, error, refresh, updateUser } = useAdminUsers()
  const [savingId, setSavingId] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setSavingId(userId)
    setSaveSuccess(null)
    const ok = await updateUser(userId, { role: newRole })
    setSavingId(null)
    if (ok) {
      setSaveSuccess(userId)
      setTimeout(() => setSaveSuccess(null), 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={refresh} className="btn-secondary text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        <button onClick={refresh} className="btn-ghost text-xs py-1.5 px-2.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {users.map((user) => (
        <div key={user.id} className="card p-4">
          <div className="flex items-center justify-between gap-3">
            {/* User info */}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>

            {/* Role selector */}
            <div className="flex items-center gap-2">
              {savingId === user.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
              ) : saveSuccess === user.id ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : null}

              <div className="relative">
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                  disabled={savingId === user.id}
                  className={cn(
                    'badge appearance-none pr-6 cursor-pointer border-0 text-xs',
                    ROLE_COLORS[user.role]
                  )}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none opacity-60" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================
// Coaches Tab
// ============================================

function CoachesTab() {
  const { users: coaches, loading, error, refresh, updateUser } = useAdminUsers('coach')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  const handleTierChange = async (userId: string, newTier: CoachTier) => {
    setSavingId(userId)
    setSaveSuccess(null)
    const ok = await updateUser(userId, { coach_tier: newTier })
    setSavingId(null)
    if (ok) {
      setSaveSuccess(userId)
      setTimeout(() => setSaveSuccess(null), 2000)
    }
  }

  const handleToggleNotification = async (userId: string, field: 'notify_sms' | 'notify_discord', current: boolean) => {
    setSavingId(userId)
    setSaveSuccess(null)
    const ok = await updateUser(userId, { [field]: !current })
    setSavingId(null)
    if (ok) {
      setSaveSuccess(userId)
      setTimeout(() => setSaveSuccess(null), 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={refresh} className="btn-secondary text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    )
  }

  if (coaches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Dumbbell className="h-10 w-10 text-gray-300" />
        <p className="text-sm text-gray-500">No coaches found</p>
        <p className="text-xs text-gray-400">Assign a user the &quot;coach&quot; role in the Users tab first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{coaches.length} coach{coaches.length !== 1 ? 'es' : ''}</p>
        <button onClick={refresh} className="btn-ghost text-xs py-1.5 px-2.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Availability Calendar */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Weekly Availability</h2>
        <CoachAvailabilityManager />
      </div>

      {coaches.map((coach) => (
        <div key={coach.id} className="card p-4 space-y-3">
          {/* Name + tier row */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 truncate">{coach.name}</p>
              <p className="text-xs text-gray-500 truncate">{coach.email}</p>
            </div>

            <div className="flex items-center gap-2">
              {savingId === coach.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
              ) : saveSuccess === coach.id ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : null}

              <div className="relative">
                <select
                  value={coach.coach_tier || ''}
                  onChange={(e) => handleTierChange(coach.id, e.target.value as CoachTier)}
                  disabled={savingId === coach.id}
                  className={cn(
                    'badge appearance-none pr-6 cursor-pointer border-0 text-xs',
                    coach.coach_tier ? TIER_COLORS[coach.coach_tier] : 'bg-gray-100 text-gray-600'
                  )}
                >
                  <option value="" disabled>Tier</option>
                  {TIER_OPTIONS.map((tier) => (
                    <option key={tier} value={tier}>{tier}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none opacity-60" />
              </div>
            </div>
          </div>

          {/* Disciplines */}
          {coach.disciplines && coach.disciplines.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {coach.disciplines.map((d) => (
                <span key={d} className="badge bg-brand-50 text-brand-700 text-xs">{d}</span>
              ))}
            </div>
          )}

          {/* Notification toggles */}
          <div className="flex items-center gap-4 pt-1 border-t border-gray-100">
            <button
              onClick={() => handleToggleNotification(coach.id, 'notify_sms', coach.notify_sms)}
              disabled={savingId === coach.id}
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium transition-colors py-1',
                coach.notify_sms ? 'text-green-600' : 'text-gray-400'
              )}
            >
              {coach.notify_sms ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
              SMS {coach.notify_sms ? 'On' : 'Off'}
            </button>
            <button
              onClick={() => handleToggleNotification(coach.id, 'notify_discord', coach.notify_discord)}
              disabled={savingId === coach.id}
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium transition-colors py-1',
                coach.notify_discord ? 'text-green-600' : 'text-gray-400'
              )}
            >
              {coach.notify_discord ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
              Discord {coach.notify_discord ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================
// Settings Tab
// ============================================

function SettingsTab() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      const data = await res.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={fetchStats} className="btn-secondary text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    )
  }

  const supabaseProjectId = 'thfoinlxdkgdyasuclcr'

  return (
    <div className="space-y-4">
      {/* System Info */}
      <div className="card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">System Info</h2>
        <div className="space-y-2">
          <InfoRow label="Supabase Project" value={supabaseProjectId} mono />
          <InfoRow
            label="Leads"
            value={stats?.leads_count?.toLocaleString() ?? '0'}
          />
          <InfoRow
            label="Applications"
            value={stats?.applications_count?.toLocaleString() ?? '0'}
          />
          <InfoRow
            label="Sessions"
            value={stats?.sessions_count?.toLocaleString() ?? '0'}
          />
          <InfoRow
            label="Last Briefing"
            value={
              stats?.last_briefing_at
                ? new Date(stats.last_briefing_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'Never'
            }
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Quick Links</h2>
        <div className="space-y-2">
          <ExternalLinkRow
            label="Supabase Dashboard"
            href={`https://supabase.com/dashboard/project/${supabaseProjectId}`}
          />
          <ExternalLinkRow
            label="Vercel Dashboard"
            href="https://vercel.com/redbird-automations-projects/108-lead-intel"
          />
          <ExternalLinkRow
            label="GoHighLevel"
            href="https://app.gohighlevel.com"
          />
        </div>
      </div>

      {/* Briefing Triggers */}
      <BriefingActions />

      {/* Refresh */}
      <button onClick={fetchStats} className="btn-secondary text-xs w-full">
        <RefreshCw className="h-3.5 w-3.5" />
        Refresh Stats
      </button>
    </div>
  )
}

function BriefingActions() {
  const [generating, setGenerating] = useState(false)
  const [delivering, setDelivering] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleGenerate = async () => {
    setGenerating(true)
    setMessage(null)
    try {
      const res = await fetch('/api/briefings/generate', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to generate briefings')
      const data = await res.json()
      setMessage(`Generated ${data.count ?? ''} briefing(s)`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error generating briefings')
    } finally {
      setGenerating(false)
    }
  }

  const handleDeliver = async () => {
    setDelivering(true)
    setMessage(null)
    try {
      const res = await fetch('/api/briefings/deliver', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to deliver briefings')
      const data = await res.json()
      setMessage(`Delivered ${data.count ?? ''} briefing(s)`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error delivering briefings')
    } finally {
      setDelivering(false)
    }
  }

  return (
    <div className="card p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-900">Daily Briefings</h2>
      <p className="text-xs text-gray-500">Manually trigger briefing generation and delivery for today.</p>
      <div className="flex gap-3">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn-secondary flex-1 text-xs"
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {generating ? 'Generating...' : 'Generate Briefings'}
        </button>
        <button
          onClick={handleDeliver}
          disabled={delivering}
          className="btn-primary flex-1 text-xs"
        >
          {delivering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {delivering ? 'Delivering...' : 'Deliver Briefings'}
        </button>
      </div>
      {message && (
        <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{message}</p>
      )}
    </div>
  )
}

// ============================================
// Shared Components
// ============================================

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={cn('text-sm text-gray-900', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  )
}

function ExternalLinkRow({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between py-2 px-1 -mx-1 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
      <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-brand-500 transition-colors" />
    </a>
  )
}

// ============================================
// useAdminUsers hook
// ============================================

function useAdminUsers(roleFilter?: string) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = roleFilter
        ? `/api/admin/users?role=${roleFilter}`
        : '/api/admin/users'
      const res = await fetch(url)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to fetch users')
      }
      const data = await res.json()
      setUsers(data.users)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [roleFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const updateUser = async (userId: string, updates: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, ...updates }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error('Update failed:', body.error)
        return false
      }

      const data = await res.json()
      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...data.user } : u))
      )
      return true
    } catch (err) {
      console.error('Update error:', err)
      return false
    }
  }

  return { users, loading, error, refresh: fetchUsers, updateUser }
}
