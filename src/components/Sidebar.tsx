'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Phone,
  ClipboardCheck,
  Calendar,
  PenLine,
  BarChart3,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  ChevronDown,
  Filter,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/useUser'
import { useDashboard } from '@/contexts/DashboardContext'
import type { LeadQueue, UserRole } from '@/types'

// ─── Nav Items ───────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles: UserRole[]
}

const navItems: NavItem[] = [
  { href: '/', label: 'Leads', roles: ['sales', 'coordinator', 'manager', 'admin'], icon: <Phone size={20} strokeWidth={1.75} /> },
  { href: '/applications', label: 'Applications', roles: ['coordinator', 'manager', 'admin'], icon: <ClipboardCheck size={20} strokeWidth={1.75} /> },
  { href: '/schedule', label: 'Schedule', roles: ['coordinator', 'coach', 'manager', 'admin'], icon: <Calendar size={20} strokeWidth={1.75} /> },
  { href: '/sessions', label: 'Sessions', roles: ['coach', 'manager', 'admin'], icon: <PenLine size={20} strokeWidth={1.75} /> },
  { href: '/analytics', label: 'Analytics', roles: ['admin'], icon: <BarChart3 size={20} strokeWidth={1.75} /> },
  { href: '/admin', label: 'Admin', roles: ['admin'], icon: <Settings size={20} strokeWidth={1.75} /> },
]

// ─── Queue Pills Config ──────────────────────────────────

const QUEUE_PILLS: { key: LeadQueue | 'all'; label: string; dotClass: string }[] = [
  { key: 'call_now', label: 'Call Now', dotClass: 'status-dot-danger' },
  { key: 'follow_up', label: 'Today', dotClass: 'status-dot-warning' },
  { key: 'nurture', label: 'Nurture', dotClass: 'status-dot-neutral' },
  { key: 'all', label: 'All Leads', dotClass: 'status-dot-neutral' },
]

// ─── Types ───────────────────────────────────────────────

interface SidebarProps {
  queueCounts?: Record<LeadQueue | 'all', number>
}

// ─── Sidebar Content ─────────────────────────────────────

function SidebarContent({ queueCounts }: SidebarProps) {
  const pathname = usePathname()
  const { user, signOut } = useUser()
  const {
    state: { sidebarOpen, activeTab, filtersExpanded, filters },
    setActiveTab,
    setFiltersExpanded,
    setFilter,
    resetFilters,
    setSidebarDrawerOpen,
    toggleSidebar,
  } = useDashboard()

  const userRole = user?.role ?? 'sales'
  const isLeadsPage = pathname === '/'
  const visibleNav = navItems.filter((item) => item.roles.includes(userRole))
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-4">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-[10px] font-extrabold shadow-sm"
          style={{ background: 'var(--accent-blue)', color: '#FFFFFF' }}
        >
          108
        </div>
        {sidebarOpen && (
          <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--sidebar-text)' }}>
            OPS HUB
          </span>
        )}
      </div>

      {/* Nav Links */}
      <nav className="mt-3 space-y-0.5 px-3">
        {/* Section label */}
        {sidebarOpen && (
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--sidebar-text-muted)' }}>
            Navigation
          </p>
        )}
        {visibleNav.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarDrawerOpen(false)}
              className={cn(
                'group relative flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm font-medium transition-all duration-150 ease-apple',
              )}
              style={isActive
                ? { background: 'var(--accent-blue-tint)', color: 'var(--sidebar-text)' }
                : { color: 'var(--sidebar-text-muted)' }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--sidebar-hover)'
                  e.currentTarget.style.color = 'var(--sidebar-text)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--sidebar-text-muted)'
                }
              }}
            >
              {/* Blue active indicator bar */}
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{ background: 'var(--sidebar-active-indicator)' }}
                />
              )}
              <span className="shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Queue Pills (only on leads page) */}
      {isLeadsPage && sidebarOpen && (
        <div className="mt-4 px-3 pt-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--sidebar-text-muted)' }}>
            Queue
          </p>
          <div className="space-y-1">
            {QUEUE_PILLS.map((pill) => {
              const isActive = activeTab === pill.key
              const count = queueCounts?.[pill.key] ?? 0
              return (
                <button
                  key={pill.key}
                  onClick={() => setActiveTab(pill.key)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm font-medium transition-all duration-150 ease-apple cursor-pointer',
                  )}
                  style={isActive
                    ? { background: 'rgba(255, 255, 255, 0.1)', color: 'var(--sidebar-text)' }
                    : { color: 'var(--sidebar-text-muted)' }
                  }
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--sidebar-hover)'
                      e.currentTarget.style.color = 'var(--sidebar-text)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--sidebar-text-muted)'
                    }
                  }}
                >
                  <span className={cn('status-dot', pill.dotClass)} />
                  <span className="flex-1 text-left">{pill.label}</span>
                  <span
                    className="min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: isActive ? 'var(--sidebar-text)' : 'var(--sidebar-text-muted)',
                    }}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Collapsible Filters (only on leads page) */}
      {isLeadsPage && sidebarOpen && (
        <div className="mt-2 px-3 pt-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="flex w-full items-center gap-2 px-1 py-1 text-[11px] font-semibold uppercase tracking-widest hover:opacity-70 transition-opacity cursor-pointer"
            style={{ color: 'var(--sidebar-text-muted)' }}
          >
            <Filter size={14} strokeWidth={1.75} />
            <span className="flex-1 text-left">Filters</span>
            <ChevronDown className={cn(
              'h-3.5 w-3.5 transition-transform duration-200',
              !filtersExpanded && '-rotate-90'
            )} />
          </button>

          {filtersExpanded && (
            <div className="mt-2 space-y-2.5 animate-fade-in">
              <FilterSelect
                label="Channel"
                value={filters.channel}
                onChange={(v) => setFilter('channel', v)}
                options={[
                  { value: 'all', label: 'All Channels' },
                  { value: 'web_form', label: 'Web Form' },
                  { value: 'facebook', label: 'Facebook' },
                  { value: 'instagram', label: 'Instagram' },
                  { value: 'google', label: 'Google' },
                  { value: 'phone', label: 'Phone' },
                  { value: 'referral', label: 'Referral' },
                  { value: 'walk_in', label: 'Walk-in' },
                  { value: 'email', label: 'Email' },
                  { value: 'text', label: 'Text' },
                  { value: 'other', label: 'Other' },
                ]}
              />
              <FilterSelect
                label="Service"
                value={filters.serviceMatch}
                onChange={(v) => setFilter('serviceMatch', v)}
                options={[
                  { value: 'all', label: 'All Services' },
                  { value: '108_experience', label: '108 Experience' },
                  { value: 'tri_star', label: 'Tri-Star' },
                  { value: 'virtual', label: 'Virtual' },
                  { value: 'virtual_pro', label: 'Virtual Pro' },
                  { value: 'college_prep', label: 'College Prep' },
                  { value: 'draft_prep', label: 'Draft Prep' },
                  { value: 'pro_experience', label: 'Pro Experience' },
                  { value: 'coaches_experience', label: 'Coaches Experience' },
                  { value: 'coaches_mentorship', label: 'Coaches Mentorship' },
                  { value: 'tour_experience', label: 'Tour Experience' },
                  { value: 'powered_by_108', label: 'Powered by 108' },
                  { value: 'partnership', label: 'Partnership' },
                  { value: 'performance_institute', label: 'Performance Institute' },
                ]}
              />
              <FilterSelect
                label="Time"
                value={filters.timeRange}
                onChange={(v) => setFilter('timeRange', v)}
                options={[
                  { value: 'all', label: 'All Time' },
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'This Week' },
                  { value: 'month', label: 'This Month' },
                ]}
              />
              {(filters.channel !== 'all' || filters.serviceMatch !== 'all' || filters.timeRange !== 'all') && (
                <button
                  onClick={resetFilters}
                  className="w-full text-xs py-1 transition-colors cursor-pointer"
                  style={{ color: 'var(--sidebar-text-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--sidebar-text-muted)' }}
                >
                  Reset filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* User Section */}
      <div className="p-3 space-y-0.5" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        {/* User Info */}
        <div className="flex items-center gap-2.5 rounded-sm px-2 py-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-sm"
            style={{ background: 'var(--accent-blue)', color: '#FFFFFF' }}
          >
            {initials}
          </div>
          {sidebarOpen && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" style={{ color: 'var(--sidebar-text)' }}>{user?.name ?? 'User'}</p>
              <p className="truncate text-xs capitalize" style={{ color: 'var(--sidebar-text-muted)' }}>{userRole}</p>
            </div>
          )}
        </div>

        {/* Collapse Toggle (desktop only) */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-all duration-150 ease-apple cursor-pointer"
          style={{ color: 'var(--sidebar-text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--sidebar-hover)'
            e.currentTarget.style.color = 'var(--sidebar-text)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--sidebar-text-muted)'
          }}
        >
          {sidebarOpen ? (
            <>
              <ChevronsLeft size={16} strokeWidth={1.75} />
              <span>Collapse</span>
            </>
          ) : (
            <ChevronsRight size={16} strokeWidth={1.75} />
          )}
        </button>

        {/* Sign Out */}
        <button
          onClick={signOut}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-all duration-150 ease-apple cursor-pointer',
            !sidebarOpen && 'justify-center'
          )}
          style={{ color: 'var(--sidebar-text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(229, 72, 77, 0.1)'
            e.currentTarget.style.color = 'var(--color-danger)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--sidebar-text-muted)'
          }}
        >
          <LogOut size={16} strokeWidth={1.75} />
          {sidebarOpen && <span>Sign out</span>}
        </button>
      </div>
    </div>
  )
}

// ─── Filter Select Helper ────────────────────────────────

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--sidebar-text-muted)' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-sm px-2.5 py-1.5 text-xs outline-none transition-all duration-200 ease-apple"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          color: 'var(--sidebar-text)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ background: '#1C1C1E', color: '#F5F5F7' }}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────

export default function Sidebar({ queueCounts }: SidebarProps) {
  const {
    state: { sidebarOpen, sidebarDrawerOpen },
    setSidebarDrawerOpen,
  } = useDashboard()

  return (
    <>
      {/* Desktop Sidebar — BLACK background, no border */}
      <aside
        className={cn(
          'hidden md:flex flex-col fixed left-0 top-0 h-screen z-40 transition-[width] duration-200 ease-apple overflow-hidden',
          sidebarOpen ? 'w-[260px]' : 'w-16'
        )}
        style={{ background: 'var(--sidebar-bg)' }}
      >
        <SidebarContent queueCounts={queueCounts} />
      </aside>

      {/* Mobile Drawer */}
      {sidebarDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="backdrop animate-fade-in"
            onClick={() => setSidebarDrawerOpen(false)}
          />
          {/* Drawer */}
          <aside
            className="relative h-full w-[280px] shadow-lg animate-slide-in-left overflow-y-auto scrollbar-thin"
            style={{ background: 'var(--sidebar-bg)' }}
          >
            {/* Close button */}
            <button
              onClick={() => setSidebarDrawerOpen(false)}
              className="absolute right-3 top-3.5 z-10 p-2 rounded-sm transition-all duration-150 ease-apple cursor-pointer"
              style={{ color: 'var(--sidebar-text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--sidebar-text)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--sidebar-text-muted)' }}
            >
              <X size={16} strokeWidth={1.75} />
            </button>
            <SidebarContent queueCounts={queueCounts} />
          </aside>
        </div>
      )}
    </>
  )
}
