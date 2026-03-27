# n8n Voice-to-Contract Workflow Import Guide

## Overview

Three workflows power the voice-to-contract deal capture pipeline:

| Workflow | File | Purpose |
|----------|------|---------|
| **1. Voice Deal Capture** | `workflow-1-voice-deal-capture.json` | SMS/voice memo → AI parse → deal created → staff confirms |
| **2. Deal Status Updates** | `workflow-2-deal-status-updates.json` | GHL webhooks → contract signed / payment / failures |
| **3. Deal Reminders** | `workflow-3-deal-reminders.json` | Cron every 2hrs → nudge staff on stale deals |

---

## Step 1: Create Credentials in n8n

Before importing, set up these 4 credentials in n8n:

### 1a. Twilio API
1. Go to n8n → **Settings** → **Credentials** → **Add Credential**
2. Search for **Twilio API**
3. Enter:
   - **Account SID**: (from [Twilio Console](https://console.twilio.com) → Account Info)
   - **Auth Token**: (same page)
4. Name it: **Twilio**
5. Save

### 1b. OpenAI API
1. **Add Credential** → search **OpenAI API**
2. Enter:
   - **API Key**: `sk-...` (from [platform.openai.com/api-keys](https://platform.openai.com/api-keys))
3. Name it: **OpenAI**
4. Save

### 1c. Supabase API
1. **Add Credential** → search **Supabase**
2. Enter:
   - **Host**: `https://thfoinlxdkgdyasuclcr.supabase.co`
   - **Service Role Key**: (from Supabase → Settings → API → `service_role` key — the longer one, NOT the `anon` key)
3. Name it: **Supabase**
4. Save

### 1d. Header Auth (for Anthropic/Claude API)
1. **Add Credential** → search **Header Auth**
2. Enter:
   - **Name**: `x-api-key`
   - **Value**: `sk-ant-...` (your Anthropic API key from [console.anthropic.com](https://console.anthropic.com))
3. Name it: **Anthropic API**
4. Save

---

## Step 2: Set Environment Variables in n8n

Go to n8n → **Settings** → **Variables** and add:

| Variable | Value | Where to find it |
|----------|-------|-------------------|
| `SUPABASE_URL` | `https://thfoinlxdkgdyasuclcr.supabase.co` | Supabase → Settings → API |
| `SUPABASE_SERVICE_KEY` | `eyJ...` (long key) | Supabase → Settings → API → `service_role` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com) |
| `TWILIO_DEAL_NUMBER` | `+18653814600` | Your Twilio number |
| `OPS_HUB_URL` | `https://your-app.vercel.app` | Your Vercel deployment URL |

---

## Step 3: Import Workflows

For each of the 3 JSON files:

1. Open n8n
2. Click **Add Workflow** (top right) → **Import from File**
3. Select the JSON file
4. The workflow appears with all nodes pre-configured
5. Click each node that shows a ⚠️ warning → select the matching credential from the dropdown
6. Click **Save**
7. Toggle **Active** (top right) to turn it on

### Import order:
1. `workflow-1-voice-deal-capture.json` first (this is the main one)
2. `workflow-2-deal-status-updates.json` second
3. `workflow-3-deal-reminders.json` third

---

## Step 4: Configure Twilio Webhook

After importing and activating Workflow 1:

1. Open Workflow 1 → click the **Webhook** trigger node
2. Copy the **Production URL** shown (looks like `https://your-n8n.com/webhook/twilio-deal-intake`)
3. Go to [Twilio Console](https://console.twilio.com) → **Phone Numbers** → **+1 (865) 381-4600**
4. Under **Messaging** → **A MESSAGE COMES IN**:
   - Set **Webhook** to the n8n production URL
   - Set method to **POST**
5. Click **Save Configuration**

---

## Step 5: Configure GHL Webhooks

After importing and activating Workflow 2:

1. Open Workflow 2 → click the **Webhook** trigger node
2. Copy the **Production URL** (looks like `https://your-n8n.com/webhook/ghl-deal-events`)
3. In GoHighLevel → **Settings** → **Webhooks** → **Add Webhook**
4. Events to subscribe to:
   - Contact Document Signed
   - Payment Received
   - Payment Failed
   - Document Delivery Failed
5. URL: paste the n8n production URL
6. Save

---

## Step 6: Test End-to-End

### Quick smoke test:
1. From your phone, send a text to **(865) 381-4600**: `Test deal for John Smith, Tri Star monthly, $499`
2. You should receive back:
   - First: `Got it, processing your deal info... ⏳`
   - Then (~15 sec later): A deal confirmation card with details
3. Reply **YES** to confirm
4. Check Supabase → `deals` table — you should see the new deal

### Voice memo test:
1. Open Messages on your phone
2. Record a voice memo: *"Just got off the phone with Marcus Johnson. He wants to do the 108 Experience, three days, hitting only. He's a high school junior, 17 years old. Wants to come next month. His number is 615-555-1234."*
3. Send to (865) 381-4600
4. Wait ~30 seconds for the AI parse
5. Review the confirmation card — it should show Marcus Johnson, 108 Experience, $2,500, etc.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No response to SMS | Check Twilio webhook URL is set correctly. Test the n8n webhook URL in browser (should return empty TwiML). |
| "Unknown number" reply | Your phone number isn't in the Supabase `users` table. Add it: SQL Editor → `UPDATE users SET phone = '+1XXXXXXXXXX' WHERE name = 'Your Name'` |
| Audio transcription fails | Check OpenAI API key is valid and has credits. Voice memos must be under 25MB (~5 minutes). |
| Claude parse returns low confidence | Re-record with clearer details: athlete name, package name, price. |
| Deal not appearing in Supabase | Check n8n execution log for errors. Verify SUPABASE_SERVICE_KEY is the `service_role` key (not `anon`). |
| GHL webhooks not firing | Verify webhook URL in GHL settings. Check GHL workflow is active. |
| Reminders not sending | Check Workflow 3 is activated. Verify schedule trigger is running (check execution log). |

---

## Cost Estimates

Per deal cycle: ~$0.05-0.10
- MMS receive: $0.0075
- SMS sent (3-4 messages): $0.03
- Whisper API (~30 sec audio): $0.003
- Claude API (deal parse): $0.01-0.03
- **Monthly at 5-10 deals/day: ~$15-30/month**

---

## Architecture Notes

- **Workflow 1** uses a standard Webhook (not Twilio Trigger) because we need to respond with TwiML and handle the full SMS conversation loop
- **Workflow 2** uses a generic Webhook to receive GHL events — GHL doesn't have a native n8n trigger node
- **Workflow 3** uses Schedule Trigger with a business hours check to avoid sending SMS at 3am
- All Supabase calls use the REST API via HTTP Request (with service_role key) rather than the native Supabase node, for better control over queries and env var usage
- Claude API is called directly via HTTP Request rather than through an AI node, to use the full system prompt with the deal parsing instructions
