# n8n Workflow Specifications

## Overview
These workflows automate lead processing between GoHighLevel (GHL), Claude AI, Supabase, and the notification systems.

---

## Workflow 1: AI Lead Triage (Inbound)

**Trigger:** GHL Webhook — "Customer Replied" event

### Flow:
1. **Webhook Trigger** — Receives GHL payload when a contact sends a message
2. **Extract Data** — Pull contact_id, name, phone, email, message body, channel
3. **Claude AI Node** — Send message to Claude for triage analysis
   - Model: `claude-sonnet-4-20250514`
   - System prompt: 108 Performance triage prompt (see `/api/call-capture/extract/route.ts`)
   - Returns: AITriageResult JSON
4. **HTTP Request** — POST to `https://leads.108performance.com/api/webhook/ghl`
   - Body: { contact_id, contact_name, contact_phone, contact_email, message, channel, triage }
5. **IF Node** — Check if temperature === "hot"
   - YES → Parallel notifications (Discord + SMS)
   - NO → End

### GHL Webhook Setup:
1. Go to GHL → Settings → Webhooks
2. Add webhook URL: `https://your-n8n-instance.com/webhook/ghl-inbound`
3. Select trigger: "Customer Replied"
4. Enable for all channels (SMS, Email, Facebook, Instagram, Web Chat)

---

## Workflow 2: Post-Call Processing

**Trigger:** GHL Webhook — "Call Completed" event

### Flow:
1. **Webhook Trigger** — GHL fires when a call recording is ready
2. **HTTP Request** — Download call recording/transcript from GHL
   - GET `https://services.leadconnectorhq.com/contacts/{contactId}/recordings`
   - Headers: Authorization Bearer {GHL_API_KEY}
3. **Claude AI Node** — Analyze transcript
   - Model: `claude-sonnet-4-20250514`
   - System prompt: Post-call analysis prompt
   - Returns: PostCallAnalysis JSON
4. **Supabase Node** — Update lead record
   - Match on ghl_contact_id
   - Update: call_outcome, call_notes, lead_temperature, follow_up_date, athlete details
5. **Supabase Node** — Insert lead_activity entry
6. **IF Node** — Check if outcome === "booked"
   - YES → Discord celebration message 🎉
   - NO → End

---

## Workflow 3: Follow-Up Reminder

**Trigger:** Cron — Every day at 8:00 AM ET

### Flow:
1. **Cron Trigger** — Daily at 8:00 AM
2. **Supabase Node** — Query leads where:
   - `follow_up_date <= NOW()`
   - `status IN ('claimed', 'contacted')`
   - `call_outcome NOT IN ('booked', 'not_interested', 'wrong_number')`
3. **Loop** — For each lead:
   - **Discord Node** — Send reminder to channel
   - **IF** — If lead has claimed_by user with notify_sms = true
     - YES → Twilio SMS reminder

---

## Workflow 4: Daily Lead Summary

**Trigger:** Cron — Every day at 6:00 PM ET

### Flow:
1. **Cron Trigger** — Daily at 6:00 PM
2. **Supabase Node** — Query today's lead stats:
   - New leads count by temperature
   - Claimed/contacted/converted counts
   - Unclaimed hot leads (alert!)
3. **Discord Node** — Post daily summary embed

---

## Workflow 5: Daily Coach Briefing

**Trigger:** Cron — Every day at 6:00 AM ET

### Flow:
1. **Cron Trigger** — Daily at 6:00 AM
2. **HTTP Request** — POST to `${APP_URL}/api/briefings/generate?date=${TODAY}`
   - Headers: `Authorization: Bearer ${CRON_SECRET}`
   - This generates briefing content for each coach with scheduled sessions
3. **Wait Node** — 5 seconds (let generation complete)
4. **HTTP Request** — POST to `${APP_URL}/api/briefings/deliver?date=${TODAY}`
   - Headers: `Authorization: Bearer ${CRON_SECRET}`
   - Delivers via email (Resend), SMS (Twilio), and Discord based on each coach's notification preferences
5. **IF Node** — Check response.delivered > 0
   - YES → Discord summary: "Delivered {n} briefings for {date}"
   - NO → Discord alert: "No briefings to deliver — check schedule"

### Notes:
- The generate endpoint builds per-coach dossiers from `v_coach_daily_schedule` view
- The deliver endpoint checks each coach's `notify_sms`, `notify_discord` preferences
- SMS contains a concise summary; email contains the full HTML briefing
- Briefings are stored in `daily_briefings` table for archive

---

## Workflow 6: Metric Engine (Athlete Analytics)

**Trigger:** Cron — Every day at 2:00 AM ET

### Flow:
1. **Cron Trigger** — Daily at 2:00 AM
2. **HTTP Request** — POST to `${APP_URL}/api/metrics/compute`
   - Headers: `Authorization: Bearer ${CRON_SECRET}`
   - Body: `{ "secret": "${CRON_SECRET}" }`
3. **IF Node** — Check response.success
   - YES → End
   - NO → Discord alert: "Metric engine failed: {error}"

### What it computes:
- `churn_risk_score` — Based on days since last session, session frequency trend
- `engagement_band` — hot/warm/cold based on sessions in last 7 and 30 days
- `avg_sessions_per_month` — Rolling average
- Results upserted to `athlete_metrics` table
- Powers the at-risk athletes table and analytics dashboard

---

## Workflow 7: GHL Pipeline Sync → Experience Creation

**Trigger:** GHL Webhook — "Pipeline Stage Changed" event

### Flow:
1. **Webhook Trigger** — GHL fires when a contact moves pipeline stages
2. **IF Node** — Check if new stage === "Booked" (or equivalent GHL stage)
   - NO → End
3. **Supabase Node** — Look up lead by `ghl_contact_id`
4. **IF Node** — Lead exists?
   - NO → Log warning, end
5. **Supabase Node** — Check if experience already exists for this lead with overlapping dates
   - YES → End (prevent duplicate)
6. **HTTP Request** — POST to `${APP_URL}/api/schedule/suggest`
   - Body: `{ "experience_id": "${new_experience_id}" }`
7. **Discord Node** — Notify coordinator channel: "New experience booked for {athlete_name} — coach assignments pending"

### Notes:
- This bridges GHL pipeline stages to 108 Ops Hub experiences
- Coordinators review and approve suggested coach assignments in the app
- The experience `payment_status` defaults to "pending" until manually confirmed

---

## Environment Variables for n8n:
```
GHL_API_KEY=your-ghl-api-key
GHL_LOCATION_ID=your-location-id
ANTHROPIC_API_KEY=your-anthropic-api-key
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
DISCORD_WEBHOOK_URL=your-discord-webhook
TWILIO_SID=your-twilio-sid
TWILIO_TOKEN=your-twilio-token
TWILIO_PHONE=+1XXXXXXXXXX
JOSE_PHONE=+1XXXXXXXXXX
GREG_PHONE=+1XXXXXXXXXX
APP_URL=https://leads.108performance.com
CRON_SECRET=your-cron-secret
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=108 Ops <ops@108performance.com>
```
