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
  ChevronRight,
  Filter,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/useUser'
import { Logo } from '@/components/Logo'
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
  { href: '/', label: 'Leads', roles: ['sales', 'coordinator', 'manager', 'admin'], icon: <Phone className="h-4 w-4" /> },
  { href: '/applications', label: 'Applications', roles: ['coordinator', 'manager', 'admin'], icon: <ClipboardCheck className="h-4 w-4" /> },
  { href: '/schedule', label: 'Schedule', roles: ['coordinator', 'coach', 'manager', 'admin'], icon: <Calendar className="h-4 w-4" /> },
  { href: '/sessions', label: 'Sessions', roles: ['coach', 'manager', 'admin'], icon: <PenLine className="h-4 w-4" /> },
  { href: '/analytics', label: 'Analytics', roles: ['admin'], icon: <BarChart3 className="h-4 w-4" /> },
  { href: '/admin', label: 'Admin', roles: ['admin'], icon: <Settings className="h-4 w-4" /> },
]

// ─── Queue Pills Config ─────────────────────────────────

const QUEUE_PILLS: { key: LeadQueue | 'all'; label: string; dotClass: string; activeClass: string }[] = [
  { key: 'call_now', label: 'Call Now', dotClass: 'bg-red-400', activeClass: 'bg-red-500/15 text-red-300 border-red-500/30' },
  { key: 'follow_up', label: 'Today', dotClass: 'bg-amber-400', activeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { key: 'nurture', label: 'Nurture', dotClass: 'bg-steel-400', activeClass: 'bg-white/5 text-steel-300 border-steel-500/30' },
  { key: 'all', label: 'All Leads', dotClass: 'bg-steel-500', activeClass: 'bg-white/5 text-steel-300 border-steel-500/30' },
]

// ─── Types ──────────────────────────────────────────────

interface SidebarProps {
  queueCounts?: Record<LeadQueue | 'all', number>
}

// ─── Sidebar Content ────────────────────────────────────

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
    <div className="flex h-full flex-col bg-navy-500">
      {/* Logo header */}
      <div className="flex h-14 items-center border-b border-white/10 px-4">
        <Logo variant="light" size="sm" showLabel={sidebarOpen} />
      </div>

      {/* Nav Links */}
      <nav className="mt-3 space-y-0.5 px-2">
        {visibleNav.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarDrawerOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-steel-300 hover:bg-white/5 hover:text-white'
              )}
            >
              <span className={cn('shrink-0', isActive ? 'text-white' : 'text-steel-400')}>
                {item.icon}
              </span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Queue Pills (only on leads page) */}
      {isLeadsPage && sidebarOpen && (
        <div className="mt-4 border-t border-white/10 px-3 pt-4">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-steel-400">
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
                    'flex w-full items-center gap-2.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer',
                    isActive
                      ? pill.activeClass
                      : 'border-transparent text-steel-400 hover:bg-white/5 hover:text-steel-300'
                  )}
                >
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', pill.dotClass)} />
                  <span className="flex-1 text-left">{pill.label}</span>
                  <span
                    className={cn(
                      'min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-center text-xs font-semibold',
                      isActive ? 'bg-white/10 text-inherit' : 'bg-white/5 text-steel-500'
                    )}
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
        <div className="mt-2 border-t border-white/10 px-3 pt-3">
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="flex w-full items-center gap-2 px-1 py-1 text-xs font-semibold uppercase tracking-widest text-steel-400 hover:text-steel-300 cursor-pointer"
          >
            <Filter className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Filters</span>
            {filtersExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>

          {filtersExpanded && (
            <div className="mt-2 space-y-2.5">
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
                  className="w-full text-xs text-steel-500 hover:text-steel-300 py-1 cursor-pointer"
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
      <div className="border-t border-white/10 p-3 space-y-1">
        {/* User Info */}
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
            {initials}
          </div>
          {sidebarOpen && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user?.name ?? 'User'}</p>
              <p className="truncate text-xs text-steel-400 capitalize">{userRole}</p>
            </div>
          )}
        </div>

        {/* Collapse Toggle (desktop only) */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-steel-400 hover:bg-white/5 hover:text-steel-300 cursor-pointer"
        >
          {sidebarOpen ? (
            <>
              <ChevronsLeft className="h-4 w-4 shrink-0" />
              <span>Collapse</span>
            </>
          ) : (
            <ChevronsRight className="h-4 w-4 shrink-0" />
          )}
        </button>

        {/* Sign Out */}
        <button
          onClick={signOut}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-steel-400 hover:bg-white/5 hover:text-steel-300 cursor-pointer',
            !sidebarOpen && 'justify-center'
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {sidebarOpen && <span>Sign out</span>}
        </button>
      </div>
    </div>
  )
}

// ─── Filter Select Helper ───────────────────────────────

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
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-steel-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-steel-200 focus:border-white/25 focus:outline-none focus:ring-1 focus:ring-white/10"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-navy-500 text-white">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// ─── Main Export ─────────────────────────────────────────

export default function Sidebar({ queueCounts }: SidebarProps) {
  const {
    state: { sidebarOpen, sidebarDrawerOpen },
    setSidebarDrawerOpen,
  } = useDashboard()

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col fixed left-0 top-0 h-screen bg-navy-500 z-40 transition-[width] duration-200 ease-in-out overflow-hidden',
          sidebarOpen ? 'w-[260px]' : 'w-16'
        )}
      >
        <SidebarContent queueCounts={queueCounts} />
      </aside>

      {/* Mobile Drawer */}
      {sidebarDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarDrawerOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative h-full w-[280px] bg-navy-500 shadow-2xl animate-slide-in-left overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setSidebarDrawerOpen(false)}
              className="absolute right-3 top-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-steel-400 hover:bg-white/10 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent queueCounts={queueCounts} />
          </aside>
        </div>
      )}
    </>
  )
}
