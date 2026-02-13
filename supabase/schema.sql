-- ============================================
-- 108 Lead Intelligence System — Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Drop existing trigger/function if they exist
-- (must happen BEFORE dropping tables)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
    DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
  END IF;
END $$;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- ============================================
-- Drop existing tables if they exist (clean slate)
-- Order matters due to foreign key constraints
-- ============================================
DROP TABLE IF EXISTS lead_activity CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================
-- Users table (in public schema, separate from auth.users)
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sales' CHECK (role IN ('sales', 'admin', 'manager', 'coordinator')),
  ghl_user_id TEXT,
  phone TEXT,
  notify_sms BOOLEAN DEFAULT false,
  notify_discord BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial users
INSERT INTO public.users (email, name, role, notify_sms, notify_discord) VALUES
  ('jose@108performanceacademy.com', 'Jose', 'sales', true, true),
  ('greg@108performanceacademy.com', 'Greg', 'admin', true, true),
  ('will@108performanceacademy.com', 'Will', 'manager', false, true),
  ('kelly@108performanceacademy.com', 'Kelly', 'coordinator', false, true),
  ('tyler@108performanceacademy.com', 'Tyler', 'coordinator', false, true)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- Leads table
-- ============================================
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ghl_contact_id TEXT UNIQUE NOT NULL,

  -- Contact info
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,

  -- Athlete info
  athlete_name TEXT,
  athlete_age INTEGER,
  athlete_position TEXT,
  athlete_level TEXT CHECK (athlete_level IN ('youth', 'middle_school', 'high_school', 'college', 'pro')),
  athlete_velocity TEXT,
  athlete_school_team TEXT,

  -- Location
  location TEXT,
  distance_hours DECIMAL,

  -- AI Classification
  lead_temperature TEXT NOT NULL DEFAULT 'warm' CHECK (lead_temperature IN ('hot', 'warm', 'cold')),
  fit_score TEXT CHECK (fit_score IN ('good_fit', 'maybe', 'not_a_fit')),
  service_match TEXT,
  intent TEXT CHECK (intent IN ('ready_to_book', 'has_questions', 'just_browsing', 'price_shopping')),

  -- Queue & Routing
  queue TEXT NOT NULL DEFAULT 'follow_up' CHECK (queue IN ('call_now', 'follow_up', 'nurture', 'not_a_fit')),
  priority INTEGER DEFAULT 50,
  ai_summary TEXT,
  original_message TEXT,
  suggested_response TEXT,
  channel TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Status & Claims
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'claimed', 'contacted', 'converted', 'lost')),
  claimed_by UUID REFERENCES public.users(id),
  claimed_at TIMESTAMPTZ,

  -- Call tracking
  call_outcome TEXT CHECK (call_outcome IN ('booked', 'follow_up_scheduled', 'not_interested', 'no_answer', 'left_voicemail', 'wrong_number', 'price_objection', 'needs_more_info')),
  call_notes TEXT,
  call_duration INTEGER, -- seconds
  follow_up_date TIMESTAMPTZ,

  -- Timestamps
  inbound_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Lead Activity / Audit Log
-- ============================================
CREATE TABLE public.lead_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_leads_queue ON leads(queue);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_temperature ON leads(lead_temperature);
CREATE INDEX idx_leads_claimed_by ON leads(claimed_by);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_priority ON leads(priority DESC);
CREATE INDEX idx_leads_ghl_contact_id ON leads(ghl_contact_id);
CREATE INDEX idx_lead_activity_lead_id ON lead_activity(lead_id);
CREATE INDEX idx_lead_activity_created_at ON lead_activity(created_at DESC);

-- ============================================
-- Updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activity ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all leads
CREATE POLICY "Authenticated users can read leads"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert leads
CREATE POLICY "Authenticated users can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update leads
CREATE POLICY "Authenticated users can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (true);

-- Users table policies
CREATE POLICY "Authenticated users can read users"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

-- Activity policies
CREATE POLICY "Authenticated users can read activity"
  ON lead_activity FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert activity"
  ON lead_activity FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Service role can do everything (for n8n webhooks)
CREATE POLICY "Service role full access to leads"
  ON leads FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to activity"
  ON lead_activity FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to users"
  ON public.users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Realtime subscriptions
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE leads;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'lead_activity'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE lead_activity;
  END IF;
END $$;
