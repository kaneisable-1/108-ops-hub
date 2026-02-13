# Phase 2: Application Review + Pipeline — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build application review workflow (accept/reject/need-more-info) and pipeline Kanban board so coordinators can process athlete applications and track every lead from first contact to conversion.

**Architecture:** Two-tab page on `/applications` — Review tab (filtered list + slide-up review panel) and Pipeline tab (9-column Kanban). New `pipeline_stage` column on leads. API routes for decisions and stage updates. Realtime subscriptions on both views.

**Tech Stack:** Next.js 15, Supabase (RLS + realtime), TypeScript, Tailwind, lucide-react icons.

---

### Task 1: Migration + Type Updates

**Files:**
- Create: `supabase/migrations/004_add_pipeline_stage.sql`
- Modify: `src/types/index.ts` (add `pipeline_stage` to `Lead` interface)

**Step 1: Write migration 004**

Create `supabase/migrations/004_add_pipeline_stage.sql`:

```sql
-- Migration 004: Add pipeline_stage to leads
-- Run in Supabase SQL Editor after migrations 001-003

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'lead'
  CHECK (pipeline_stage IN (
    'lead', 'applied', 'accepted', 'booked',
    'arrived', 'completed', 'converting', 'converted', 'nurture'
  ));

CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON public.leads(pipeline_stage);

-- Backfill existing leads based on status
UPDATE public.leads SET pipeline_stage = 'lead' WHERE pipeline_stage IS NULL AND status = 'new';
UPDATE public.leads SET pipeline_stage = 'lead' WHERE pipeline_stage IS NULL AND status = 'claimed';
UPDATE public.leads SET pipeline_stage = 'lead' WHERE pipeline_stage IS NULL AND status = 'contacted';
UPDATE public.leads SET pipeline_stage = 'converted' WHERE pipeline_stage IS NULL AND status = 'converted';
UPDATE public.leads SET pipeline_stage = 'nurture' WHERE pipeline_stage IS NULL AND status = 'lost';
```

**Step 2: Update Lead type**

In `src/types/index.ts`, add `pipeline_stage` to the `Lead` interface (after `updated_at`):

```typescript
  // Pipeline
  pipeline_stage: PipelineStage
```

**Step 3: Verify build**

Run: `cd /Users/gregoriowiggles/Development/108-lead-intel && npx tsc --noEmit`

---

### Task 2: API Routes

**Files:**
- Create: `src/app/api/applications/decide/route.ts`
- Create: `src/app/api/pipeline/update/route.ts`

**Step 1: Create decide endpoint**

`src/app/api/applications/decide/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// POST /api/applications/decide
// Body: { application_id, decision, review_notes?, decision_reason?, reviewed_by }
// decision: 'accepted' | 'rejected' | 'need_more_info'
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { application_id, decision, review_notes, decision_reason, reviewed_by } = body

    if (!application_id || !decision || !reviewed_by) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const validDecisions = ['accepted', 'rejected', 'need_more_info']
    if (!validDecisions.includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    // Update application
    const { data: app, error: appError } = await supabase
      .from('applications')
      .update({
        status: decision,
        reviewed_by,
        reviewed_at: new Date().toISOString(),
        review_notes: review_notes || null,
        decision_reason: decision_reason || null,
      })
      .eq('id', application_id)
      .select('lead_id')
      .single()

    if (appError || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Update lead pipeline_stage on accept
    if (decision === 'accepted') {
      await supabase
        .from('leads')
        .update({ pipeline_stage: 'accepted' })
        .eq('id', app.lead_id)
    }

    return NextResponse.json({ success: true, decision, lead_id: app.lead_id })
  } catch (err) {
    console.error('Application decide error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 2: Create pipeline update endpoint**

`src/app/api/pipeline/update/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { PipelineStage } from '@/types'

const VALID_STAGES: PipelineStage[] = [
  'lead','applied','accepted','booked','arrived','completed','converting','converted','nurture'
]

// POST /api/pipeline/update
// Body: { lead_id, stage }
export async function POST(request: NextRequest) {
  try {
    const { lead_id, stage } = await request.json()

    if (!lead_id || !stage) {
      return NextResponse.json({ error: 'lead_id and stage are required' }, { status: 400 })
    }

    if (!VALID_STAGES.includes(stage)) {
      return NextResponse.json({ error: 'Invalid pipeline stage' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    const { error } = await supabase
      .from('leads')
      .update({ pipeline_stage: stage })
      .eq('id', lead_id)

    if (error) {
      return NextResponse.json({ error: 'Failed to update stage' }, { status: 500 })
    }

    return NextResponse.json({ success: true, lead_id, stage })
  } catch (err) {
    console.error('Pipeline update error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`

---

### Task 3: Client Hooks

**Files:**
- Create: `src/hooks/useApplications.ts`
- Create: `src/hooks/usePipeline.ts`

**Step 1: useApplications hook**

Follow `useLeads.ts` pattern. Fetch applications with lead join, realtime sub, filter by status, decision actions.

Key exports: `applications`, `loading`, `error`, `makeDecision()`, `filterByStatus()`, `refresh()`

**Step 2: usePipeline hook**

Fetch all leads with `pipeline_stage`, group into Map by stage, realtime sub on leads table, `updateStage()` action.

Key exports: `stageGroups` (Map<PipelineStage, Lead[]>), `loading`, `error`, `updateStage()`, `refresh()`

**Step 3: Verify build**

Run: `npx tsc --noEmit`

---

### Task 4: Application Review Components

**Files:**
- Create: `src/components/applications/ApplicationCard.tsx`
- Create: `src/components/applications/ApplicationStatusFilter.tsx`
- Create: `src/components/applications/DecisionForm.tsx`
- Create: `src/components/applications/ApplicationReviewPanel.tsx`

**Step 1: ApplicationCard**

Compact card following `LeadCard.tsx` pattern. Shows:
- Athlete name (from lead join), submitted date, status badge
- Video indicator icon if `video_url` exists
- Tap opens review panel

**Step 2: ApplicationStatusFilter**

Horizontal scrollable chips: All, Submitted, Under Review, Accepted, Rejected, Need More Info. Active chip = brand orange.

**Step 3: DecisionForm**

Three big buttons: Accept (green), Reject (red), Need More Info (amber). Text area for notes. Text area for decision reason. Submit button.

**Step 4: ApplicationReviewPanel**

Slide-up panel (follow `SlotDetail.tsx` pattern):
- Video player (`<video>` tag with `video_url`)
- Expandable responses section (JSONB rendered as key-value pairs)
- DecisionForm at bottom
- Calls `POST /api/applications/decide`

**Step 5: Verify build**

Run: `npx tsc --noEmit`

---

### Task 5: Pipeline Kanban Components

**Files:**
- Create: `src/components/applications/PipelineCard.tsx`
- Create: `src/components/applications/PipelineColumn.tsx`
- Create: `src/components/applications/PipelineBoard.tsx`

**Step 1: PipelineCard**

Compact card: athlete name, level badge, days since last update. Tap opens a dropdown to select new stage (mobile-friendly).

**Step 2: PipelineColumn**

Column header (stage name + count badge), scrollable card list. Stage colors:
- lead: gray, applied: blue, accepted: green, booked: brand, arrived: amber
- completed: emerald, converting: purple, converted: gold, nurture: teal

**Step 3: PipelineBoard**

Horizontal scrollable container with 9 PipelineColumns. Uses `usePipeline` hook. Calls `POST /api/pipeline/update` on card stage change.

**Step 4: Verify build**

Run: `npx tsc --noEmit`

---

### Task 6: Tab Switcher + Page Assembly

**Files:**
- Create: `src/components/applications/TabSwitcher.tsx`
- Modify: `src/app/applications/page.tsx`

**Step 1: TabSwitcher**

Two-tab toggle: "Review" and "Pipeline". Underline active tab in brand orange. Full-width on mobile.

**Step 2: Replace applications page**

Replace stub with full implementation:
- RoleGate for coordinator/manager/admin
- TabSwitcher at top
- Review tab: ApplicationStatusFilter + scrollable ApplicationCard list + ApplicationReviewPanel
- Pipeline tab: PipelineBoard
- useApplications + usePipeline hooks

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add -A
git commit -m "Phase 2: Application review + pipeline Kanban

- Migration 004: pipeline_stage column on leads
- Application review workflow (accept/reject/need-more-info)
- Pipeline Kanban board with 9 stages
- 2 API routes: /api/applications/decide, /api/pipeline/update
- 2 hooks: useApplications, usePipeline
- 8 components: ApplicationCard, ReviewPanel, DecisionForm,
  StatusFilter, PipelineBoard, PipelineColumn, PipelineCard, TabSwitcher

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Execution Order

```
Task 1 (Migration + Types) → Task 2 (API Routes) → Task 3 (Hooks) → Task 4 (Review Components) → Task 5 (Kanban Components) → Task 6 (Page Assembly + Commit)
```

## Critical Reference Files

- `src/types/index.ts` — Application, Lead, PipelineStage types
- `src/hooks/useLeads.ts` — hook pattern (realtime, useCallback, try/catch)
- `src/components/LeadCard.tsx` — compact card pattern
- `src/components/schedule/SlotDetail.tsx` — slide-up panel pattern
- `src/app/api/call-capture/extract/route.ts` — API route pattern
- `src/lib/supabase/server.ts` — `createServiceRoleClient()`
- `src/app/globals.css` — CSS classes: card, badge, btn-primary, btn-secondary, input

## Verification (end-to-end)

1. `npm run build` passes with 0 errors
2. `/applications` page renders Review tab with filterable application list
3. Pipeline tab renders 9-column horizontal-scrollable Kanban
4. ApplicationReviewPanel opens on card tap with video + responses
5. DecisionForm calls API and updates both application and lead
6. `git push` to GitHub
