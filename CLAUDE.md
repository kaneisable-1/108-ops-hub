# 108 Ops Hub (formerly Lead Intelligence System)

## Project Overview
Internal operations platform for 108 Performance (baseball/softball training academy in Knoxville, TN). Covers the full lifecycle: AI-powered lead triage, 108 Path application review, Experience scheduling with coach tier logic, session notes with AI parsing, daily coach briefings, conversion tracking, and Shadow Analytics Brain for retention/engagement metrics.

## Tech Stack
- **Frontend:** Next.js 15 + React 19 + TypeScript + Tailwind CSS + Recharts
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + pg_cron)
- **AI:** Claude API for lead triage, session note parsing, briefing generation
- **CRM:** GoHighLevel (GHL) with LC Phone (Twilio) for calls
- **Automation:** n8n workflows for webhooks, daily briefings, metric engine, Bridge sync
- **Notifications:** Discord webhooks + Twilio SMS + Resend email
- **Hosting:** Vercel (auto-deploy from GitHub on push to main)

## Key Files
- `src/app/page.tsx` — Leads dashboard (queue tabs, lead cards, filters)
- `src/app/applications/page.tsx` — 108 Path application review queue
- `src/app/schedule/page.tsx` — Master schedule / coach assignment calendar
- `src/app/sessions/page.tsx` — Coach session notes + exit evaluations
- `src/app/analytics/page.tsx` — Analytics dashboard (cohort retention, engagement, risk flags)
- `src/app/admin/page.tsx` — Admin settings
- `src/components/LeadDetail.tsx` — Slide-up panel with lead details
- `src/components/CallCapture.tsx` — AI text extraction for leads
- `src/app/api/call-capture/extract/route.ts` — Claude AI triage endpoint
- `src/app/api/webhook/ghl/route.ts` — GHL webhook receiver
- `src/app/api/schedule/suggest/route.ts` — Scheduling algorithm auto-suggest
- `src/app/api/sessions/notes/route.ts` — AI session note parsing
- `src/app/api/briefings/generate/route.ts` — Daily briefing generation
- `src/lib/scheduling/` — Scheduling algorithm (eligibility, availability, ranking, validation)
- `src/hooks/useLeads.ts` — Lead data + realtime subscriptions
- `src/types/index.ts` — All TypeScript types
- `supabase/schema.sql` — Full canonical database schema
- `supabase/migrations/` — Versioned schema migrations
- `docs/plans/` — Design docs and algorithm analysis

## Users & Roles
- Jose (sales) — Leads, conversion tracking | SMS + Discord
- Greg (admin) — Everything | SMS + Discord
- Will (manager) — Leads, applications, schedule, sessions | Discord
- Kelly (coordinator) — Applications, schedule | Discord
- Tyler (coordinator) — Applications, schedule | Discord
- Coaches (11 total: 5 S1, 2 S2, 4 J1) — Sessions, daily briefings | SMS + email + Discord

## Commands
- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run lint` — ESLint check

## Architecture Decisions
- Mobile-first PWA (no native app needed)
- Monolithic Next.js app (Approach A — single codebase, single deploy)
- Supabase Realtime for live updates
- Rule-based greedy scheduling algorithm (not constraint solver) — appropriate for 11 coaches / <20 daily athletes
- Service role key for n8n/webhook access (bypasses RLS)
- Shadow Analytics Brain: event stream + metric engine + materialized metrics, all in Supabase
- Bridge Athletic data ingested via n8n every 4 hours until replaced by Athlete OS
- Daily coach briefings via SMS + email + Discord with progressive disclosure dossiers
- AI-assisted session notes: coach types/dictates freely, Claude parses to structured fields

## Database Tables
- `users` — Internal staff + coaches (with tier/discipline fields)
- `leads` — AthleteProfile spine (lead through converted athlete)
- `lead_activity` — Event stream (all system events)
- `applications` — 108 Path intake applications
- `experiences` — Booked 108 Experiences
- `schedule_slots` — Daily coach-athlete assignments
- `coach_availability` — Days off, sick, vacation
- `sessions` — Session notes + exit evaluations
- `athlete_metrics` — Computed engagement/retention metrics
- `daily_briefings` — Generated briefing archive

## Scheduling Constraints (see docs/plans/scheduling-algorithm-analysis.md)
- Day 1: PRO/COLLEGE/HIGH_HS require S1/S2; Pro requires S1
- Day 2+: Cannot escalate above Day 1 tier
- Final day: Prefer S1/S2 for exit evaluation; Pro requires S1
- Max 3 athletes per coach per block; Pro = solo or college+ pair
- Two-way: morning pitching, afternoon hitting; Under-12: single skill only
