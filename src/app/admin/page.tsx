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
import type { User, UserRole, CoachTier } from '@/types'
import { cn } from '@/lib/utils'

type AdminTab = 'users' | 'coaches' | 'settings'

const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
  { key: 'users', label: 'Users', icon: <Users size={16} strokeWidth={1.75} /> },
  { key: 'coaches', label: 'Coaches', icon: <Dumbbell size={16} strokeWidth={1.75} /> },
  { key: 'settings', label: 'Settings', icon: <Settings size={16} strokeWidth={1.75} /> },
]

const ROLE_OPTIONS: UserRole[] = ['sales', 'coordinator', 'coach', 'manager', 'admin']
const TIER_OPTIONS: CoachTier[] = ['S1', 'S2', 'J1']

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  coordinator: 'bg-teal-100 text-teal-700',
  coach: 'bg-amber-100 text-amber-700',
  sales: 'bg-emerald-100 text-emerald-700',
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
        <div>
          {/* Header */}
          <div className="page-header">
            <div className="page-header-inner">
              <div className="flex items-center gap-3 mb-3">
                <Settings size={20} strokeWidth={1.75} style={{ color: 'var(--accent-blue)' }} />
                <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Admin</h1>
              </div>
              {/* Tab bar */}
              <div className="flex gap-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ease-apple border-b-2 cursor-pointer',
                      activeTab === tab.key
                        ? 'border-current'
                        : 'border-transparent'
                    )}
                    style={
                      activeTab === tab.key
                        ? { color: 'var(--accent-blue)', background: 'color-mix(in srgb, var(--accent-blue) 8%, transparent)' }
                        : { color: 'var(--text-placeholder)' }
                    }
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tab content */}
          <div className="content-area py-6 pb-24 animate-fade-in">
            <div className="card-list-wide">
              {activeTab === 'users' && <UsersTab />}
              {activeTab === 'coaches' && <CoachesTab />}
              {activeTab === 'settings' && <SettingsTab />}
            </div>
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
      <div className="flex items-center justify-center py-20 animate-fade-in">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 animate-fade-in">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)' }}
        >
          <AlertCircle size={24} strokeWidth={1.75} style={{ color: 'var(--color-danger)' }} />
        </div>
        <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
        <button onClick={refresh} className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer">
          <RefreshCw size={14} strokeWidth={1.75} />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm tabular-nums" style={{ color: 'var(--text-tertiary)' }}>{users.length} user{users.length !== 1 ? 's' : ''}</p>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 text-xs font-medium transition-colors duration-200 ease-apple cursor-pointer"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <RefreshCw size={14} strokeWidth={1.75} />
          Refresh
        </button>
      </div>

      {users.map((user) => (
        <div key={user.id} className="card p-4">
          <div className="flex items-center justify-between gap-3">
            {/* User info */}
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{user.email}</p>
            </div>

            {/* Role selector */}
            <div className="flex items-center gap-2">
              {savingId === user.id ? (
                <Loader2 size={16} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
              ) : saveSuccess === user.id ? (
                <Check size={16} strokeWidth={1.75} className="text-emerald-500 animate-scale-in" />
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
                <ChevronDown size={12} strokeWidth={1.75} className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
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
      <div className="flex items-center justify-center py-20 animate-fade-in">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 animate-fade-in">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)' }}
        >
          <AlertCircle size={24} strokeWidth={1.75} style={{ color: 'var(--color-danger)' }} />
        </div>
        <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
        <button onClick={refresh} className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer">
          <RefreshCw size={14} strokeWidth={1.75} />
          Retry
        </button>
      </div>
    )
  }

  if (coaches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 animate-fade-in">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: 'var(--bg-secondary)' }}
        >
          <Dumbbell size={24} strokeWidth={1.75} style={{ color: 'var(--text-placeholder)' }} />
        </div>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No coaches found</p>
        <p className="text-xs" style={{ color: 'var(--text-placeholder)' }}>Assign a user the &quot;coach&quot; role in the Users tab first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm tabular-nums" style={{ color: 'var(--text-tertiary)' }}>{coaches.length} coach{coaches.length !== 1 ? 'es' : ''}</p>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 text-xs font-medium transition-colors duration-200 ease-apple cursor-pointer"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <RefreshCw size={14} strokeWidth={1.75} />
          Refresh
        </button>
      </div>

      {coaches.map((coach) => (
        <div key={coach.id} className="card p-4 space-y-3">
          {/* Name + tier row */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{coach.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{coach.email}</p>
            </div>

            <div className="flex items-center gap-2">
              {savingId === coach.id ? (
                <Loader2 size={16} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
              ) : saveSuccess === coach.id ? (
                <Check size={16} strokeWidth={1.75} className="text-emerald-500 animate-scale-in" />
              ) : null}

              <div className="relative">
                <select
                  value={coach.coach_tier || ''}
                  onChange={(e) => handleTierChange(coach.id, e.target.value as CoachTier)}
                  disabled={savingId === coach.id}
                  className={cn(
                    'badge appearance-none pr-6 cursor-pointer border-0 text-xs',
                    coach.coach_tier ? TIER_COLORS[coach.coach_tier] : ''
                  )}
                  style={!coach.coach_tier ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : undefined}
                >
                  <option value="" disabled>Tier</option>
                  {TIER_OPTIONS.map((tier) => (
                    <option key={tier} value={tier}>{tier}</option>
                  ))}
                </select>
                <ChevronDown size={12} strokeWidth={1.75} className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
              </div>
            </div>
          </div>

          {/* Disciplines */}
          {coach.disciplines && coach.disciplines.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {coach.disciplines.map((d) => (
                <span
                  key={d}
                  className="badge text-xs"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-blue) 12%, transparent)',
                    color: 'var(--accent-blue)',
                  }}
                >
                  {d}
                </span>
              ))}
            </div>
          )}

          {/* Notification toggles */}
          <div className="flex items-center gap-4 pt-2" style={{ borderTop: '1px solid var(--border-light)' }}>
            <button
              onClick={() => handleToggleNotification(coach.id, 'notify_sms', coach.notify_sms)}
              disabled={savingId === coach.id}
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium transition-colors duration-200 ease-apple py-2 px-2 rounded-md cursor-pointer',
                coach.notify_sms ? 'text-emerald-600' : ''
              )}
              style={!coach.notify_sms ? { color: 'var(--text-placeholder)' } : undefined}
            >
              {coach.notify_sms ? <Bell size={14} strokeWidth={1.75} /> : <BellOff size={14} strokeWidth={1.75} />}
              SMS {coach.notify_sms ? 'On' : 'Off'}
            </button>
            <button
              onClick={() => handleToggleNotification(coach.id, 'notify_discord', coach.notify_discord)}
              disabled={savingId === coach.id}
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium transition-colors duration-200 ease-apple py-2 px-2 rounded-md cursor-pointer',
                coach.notify_discord ? 'text-emerald-600' : ''
              )}
              style={!coach.notify_discord ? { color: 'var(--text-placeholder)' } : undefined}
            >
              {coach.notify_discord ? <Bell size={14} strokeWidth={1.75} /> : <BellOff size={14} strokeWidth={1.75} />}
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
      <div className="flex items-center justify-center py-20 animate-fade-in">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 animate-fade-in">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)' }}
        >
          <AlertCircle size={24} strokeWidth={1.75} style={{ color: 'var(--color-danger)' }} />
        </div>
        <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
        <button onClick={fetchStats} className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer">
          <RefreshCw size={14} strokeWidth={1.75} />
          Retry
        </button>
      </div>
    )
  }

  const supabaseProjectId = 'thfoinlxdkgdyasuclcr'

  return (
    <div className="space-y-4 animate-fade-in">
      {/* System Info */}
      <div className="card p-4 space-y-3">
        <h2 className="section-label">System Info</h2>
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
        <h2 className="section-label">Quick Links</h2>
        <div className="space-y-1">
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

      {/* Refresh */}
      <button
        onClick={fetchStats}
        className="btn-secondary text-xs w-full flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <RefreshCw size={14} strokeWidth={1.75} />
        Refresh Stats
      </button>
    </div>
  )
}

// ============================================
// Shared Components
// ============================================

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 last:border-0" style={{ borderBottom: '1px solid var(--border-light)' }}>
      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span className={cn('text-sm tabular-nums', mono && 'font-mono text-xs')} style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

function ExternalLinkRow({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between py-2 px-2 -mx-1 rounded-lg transition-colors duration-200 ease-apple group"
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span className="text-sm transition-colors duration-200 ease-apple" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <ExternalLink size={14} strokeWidth={1.75} style={{ color: 'var(--text-placeholder)' }} />
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
