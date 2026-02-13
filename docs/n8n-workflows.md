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
```
