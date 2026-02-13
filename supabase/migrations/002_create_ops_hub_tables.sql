-- ============================================
-- Migration 002: Create Ops Hub Tables
-- 108 Performance Academy — Operations Hub Schema
-- Run this in Supabase SQL Editor AFTER 001
-- ============================================

-- Enable UUID generation (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Trigger function for updated_at
-- Reuse existing or create if not present
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- ============================================
-- 1. Applications — 108 Path intake
-- Tracks applications from leads, review status,
-- and decision workflow.
-- ============================================
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES public.leads(id),
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'accepted', 'rejected', 'need_more_info')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  decision_reason TEXT,
  video_url TEXT,
  responses JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Experiences — Booked 108 Experiences
-- Represents a paid training block: dates, focus,
-- payment status, and overall experience lifecycle.
-- ============================================
CREATE TABLE IF NOT EXISTS public.experiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES public.leads(id),
  application_id UUID REFERENCES public.applications(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  skill_focus TEXT NOT NULL
    CHECK (skill_focus IN ('hitting', 'pitching', 'two_way')),
  duration_days INTEGER,
  price_cents INTEGER,
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'deposit_paid', 'paid_full', 'payment_plan')),
  deposit_amount_cents INTEGER,
  balance_due_cents INTEGER,
  stripe_payment_id TEXT,
  status TEXT DEFAULT 'booked'
    CHECK (status IN ('booked', 'arrived', 'in_progress', 'completed', 'canceled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. Schedule Slots — Daily coach-athlete assignments
-- Each row is one time block on one day for one athlete
-- with an assigned coach. Supports conflict detection
-- and group scheduling via group_slot_id.
-- ============================================
CREATE TABLE IF NOT EXISTS public.schedule_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experience_id UUID NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id),
  coach_id UUID REFERENCES public.users(id),
  date DATE NOT NULL,
  time_block TEXT NOT NULL
    CHECK (time_block IN ('morning', 'afternoon')),
  skill TEXT NOT NULL
    CHECK (skill IN ('hitting', 'pitching')),
  day_number INTEGER NOT NULL CHECK (day_number >= 1),
  is_final_day BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'canceled', 'conflict')),
  conflict_reason TEXT,
  override_reason TEXT,
  group_slot_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. Coach Availability — Days off tracking
-- One row per coach per date. If available = false
-- the coach is unavailable that day.
-- ============================================
CREATE TABLE IF NOT EXISTS public.coach_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES public.users(id),
  date DATE NOT NULL,
  available BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coach_id, date)
);

-- ============================================
-- 5. Sessions — Coach session records
-- Detailed per-session data: notes (raw + AI-parsed),
-- energy levels, cues, video links, and exit evals.
-- ============================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_slot_id UUID REFERENCES public.schedule_slots(id),
  lead_id UUID REFERENCES public.leads(id),
  coach_id UUID REFERENCES public.users(id),
  date DATE NOT NULL,
  skill TEXT NOT NULL
    CHECK (skill IN ('hitting', 'pitching')),
  duration_minutes INTEGER,
  raw_notes TEXT,
  parsed_notes JSONB,
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
  focus_areas TEXT[],
  cues_that_worked TEXT[],
  is_exit_eval BOOLEAN DEFAULT false,
  exit_eval JSONB,
  video_urls TEXT[],
  performance_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. Athlete Metrics — Computed engagement/retention
-- One row per lead. Periodically recomputed by
-- background jobs. Powers churn risk and engagement
-- dashboards.
-- ============================================
CREATE TABLE IF NOT EXISTS public.athlete_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID UNIQUE REFERENCES public.leads(id),
  days_to_first_login INTEGER,
  days_to_first_workout INTEGER,
  activation_status TEXT,
  sessions_last_7_days INTEGER DEFAULT 0,
  sessions_last_30_days INTEGER DEFAULT 0,
  workouts_completed_lifetime INTEGER DEFAULT 0,
  avg_sessions_per_month DECIMAL,
  engagement_band TEXT
    CHECK (engagement_band IN ('hot', 'warm', 'cold')),
  is_retained_3_months BOOLEAN,
  is_retained_6_months BOOLEAN,
  is_retained_12_months BOOLEAN,
  churn_date TIMESTAMPTZ,
  churn_reason TEXT,
  churn_risk_score DECIMAL CHECK (churn_risk_score BETWEEN 0 AND 1),
  last_computed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. Daily Briefings — Generated briefings archive
-- AI-generated coach briefings stored for history
-- and audit. Tracks delivery channel and timestamp.
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_briefings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID REFERENCES public.users(id),
  date DATE NOT NULL,
  briefing_content JSONB,
  briefing_text TEXT,
  delivered_via TEXT[],
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================

-- Applications: filter by status for review queues
CREATE INDEX IF NOT EXISTS idx_applications_status
  ON public.applications(status);

-- Applications: look up by lead
CREATE INDEX IF NOT EXISTS idx_applications_lead_id
  ON public.applications(lead_id);

-- Experiences: date-range queries filtered by status
CREATE INDEX IF NOT EXISTS idx_experiences_start_date_status
  ON public.experiences(start_date, status);

-- Experiences: look up by lead
CREATE INDEX IF NOT EXISTS idx_experiences_lead_id
  ON public.experiences(lead_id);

-- Schedule slots: the core scheduling query — what is
-- a coach doing on a given date?
CREATE INDEX IF NOT EXISTS idx_schedule_slots_date_coach
  ON public.schedule_slots(date, coach_id);

-- Schedule slots: look up all slots for an experience
CREATE INDEX IF NOT EXISTS idx_schedule_slots_experience_id
  ON public.schedule_slots(experience_id);

-- Sessions: athlete history by date
CREATE INDEX IF NOT EXISTS idx_sessions_lead_date
  ON public.sessions(lead_id, date);

-- Sessions: coach session log
CREATE INDEX IF NOT EXISTS idx_sessions_coach_date
  ON public.sessions(coach_id, date);

-- Coach availability: date lookups
CREATE INDEX IF NOT EXISTS idx_coach_availability_date
  ON public.coach_availability(date);

-- Daily briefings: coach + date lookup
CREATE INDEX IF NOT EXISTS idx_daily_briefings_coach_date
  ON public.daily_briefings(coach_id, date);

-- Athlete metrics: churn risk queries
CREATE INDEX IF NOT EXISTS idx_athlete_metrics_churn_risk
  ON public.athlete_metrics(churn_risk_score DESC)
  WHERE churn_risk_score IS NOT NULL;

-- ============================================
-- Updated_at triggers
-- Apply to all tables that have an updated_at column.
-- coach_availability, athlete_metrics, and daily_briefings
-- do not have updated_at so they are excluded.
-- ============================================

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experiences_updated_at
  BEFORE UPDATE ON public.experiences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_slots_updated_at
  BEFORE UPDATE ON public.schedule_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Views
-- ============================================

-- v_coach_daily_schedule: Denormalized view joining
-- schedule_slots with lead info, experience details,
-- and coach name. Powers the coach daily schedule UI.
CREATE OR REPLACE VIEW public.v_coach_daily_schedule AS
SELECT
  ss.id              AS slot_id,
  ss.date,
  ss.time_block,
  ss.skill,
  ss.day_number,
  ss.is_final_day,
  ss.status          AS slot_status,
  ss.conflict_reason,
  ss.override_reason,
  ss.group_slot_id,
  -- Coach info
  c.id               AS coach_id,
  c.name             AS coach_name,
  c.coach_tier,
  -- Athlete / lead info
  l.id               AS lead_id,
  l.athlete_name,
  l.contact_name,
  l.contact_phone,
  l.athlete_age,
  l.athlete_level,
  -- Experience info
  e.id               AS experience_id,
  e.start_date       AS experience_start,
  e.end_date         AS experience_end,
  e.skill_focus,
  e.status           AS experience_status,
  e.duration_days
FROM public.schedule_slots ss
LEFT JOIN public.leads l       ON l.id = ss.lead_id
LEFT JOIN public.experiences e ON e.id = ss.experience_id
LEFT JOIN public.users c       ON c.id = ss.coach_id;

-- v_at_risk_athletes: Athletes with high churn risk.
-- Used for proactive retention outreach and daily
-- briefing generation.
CREATE OR REPLACE VIEW public.v_at_risk_athletes AS
SELECT
  am.id              AS metric_id,
  am.lead_id,
  l.athlete_name,
  l.contact_name,
  l.contact_email,
  l.contact_phone,
  am.churn_risk_score,
  am.engagement_band,
  am.sessions_last_7_days,
  am.sessions_last_30_days,
  am.churn_reason,
  am.churn_date,
  am.activation_status,
  am.last_computed_at
FROM public.athlete_metrics am
JOIN public.leads l ON l.id = am.lead_id
WHERE am.churn_risk_score > 0.7
ORDER BY am.churn_risk_score DESC;

-- ============================================
-- Row Level Security (enable only — policies defined in 003_rls_policies.sql)
-- ============================================

ALTER TABLE public.applications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_slots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_metrics   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_briefings   ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Realtime subscriptions
-- Idempotent: only adds if not already published
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'applications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'experiences'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.experiences;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'schedule_slots'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_slots;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'coach_availability'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.coach_availability;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'athlete_metrics'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.athlete_metrics;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'daily_briefings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_briefings;
  END IF;
END $$;
