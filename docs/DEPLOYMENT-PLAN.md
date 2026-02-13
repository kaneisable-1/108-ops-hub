# 108 Lead Intelligence System — Deployment Plan

## What You Already Have (from previous conversation)
- Discord Webhook URL: `https://discord.com/api/webhooks/1471363374544715877/YSxGK9hR6VPwkrZDzGOi2PxV5keqig9jq8r9jpgUA1n_i2iDSB7h5yriAziyXYtGtqZV`

## What You Need to Provide
Before we can go live, I need these from you:

| Item | Where to Find It | Who Has It |
|------|-------------------|------------|
| GHL Location ID | GHL → Settings → Business Info → Location ID | Greg |
| GHL API Key | GHL → Settings → Business Profile → API Keys → Create | Greg |
| Anthropic API Key | console.anthropic.com → API Keys → Create | Greg |
| Jose's phone number | (for SMS alerts, format: +1XXXXXXXXXX) | Jose/Greg |
| Greg's phone number | (for SMS alerts, format: +1XXXXXXXXXX) | Greg |
| Twilio Account SID | twilio.com/console (or use GHL's built-in Twilio) | Greg |
| Twilio Auth Token | twilio.com/console | Greg |
| Twilio Phone Number | twilio.com/console → Phone Numbers | Greg |
| n8n instance URL | Your self-hosted n8n or n8n.cloud URL | Greg |
| Domain preference | leads.108performance.com or other? | Greg |

---

## Step 1: Create Supabase Project (5 min)

### 1a. Create the Project
1. Go to **https://supabase.com/dashboard**
2. Click **"New Project"**
3. Settings:
   - **Name:** `108-lead-intel`
   - **Database Password:** Generate a strong one (save it!)
   - **Region:** `US East (N. Virginia)` — closest to Knoxville
   - **Plan:** Free tier works to start (500MB DB, 50k auth users)
4. Wait ~2 min for project to provision

### 1b. Run the Database Schema
1. In Supabase Dashboard → **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy-paste the ENTIRE contents of `supabase/schema.sql` (196 lines)
4. Click **"Run"** (or Cmd+Enter)
5. You should see: "Success. No rows returned" — this means all tables, indexes, policies, and seed users were created

### 1c. Verify the Schema
1. Go to **Table Editor** (left sidebar)
2. Confirm you see 3 tables: `users`, `leads`, `lead_activity`
3. Click `users` — you should see 5 seeded rows (Jose, Greg, Will, Kelly, Tyler)

### 1d. Enable Google OAuth
1. Go to **Authentication** → **Providers**
2. Click **Google**
3. Toggle **Enabled** ON
4. You need a Google OAuth Client:
   - Go to **https://console.cloud.google.com/apis/credentials**
   - Create OAuth 2.0 Client ID (Web application)
   - Authorized redirect URI: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
   - Copy the **Client ID** and **Client Secret**
5. Paste them in Supabase Google provider settings
6. Save

### 1e. Restrict to 108 Domain (Optional but Recommended)
1. In Supabase → **Authentication** → **Settings**
2. Under **Allowed Redirect URLs**, add: `https://leads.108performance.com/**`
3. No need to restrict email domain — the `users` table check handles access control

### 1f. Copy Your Keys
1. Go to **Settings** → **API** (left sidebar)
2. Copy these 3 values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (click to reveal) → `SUPABASE_SERVICE_ROLE_KEY`

### 1g. Enable Realtime
1. Go to **Database** → **Replication**
2. Under "Realtime", confirm `leads` and `lead_activity` tables are enabled
3. (The schema.sql already did this, but verify)

---

## Step 2: Get GHL API Access (5 min)

### 2a. Get Location ID
1. Log in to **GoHighLevel** → go to your 108 Performance sub-account
2. Go to **Settings** → **Business Info**
3. The **Location ID** is displayed (looks like: `abc123XYZdef456`)
4. Copy it → `GHL_LOCATION_ID`

### 2b. Create API Key
1. In GHL → **Settings** → **Business Profile**
2. Navigate to **API Keys** or **Integrations**
3. Click **"Create API Key"**
4. Name: `108 Lead Intel`
5. Permissions needed:
   - ✅ Contacts (Read, Write)
   - ✅ Conversations (Read)
   - ✅ Opportunities (Read, Write)
6. Copy the key → `GHL_API_KEY`

### 2c. Set Up GHL Webhooks (for n8n)
1. In GHL → **Settings** → **Webhooks**
2. Add **Webhook 1 — Inbound Messages:**
   - URL: `https://your-n8n-instance.com/webhook/ghl-inbound`
   - Event: **Customer Replied**
3. Add **Webhook 2 — Call Completed:**
   - URL: `https://your-n8n-instance.com/webhook/ghl-call-completed`
   - Event: **Call Status Changed** (filter to "completed")
4. Save both

---

## Step 3: Get Remaining API Keys (10 min)

### 3a. Anthropic API Key
1. Go to **https://console.anthropic.com**
2. Sign in (or create account)
3. Go to **API Keys** → **Create Key**
4. Name: `108 Lead Intel`
5. Copy → `ANTHROPIC_API_KEY`
6. Add billing/credits if needed (~$5-10/month estimated usage)

### 3b. Twilio (for SMS alerts)
**Option A: New Twilio Account**
1. Go to **https://twilio.com** → Sign up
2. Verify your phone number
3. Get a phone number (free trial includes one)
4. From Console dashboard, copy:
   - **Account SID** → `TWILIO_ACCOUNT_SID`
   - **Auth Token** → `TWILIO_AUTH_TOKEN`
   - **Phone Number** → `TWILIO_PHONE_NUMBER`

**Option B: Use GHL's Twilio (LC Phone)**
- If you're already using LC Phone in GHL, you may be able to use GHL's Twilio sub-account credentials
- Check GHL → Settings → Phone Numbers → Twilio SID info

### 3c. Phone Numbers for Alerts
- Jose's cell: `+1XXXXXXXXXX` format → `JOSE_PHONE`
- Greg's cell: `+1XXXXXXXXXX` format → `GREG_PHONE`

---

## Step 4: Deploy to Vercel (5 min)

### 4a. I Can Deploy Right Now
I'll use the Vercel CLI to deploy. When you give me the go-ahead, I'll:
1. Link the project to your Vercel account
2. Set all environment variables
3. Deploy to production
4. Set up custom domain (leads.108performance.com)

### 4b. Environment Variables to Set in Vercel
All of these go into Vercel → Project Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=<from Step 1f>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Step 1f>
SUPABASE_SERVICE_ROLE_KEY=<from Step 1f>
GHL_API_KEY=<from Step 2b>
GHL_LOCATION_ID=<from Step 2a>
NEXT_PUBLIC_GHL_LOCATION_ID=<from Step 2a>
ANTHROPIC_API_KEY=<from Step 3a>
TWILIO_ACCOUNT_SID=<from Step 3b>
TWILIO_AUTH_TOKEN=<from Step 3b>
TWILIO_PHONE_NUMBER=<from Step 3b>
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1471363374544715877/YSxGK9hR6VPwkrZDzGOi2PxV5keqig9jq8r9jpgUA1n_i2iDSB7h5yriAziyXYtGtqZV
JOSE_PHONE=<from Step 3c>
GREG_PHONE=<from Step 3c>
NEXT_PUBLIC_APP_URL=https://leads.108performance.com
```

### 4c. Custom Domain Setup
1. In Vercel → Project → Settings → Domains
2. Add: `leads.108performance.com`
3. Vercel will give you DNS records to add
4. In your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.):
   - Add CNAME record: `leads` → `cname.vercel-dns.com`
5. Wait for DNS propagation (usually 5-30 min)

---

## Step 5: Set Up n8n Workflows (20-30 min)

### Prerequisites
- n8n instance running (self-hosted or n8n.cloud)
- All API keys from above

### 5a. Workflow 1: AI Lead Triage
**Purpose:** GHL message → Claude AI triage → Save to dashboard → Notify team

1. Create new workflow in n8n
2. Add **Webhook node** (trigger):
   - Method: POST
   - Path: `/ghl-inbound`
   - Copy the webhook URL → paste into GHL webhook settings (Step 2c)
3. Add **Set node** (extract data):
   - `contact_id` = `{{$json.contact_id}}`
   - `contact_name` = `{{$json.full_name}}`
   - `contact_phone` = `{{$json.phone}}`
   - `contact_email` = `{{$json.email}}`
   - `message` = `{{$json.body}}`
   - `channel` = `{{$json.message_type}}`
4. Add **HTTP Request node** (Claude API):
   - Method: POST
   - URL: `https://api.anthropic.com/v1/messages`
   - Headers: `x-api-key: {{$env.ANTHROPIC_API_KEY}}`, `anthropic-version: 2023-06-01`
   - Body: JSON with model, system prompt (copy from app's route.ts), and message
5. Add **Code node** (parse Claude response):
   - Extract JSON from Claude's text response
6. Add **HTTP Request node** (POST to our app):
   - URL: `{{$env.APP_URL}}/api/webhook/ghl`
   - Body: combined contact data + triage result
7. Add **IF node**: Check `triage.classification.temperature === "hot"`
8. (True branch) Add **Discord node** + **Twilio node** for notifications

### 5b. Workflow 2: Post-Call Processing
**Purpose:** Call ends → Get transcript → Claude analyzes → Update lead

1. **Webhook trigger**: Path `/ghl-call-completed`
2. **HTTP Request**: GET GHL recording/transcript
3. **HTTP Request**: Claude API for post-call analysis
4. **Supabase node**: Update lead with call results
5. **IF node**: outcome === "booked" → Discord celebration

### 5c. Workflow 3: Follow-Up Reminders
**Purpose:** Daily 8 AM check for overdue follow-ups

1. **Schedule trigger**: Cron `0 8 * * *` (America/New_York)
2. **Supabase node**: Query overdue leads
3. **Loop node**: For each lead → Discord + optional SMS

### 5d. Workflow 4: Daily Summary
**Purpose:** Daily 6 PM summary of lead activity

1. **Schedule trigger**: Cron `0 18 * * *` (America/New_York)
2. **Supabase node**: Aggregate today's stats
3. **Discord node**: Post summary embed

### n8n Environment Variables
Set these in n8n → Settings → Variables:
- `ANTHROPIC_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GHL_API_KEY`
- `GHL_LOCATION_ID`
- `DISCORD_WEBHOOK_URL`
- `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_PHONE`
- `JOSE_PHONE`, `GREG_PHONE`
- `APP_URL`

---

## Step 6: Post-Deploy Verification Checklist

### Quick Smoke Test (5 min)
- [ ] Visit `https://leads.108performance.com` — see login screen
- [ ] Sign in with Google (@108performanceacademy.com) — see empty dashboard
- [ ] Open Call Capture (phone icon) — paste test text — see AI extraction work
- [ ] Check Supabase Table Editor — new lead row should appear
- [ ] Check Discord channel — notification should appear for hot leads

### Full Integration Test (15 min)
- [ ] Send test message through GHL (any channel)
- [ ] Verify n8n webhook fires and processes the message
- [ ] Verify lead appears in dashboard within seconds (realtime)
- [ ] Claim the lead in dashboard
- [ ] Click "Call in GHL" — verify GHL contact page opens
- [ ] Log a call outcome — verify activity timeline updates
- [ ] Verify Discord notifications for hot leads
- [ ] Verify SMS alerts for hot leads (Jose + Greg phones)

### Mobile PWA Test
- [ ] Open URL on iPhone/Android
- [ ] Tap "Add to Home Screen"
- [ ] Open from home screen — should look like native app
- [ ] Test all touch interactions (scroll, tap, swipe)

---

## Estimated Timeline

| Step | Time | Blocker? |
|------|------|----------|
| 1. Supabase setup | 5 min | Need Google OAuth credentials |
| 2. GHL webhooks | 5 min | Need GHL admin access |
| 3. API keys | 10 min | Need Anthropic account + Twilio |
| 4. Vercel deploy | 5 min | I can do this once I have the keys |
| 5. n8n workflows | 20-30 min | Need n8n instance running |
| 6. Verification | 15 min | All above must be done |
| **Total** | **~60-70 min** | |

---

## Monthly Cost Estimate

| Service | Cost | Notes |
|---------|------|-------|
| Supabase | $0 | Free tier (500MB DB, 50k MAU) |
| Vercel | $0 | Free tier (hobby, fine for internal tool) |
| Anthropic Claude | $5-15/mo | ~$0.003 per triage, 50-100 leads/day |
| Twilio SMS | $2-5/mo | ~$0.0079/SMS, hot leads only |
| GHL | (existing) | Already paying for CRM |
| n8n | $0-20/mo | Free self-hosted, or $20/mo cloud |
| **Total** | **$7-40/mo** | |
