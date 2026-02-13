-- Migration 001: Extend users table for coach functionality
-- Run this in Supabase SQL Editor

-- Add coach-specific fields to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS coach_tier TEXT CHECK (coach_tier IN ('S1', 'S2', 'J1')),
  ADD COLUMN IF NOT EXISTS disciplines TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_coach BOOLEAN DEFAULT false;

-- Update role check constraint to include 'coach' role
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('sales', 'admin', 'manager', 'coordinator', 'coach'));

-- Seed coach roster from PRD
-- S1 (Senior)
INSERT INTO public.users (email, name, role, is_coach, coach_tier, disciplines, notify_sms, notify_discord) VALUES
  ('eugene@108performanceacademy.com', 'Eugene Bleecker', 'coach', true, 'S1', '{hitting,pitching}', true, true),
  ('nate@108performanceacademy.com', 'Nate Headley', 'coach', true, 'S1', '{hitting,pitching}', true, true),
  ('mac@108performanceacademy.com', 'Ryan McMillan', 'coach', true, 'S1', '{hitting,pitching}', true, true)
ON CONFLICT (email) DO UPDATE SET
  is_coach = true,
  coach_tier = EXCLUDED.coach_tier,
  disciplines = EXCLUDED.disciplines;

-- Will and Jose are already in users table but also S1 coaches
UPDATE public.users SET is_coach = true, coach_tier = 'S1', disciplines = '{hitting,pitching}'
  WHERE email = 'will@108performanceacademy.com';
UPDATE public.users SET is_coach = true, coach_tier = 'S1', disciplines = '{hitting,pitching}'
  WHERE email = 'jose@108performanceacademy.com';

-- S2
INSERT INTO public.users (email, name, role, is_coach, coach_tier, disciplines, notify_sms, notify_discord) VALUES
  ('jacob@108performanceacademy.com', 'Jacob Gwynne', 'coach', true, 'S2', '{hitting,pitching}', true, true),
  ('tyler.s@108performanceacademy.com', 'Tyler Shorter', 'coach', true, 'S2', '{hitting,pitching}', true, true)
ON CONFLICT (email) DO UPDATE SET
  is_coach = true,
  coach_tier = EXCLUDED.coach_tier,
  disciplines = EXCLUDED.disciplines;

-- J1 (Junior)
INSERT INTO public.users (email, name, role, is_coach, coach_tier, disciplines, notify_sms, notify_discord) VALUES
  ('nick@108performanceacademy.com', 'Nick Osborne', 'coach', true, 'J1', '{hitting,pitching}', false, true),
  ('bodie@108performanceacademy.com', 'Bodie Parker', 'coach', true, 'J1', '{hitting,pitching}', false, true),
  ('adam@108performanceacademy.com', 'Adam Snyder', 'coach', true, 'J1', '{hitting,pitching}', false, true),
  ('casey@108performanceacademy.com', 'Casey Kostrzewa', 'coach', true, 'J1', '{hitting,pitching}', false, true)
ON CONFLICT (email) DO UPDATE SET
  is_coach = true,
  coach_tier = EXCLUDED.coach_tier,
  disciplines = EXCLUDED.disciplines;

-- Add extended pipeline and analytics fields to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS bridge_user_id TEXT,
  ADD COLUMN IF NOT EXISTS first_paid_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_active_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS engagement_band TEXT DEFAULT 'warm',
  ADD COLUMN IF NOT EXISTS sessions_last_30_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activation_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS churn_risk BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS acquisition_source TEXT;

-- Add event categorization fields to lead_activity
ALTER TABLE public.lead_activity
  ADD COLUMN IF NOT EXISTS event_category TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
