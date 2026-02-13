# 108 Lead Intelligence System

## Project Overview
AI-powered lead triage and management PWA for 108 Performance (baseball/softball training academy in Knoxville, TN). Processes inbound leads from all channels through Claude AI for classification, routes them to the right queue, and provides a mobile-first dashboard for the sales team.

## Tech Stack
- **Frontend:** Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **AI:** Claude API (Anthropic) for lead triage and post-call analysis
- **CRM:** GoHighLevel (GHL) with LC Phone (Twilio) for calls
- **Automation:** n8n workflows for webhooks and integrations
- **Notifications:** Discord webhooks + Twilio SMS
- **Hosting:** Vercel

## Key Files
- `src/app/page.tsx` — Main dashboard (queue tabs, lead cards, filters)
- `src/components/LeadDetail.tsx` — Slide-up panel with lead details, claim, call logging
- `src/components/CallCapture.tsx` — Paste text → AI extraction → GHL contact
- `src/app/api/call-capture/extract/route.ts` — Claude AI triage endpoint
- `src/app/api/webhook/ghl/route.ts` — GHL webhook receiver
- `src/hooks/useLeads.ts` — Lead data + realtime subscriptions
- `src/types/index.ts` — All TypeScript types
- `supabase/schema.sql` — Database schema
- `docs/n8n-workflows.md` — n8n workflow specifications

## Users
- Jose (sales) — SMS + Discord notifications
- Greg (VP/admin) — SMS + Discord notifications
- Will (COO) — Discord only
- Kelly (travel/payments) — Discord only
- Tyler (scheduling) — Discord only

## Commands
- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run lint` — ESLint check

## Architecture Decisions
- Mobile-first PWA (no native app needed)
- Supabase Realtime for live lead updates
- Service role key for n8n/webhook access (bypasses RLS)
- GHL web app deep links for call initiation (native deep links not supported)
- Claude API direct calls (not through GHL's built-in AI) for custom triage logic
