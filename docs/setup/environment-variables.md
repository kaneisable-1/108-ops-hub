# Environment Variables

All variables must be set in Vercel (Settings → Environment Variables) for production, and in `.env.local` for local development.

## GoHighLevel (CRM)

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `GHL_API_KEY` | GHL API v2 bearer token | GHL → Settings → Business Profile → API Key |
| `GHL_LOCATION_ID` | GHL location/sub-account ID | GHL → Settings → Business Profile → Location ID |
| `GHL_WEBHOOK_SECRET` | HMAC-SHA256 secret for webhook signature verification | Generate with `openssl rand -hex 32`, share with n8n |

## Twilio (SMS)

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID | Twilio Console → Account Info |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Twilio Console → Account Info |
| `TWILIO_PHONE_NUMBER` | Twilio phone number (E.164 format, e.g. +1865...) | Twilio Console → Phone Numbers |

## Discord

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `DISCORD_WEBHOOK_URL` | Discord channel webhook URL | Discord → Server Settings → Integrations → Webhooks |

## Phone Numbers (notification recipients)

| Variable | Description | Format |
|----------|-------------|--------|
| `JOSE_PHONE` | Jose's cell for sales alerts | E.164: `+1XXXXXXXXXX` |
| `GREG_PHONE` | Greg's cell for admin alerts | E.164: `+1XXXXXXXXXX` |
| `WILL_PHONE` | Will's cell for manager alerts | E.164: `+1XXXXXXXXXX` |

## AI

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `ANTHROPIC_API_KEY` | Claude API key for lead triage + call summaries | console.anthropic.com → API Keys |

## Supabase

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | Supabase Dashboard → Settings → API |

## App

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Public URL of the deployed app | `https://ops.108performance.com` |
| `CRON_SECRET` | Shared secret for n8n → app cron endpoints | Generate with `openssl rand -hex 32` |
