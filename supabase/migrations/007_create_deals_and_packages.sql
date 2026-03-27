-- ============================================
-- 007: Deals and Packages tables for voice-to-contract pipeline
-- ============================================

-- Packages reference table (seed data for all 108 offerings)
CREATE TABLE IF NOT EXISTS public.packages (
  code TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  category TEXT CHECK (category IN ('athlete', 'coach', 'academy', 'other')),
  price_cents_monthly INTEGER,
  price_cents_annual INTEGER,
  price_cents_one_time INTEGER,
  duration_days INTEGER,
  requires_experience_scheduling BOOLEAN DEFAULT false,
  requires_simple_booking BOOLEAN DEFAULT false,
  requires_parent_signature_if_minor BOOLEAN DEFAULT true,
  skill_focus_default TEXT,
  ghl_workflow_id TEXT,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed package data
INSERT INTO public.packages (code, display_name, category, price_cents_monthly, price_cents_annual, price_cents_one_time, duration_days, requires_experience_scheduling, description) VALUES
  ('108_experience', '108 Experience', 'athlete', NULL, NULL, 250000, 3, true, '2-5 day fly-in intensive'),
  ('tri_star', 'Tri Star', 'athlete', 49900, 550000, NULL, NULL, false, 'Unlimited local training'),
  ('virtual', 'Virtual Experience', 'athlete', 55000, 600000, NULL, NULL, false, 'Remote coaching'),
  ('virtual_pro', 'Virtual Pro', 'athlete', 100000, 1000000, NULL, NULL, false, 'Remote + quarterly in-person'),
  ('college_prep', 'College Prep', 'athlete', 125000, 1350000, NULL, NULL, false, 'Training + recruiting'),
  ('draft_prep', 'Draft Prep', 'athlete', 150000, 1500000, NULL, NULL, false, 'Training + draft strategy'),
  ('pro_experience', 'Pro Experience', 'athlete', NULL, NULL, NULL, NULL, false, 'Custom pro training'),
  ('tour_experience', 'Tour Experience', 'athlete', NULL, NULL, 50000, 2, false, '2-day camp'),
  ('coaches_experience', 'Coaches Experience', 'coach', NULL, NULL, 50000, NULL, false, 'Shadow the method'),
  ('coaches_mentorship', 'Coaches Mentorship', 'coach', 50000, NULL, NULL, NULL, false, 'Ongoing coach development'),
  ('powered_by_108', 'Powered by 108', 'coach', NULL, 2000000, NULL, NULL, false, 'Full facility partnership'),
  ('performance_institute', 'Performance Institute', 'academy', NULL, NULL, NULL, NULL, false, 'Full-time academy'),
  ('partnership', 'Partnership', 'other', NULL, NULL, NULL, NULL, false, 'Business partnerships')
ON CONFLICT (code) DO NOTHING;

-- Deals table
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES public.leads(id),
  staff_id UUID REFERENCES public.users(id),

  -- Athlete info (parsed from voice memo)
  athlete_name TEXT NOT NULL,
  athlete_phone TEXT,
  athlete_email TEXT,
  athlete_level TEXT CHECK (athlete_level IN ('youth', 'middle_school', 'high_school', 'college', 'pro')),
  athlete_age INTEGER,
  sport TEXT DEFAULT 'baseball',
  skill_focus TEXT,

  -- Package details
  package TEXT NOT NULL REFERENCES public.packages(code),
  billing_frequency TEXT CHECK (billing_frequency IN ('monthly', 'annual', 'one_time', 'custom')),
  price_cents INTEGER NOT NULL,

  -- Deal lifecycle
  status TEXT NOT NULL DEFAULT 'pending_confirmation' CHECK (status IN (
    'pending_confirmation',
    'confirmed',
    'contract_sent',
    'contract_signed',
    'payment_sent',
    'payment_complete',
    'scheduling',
    'complete',
    'expired',
    'canceled',
    'payment_failed',
    'delivery_failed',
    'ghl_failed'
  )),

  -- Integration IDs
  ghl_contact_id TEXT,
  ghl_contract_id TEXT,
  ghl_payment_id TEXT,

  -- AI parsing metadata
  raw_transcript TEXT,
  parsed_data JSONB,
  ai_confidence REAL,
  is_deal BOOLEAN DEFAULT true,

  -- SMS conversation state
  sms_conversation_id TEXT,
  confirmation_sent_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Scheduling
  preferred_start TEXT,
  preferred_schedule TEXT,
  experience_id UUID REFERENCES public.experiences(id),

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deals_staff_status ON public.deals(staff_id, status);
CREATE INDEX IF NOT EXISTS idx_deals_lead ON public.deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_deals_created ON public.deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_phone ON public.deals(athlete_phone);
CREATE INDEX IF NOT EXISTS idx_deals_expires ON public.deals(expires_at) WHERE status = 'contract_sent';

-- Dedup: prevent duplicate active deals for same athlete + package
CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_dedup
  ON public.deals(athlete_phone, package)
  WHERE status NOT IN ('canceled', 'expired', 'complete');

-- Updated_at trigger
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read packages"
  ON public.packages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role full access to packages"
  ON public.packages FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage deals"
  ON public.deals FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to deals"
  ON public.deals FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;
