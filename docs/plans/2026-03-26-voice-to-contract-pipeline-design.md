# Voice-to-Contract Pipeline Design

**Date:** 2026-03-26
**Status:** Draft — Pending Approval
**Author:** Greg + Claude

## Overview

A frictionless deal capture system where any staff member can close a deal from their phone. After a call, staff sends a voice memo via SMS to a dedicated number. AI transcribes and parses the deal. Staff confirms via text. The system generates and sends the contract, processes payment, and auto-schedules the athlete — all without opening a laptop.

**Primary path:** SMS voice memo (native Messages app, zero app friction)
**Secondary path:** PWA Deal Capture button in Ops Hub (better for desk use, complex edits)

## End-to-End Flow

```
Coach finishes phone call with athlete
        │
        ├─── PRIMARY: SMS Path ──────────────────────────────────────┐
        │    Opens Messages app                                      │
        │    Records voice memo → sends to 865-XXX-XXXX              │
        │    System texts back: "Got it, processing..."  (15 sec)    │
        │    System texts confirmation card  (30-60 sec)             │
        │    Coach replies YES / EDIT / CANCEL                       │
        │                                                            │
        ├─── SECONDARY: PWA Path ────────────────────────────────────┤
        │    Opens Ops Hub bookmark on phone                         │
        │    Taps floating 💰 Deal button                            │
        │    Records voice → AI parses → editable card on screen     │
        │    Taps [Send Contract]                                    │
        │                                                            │
        └────────────────── Both paths converge ─────────────────────┘
                │
                v
        Deal confirmed by staff
                │
                v
        GHL creates/updates contact (upsert by phone/email)
        GHL triggers package-specific contract workflow
        Contract emailed + texted to athlete (or parent if minor)
                │
                v
        Athlete signs contract
        Payment link auto-sent by GHL
                │
                v
        Athlete pays
                │
                v
        Post-payment routing by package type:
        ├── Experience packages → auto-create Experience record
        │   → call scheduling algorithm → auto-assign or queue for review
        ├── Subscription packages (Tri Star, Virtual, etc.) → activate membership
        └── One-time packages (Tour, Coaches Exp) → confirm + deliver
                │
                v
        Deal complete. Notifications sent. Analytics updated.
```

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Transport | SMS primary, PWA secondary | Coaches text instinctively between sessions. PWA for desk/complex edits |
| Input format | Voice memo (MMS) + plain text fallback | Zero typing friction. Text fallback for when voice isn't practical |
| Confirmation | Staff confirms via text before contract sends | Safety net for AI parsing errors without adding friction |
| Scheduling | Auto-schedule + notify (non-pro, no conflicts) | Eliminates manual scheduling for ~80% of bookings |
| Architecture | GHL-native via n8n (Phase 1), Ops Hub orchestrator (Phase 2) | Ship fast with existing tools, scale into Ops Hub later |
| Dashboard | Minimum UI in Phase 1 (deals list + lead badges) | Invisible deals = abandoned system |

## Database Schema

### New Table: `deals`

```sql
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  staff_id UUID REFERENCES users(id),

  -- Athlete info (parsed from voice memo)
  athlete_name TEXT NOT NULL,
  athlete_phone TEXT,
  athlete_email TEXT,
  athlete_level athlete_level_enum,
  athlete_age INTEGER,                        -- Required for R6 (under-12 two-way rule)
  sport TEXT DEFAULT 'baseball',
  skill_focus TEXT,

  -- Package details
  package service_match_enum NOT NULL,
  billing_frequency TEXT CHECK (billing_frequency IN ('monthly','annual','one_time','custom')),
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
  is_deal BOOLEAN DEFAULT true,               -- AI intent classification

  -- SMS conversation state
  sms_conversation_id TEXT,
  confirmation_sent_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,                     -- 7 days after contract_sent

  -- Scheduling
  preferred_start TEXT,
  preferred_schedule TEXT,
  experience_id UUID REFERENCES experiences(id),

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_deals_staff_status ON deals(staff_id, status);
CREATE INDEX idx_deals_lead ON deals(lead_id);
CREATE INDEX idx_deals_created ON deals(created_at DESC);
CREATE INDEX idx_deals_phone ON deals(athlete_phone);
CREATE INDEX idx_deals_expires ON deals(expires_at) WHERE status = 'contract_sent';

-- Dedup: prevent duplicate active deals for same athlete + package
CREATE UNIQUE INDEX idx_deals_dedup
  ON deals(athlete_phone, package)
  WHERE status NOT IN ('canceled', 'expired', 'complete');

-- Updated_at trigger (reuses existing function)
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage deals"
  ON deals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to deals"
  ON deals FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE deals;
```

### New Table: `packages` (Config/Reference)

```sql
CREATE TABLE packages (
  code TEXT PRIMARY KEY,                       -- matches service_match_enum values
  display_name TEXT NOT NULL,
  category TEXT CHECK (category IN ('athlete','coach','academy','other')),
  price_cents_monthly INTEGER,
  price_cents_annual INTEGER,
  price_cents_one_time INTEGER,
  duration_days INTEGER,                       -- for Experience-type packages
  requires_experience_scheduling BOOLEAN DEFAULT false,
  requires_simple_booking BOOLEAN DEFAULT false,
  requires_parent_signature_if_minor BOOLEAN DEFAULT true,
  skill_focus_default TEXT,
  ghl_workflow_id TEXT,                        -- GHL workflow to trigger for contract
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO packages (code, display_name, category, price_cents_monthly, price_cents_annual, price_cents_one_time, duration_days, requires_experience_scheduling, skill_focus_default, description) VALUES
  ('108_experience', '108 Experience', 'athlete', NULL, NULL, 250000, 3, true, NULL, '2-5 day fly-in intensive'),
  ('tri_star', 'Tri Star', 'athlete', 49900, 550000, NULL, NULL, false, NULL, 'Unlimited local training'),
  ('virtual', 'Virtual Experience', 'athlete', 55000, 600000, NULL, NULL, false, NULL, 'Remote coaching'),
  ('virtual_pro', 'Virtual Pro', 'athlete', 100000, 1000000, NULL, NULL, false, NULL, 'Remote + quarterly in-person'),
  ('college_prep', 'College Prep', 'athlete', 125000, 1350000, NULL, NULL, false, NULL, 'Training + recruiting'),
  ('draft_prep', 'Draft Prep', 'athlete', 150000, 1500000, NULL, NULL, false, NULL, 'Training + draft strategy'),
  ('pro_experience', 'Pro Experience', 'athlete', NULL, NULL, NULL, NULL, false, NULL, 'Custom pro training'),
  ('tour_experience', 'Tour Experience', 'athlete', NULL, NULL, 50000, 2, false, NULL, '2-day camp'),
  ('coaches_experience', 'Coaches Experience', 'coach', NULL, NULL, 50000, NULL, false, NULL, 'Shadow the method'),
  ('coaches_mentorship', 'Coaches Mentorship', 'coach', 50000, NULL, NULL, NULL, false, NULL, 'Ongoing coach development'),
  ('powered_by_108', 'Powered by 108', 'coach', NULL, 2000000, NULL, NULL, false, NULL, 'Full facility partnership'),
  ('performance_institute', 'Performance Institute', 'academy', NULL, NULL, NULL, NULL, false, NULL, 'Full-time academy'),
  ('partnership', 'Partnership', 'other', NULL, NULL, NULL, NULL, false, NULL, 'Business partnerships');
```

### New `lead_activity` Event Types

```
deal_created           — Voice memo parsed, deal record created
deal_confirmed         — Staff replied YES
deal_contract_sent     — Contract delivered to athlete
deal_contract_signed   — Athlete signed
deal_payment_sent      — Payment link delivered
deal_payment_complete  — Payment received
deal_payment_failed    — Payment declined/failed
deal_experience_created — Experience record auto-created
deal_scheduled         — Coach assignments auto-assigned
deal_schedule_review   — Scheduling queued for manual review
deal_expired           — Contract unsigned past TTL
deal_canceled          — Deal canceled by staff
```

### Deal Expiration Cron Job

```sql
-- Run daily at midnight via pg_cron
SELECT cron.schedule(
  'expire-stale-deals',
  '0 0 * * *',
  $$UPDATE deals
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'contract_sent'
    AND expires_at < NOW()$$
);
```

## TypeScript Types

```typescript
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
  | 'ghl_failed';

export type BillingFrequency = 'monthly' | 'annual' | 'one_time' | 'custom';

export type PackageCategory = 'athlete' | 'coach' | 'academy' | 'other';

export interface Deal {
  id: string;
  lead_id: string | null;
  staff_id: string;
  athlete_name: string;
  athlete_phone: string | null;
  athlete_email: string | null;
  athlete_level: AthleteLevel | null;
  athlete_age: number | null;
  sport: string;
  skill_focus: string | null;
  package: ServiceMatch;
  billing_frequency: BillingFrequency;
  price_cents: number;
  status: DealStatus;
  ghl_contact_id: string | null;
  ghl_contract_id: string | null;
  ghl_payment_id: string | null;
  raw_transcript: string | null;
  parsed_data: Record<string, unknown> | null;
  ai_confidence: number | null;
  is_deal: boolean;
  sms_conversation_id: string | null;
  confirmation_sent_at: string | null;
  confirmed_at: string | null;
  expires_at: string | null;
  preferred_start: string | null;
  preferred_schedule: string | null;
  experience_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Package {
  code: ServiceMatch;
  display_name: string;
  category: PackageCategory;
  price_cents_monthly: number | null;
  price_cents_annual: number | null;
  price_cents_one_time: number | null;
  duration_days: number | null;
  requires_experience_scheduling: boolean;
  requires_simple_booking: boolean;
  requires_parent_signature_if_minor: boolean;
  skill_focus_default: string | null;
  ghl_workflow_id: string | null;
  description: string | null;
  active: boolean;
}
```

## Claude AI Deal-Parsing Prompt

```
You are a deal intake parser for 108 Performance, a baseball/softball training academy in Knoxville, TN.

## Step 1: Intent Classification
First, determine if this voice transcript describes a DEAL (athlete wants to sign up for a package) or SOMETHING ELSE (general note, question, reminder, update about existing athlete).

If NOT a deal, return:
{ "is_deal": false, "summary": "<brief summary of what was said>" }

If it IS a deal, proceed to Step 2.

## Step 2: Extract Deal Fields

### Package Matching (fuzzy → canonical)

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
| Powered by 108 | powered_by_108 | — | $20,000 yr1 / $10,000 yr2+ | — |
| Performance Institute | performance_institute | — | $14,500-$25,000/yr | — |

### Fuzzy matching examples:
- "wants to train here" / "local" / "unlimited" → tri_star
- "remote" / "virtual" / "from home" → virtual (or virtual_pro if "pro"/"quarterly" mentioned)
- "college recruiting" / "get seen" / "recruiting help" → college_prep
- "draft" / "scouts" / "get drafted" → draft_prep
- "pro" / "minor league" / "MLB" / "professional" → pro_experience
- "just the experience" / "fly in" / "come check us out" / "3 days" → 108_experience
- "coach wants to visit" / "shadow" → coaches_experience
- "tour" / "camp" / "coming to our area" → tour_experience

### 108 Experience pricing logic:
- Single skill: 2d=$2,000 | 3d=$2,500 | 4d=$3,000 | 5d=$3,500
- Two skills: 2d=$2,500 | 3d=$3,000 | 4d=$3,500 | 5d=$4,000
- Default if not specified: 3 days, single skill, $2,500

### Output JSON:
{
  "is_deal": true,
  "athlete_name": string (REQUIRED — if unclear, set confidence to 0),
  "athlete_phone": string | null (format as +1XXXXXXXXXX if provided),
  "athlete_email": string | null,
  "athlete_level": "pro" | "college" | "high_school" | "middle_school" | "youth" | null,
  "athlete_age": number | null (extract if mentioned, critical for scheduling safety),
  "sport": "baseball" | "softball" | "both" (default "baseball"),
  "skill_focus": "hitting" | "pitching" | "two_way" | null,
  "package": string (REQUIRED — one of the codes above),
  "billing_frequency": "monthly" | "annual" | "one_time" | "custom",
  "price_cents": integer (REQUIRED — in cents, use package table for defaults),
  "duration_days": number | null (for Experience packages),
  "preferred_start": string | null (natural language date),
  "preferred_schedule": string | null (day/time preferences),
  "is_minor": boolean | null (if age < 18 or level is youth/middle_school, true),
  "parent_contact": string | null (parent name/info if mentioned),
  "notes": string | null (anything else: special requests, context, etc.),
  "confidence": float 0-1 (overall extraction confidence),
  "field_confidence": {
    "athlete_name": float,
    "package": float,
    "price_cents": float
  },
  "alternatives": string | null (if package is ambiguous, note the other possibility)
}

### Confidence rules:
- If athlete_name cannot be determined → overall confidence = 0
- If package is ambiguous between two options → confidence = max 0.6, note alternatives
- If phone number has uncertain digits → flag in notes
- If price was explicitly quoted differently than package default → use quoted price, note in notes
```

## n8n Workflows

### Workflow 1: Voice Deal Capture (Main)

```
Node 1: Webhook Trigger (Twilio incoming MMS/SMS)
  ├── Extract: From, Body, NumMedia, MediaUrl0, MediaContentType0, MessageSid
  └── Lookup staff by From number → users.phone in Supabase
      └── If unknown number → reply "Unknown number. Text REGISTER [your name] or contact Greg." → STOP

Node 2: Route — New Deal vs. Reply vs. Command
  ├── If Body matches pending deal conversation → Reply Handler (Node 9)
  ├── If Body = "HELP" → reply with instructions → STOP
  ├── If Body = "STATUS" → reply with active deal summary → STOP
  └── Else → New Deal flow (Node 3)

Node 3: Immediate Acknowledgment
  └── Twilio SMS to staff: "Got it, processing your voice memo..."

Node 4: Process Audio (if MMS) or Text (if SMS)
  ├── If NumMedia > 0:
  │   ├── Download audio from MediaUrl0
  │   ├── Check MediaContentType0
  │   ├── If AMR/3GP/CAF → FFmpeg transcode to MP3
  │   ├── If file > 25MB → reply "Voice memo too long, keep under 5 min" → STOP
  │   └── POST to OpenAI Whisper API → transcript
  └── If NumMedia = 0 (plain text):
      └── Use Body as transcript directly

Node 5: Claude AI Deal Parsing
  ├── POST to Anthropic API (claude-sonnet-4-20250514)
  ├── System prompt: [full prompt from above]
  ├── User message: transcript text
  └── Parse response JSON

Node 6: Intent + Confidence Check
  ├── If is_deal = false → reply "That didn't sound like a deal: [summary]. Re-record if it was." → STOP
  ├── If confidence < 0.4 → reply "Couldn't parse deal details. Missing: [fields]. Please re-record." → STOP
  ├── If athlete_name missing → reply "Couldn't catch the athlete's name. Re-record?" → STOP
  └── Else → proceed

Node 7: Dedup Check
  ├── Query Supabase: deals WHERE athlete_phone = X AND package = Y AND status NOT IN (canceled, expired, complete)
  ├── If duplicate found → reply "Active deal already exists for [name] ([package]). Replace it? Reply YES or NO." → route to dedup handler
  └── Else → proceed

Node 8: Create Deal + Lead Linkage
  ├── Search leads by contact_phone OR contact_email (upsert pattern)
  │   ├── If existing lead found → link deal.lead_id
  │   └── If no lead → create new lead with basic info, link deal.lead_id
  ├── INSERT into deals table (status: pending_confirmation)
  ├── INSERT into lead_activity (action: deal_created)
  ├── Set confirmation_sent_at = NOW()
  └── Send confirmation SMS to staff:

      🏈 New Deal #[short_id]

      Athlete: [name]
      Phone: [phone]
      Email: [email]
      Package: [display_name]
      AMOUNT: $[price]/[frequency]
      Start: [preferred_start]

      [If is_minor] ⚠️ Minor — contract goes to parent

      Reply YES to send contract
      Reply EDIT to modify
      Reply CANCEL to discard

Node 9: Reply Handler
  ├── Parse reply through Claude mini-classifier:
  │   "Classify this reply as: confirm, edit, cancel, or unclear"
  │
  ├── CONFIRM (yes, yep, send it, ya, sure, etc.):
  │   └── Trigger Node 10 (Contract Flow)
  │
  ├── EDIT:
  │   ├── If reply includes changes ("change package to college prep"):
  │   │   └── Re-run Claude with original deal + correction → update deal → send new confirmation
  │   ├── If reply is just "EDIT" with no details:
  │   │   └── Reply "What would you like to change? Name, phone, email, package, price, or describe in plain English."
  │   └── If 3+ edit rounds:
  │       └── Reply "Getting complex — here's a link to edit directly: [Ops Hub deep link]"
  │
  ├── CANCEL:
  │   └── Update deal status → canceled, log lead_activity, reply "Deal canceled."
  │
  └── UNCLEAR:
      └── Reply "Didn't catch that. Reply YES to send contract, EDIT to change, or CANCEL."

Node 10: GHL Contract Flow
  ├── Update deal status → confirmed, set confirmed_at
  ├── GHL API: POST /contacts/upsert (find or create by phone/email)
  │   └── Fields: name, phone, email, tags: [package_code]
  │   └── Store ghl_contact_id on deal
  ├── Lookup packages table → ghl_workflow_id for this package
  ├── Determine contract recipient:
  │   ├── If is_minor AND parent_contact exists → send to parent email
  │   └── Else → send to athlete email
  ├── GHL API: POST /contacts/{id}/workflow/{workflowId}
  │   └── This triggers the pre-configured GHL workflow that sends the contract
  ├── Update deal status → contract_sent
  ├── Set expires_at = NOW() + 7 days
  ├── Log lead_activity: deal_confirmed, deal_contract_sent
  ├── Update lead pipeline_stage → 'converting' (if not already at later stage)
  ├── Discord #sales: "[staff] sent [package] contract to [athlete] — $[price]"
  └── SMS to staff: "✅ Contract sent to [name] for [package]. You'll be notified when they sign."

  Error handling:
  ├── If GHL API fails → retry 3x with exponential backoff
  ├── If still failing → set deal status → ghl_failed
  ├── Discord alert: "⚠️ Deal #[id] confirmed but GHL API failed. Manual action needed."
  └── SMS to staff: "Contract couldn't be sent automatically. Greg has been notified."

Node 11: Notification Hub
  └── Discord embed to #sales with: deal details, staff name, package, athlete info, color-coded by package tier
```

### Workflow 2: Deal Status Updates (GHL Webhook Listener)

```
Node 1: Webhook Trigger (GHL events)
  └── Route by event type

Node 2: Contract Signed Handler
  ├── Match GHL contactId → deals.ghl_contact_id
  ├── Update deal status → contract_signed
  ├── GHL auto-sends payment link (configured in GHL workflow)
  ├── Update deal status → payment_sent
  ├── Log lead_activity: deal_contract_signed, deal_payment_sent
  ├── SMS to staff: "✍️ [name] signed! Payment link sent."
  └── Discord: "[name] signed [package] contract"

Node 3: Payment Complete Handler
  ├── Match payment event → deal
  ├── Update deal status → payment_complete
  ├── Log lead_activity: deal_payment_complete
  ├── SMS to staff: "💰 [name] paid for [package]!"
  ├── Discord: "🎉 New conversion: [name] → [package]"
  └── Trigger Post-Payment Routing (Node 4)

Node 4: Post-Payment Routing
  ├── Lookup packages table for this deal's package
  │
  ├── IF requires_experience_scheduling = true:
  │   ├── Create experience record:
  │   │   lead_id, start_date (from preferred_start), end_date (start + duration_days),
  │   │   skill_focus, price_cents, payment_status='paid_full'
  │   ├── Update deal.experience_id
  │   ├── Log lead_activity: deal_experience_created
  │   ├── SCHEDULING READINESS CHECK:
  │   │   ├── Is athlete_level set? (required for tier eligibility)
  │   │   ├── Is athlete_age known? (required if skill_focus = two_way, for R6 safety)
  │   │   ├── Is start_date confirmed (not just "next week")?
  │   │   └── If any missing → queue for manual review, Discord alert
  │   ├── Call POST /api/schedule/suggest with { experience_id }
  │   ├── Evaluate response:
  │   │   ├── IF zero conflicts AND all blocks have suggestions AND athlete_level != 'pro':
  │   │   │   ├── Call POST /api/schedule/assign with top-ranked coaches
  │   │   │   ├── Update deal status → complete
  │   │   │   ├── Log lead_activity: deal_scheduled
  │   │   │   ├── Discord: "Auto-scheduled [name] for [dates]. Review in Ops Hub."
  │   │   │   ├── SMS to staff: "[name] scheduled! [dates]"
  │   │   │   └── Email to athlete: schedule confirmation
  │   │   └── ELSE (conflicts, pro, or low confidence):
  │   │       ├── Update deal status → scheduling
  │   │       ├── Log lead_activity: deal_schedule_review
  │   │       ├── Discord: "⚠️ [name] needs scheduling review: [conflict details]"
  │   │       └── SMS to staff: "[name] paid but needs manual scheduling. Check Ops Hub."
  │
  ├── IF requires_simple_booking = true:
  │   ├── Send GHL calendar booking link to athlete
  │   ├── Update deal status → complete
  │   └── Log lead_activity
  │
  └── ELSE (subscriptions, memberships, no scheduling):
      ├── Activate service in GHL (tag contact, add to pipeline)
      ├── Update deal status → complete
      ├── Update lead pipeline_stage → 'converted'
      └── Log lead_activity

Node 5: Payment Failed Handler
  ├── Update deal status → payment_failed
  ├── Log lead_activity
  ├── SMS to staff: "⚠️ Payment failed for [name]. Card declined."
  └── Discord alert

Node 6: Document Delivery Failed Handler
  ├── Update deal status → delivery_failed
  ├── SMS to staff: "Contract email bounced for [name]. Verify email: [email]"
  └── Discord alert
```

### Workflow 3: Deal Reminders (Scheduled)

```
Trigger: Cron every 2 hours during business hours (8am-8pm)

Node 1: Check for unconfirmed deals > 2 hours old
  └── SMS to staff: "Still need to send that contract to [name]? Reply YES or CANCEL."

Node 2: Check for unsigned contracts > 48 hours old
  └── SMS to staff: "[name] hasn't signed yet (sent [X] days ago). Follow up?"

Node 3: Check for unpaid deals > 72 hours old
  └── Discord alert to #sales
```

## GHL Configuration (Manual Setup)

### Contract Templates
Create one GHL document template per package with merge fields:
- `{{contact.name}}` — Athlete (or parent) name
- `{{contact.email}}` — Email
- `{{contact.phone}}` — Phone
- Package-specific: name, pricing, billing terms, start date, duration
- Standard 108 Performance terms and conditions

### GHL Workflows (one per package)
Each workflow:
1. Trigger: API webhook
2. Send Document (correct template with merge fields)
3. Wait for Document Signed
4. Send Payment Link (correct amount)
5. Wait for Payment
6. Fire webhook to n8n Deal Status Updates workflow

### Environment Variables (new)
```
TWILIO_DEAL_NUMBER=+1865XXXXXXX     # Dedicated deal intake number
OPENAI_API_KEY=sk-...                 # For Whisper transcription
```

## Ops Hub Integration (Phase 1 Minimum)

### 1. `/deals` Page — List View

Simple filtered list following the `sessions/page.tsx` pattern:
- Stage filter chips at top (horizontally scrollable on mobile)
- Deal cards with: athlete name, package, price, stage badge, days-in-stage, staff avatar
- Tap to expand inline detail (no slide-over panel in Phase 1)
- Realtime updates via `useDeals` hook

### 2. Deal Badge on Lead Cards

LeadCard component shows a colored pill when the lead has an active deal:
- `pending_confirmation` → gray "Deal: Pending"
- `contract_sent` → blue "Deal: Contract Sent"
- `payment_complete` → green "Deal: Paid"

### 3. Deal Section in LeadDetailPanel

New collapsible section between Classification and Activity Timeline:
```
[Active Deal]
Status:   contract_sent
Package:  Draft Prep ($1,500/mo)
Created:  2 days ago
[View Deal →]
```

### 4. Nav Entry

```typescript
{ href: '/deals', label: 'Deals', roles: ['sales', 'admin', 'manager'] }
```

### 5. `useDeals` Hook

Clone `useLeads` pattern with Realtime subscription on `deals` table.

### 6. Pipeline Stage Wiring

Deal status transitions automatically update `leads.pipeline_stage`:
- `contract_sent` → pipeline: `converting`
- `payment_complete` → pipeline: `booked`
- `complete` → pipeline: `converted`
- `canceled` / `expired` → no pipeline regression

### 7. PWA Quick Deal Button

Floating action button on mobile (bottom-right) that opens a bottom-sheet with:
1. Voice recording (reuse `useVoiceRecorder` hook)
2. OR text input field
3. Submit → `/api/deals/capture` → Claude parsing → editable confirmation card
4. Confirm → triggers same GHL contract flow as SMS path

## Ops Hub Phase 2 (Future)

- Kanban board view (drag-to-advance with confirmation modal)
- Revenue analytics on /analytics page (funnel, time-to-close, revenue by package/staff/period)
- Deal creation form (lead picker + package selector, for desk use)
- Auto-scheduling dashboard integration
- Refund/cancellation flow with experience cleanup
- Multi-package deal support

## Error Handling Summary

| Scenario | Response |
|----------|----------|
| Whisper fails (bad audio) | SMS: "Couldn't understand audio. Re-record in quiet area or type details." |
| Claude confidence < 0.4 | SMS: "Couldn't parse deal. Missing: [fields]. Re-record with these details." |
| Not a deal (intent = false) | SMS: "That didn't sound like a deal: [summary]. Re-record if it was." |
| Duplicate deal detected | SMS: "Active deal exists for [name] ([package]). Replace it?" |
| Unknown sender phone | SMS: "Unknown number. Text REGISTER [name] or contact Greg." |
| GHL API fails after YES | Retry 3x, then: deal → ghl_failed, Discord alert, SMS to staff |
| Payment fails | Deal → payment_failed, SMS to staff, Discord alert |
| Contract email bounces | Deal → delivery_failed, SMS to staff with email to verify |
| Unsigned contract > 7 days | Deal → expired, pg_cron job |
| n8n workflow crash | Error trigger workflow logs to failed_webhooks, Discord alert |
| Voice memo too large (>25MB) | SMS: "Too long — keep under 5 minutes" |
| Android audio format (AMR/3GP) | Auto-transcode via FFmpeg before Whisper |

## Security Considerations

- **PII in SMS:** Minimize to first name + last initial, package, price. Full details via Ops Hub link.
- **RLS:** Standard authenticated + service_role policies (matches existing pattern).
- **Minors:** If athlete_age < 18 or level is youth/middle_school, contract sent to parent/guardian contact, not athlete.
- **PCI:** Payment processing entirely within GHL/Stripe. Only reference IDs stored in deals table.
- **Twilio webhook validation:** n8n's Twilio trigger node handles `X-Twilio-Signature` validation automatically.

## Cost Estimate

Per deal cycle: ~$0.05-0.10
- MMS received: $0.0075
- SMS sent (3-4 messages): $0.024-0.032
- Whisper API (~30 sec): $0.003
- Claude API (deal parse + reply classification): $0.01-0.03
- Monthly at 5-10 deals/day: ~$15-30/month

## Files to Create/Modify

### New Files
- `supabase/migrations/XXX_create_deals_and_packages.sql`
- `src/app/deals/page.tsx`
- `src/components/DealCard.tsx`
- `src/hooks/useDeals.ts`
- `src/app/api/deals/capture/route.ts` (PWA path)
- `src/app/api/webhook/deal-status/route.ts`

### Modified Files
- `src/types/index.ts` — Add Deal, Package, DealStatus types
- `src/components/Sidebar.tsx` — Add /deals nav entry
- `src/components/LeadDetailPanel.tsx` — Add deal section
- `src/components/LeadCard.tsx` — Add deal badge
- `src/lib/utils.ts` — Add deal status labels/colors

### n8n Workflows (configured in n8n UI)
- Voice Deal Capture workflow
- Deal Status Updates workflow
- Deal Reminders workflow

### GHL Configuration (manual)
- Contract templates per package
- Workflows per package
- Webhook configuration for deal events
