-- Migration 005: Add Phase 3 session notes columns
-- Run this in Supabase SQL Editor
--
-- Adds: note_mode, coach_sentiment, sentiment_reason, drills_performed,
-- key_observations, cues_given, recommendations, athlete_effort_rating,
-- injury_notes, voice_transcript, ai_parsed_at
-- Also: critical fix for daily_briefings UNIQUE constraint

-- Add session notes columns
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS note_mode TEXT DEFAULT 'quick' CHECK (note_mode IN ('quick', 'extended')),
  ADD COLUMN IF NOT EXISTS coach_sentiment TEXT CHECK (coach_sentiment IN ('green', 'yellow', 'red')),
  ADD COLUMN IF NOT EXISTS sentiment_reason TEXT,
  ADD COLUMN IF NOT EXISTS drills_performed TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS key_observations TEXT,
  ADD COLUMN IF NOT EXISTS cues_given TEXT,
  ADD COLUMN IF NOT EXISTS recommendations TEXT,
  ADD COLUMN IF NOT EXISTS athlete_effort_rating INTEGER CHECK (athlete_effort_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS injury_notes TEXT,
  ADD COLUMN IF NOT EXISTS voice_transcript TEXT,
  ADD COLUMN IF NOT EXISTS ai_parsed_at TIMESTAMPTZ;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sessions_coach_sentiment ON public.sessions(coach_sentiment);
CREATE INDEX IF NOT EXISTS idx_sessions_lead_id ON public.sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_sessions_coach_id_date ON public.sessions(coach_id, date);

-- Critical fix from health audit: prevent duplicate briefings
ALTER TABLE public.daily_briefings
  ADD CONSTRAINT daily_briefings_coach_date_unique UNIQUE (coach_id, date);

-- Add coordinator to sessions RLS read policy (design says coordinators see all)
DROP POLICY IF EXISTS "Coordinators can read all sessions" ON public.sessions;
CREATE POLICY "Coordinators can read all sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'coordinator');
