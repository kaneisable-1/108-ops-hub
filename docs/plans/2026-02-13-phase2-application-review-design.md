# Phase 2: Application Review + Pipeline — Design

## Problem

When athletes submit 108 Experience applications (via Athlete OS), coordinators Kelly & Tyler need to:
- Review the application, watch the athlete's video, read survey responses
- Make a decision: accept, reject, or request more info
- Track the decision and trigger downstream actions (GHL sync, experience creation)
- See where every lead sits in the full pipeline from first contact to conversion

Currently there's a stub page and no review workflow.

## Solution: Two Tabs on /applications

### Tab 1: Review Queue (default)
Filtered list of applications sorted by submitted date. Each card shows athlete name, submitted date, status badge. Tap to expand a slide-up review panel with:
- Video embed (if video_url exists)
- Expandable survey responses (JSONB)
- Decision buttons: Accept / Reject / Need More Info
- Notes field + decision reason

### Tab 2: Pipeline Board
Kanban board with 9 columns representing the full pipeline:
`lead → applied → accepted → booked → arrived → completed → converting → converted → nurture`

Each column shows lead cards with athlete name, tier/level, and days since last action. Desktop: drag to move. Mobile: tap card → dropdown to select new stage.

## Data Changes

### Migration 004: Add pipeline_stage to leads
```sql
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'lead'
  CHECK (pipeline_stage IN ('lead','applied','accepted','booked','arrived','completed','converting','converted','nurture'));
CREATE INDEX idx_leads_pipeline_stage ON leads(pipeline_stage);
```

## Components (8 new)

| Component | Purpose |
|-----------|---------|
| `TabSwitcher` | Review / Pipeline toggle tabs |
| `ApplicationCard` | Compact card for review list |
| `ApplicationReviewPanel` | Slide-up detail with video, responses, decision form |
| `ApplicationStatusFilter` | Filter chips for submitted/under_review/accepted/rejected/need_more_info |
| `DecisionForm` | Accept/reject/need-more-info buttons + notes |
| `PipelineBoard` | Kanban board container with 9 columns |
| `PipelineColumn` | Single column with header count + cards |
| `PipelineCard` | Compact lead card for Kanban |

## Hooks (2 new)

| Hook | Purpose |
|------|---------|
| `useApplications` | Fetch/filter/update applications, realtime sub, decision workflow |
| `usePipeline` | Fetch leads grouped by pipeline_stage, update stage, realtime sub |

## API Routes (2 new)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/applications/decide` | POST | Validate decision, update application + lead pipeline_stage |
| `/api/pipeline/update` | POST | Move a lead to a new pipeline stage |

## Workflow

1. Athlete submits application → `applications` record created with `status='submitted'`, lead's `pipeline_stage='applied'`
2. Coordinator opens Review tab → sees pending applications
3. Taps application → review panel opens with video + responses
4. Makes decision:
   - **Accept** → `applications.status='accepted'`, `leads.pipeline_stage='accepted'`, can now create Experience
   - **Reject** → `applications.status='rejected'`, lead stays at `pipeline_stage='applied'`
   - **Need More Info** → `applications.status='need_more_info'`, lead stays at `pipeline_stage='applied'`
5. Pipeline tab shows all leads across all stages
6. GHL sync endpoint ready for n8n integration (fires webhook on decision)

## Patterns to Follow

- `LeadCard.tsx` → ApplicationCard pattern
- `SlotDetail.tsx` → ApplicationReviewPanel pattern (slide-up)
- `useLeads.ts` → useApplications hook pattern
- `useSchedule.ts` → usePipeline hook pattern
- API routes follow `createServiceRoleClient()` pattern

## Verification

1. `npm run build` passes
2. `/applications` page renders Review tab with filterable list
3. Pipeline tab renders 9-column Kanban
4. `POST /api/applications/decide` updates both application and lead
5. Realtime: decision in one browser updates another browser instantly
