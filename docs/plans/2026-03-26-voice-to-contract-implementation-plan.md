# Voice-to-Contract Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Ops Hub side of the voice-to-contract pipeline: database schema, TypeScript types, API endpoints, deals page, and integration hooks.

**Architecture:** New `deals` + `packages` tables in Supabase, a `/deals` page with filtered list view, a `useDeals` hook with Realtime, a `/api/deals/capture` endpoint for PWA voice capture, a `/api/webhook/deal-status` endpoint for n8n callbacks, and integration points in LeadDetailPanel and LeadCard.

**Tech Stack:** Next.js 15, React 19, TypeScript, Supabase (PostgreSQL + Realtime), Tailwind CSS, lucide-react icons, date-fns

---

## Task 1: Database Migration — `deals` and `packages` Tables

**Files:**
- Create: `supabase/migrations/007_create_deals_and_packages.sql`

**Step 1: Write the migration**

```sql
-- ============================================
-- 007: Deals and Packages tables for voice-to-contract pipeline
-- ============================================

-- Packages reference table (seed data for all 108 offerings)
CREATE TABLE IF NOT EXISTS public.packages (
  code TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  category TEXT CHECK (category IN ('athlete', 'coach', 'academy', 'other')),
  price_cents_monthly INTEGER,
  price_cents_annual INTEGER,
  price_cents_one_time INTEGER,
  duration_days INTEGER,
  requires_experience_scheduling BOOLEAN DEFAULT false,
  requires_simple_booking BOOLEAN DEFAULT false,
  requires_parent_signature_if_minor BOOLEAN DEFAULT true,
  skill_focus_default TEXT,
  ghl_workflow_id TEXT,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed package data
INSERT INTO public.packages (code, display_name, category, price_cents_monthly, price_cents_annual, price_cents_one_time, duration_days, requires_experience_scheduling, description) VALUES
  ('108_experience', '108 Experience', 'athlete', NULL, NULL, 250000, 3, true, '2-5 day fly-in intensive'),
  ('tri_star', 'Tri Star', 'athlete', 49900, 550000, NULL, NULL, false, 'Unlimited local training'),
  ('virtual', 'Virtual Experience', 'athlete', 55000, 600000, NULL, NULL, false, 'Remote coaching'),
  ('virtual_pro', 'Virtual Pro', 'athlete', 100000, 1000000, NULL, NULL, false, 'Remote + quarterly in-person'),
  ('college_prep', 'College Prep', 'athlete', 125000, 1350000, NULL, NULL, false, 'Training + recruiting'),
  ('draft_prep', 'Draft Prep', 'athlete', 150000, 1500000, NULL, NULL, false, 'Training + draft strategy'),
  ('pro_experience', 'Pro Experience', 'athlete', NULL, NULL, NULL, NULL, false, 'Custom pro training'),
  ('tour_experience', 'Tour Experience', 'athlete', NULL, NULL, 50000, 2, false, '2-day camp'),
  ('coaches_experience', 'Coaches Experience', 'coach', NULL, NULL, 50000, NULL, false, 'Shadow the method'),
  ('coaches_mentorship', 'Coaches Mentorship', 'coach', 50000, NULL, NULL, NULL, false, 'Ongoing coach development'),
  ('powered_by_108', 'Powered by 108', 'coach', NULL, 2000000, NULL, NULL, false, 'Full facility partnership'),
  ('performance_institute', 'Performance Institute', 'academy', NULL, NULL, NULL, NULL, false, 'Full-time academy'),
  ('partnership', 'Partnership', 'other', NULL, NULL, NULL, NULL, false, 'Business partnerships')
ON CONFLICT (code) DO NOTHING;

-- Deals table
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES public.leads(id),
  staff_id UUID REFERENCES public.users(id),

  -- Athlete info (parsed from voice memo)
  athlete_name TEXT NOT NULL,
  athlete_phone TEXT,
  athlete_email TEXT,
  athlete_level TEXT CHECK (athlete_level IN ('youth', 'middle_school', 'high_school', 'college', 'pro')),
  athlete_age INTEGER,
  sport TEXT DEFAULT 'baseball',
  skill_focus TEXT,

  -- Package details
  package TEXT NOT NULL REFERENCES public.packages(code),
  billing_frequency TEXT CHECK (billing_frequency IN ('monthly', 'annual', 'one_time', 'custom')),
  price_cents INTEGER NOT NULL,

  -- Deal lifecycle
  status TEXT NOT NULL DEFAULT 'pending_confirmation' CHECK (status IN (
    'pending_confirmation',
    'confirmed',
    'contract_sent',
    'contract_signed',
    'payment_sent',
    'payment_complete',
    'scheduling',
    'complete',
    'expired',
    'canceled',
    'payment_failed',
    'delivery_failed',
    'ghl_failed'
  )),

  -- Integration IDs
  ghl_contact_id TEXT,
  ghl_contract_id TEXT,
  ghl_payment_id TEXT,

  -- AI parsing metadata
  raw_transcript TEXT,
  parsed_data JSONB,
  ai_confidence REAL,
  is_deal BOOLEAN DEFAULT true,

  -- SMS conversation state
  sms_conversation_id TEXT,
  confirmation_sent_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Scheduling
  preferred_start TEXT,
  preferred_schedule TEXT,
  experience_id UUID REFERENCES public.experiences(id),

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deals_staff_status ON public.deals(staff_id, status);
CREATE INDEX IF NOT EXISTS idx_deals_lead ON public.deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_deals_created ON public.deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_phone ON public.deals(athlete_phone);
CREATE INDEX IF NOT EXISTS idx_deals_expires ON public.deals(expires_at) WHERE status = 'contract_sent';

-- Dedup: prevent duplicate active deals for same athlete + package
CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_dedup
  ON public.deals(athlete_phone, package)
  WHERE status NOT IN ('canceled', 'expired', 'complete');

-- Updated_at trigger
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read packages"
  ON public.packages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role full access to packages"
  ON public.packages FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage deals"
  ON public.deals FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to deals"
  ON public.deals FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;
```

**Step 2: Verify migration file is valid SQL**

Run: `cat supabase/migrations/007_create_deals_and_packages.sql | head -5`
Expected: First lines of the migration visible

**Step 3: Commit**

```bash
git add supabase/migrations/007_create_deals_and_packages.sql
git commit -m "feat: add deals and packages tables migration"
```

---

## Task 2: TypeScript Types — Deal, Package, DealStatus

**Files:**
- Modify: `src/types/index.ts` (append after existing types)

**Step 1: Add Deal types to the end of `src/types/index.ts`**

Append the following after the last existing type/interface in the file:

```typescript
// ============================================
// Deals — Voice-to-Contract Pipeline
// ============================================

export type DealStatus =
  | 'pending_confirmation'
  | 'confirmed'
  | 'contract_sent'
  | 'contract_signed'
  | 'payment_sent'
  | 'payment_complete'
  | 'scheduling'
  | 'complete'
  | 'expired'
  | 'canceled'
  | 'payment_failed'
  | 'delivery_failed'
  | 'ghl_failed'

export type BillingFrequency = 'monthly' | 'annual' | 'one_time' | 'custom'

export type PackageCategory = 'athlete' | 'coach' | 'academy' | 'other'

export interface Package {
  code: ServiceMatch
  display_name: string
  category: PackageCategory
  price_cents_monthly: number | null
  price_cents_annual: number | null
  price_cents_one_time: number | null
  duration_days: number | null
  requires_experience_scheduling: boolean
  requires_simple_booking: boolean
  requires_parent_signature_if_minor: boolean
  skill_focus_default: string | null
  ghl_workflow_id: string | null
  description: string | null
  active: boolean
}

export interface Deal {
  id: string
  lead_id: string | null
  staff_id: string
  athlete_name: string
  athlete_phone: string | null
  athlete_email: string | null
  athlete_level: AthleteLevel | null
  athlete_age: number | null
  sport: string
  skill_focus: string | null
  package: ServiceMatch
  billing_frequency: BillingFrequency
  price_cents: number
  status: DealStatus
  ghl_contact_id: string | null
  ghl_contract_id: string | null
  ghl_payment_id: string | null
  raw_transcript: string | null
  parsed_data: Record<string, unknown> | null
  ai_confidence: number | null
  is_deal: boolean
  sms_conversation_id: string | null
  confirmation_sent_at: string | null
  confirmed_at: string | null
  expires_at: string | null
  preferred_start: string | null
  preferred_schedule: string | null
  experience_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined fields
  staff?: User
  lead?: Lead
}

export interface DealFilters {
  status: DealStatus | 'all'
  staff_id: string | null
  search: string
  dateRange: { start: string; end: string } | null
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit src/types/index.ts 2>&1 | head -20`
Expected: No errors (or only pre-existing errors unrelated to deals)

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add Deal, Package, and DealStatus types"
```

---

## Task 3: Utility Functions — Deal Status Labels and Colors

**Files:**
- Modify: `src/lib/utils.ts` (append new functions)

**Step 1: Add deal utility functions to the end of `src/lib/utils.ts`**

Append:

```typescript
// ============================================
// Deal utilities
// ============================================

export function getDealStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_confirmation: 'Pending',
    confirmed: 'Confirmed',
    contract_sent: 'Contract Sent',
    contract_signed: 'Signed',
    payment_sent: 'Payment Sent',
    payment_complete: 'Paid',
    scheduling: 'Scheduling',
    complete: 'Complete',
    expired: 'Expired',
    canceled: 'Canceled',
    payment_failed: 'Payment Failed',
    delivery_failed: 'Delivery Failed',
    ghl_failed: 'GHL Error',
  }
  return labels[status] || status
}

export function getDealStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending_confirmation: 'bg-gray-500/20 text-gray-300',
    confirmed: 'bg-blue-500/20 text-blue-300',
    contract_sent: 'bg-indigo-500/20 text-indigo-300',
    contract_signed: 'bg-purple-500/20 text-purple-300',
    payment_sent: 'bg-amber-500/20 text-amber-300',
    payment_complete: 'bg-emerald-500/20 text-emerald-300',
    scheduling: 'bg-cyan-500/20 text-cyan-300',
    complete: 'bg-green-500/20 text-green-300',
    expired: 'bg-red-500/20 text-red-300',
    canceled: 'bg-red-500/20 text-red-300',
    payment_failed: 'bg-red-500/20 text-red-300',
    delivery_failed: 'bg-orange-500/20 text-orange-300',
    ghl_failed: 'bg-orange-500/20 text-orange-300',
  }
  return colors[status] || 'bg-gray-500/20 text-gray-300'
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function getBillingLabel(frequency: string): string {
  const labels: Record<string, string> = {
    monthly: '/mo',
    annual: '/yr',
    one_time: '',
    custom: ' (custom)',
  }
  return labels[frequency] || ''
}
```

**Step 2: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat: add deal status label, color, and formatting utils"
```

---

## Task 4: `useDeals` Hook — Data Fetching + Realtime

**Files:**
- Create: `src/hooks/useDeals.ts`

**Step 1: Create the hook**

Follow the exact pattern from `useLeads.ts`: useState for deals/loading/error, fetchDeals with Supabase query, Realtime channel subscription, and mutation helpers.

```typescript
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Deal, DealStatus, DealFilters } from '@/types'

export function useDeals() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const supabase = createClient()

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('deals')
        .select(`
          *,
          staff:users!deals_staff_id_fkey(id, name, email, role),
          lead:leads!deals_lead_id_fkey(id, contact_name, athlete_name, contact_phone, contact_email)
        `)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setDeals((data as Deal[]) || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching deals:', err)
      setError('Failed to load deals')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchDeals()

    const channel = supabase
      .channel('deals-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deals' },
        () => {
          fetchDeals()
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchDeals])

  const updateDealStatus = useCallback(
    async (dealId: string, status: DealStatus) => {
      const { error: updateError } = await supabase
        .from('deals')
        .update({ status })
        .eq('id', dealId)

      if (updateError) throw updateError
      await fetchDeals()
    },
    [supabase, fetchDeals]
  )

  const refresh = useCallback(async () => {
    await fetchDeals()
  }, [fetchDeals])

  return {
    deals,
    loading,
    error,
    realtimeConnected,
    updateDealStatus,
    refresh,
  }
}

export function useFilteredDeals(deals: Deal[], filters: DealFilters) {
  return useMemo(() => {
    let filtered = [...deals]

    if (filters.status !== 'all') {
      filtered = filtered.filter((d) => d.status === filters.status)
    }

    if (filters.staff_id) {
      filtered = filtered.filter((d) => d.staff_id === filters.staff_id)
    }

    if (filters.search) {
      const q = filters.search.toLowerCase()
      filtered = filtered.filter(
        (d) =>
          d.athlete_name.toLowerCase().includes(q) ||
          d.athlete_phone?.includes(q) ||
          d.athlete_email?.toLowerCase().includes(q) ||
          d.notes?.toLowerCase().includes(q)
      )
    }

    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start)
      const end = new Date(filters.dateRange.end)
      filtered = filtered.filter((d) => {
        const created = new Date(d.created_at)
        return created >= start && created <= end
      })
    }

    return filtered
  }, [deals, filters])
}

export function useDealCounts(deals: Deal[]) {
  return useMemo(() => {
    const counts: Record<DealStatus | 'all', number> = {
      all: deals.length,
      pending_confirmation: 0,
      confirmed: 0,
      contract_sent: 0,
      contract_signed: 0,
      payment_sent: 0,
      payment_complete: 0,
      scheduling: 0,
      complete: 0,
      expired: 0,
      canceled: 0,
      payment_failed: 0,
      delivery_failed: 0,
      ghl_failed: 0,
    }
    deals.forEach((d) => {
      if (d.status in counts) {
        counts[d.status as DealStatus]++
      }
    })
    return counts
  }, [deals])
}
```

**Step 2: Commit**

```bash
git add src/hooks/useDeals.ts
git commit -m "feat: add useDeals hook with Realtime subscription"
```

---

## Task 5: DealCard Component

**Files:**
- Create: `src/components/deals/DealCard.tsx`

**Step 1: Create the component**

Follow the pattern from `SessionCard` — a card that expands inline on tap to show details.

```typescript
'use client'

import { useState } from 'react'
import { Handshake, Phone, Mail, ChevronDown, ChevronUp, User, Calendar, Package } from 'lucide-react'
import { formatRelativeTime, getDealStatusLabel, getDealStatusColor, formatCents, getBillingLabel, getServiceLabel, formatPhoneNumber } from '@/lib/utils'
import type { Deal } from '@/types'

interface DealCardProps {
  deal: Deal
}

export default function DealCard({ deal }: DealCardProps) {
  const [expanded, setExpanded] = useState(false)

  const priceDisplay = `${formatCents(deal.price_cents)}${getBillingLabel(deal.billing_frequency)}`

  return (
    <div
      className="card-surface rounded-xl p-4 cursor-pointer transition-all duration-200 hover:bg-white/[0.04]"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0">
            <Handshake size={16} className="text-white/50" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-white truncate">{deal.athlete_name}</p>
            <p className="text-sm text-white/50 truncate">
              {getServiceLabel(deal.package)} &middot; {priceDisplay}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full ${getDealStatusColor(deal.status)}`}>
            {getDealStatusLabel(deal.status)}
          </span>
          {expanded ? (
            <ChevronUp size={16} className="text-white/30" />
          ) : (
            <ChevronDown size={16} className="text-white/30" />
          )}
        </div>
      </div>

      {/* Subtitle row */}
      <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
        {deal.staff?.name && (
          <span className="flex items-center gap-1">
            <User size={12} />
            {deal.staff.name}
          </span>
        )}
        <span>{formatRelativeTime(deal.created_at)}</span>
        {deal.ai_confidence !== null && deal.ai_confidence !== undefined && (
          <span className={deal.ai_confidence < 0.7 ? 'text-amber-400' : ''}>
            {Math.round(deal.ai_confidence * 100)}% confidence
          </span>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
          {/* Contact info */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {deal.athlete_phone && (
              <div className="flex items-center gap-2 text-white/60">
                <Phone size={14} />
                <span>{formatPhoneNumber(deal.athlete_phone)}</span>
              </div>
            )}
            {deal.athlete_email && (
              <div className="flex items-center gap-2 text-white/60">
                <Mail size={14} />
                <span className="truncate">{deal.athlete_email}</span>
              </div>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {deal.athlete_level && (
              <div className="text-white/60">
                <span className="text-white/30">Level: </span>
                {deal.athlete_level.replace('_', ' ')}
              </div>
            )}
            {deal.sport && (
              <div className="text-white/60">
                <span className="text-white/30">Sport: </span>
                {deal.sport}
              </div>
            )}
            {deal.skill_focus && (
              <div className="text-white/60">
                <span className="text-white/30">Focus: </span>
                {deal.skill_focus}
              </div>
            )}
            {deal.preferred_start && (
              <div className="flex items-center gap-1 text-white/60">
                <Calendar size={12} />
                {deal.preferred_start}
              </div>
            )}
          </div>

          {/* Notes */}
          {deal.notes && (
            <div className="text-sm text-white/50 bg-white/[0.03] rounded-lg p-3">
              {deal.notes}
            </div>
          )}

          {/* Transcript */}
          {deal.raw_transcript && (
            <details className="text-sm">
              <summary className="text-white/40 cursor-pointer hover:text-white/60">
                View transcript
              </summary>
              <p className="mt-2 text-white/50 bg-white/[0.03] rounded-lg p-3 text-xs">
                {deal.raw_transcript}
              </p>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
mkdir -p src/components/deals
git add src/components/deals/DealCard.tsx
git commit -m "feat: add DealCard component with expandable detail"
```

---

## Task 6: Deal Status Filter Chips

**Files:**
- Create: `src/components/deals/DealStatusFilter.tsx`

**Step 1: Create the filter component**

Horizontal chip row matching the pattern from sessions/applications filter bars.

```typescript
'use client'

import type { DealStatus } from '@/types'
import { getDealStatusLabel } from '@/lib/utils'

// Only show the meaningful statuses as filter chips (not error states)
const FILTER_STATUSES: (DealStatus | 'all')[] = [
  'all',
  'pending_confirmation',
  'confirmed',
  'contract_sent',
  'contract_signed',
  'payment_complete',
  'scheduling',
  'complete',
]

interface DealStatusFilterProps {
  selected: DealStatus | 'all'
  counts: Record<DealStatus | 'all', number>
  onChange: (status: DealStatus | 'all') => void
}

export default function DealStatusFilter({ selected, counts, onChange }: DealStatusFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {FILTER_STATUSES.map((status) => {
        const isActive = selected === status
        const count = counts[status] || 0
        const label = status === 'all' ? 'All' : getDealStatusLabel(status)

        return (
          <button
            key={status}
            onClick={() => onChange(status)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all
              ${isActive
                ? 'bg-white/[0.12] text-white'
                : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/60'
              }
            `}
          >
            {label}
            {count > 0 && (
              <span className={`text-xs ${isActive ? 'text-white/60' : 'text-white/30'}`}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/deals/DealStatusFilter.tsx
git commit -m "feat: add DealStatusFilter chip component"
```

---

## Task 7: `/deals` Page

**Files:**
- Create: `src/app/deals/page.tsx`

**Step 1: Create the deals page**

Follow `sessions/page.tsx` pattern: RoleGate → DashboardLayout → content with filters + card list.

```typescript
'use client'

import { useState } from 'react'
import { Handshake, Search, RefreshCw } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import RoleGate from '@/components/layout/RoleGate'
import DealCard from '@/components/deals/DealCard'
import DealStatusFilter from '@/components/deals/DealStatusFilter'
import { useDeals, useFilteredDeals, useDealCounts } from '@/hooks/useDeals'
import type { DealStatus, DealFilters } from '@/types'

function DealsContent() {
  const { deals, loading, error, refresh } = useDeals()
  const [filters, setFilters] = useState<DealFilters>({
    status: 'all' as DealStatus | 'all',
    staff_id: null,
    search: '',
    dateRange: null,
  })

  const filteredDeals = useFilteredDeals(deals, filters)
  const counts = useDealCounts(deals)

  // Pipeline value: sum of active (non-terminal) deals
  const pipelineValue = deals
    .filter((d) => !['complete', 'canceled', 'expired'].includes(d.status))
    .reduce((sum, d) => sum + d.price_cents, 0)

  const completedThisMonth = deals.filter((d) => {
    if (d.status !== 'complete') return false
    const created = new Date(d.created_at)
    const now = new Date()
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
  }).length

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Handshake size={24} className="text-white/60" />
          <div>
            <h1 className="text-xl font-semibold text-white">Deals</h1>
            <p className="text-sm text-white/40">
              {counts.all} total &middot; Pipeline: ${(pipelineValue / 100).toLocaleString()} &middot; {completedThisMonth} closed this month
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} className="text-white/50" />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/[0.12]"
        />
      </div>

      {/* Status filter chips */}
      <DealStatusFilter
        selected={filters.status}
        counts={counts}
        onChange={(status) => setFilters((f) => ({ ...f, status }))}
      />

      {/* Deal list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-400">{error}</div>
      ) : filteredDeals.length === 0 ? (
        <div className="text-center py-20">
          <Handshake size={40} className="mx-auto text-white/20 mb-3" />
          <p className="text-white/40">
            {filters.status !== 'all' || filters.search
              ? 'No deals match your filters'
              : 'No deals yet. Send a voice memo to get started.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDeals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DealsPage() {
  return (
    <RoleGate allowedRoles={['sales', 'admin', 'manager']}>
      <DashboardLayout>
        <DealsContent />
      </DashboardLayout>
    </RoleGate>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/deals/page.tsx
git commit -m "feat: add /deals page with filtered list view"
```

---

## Task 8: Sidebar Navigation — Add Deals Link

**Files:**
- Modify: `src/components/Sidebar.tsx`

**Step 1: Read the Sidebar to find the navItems array**

Read `src/components/Sidebar.tsx` and locate the `navItems` array definition (around line 33-39). The existing items look like:

```typescript
const navItems: NavItem[] = [
  { href: '/', label: 'Leads', icon: <Users size={20} />, roles: ['sales', 'admin', 'manager', 'coordinator'] },
  { href: '/applications', label: 'Applications', icon: <FileText size={20} />, roles: ['admin', 'manager', 'coordinator'] },
  // ... etc
]
```

**Step 2: Add the Deals nav item**

Insert a new entry AFTER the Leads item and BEFORE Applications:

```typescript
{ href: '/deals', label: 'Deals', icon: <Handshake size={20} />, roles: ['sales', 'admin', 'manager'] },
```

Also add `Handshake` to the lucide-react import at the top of the file.

**Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add Deals link to sidebar navigation"
```

---

## Task 9: LeadCard — Deal Status Badge

**Files:**
- Modify: `src/components/LeadCard.tsx`

**Step 1: Read LeadCard.tsx to understand the current structure**

Read the file and identify where the temperature dot and status indicators are rendered.

**Step 2: Add a deal badge**

The LeadCard needs to accept an optional `dealStatus` prop and render a small badge. Add:

- A new optional prop: `dealStatus?: string`
- A badge rendered next to the existing status indicators
- Import `getDealStatusLabel` and `getDealStatusColor` from utils

The badge should be a small pill:

```tsx
{dealStatus && (
  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getDealStatusColor(dealStatus)}`}>
    {getDealStatusLabel(dealStatus)}
  </span>
)}
```

Place this in the header area next to the temperature dot.

**Step 3: Commit**

```bash
git add src/components/LeadCard.tsx
git commit -m "feat: add optional deal status badge to LeadCard"
```

---

## Task 10: LeadDetailPanel — Deal Section

**Files:**
- Modify: `src/components/LeadDetailPanel.tsx`

**Step 1: Read LeadDetailPanel.tsx to find the right insertion point**

Look for the Classification card section. The deal section goes AFTER Classification and BEFORE the Activity Timeline.

**Step 2: Add the deal section**

Add an optional `activeDeal` prop to the component props:

```typescript
activeDeal?: Deal | null
```

Then add a collapsible card section:

```tsx
{/* Active Deal */}
{activeDeal && (
  <div className="card-surface rounded-xl p-4 space-y-2">
    <div className="flex items-center gap-2 text-sm font-medium text-white/70">
      <Handshake size={14} />
      Active Deal
    </div>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div>
        <span className="text-white/30">Status: </span>
        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-xs ${getDealStatusColor(activeDeal.status)}`}>
          {getDealStatusLabel(activeDeal.status)}
        </span>
      </div>
      <div>
        <span className="text-white/30">Package: </span>
        <span className="text-white/60">{getServiceLabel(activeDeal.package)}</span>
      </div>
      <div>
        <span className="text-white/30">Value: </span>
        <span className="text-white/60">{formatCents(activeDeal.price_cents)}{getBillingLabel(activeDeal.billing_frequency)}</span>
      </div>
      <div>
        <span className="text-white/30">Created: </span>
        <span className="text-white/60">{formatRelativeTime(activeDeal.created_at)}</span>
      </div>
    </div>
    <a
      href={`/deals?highlight=${activeDeal.id}`}
      className="text-xs text-blue-400 hover:text-blue-300"
    >
      View Deal →
    </a>
  </div>
)}
```

Add the necessary imports: `Handshake` from lucide-react, `getDealStatusLabel`, `getDealStatusColor`, `formatCents`, `getBillingLabel`, `getServiceLabel` from utils, and `Deal` from types.

**Step 3: Commit**

```bash
git add src/components/LeadDetailPanel.tsx
git commit -m "feat: add active deal section to LeadDetailPanel"
```

---

## Task 11: API Endpoint — `/api/deals/capture` (PWA Path)

**Files:**
- Create: `src/app/api/deals/capture/route.ts`

**Step 1: Create the deal capture endpoint**

This is the PWA equivalent of the SMS path. Takes text or voice transcript, parses with Claude, creates deal record.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireEnv } from '@/lib/env'

const DEAL_PARSE_PROMPT = `You are a deal intake parser for 108 Performance, a baseball/softball training academy in Knoxville, TN.

## Step 1: Intent Classification
Determine if this voice transcript describes a DEAL (athlete wants to sign up for a package) or SOMETHING ELSE (general note, question, reminder).

If NOT a deal, return: { "is_deal": false, "summary": "<brief summary>" }

## Step 2: Extract Deal Fields

### Packages:
| Package | Code | Monthly | Annual | One-Time |
|---------|------|---------|--------|----------|
| 108 Experience | 108_experience | — | — | $2,000-$4,000 |
| Tri Star | tri_star | $499 | $5,500 | — |
| Virtual Experience | virtual | $550 | $6,000 | — |
| Virtual Pro | virtual_pro | $1,000 | $10,000 | — |
| College Prep | college_prep | $1,250 | $13,500 | — |
| Draft Prep | draft_prep | $1,500 | $15,000 | — |
| Pro Experience | pro_experience | custom | custom | — |
| Tour Experience | tour_experience | — | — | $500/athlete |
| Coaches Experience | coaches_experience | — | — | $500/day |
| Coaches Mentorship | coaches_mentorship | $500 | — | — |
| Powered by 108 | powered_by_108 | — | $20,000 yr1 | — |
| Performance Institute | performance_institute | — | $14,500-$25,000/yr | — |

### Fuzzy matching:
- "train here" / "local" / "unlimited" → tri_star
- "remote" / "virtual" / "from home" → virtual (virtual_pro if "pro"/"quarterly")
- "college recruiting" / "get seen" → college_prep
- "draft" / "scouts" → draft_prep
- "pro" / "minor league" / "MLB" → pro_experience
- "experience" / "fly in" / "come check us out" → 108_experience
- "coach visit" / "shadow" → coaches_experience

### 108 Experience pricing:
- Single skill: 2d=$2,000 | 3d=$2,500 | 4d=$3,000 | 5d=$3,500
- Two skills: 2d=$2,500 | 3d=$3,000 | 4d=$3,500 | 5d=$4,000
- Default: 3 days, single skill, $2,500

### Output:
{
  "is_deal": true,
  "athlete_name": string (REQUIRED),
  "athlete_phone": string | null,
  "athlete_email": string | null,
  "athlete_level": "pro"|"college"|"high_school"|"middle_school"|"youth"|null,
  "athlete_age": number | null,
  "sport": "baseball"|"softball"|"both",
  "skill_focus": "hitting"|"pitching"|"two_way"|null,
  "package": string (REQUIRED, one of the codes),
  "billing_frequency": "monthly"|"annual"|"one_time"|"custom",
  "price_cents": integer (REQUIRED, in cents),
  "preferred_start": string | null,
  "preferred_schedule": string | null,
  "is_minor": boolean | null,
  "notes": string | null,
  "confidence": float 0-1
}`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, staff_id } = body as { text: string; staff_id: string }

    if (!text || !staff_id) {
      return NextResponse.json({ error: 'text and staff_id required' }, { status: 400 })
    }

    // Parse with Claude
    const anthropicKey = requireEnv('ANTHROPIC_API_KEY')
    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: DEAL_PARSE_PROMPT,
        messages: [{ role: 'user', content: text }],
      }),
    })

    if (!aiResponse.ok) {
      const err = await aiResponse.text()
      console.error('Claude API error:', err)
      return NextResponse.json({ error: 'AI parsing failed' }, { status: 502 })
    }

    const aiData = await aiResponse.json()
    const content = aiData.content?.[0]?.text || ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse AI response' }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Not a deal
    if (!parsed.is_deal) {
      return NextResponse.json({ is_deal: false, summary: parsed.summary })
    }

    // Low confidence
    if (!parsed.athlete_name || !parsed.package) {
      return NextResponse.json({
        is_deal: true,
        error: 'Missing required fields',
        missing: [
          !parsed.athlete_name && 'athlete_name',
          !parsed.package && 'package',
        ].filter(Boolean),
        parsed,
      }, { status: 422 })
    }

    // Find or create lead
    const supabase = await createServiceRoleClient()

    let lead_id: string | null = null
    if (parsed.athlete_phone || parsed.athlete_email) {
      let query = supabase.from('leads').select('id')
      if (parsed.athlete_phone) {
        query = query.eq('contact_phone', parsed.athlete_phone)
      } else if (parsed.athlete_email) {
        query = query.eq('contact_email', parsed.athlete_email)
      }
      const { data: existingLead } = await query.limit(1).single()
      if (existingLead) {
        lead_id = existingLead.id
      }
    }

    // Check dedup
    if (parsed.athlete_phone) {
      const { data: existingDeal } = await supabase
        .from('deals')
        .select('id, status')
        .eq('athlete_phone', parsed.athlete_phone)
        .eq('package', parsed.package)
        .not('status', 'in', '("canceled","expired","complete")')
        .limit(1)
        .single()

      if (existingDeal) {
        return NextResponse.json({
          error: 'duplicate',
          existing_deal_id: existingDeal.id,
          existing_status: existingDeal.status,
          parsed,
        }, { status: 409 })
      }
    }

    // Create deal
    const { data: deal, error: insertError } = await supabase
      .from('deals')
      .insert({
        lead_id,
        staff_id,
        athlete_name: parsed.athlete_name,
        athlete_phone: parsed.athlete_phone || null,
        athlete_email: parsed.athlete_email || null,
        athlete_level: parsed.athlete_level || null,
        athlete_age: parsed.athlete_age || null,
        sport: parsed.sport || 'baseball',
        skill_focus: parsed.skill_focus || null,
        package: parsed.package,
        billing_frequency: parsed.billing_frequency || 'monthly',
        price_cents: parsed.price_cents,
        status: 'pending_confirmation',
        raw_transcript: text,
        parsed_data: parsed,
        ai_confidence: parsed.confidence || null,
        is_deal: true,
        preferred_start: parsed.preferred_start || null,
        preferred_schedule: parsed.preferred_schedule || null,
        notes: parsed.notes || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Deal insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
    }

    // Log activity
    if (lead_id) {
      await supabase.from('lead_activity').insert({
        lead_id,
        user_id: staff_id,
        action: 'deal_created',
        details: { deal_id: deal.id, package: parsed.package, price_cents: parsed.price_cents },
        event_category: 'deal',
        source: 'pwa',
      })
    }

    return NextResponse.json({ deal, parsed })
  } catch (err) {
    console.error('Deal capture error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 2: Commit**

```bash
mkdir -p src/app/api/deals/capture
git add src/app/api/deals/capture/route.ts
git commit -m "feat: add /api/deals/capture endpoint with Claude AI parsing"
```

---

## Task 12: API Endpoint — `/api/webhook/deal-status` (n8n Callbacks)

**Files:**
- Create: `src/app/api/webhook/deal-status/route.ts`

**Step 1: Create the webhook endpoint**

Receives status updates from n8n workflows (contract signed, payment complete, etc.) and updates Supabase.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

interface DealStatusPayload {
  deal_id: string
  status: string
  ghl_contact_id?: string
  ghl_contract_id?: string
  ghl_payment_id?: string
  experience_id?: string
  metadata?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DealStatusPayload

    if (!body.deal_id || !body.status) {
      return NextResponse.json({ error: 'deal_id and status required' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    // Fetch current deal
    const { data: deal, error: fetchError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', body.deal_id)
      .single()

    if (fetchError || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Build update payload
    const update: Record<string, unknown> = { status: body.status }

    if (body.ghl_contact_id) update.ghl_contact_id = body.ghl_contact_id
    if (body.ghl_contract_id) update.ghl_contract_id = body.ghl_contract_id
    if (body.ghl_payment_id) update.ghl_payment_id = body.ghl_payment_id
    if (body.experience_id) update.experience_id = body.experience_id

    if (body.status === 'confirmed') update.confirmed_at = new Date().toISOString()
    if (body.status === 'contract_sent') update.expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    // Update deal
    const { error: updateError } = await supabase
      .from('deals')
      .update(update)
      .eq('id', body.deal_id)

    if (updateError) {
      console.error('Deal update error:', updateError)
      return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 })
    }

    // Log activity
    if (deal.lead_id) {
      await supabase.from('lead_activity').insert({
        lead_id: deal.lead_id,
        action: `deal_${body.status}`,
        details: { deal_id: body.deal_id, status: body.status, ...body.metadata },
        event_category: 'deal',
        source: 'n8n',
      })

      // Update pipeline stage based on deal status
      const pipelineMap: Record<string, string> = {
        contract_sent: 'converting',
        payment_complete: 'booked',
        complete: 'converted',
      }
      const newPipelineStage = pipelineMap[body.status]
      if (newPipelineStage) {
        // Only advance, never regress
        const { data: lead } = await supabase
          .from('leads')
          .select('pipeline_stage')
          .eq('id', deal.lead_id)
          .single()

        const stageOrder = ['lead', 'applied', 'accepted', 'converting', 'booked', 'arrived', 'completed', 'converted']
        const currentIdx = stageOrder.indexOf(lead?.pipeline_stage || 'lead')
        const newIdx = stageOrder.indexOf(newPipelineStage)

        if (newIdx > currentIdx) {
          await supabase
            .from('leads')
            .update({ pipeline_stage: newPipelineStage })
            .eq('id', deal.lead_id)
        }
      }
    }

    return NextResponse.json({ status: 'updated', deal_id: body.deal_id, new_status: body.status })
  } catch (err) {
    console.error('Deal status webhook error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 2: Commit**

```bash
mkdir -p src/app/api/webhook/deal-status
git add src/app/api/webhook/deal-status/route.ts
git commit -m "feat: add /api/webhook/deal-status endpoint for n8n callbacks"
```

---

## Task 13: Build Verification

**Step 1: Run the build**

Run: `npm run build`
Expected: Build succeeds with no errors related to deals/packages code

**Step 2: Fix any build errors**

If there are TypeScript or import errors, fix them one at a time.

**Step 3: Run lint**

Run: `npm run lint`
Expected: No new lint errors

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build errors from deals pipeline implementation"
```

---

## Task 14: Final Commit and Summary

**Step 1: Verify all files are committed**

Run: `git status`
Expected: Clean working tree

**Step 2: Review the full diff**

Run: `git log --oneline master..HEAD`
Expected: ~12 commits covering: migration, types, utils, hook, components, pages, APIs

---

## Files Created/Modified Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/007_create_deals_and_packages.sql` | Create | DB tables + seed data + RLS + Realtime |
| `src/types/index.ts` | Modify | Deal, Package, DealStatus, DealFilters types |
| `src/lib/utils.ts` | Modify | getDealStatusLabel, getDealStatusColor, formatCents, getBillingLabel |
| `src/hooks/useDeals.ts` | Create | useDeals, useFilteredDeals, useDealCounts hooks |
| `src/components/deals/DealCard.tsx` | Create | Expandable deal card component |
| `src/components/deals/DealStatusFilter.tsx` | Create | Filter chip bar |
| `src/app/deals/page.tsx` | Create | /deals page with filtered list |
| `src/components/Sidebar.tsx` | Modify | Add Deals nav link |
| `src/components/LeadCard.tsx` | Modify | Add deal status badge |
| `src/components/LeadDetailPanel.tsx` | Modify | Add active deal section |
| `src/app/api/deals/capture/route.ts` | Create | PWA deal capture with Claude AI |
| `src/app/api/webhook/deal-status/route.ts` | Create | n8n webhook receiver |
