# 108 Ops Hub — Design & Development Plan

## Document Info
- **Date**: 2026-02-13
- **Author**: Claude (Opus 4.6) + Greg Wiggins
- **Status**: Awaiting approval
- **Source PRD**: 108 Athlete OS PRD v3.0
- **Source Analytics Spec**: Shadow Analytics Brain prompt
- **Companion doc**: [Scheduling Algorithm Analysis](./2026-02-13-scheduling-algorithm-analysis.md) — full constraint catalog, algorithm pseudocode, capacity analysis, edge cases, API design

---

## 1. What We're Building

Expanding the existing 108 Lead Intelligence System into a full **internal operations hub** for 108 Performance. The app becomes the single operational tool for the entire staff — from inbound lead to converted athlete, with scheduling, session tracking, analytics, and automated briefings.

### Current State (Lead Intel v1)
- 3 Supabase tables: `users`, `leads`, `lead_activity`
- 1 page: lead triage dashboard with queue tabs
- AI-powered lead classification via Claude API
- GHL webhook ingestion + Discord/SMS notifications
- Google OAuth (pending setup)
- Deployed to Vercel at 108-lead-intel.vercel.app

### Target State (108 Ops Hub)
- 12+ Supabase tables (athlete profiles, coaches, sessions, schedules, events, metrics)
- 6 views: Leads, Applications, Schedule, Sessions, Analytics, Admin
- Role-based access: sales, coach, coordinator, admin
- Automated daily briefings via SMS + email + Discord
- Shadow Analytics Brain: event stream, metric engine, Bridge ingestion
- AI-assisted session notes (voice/text to structured data)
- Full pipeline tracking: lead -> application -> experience -> conversion

---

## 2. Infrastructure & Tooling Decisions

### What we have and how we'll use it

| Tool | Role in Ops Hub |
|------|----------------|
| **Next.js 15 + React 19** | Frontend + API routes. Monolithic — all views in one app. |
| **Supabase** | Database (PostgreSQL), auth, realtime subscriptions, pg_cron for metric engine, Edge Functions for scheduled jobs |
| **Vercel** | Hosting + CI/CD (once GitHub remote is connected) |
| **GitHub** | Source control, branch-per-phase, PR-based deploys |
| **n8n** | Workflow automation: Bridge data ingestion, daily briefings, GHL sync, metric computation |
| **Claude API** | Lead triage (exists), session note parsing (new), daily briefing generation (new) |
| **GHL API** | Contact sync, pipeline stage updates, automation triggers |
| **Twilio** | SMS notifications + daily coach briefings |
| **Discord** | Webhook notifications (hot leads, daily summaries) |
| **SendGrid/Resend** | Email delivery for daily coach briefings |
| **Recharts** | Analytics dashboard charts (lightweight, React-native) |

### What needs to be set up first (prerequisites)

| Task | Current State | Action Required |
|------|--------------|-----------------|
| GitHub remote | Not configured | `gh auth login` + create repo + push |
| GitHub -> Vercel | Manual deploys only | Connect repo in Vercel dashboard for auto-deploy on push |
| Google OAuth | Not configured | User needs Google Cloud Console OAuth credentials |
| Twilio | Not configured | User needs account + phone number |
| n8n | Installed, not running | Start as background service or Docker container |
| Supabase CLI link | Not linked | `supabase link --project-ref thfoinlxdkgdyasuclcr` |
| Email service | None | Add Resend (free tier: 3k emails/mo, perfect for briefings) |

---

## 3. Data Model

### Existing tables (evolving)

**`users`** — Internal staff. Add `coach_tier` and `disciplines` fields for coaches.
```
ADD: coach_tier TEXT CHECK (IN ('S1', 'S2', 'J1', NULL))
ADD: disciplines TEXT[] DEFAULT '{}'  -- ['hitting', 'pitching']
ADD: is_coach BOOLEAN DEFAULT false
```

**`leads`** — Becomes the **AthleteProfile spine**. Rename conceptually but keep table name for backwards compatibility. Add lifecycle and commercial fields.
```
ADD: pipeline_stage TEXT  -- 'lead', 'applied', 'accepted', 'booked', 'arrived', 'completed', 'converting', 'converted', 'nurture'
ADD: subscription_status TEXT  -- 'none', 'rfd', 'skills', 'rfd_skills', '108_path'
ADD: subscription_tier TEXT  -- pathway sub-tier for 108 Path
ADD: stripe_customer_id TEXT
ADD: bridge_user_id TEXT
ADD: first_paid_date TIMESTAMPTZ
ADD: onboarded_at TIMESTAMPTZ
ADD: last_active_date TIMESTAMPTZ
ADD: engagement_band TEXT  -- 'hot', 'warm', 'cold' (computed by metric engine)
ADD: sessions_last_30_days INTEGER DEFAULT 0
ADD: activation_status TEXT  -- 'pending', 'activated', 'not_activated'
ADD: churn_risk BOOLEAN DEFAULT false
ADD: acquisition_source TEXT
```

**`lead_activity`** — Becomes the **Event Stream**. Already has the right shape. Add event categorization.
```
ADD: event_category TEXT  -- 'commercial', 'product', 'coaching', 'system'
ADD: source TEXT  -- 'ghl', 'bridge', 'stripe', 'manual', 'system'
```

### New tables

**`applications`** — 108 Path intake
```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  status TEXT NOT NULL DEFAULT 'submitted',  -- submitted, under_review, accepted, rejected, need_more_info
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  decision_reason TEXT,
  video_url TEXT,
  responses JSONB,  -- all 50 questions stored as structured JSON
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`experiences`** — Booked 108 Experiences
```sql
CREATE TABLE experiences (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  application_id UUID REFERENCES applications(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  skill_focus TEXT NOT NULL,  -- 'hitting', 'pitching', 'two_way'
  duration_days INTEGER,
  price_cents INTEGER,
  payment_status TEXT DEFAULT 'pending',  -- pending, deposit_paid, paid_full, payment_plan
  deposit_amount_cents INTEGER,
  balance_due_cents INTEGER,
  stripe_payment_id TEXT,
  status TEXT DEFAULT 'booked',  -- booked, arrived, in_progress, completed, canceled
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`schedule_slots`** — Daily coach-athlete assignments (see [Scheduling Algorithm Analysis](./2026-02-13-scheduling-algorithm-analysis.md) for full constraint logic)
```sql
CREATE TABLE schedule_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id),
  coach_id UUID REFERENCES users(id),  -- NULL = unassigned (conflict)
  date DATE NOT NULL,
  time_block TEXT NOT NULL CHECK (time_block IN ('morning', 'afternoon')),
  skill TEXT NOT NULL CHECK (skill IN ('hitting', 'pitching')),
  day_number INTEGER NOT NULL CHECK (day_number >= 1),
  is_final_day BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'canceled', 'conflict')),
  conflict_reason TEXT,
  override_reason TEXT,
  group_slot_id UUID,  -- links athletes sharing same coach+date+block
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`coach_availability`** — Explicit availability for days off, sick, vacation
```sql
CREATE TABLE coach_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  available BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,  -- 'vacation', 'sick', 'personal', 'travel'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coach_id, date)
);
```

**`sessions`** — Coach session records with AI-parsed notes
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  schedule_slot_id UUID REFERENCES schedule_slots(id),
  lead_id UUID REFERENCES leads(id),
  coach_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  skill TEXT NOT NULL,
  duration_minutes INTEGER,
  -- Raw input
  raw_notes TEXT,
  -- AI-parsed structured fields
  parsed_notes JSONB,  -- { drills: [], observations: [], cues_that_worked: [], recommendations: [] }
  energy_level INTEGER,  -- 1-5
  focus_areas TEXT[],
  cues_that_worked TEXT[],
  -- Exit evaluation (final day only)
  is_exit_eval BOOLEAN DEFAULT false,
  exit_eval JSONB,  -- { progress_review, video_summary, routine_framework, recommended_pathway, return_frequency }
  -- Video links
  video_urls TEXT[],
  -- HitTrax/Trackman data
  performance_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`athlete_metrics`** — Computed by the Metric Engine (materialized summary)
```sql
CREATE TABLE athlete_metrics (
  id UUID PRIMARY KEY,
  lead_id UUID UNIQUE REFERENCES leads(id),
  -- Activation
  days_to_first_login INTEGER,
  days_to_first_workout INTEGER,
  activation_status TEXT,
  -- Engagement
  sessions_last_7_days INTEGER DEFAULT 0,
  sessions_last_30_days INTEGER DEFAULT 0,
  workouts_completed_lifetime INTEGER DEFAULT 0,
  avg_sessions_per_month DECIMAL,
  engagement_band TEXT,  -- 'hot', 'warm', 'cold'
  -- Retention
  is_retained_3_months BOOLEAN,
  is_retained_6_months BOOLEAN,
  is_retained_12_months BOOLEAN,
  -- Churn
  churn_date TIMESTAMPTZ,
  churn_reason TEXT,
  churn_risk_score DECIMAL,  -- 0-1
  -- Timestamps
  last_computed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`daily_briefings`** — Generated briefings for audit trail
```sql
CREATE TABLE daily_briefings (
  id UUID PRIMARY KEY,
  coach_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  briefing_content JSONB,  -- structured dossier data
  briefing_text TEXT,  -- AI-generated narrative
  delivered_via TEXT[],  -- ['sms', 'email', 'discord']
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes and views

- Composite index on `schedule_slots(date, coach_id)` for daily schedule lookups
- Composite index on `sessions(lead_id, date)` for athlete history
- Index on `applications(status)` for review queue
- Index on `experiences(start_date, status)` for upcoming arrivals
- SQL view: `v_coach_daily_schedule` joining schedule_slots + leads + experiences
- SQL view: `v_at_risk_athletes` filtering athlete_metrics where churn_risk_score > 0.7

---

## 4. Application Architecture

### Views / Pages

| Route | View | Primary Users | Description |
|-------|------|--------------|-------------|
| `/` | **Leads** | Jose, Greg | Existing lead triage dashboard (as-is) |
| `/applications` | **Applications** | Kelly, Tyler, Greg | Review queue for 108 Path applications |
| `/schedule` | **Schedule** | Kelly, Tyler, Coaches | Master calendar, coach assignments, daily view |
| `/sessions` | **Sessions** | Coaches | Today's athletes, session note entry, exit evals |
| `/analytics` | **Analytics** | Greg | Cohort retention, engagement funnels, coach performance, risk flags |
| `/admin` | **Admin** | Greg | User management, coach roster, pricing config, system settings |

### Role-based navigation

| Role | Sees |
|------|------|
| `sales` | Leads |
| `coordinator` | Leads, Applications, Schedule |
| `coach` | Sessions (own athletes only), Schedule (own) |
| `manager` | Leads, Applications, Schedule, Sessions |
| `admin` | Everything |

### Component structure

```
src/
  app/
    page.tsx                    # Leads (existing, refactored)
    applications/
      page.tsx                  # Application review queue
    schedule/
      page.tsx                  # Master schedule / calendar
    sessions/
      page.tsx                  # Coach session view
    analytics/
      page.tsx                  # Analytics dashboard
    admin/
      page.tsx                  # Admin settings
    api/
      call-capture/extract/     # (existing)
      webhook/ghl/              # (existing)
      sessions/notes/           # AI session note parsing
      briefings/generate/       # Daily briefing generation
      metrics/compute/          # Metric engine trigger
      bridge/sync/              # Bridge data ingestion endpoint
  components/
    layout/
      Navigation.tsx            # Role-based nav (replaces Header)
      RoleGate.tsx              # Auth + role guard wrapper
    leads/                      # (existing components, moved here)
    applications/
      ApplicationCard.tsx
      ApplicationReview.tsx
    schedule/
      CalendarView.tsx
      CoachAssignment.tsx
      SlotCard.tsx
    sessions/
      SessionNoteForm.tsx       # AI-assisted note entry
      ExitEvalForm.tsx
      AthleteDossier.tsx        # Progressive disclosure athlete profile
    analytics/
      CohortChart.tsx
      EngagementFunnel.tsx
      CoachPerformance.tsx
      RiskFlags.tsx
    shared/
      Badge.tsx
      ExpandableSection.tsx     # Progressive disclosure component
```

---

## 5. Automated Workflows (n8n + Supabase)

### Daily Coach Briefing (6:00 AM ET)
1. n8n cron triggers at 6:00 AM
2. Query `schedule_slots` + `leads` + `experiences` for today's date, grouped by coach
3. For each coach with athletes today:
   a. Build dossier JSON (progressive disclosure structure)
   b. Call Claude API to generate natural-language briefing narrative
   c. Save to `daily_briefings` table
   d. Send SMS via Twilio (summary + link to app)
   e. Send email via Resend (full briefing with expandable sections)
   f. Post to Discord coach channel

### Metric Engine (2:00 AM ET nightly)
1. n8n cron triggers at 2:00 AM
2. For each athlete with `subscription_status != 'none'`:
   a. Count events in last 7/30 days
   b. Compute engagement_band thresholds
   c. Compute activation metrics
   d. Compute retention flags
   e. Compute churn_risk_score
3. Upsert results into `athlete_metrics`
4. Update `leads.engagement_band`, `leads.sessions_last_30_days`, `leads.churn_risk`
5. Flag any new high-risk athletes -> Discord alert

### Bridge Data Sync (every 4 hours)
1. n8n cron triggers every 4 hours
2. Pull Bridge API/CSV export for recent activity
3. Map Bridge user IDs to `leads.bridge_user_id`
4. Insert events into `lead_activity` (bridge_login, workout_completed, etc.)
5. Update `leads.last_active_date`

### GHL Pipeline Sync (webhook-driven)
1. GHL fires webhook on pipeline stage changes
2. n8n receives, maps to our pipeline stages
3. Updates `leads.pipeline_stage`
4. Inserts event into `lead_activity`
5. If stage = 'booked', creates `experiences` record

### Post-Session AI Processing (on session save)
1. Coach submits raw notes via SessionNoteForm
2. API route `/api/sessions/notes` receives raw text
3. Claude API parses into structured fields (drills, observations, cues, recommendations)
4. Returns structured JSON for coach review
5. Coach confirms -> saved to `sessions` table
6. Event logged to `lead_activity`

---

## 6. Development Phases

### Phase 0: Infrastructure Setup (this session)
**Goal**: Get the foundation right before building features.

- [ ] Authenticate GitHub CLI (`gh auth login`)
- [ ] Create GitHub repo (`108-ops-hub` or rename existing)
- [ ] Push initial codebase to GitHub
- [ ] Connect GitHub repo to Vercel (auto-deploy on push to `main`)
- [ ] Finish Google OAuth setup (user action)
- [ ] Set up Twilio (user action)
- [ ] Link Supabase CLI to project
- [ ] Add Resend for email delivery
- [ ] Run schema migration for new tables
- [ ] Update CLAUDE.md with Ops Hub context

### Phase 1: Scheduling & Coach Briefings
**Goal**: Solve the most immediate operational gap — who's arriving and when.

- [ ] Extended schema: `experiences`, `schedule_slots`, `daily_briefings`
- [ ] Extended `users` table with coach fields
- [ ] Schedule view: master calendar + coach daily view
- [ ] Coach assignment interface with S1/S2/J1 tier logic
- [ ] Athlete dossier component (progressive disclosure)
- [ ] Daily briefing generation API route
- [ ] n8n workflow: daily briefing at 6 AM
- [ ] SMS + email + Discord delivery

### Phase 2: Application Review & Pipeline
**Goal**: Handle 108 Path intake and track the full conversion journey.

- [ ] `applications` table + schema migration
- [ ] Application review queue view
- [ ] Accept/reject/need-more-info workflow
- [ ] GHL automation triggers on decision
- [ ] Extended pipeline stages on leads
- [ ] Pipeline view / Kanban board
- [ ] Conversion tracking (Experience -> Pathway enrollment)

### Phase 3: Session Notes & Coach Tools
**Goal**: Give coaches a fast way to log what happened.

- [ ] `sessions` table + schema migration
- [ ] Session note form with AI parsing
- [ ] Exit evaluation form (structured fields)
- [ ] Coach's "Today" view (their athletes, quick note entry)
- [ ] Session history per athlete (viewable in dossier)

### Phase 4: Shadow Analytics Brain
**Goal**: Make data-driven decisions about retention, engagement, and coach performance.

- [ ] `athlete_metrics` table + schema migration
- [ ] Bridge data ingestion (n8n workflow)
- [ ] Metric engine (n8n nightly cron)
- [ ] Analytics dashboard: cohort retention charts
- [ ] Engagement funnel visualization
- [ ] Coach performance metrics
- [ ] Risk flags view (churn risk athletes)
- [ ] Stripe webhook integration for commercial events

### Phase 5: Polish & Optimization
- [ ] PWA optimization (offline support for session notes)
- [ ] Push notifications (Web Push API)
- [ ] Performance optimization (React.memo, virtual scrolling for large lists)
- [ ] Role-based data filtering at Supabase RLS level
- [ ] Admin settings page (pricing config, notification preferences)

---

## 7. Failsafes & Development Safeguards

### Source Control Strategy
- **Main branch**: `main` — always deployable, auto-deploys to Vercel production
- **Feature branches**: `phase-1/scheduling`, `phase-2/applications`, etc.
- **PR workflow**: Feature branch -> PR -> review -> merge to main -> auto-deploy
- **Commit convention**: Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **Never force push to main**

### Database Migration Strategy
- All schema changes written as versioned SQL files in `supabase/migrations/`
- Naming: `001_add_coach_fields.sql`, `002_create_applications.sql`, etc.
- Each migration is additive (ADD COLUMN, CREATE TABLE) — never destructive in production
- Test migrations against a Supabase branch database before applying to production
- Keep `supabase/schema.sql` as the full canonical schema (updated after each migration)

### Deployment Safeguards
- Vercel preview deployments on every PR (auto-generated preview URL)
- Production deploy only on merge to `main`
- Environment variables already set for all three Vercel environments
- Vercel rollback available if a bad deploy goes out

### Data Protection
- Supabase automatic daily backups (included in free tier)
- RLS policies on all new tables (same pattern as existing: authenticated read, service_role full access)
- `.env.local` in `.gitignore` (already configured)
- No secrets in source code

### Build Verification
- `npm run build` must pass before any PR merge
- TypeScript strict mode catches type errors at build time
- ESLint catches code quality issues
- Future: add Vitest for critical API routes (metric computation, AI parsing)

### Context Preservation
- claude-mem worker is running (localhost:37777) — preserves memory across sessions
- CLAUDE.md updated with Ops Hub context after each phase
- Design doc (this file) committed to repo for reference
- Each phase's implementation details documented in PR descriptions

### Monitoring
- Vercel deployment logs for build/runtime errors
- Supabase dashboard for database health, query performance
- n8n execution logs for workflow failures
- Discord channel receives error notifications from n8n on workflow failure

---

## 8. Dependencies & Install Plan

### New npm packages needed
```
recharts              # Charts for analytics dashboard
resend                # Email delivery (daily briefings)
react-day-picker      # Calendar component for schedule view
date-fns              # Already installed — date manipulation
```

### No new infrastructure costs
- Supabase free tier: 500MB database, 1GB file storage, 50k monthly active users (plenty)
- Vercel free tier: unlimited deploys, 100GB bandwidth (plenty)
- Resend free tier: 3,000 emails/month (plenty for daily briefings to ~15 staff)
- n8n self-hosted: free (already installed via Homebrew)
- Twilio: ~$1/mo for phone number + $0.0079/SMS (negligible)
- Total additional cost: ~$2-5/mo

---

## 9. Success Criteria

| Metric | Target |
|--------|--------|
| Coach adoption of daily briefings | 100% of coaches check briefing before first session |
| Session note logging rate | >80% of sessions have notes logged same day |
| Application review SLA | 100% reviewed within 48 hours |
| Schedule conflicts requiring manual intervention | <5% |
| Metric engine reliability | Runs nightly without failure for 30 consecutive days |
| Dashboard load time | <2 seconds on mobile |

---

## 10. Open Questions Resolved

| Question | Decision |
|----------|----------|
| Combine with Athlete OS? | No. Ops Hub is internal tool. Athlete OS is customer-facing. Connected via GHL/Supabase. |
| Session notes structure? | AI-assisted: coach dictates/types freely, Claude parses to structured fields, coach confirms. |
| Daily briefing format? | Full dossier with progressive disclosure (summary visible, details expandable). |
| Briefing delivery? | All three: SMS + email + in-app. |
| Bridge integration? | Yes, Bridge stays active. Ingest engagement data via n8n every 4 hours. |
| Analytics approach? | Built into the app (Recharts), not a separate tool. Powered by Supabase materialized metrics. |
| Scheduling complexity? | Full S1/S2/J1 tier logic, group size constraints, two-way day structure, pro protocols. |

---

**END OF DESIGN DOCUMENT**
