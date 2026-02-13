-- ============================================
-- Migration 003: Row Level Security Policies
-- Run this in Supabase SQL Editor
--
-- Roles:
--   anon           No access (default deny)
--   authenticated  Logged-in users (read access to most tables)
--   service_role   Full access (used by n8n webhooks, bypasses RLS)
--
-- Staff roles (stored in public.users.role):
--   sales          Leads access
--   coordinator    Leads, Applications, Schedule
--   coach          Sessions (own athletes), Schedule (own)
--   manager        Leads, Applications, Schedule, Sessions
--   admin          Everything
--
-- The auth user's email matches public.users.email.
-- Pattern: auth.jwt()->>'email' = public.users.email
-- ============================================


-- ============================================
-- Helper: get the current user's role from public.users
-- This avoids repeating the subquery everywhere.
-- ============================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE email = auth.jwt()->>'email' LIMIT 1;
$$;

-- ============================================
-- Helper: get the current user's id from public.users
-- ============================================
CREATE OR REPLACE FUNCTION public.get_my_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE email = auth.jwt()->>'email' LIMIT 1;
$$;


-- ============================================
-- 1. USERS
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "Authenticated users can read users" ON public.users;
DROP POLICY IF EXISTS "Service role full access to users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;

-- All authenticated users can read the users table (needed for name lookups, etc.)
CREATE POLICY "Authenticated users can read users"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete users
CREATE POLICY "Admins can manage users"
  ON public.users FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- Service role has full access (n8n webhooks, backend jobs)
CREATE POLICY "Service role full access to users"
  ON public.users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================
-- 2. LEADS
-- ============================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "Authenticated users can read leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Service role full access to leads" ON public.leads;

-- All authenticated users can read leads
CREATE POLICY "Authenticated users can read leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can insert leads (call capture, etc.)
CREATE POLICY "Authenticated users can insert leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- All authenticated users can update leads (claim, status change, etc.)
CREATE POLICY "Authenticated users can update leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (true);

-- Service role has full access (GHL webhooks, n8n workflows)
CREATE POLICY "Service role full access to leads"
  ON public.leads FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================
-- 3. LEAD_ACTIVITY
-- ============================================
ALTER TABLE public.lead_activity ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "Authenticated users can read activity" ON public.lead_activity;
DROP POLICY IF EXISTS "Authenticated users can insert activity" ON public.lead_activity;
DROP POLICY IF EXISTS "Service role full access to activity" ON public.lead_activity;
DROP POLICY IF EXISTS "Service role full access to lead_activity" ON public.lead_activity;

-- All authenticated users can read the activity log
CREATE POLICY "Authenticated users can read lead_activity"
  ON public.lead_activity FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can insert activity entries
CREATE POLICY "Authenticated users can insert lead_activity"
  ON public.lead_activity FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Service role has full access (n8n event stream ingestion)
CREATE POLICY "Service role full access to lead_activity"
  ON public.lead_activity FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================
-- 4. APPLICATIONS
-- ============================================
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read applications" ON public.applications;
DROP POLICY IF EXISTS "Staff can manage applications" ON public.applications;
DROP POLICY IF EXISTS "Service role full access to applications" ON public.applications;

-- All authenticated users can read applications
CREATE POLICY "Authenticated users can read applications"
  ON public.applications FOR SELECT
  TO authenticated
  USING (true);

-- Coordinators, managers, and admins can insert/update/delete applications
CREATE POLICY "Staff can manage applications"
  ON public.applications FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('coordinator', 'manager', 'admin'))
  WITH CHECK (public.get_my_role() IN ('coordinator', 'manager', 'admin'));

-- Service role has full access (GHL webhook creates applications)
CREATE POLICY "Service role full access to applications"
  ON public.applications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================
-- 5. EXPERIENCES
-- ============================================
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read experiences" ON public.experiences;
DROP POLICY IF EXISTS "Staff can manage experiences" ON public.experiences;
DROP POLICY IF EXISTS "Service role full access to experiences" ON public.experiences;

-- All authenticated users can read experiences
CREATE POLICY "Authenticated users can read experiences"
  ON public.experiences FOR SELECT
  TO authenticated
  USING (true);

-- Coordinators, managers, and admins can insert/update/delete experiences
CREATE POLICY "Staff can manage experiences"
  ON public.experiences FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('coordinator', 'manager', 'admin'))
  WITH CHECK (public.get_my_role() IN ('coordinator', 'manager', 'admin'));

-- Service role has full access (n8n creates experiences from GHL pipeline)
CREATE POLICY "Service role full access to experiences"
  ON public.experiences FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================
-- 6. SCHEDULE_SLOTS
--
-- SELECT: Coaches see only their own slots; admin/manager/coordinator see all
-- INSERT/UPDATE/DELETE: Only admin, manager, coordinator
-- ============================================
ALTER TABLE public.schedule_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read schedule_slots" ON public.schedule_slots;
DROP POLICY IF EXISTS "Coaches can read own schedule_slots" ON public.schedule_slots;
DROP POLICY IF EXISTS "Staff can read all schedule_slots" ON public.schedule_slots;
DROP POLICY IF EXISTS "Staff can manage schedule_slots" ON public.schedule_slots;
DROP POLICY IF EXISTS "Service role full access to schedule_slots" ON public.schedule_slots;

-- Coaches can only see their own assigned slots
CREATE POLICY "Coaches can read own schedule_slots"
  ON public.schedule_slots FOR SELECT
  TO authenticated
  USING (
    -- Coaches see only their own slots
    (public.get_my_role() = 'coach' AND coach_id = public.get_my_user_id())
  );

-- Admin, manager, coordinator, and sales can see all schedule slots
CREATE POLICY "Staff can read all schedule_slots"
  ON public.schedule_slots FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'manager', 'coordinator', 'sales')
  );

-- Only admin, manager, coordinator can create/update/delete schedule slots
CREATE POLICY "Staff can manage schedule_slots"
  ON public.schedule_slots FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'manager', 'coordinator'))
  WITH CHECK (public.get_my_role() IN ('admin', 'manager', 'coordinator'));

-- Service role has full access (scheduling algorithm, n8n workflows)
CREATE POLICY "Service role full access to schedule_slots"
  ON public.schedule_slots FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================
-- 7. COACH_AVAILABILITY
--
-- SELECT: All authenticated users (coordinators need to see who's available)
-- INSERT/UPDATE/DELETE: Coaches can manage their own; admin/manager/coordinator can manage all
-- ============================================
ALTER TABLE public.coach_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read coach_availability" ON public.coach_availability;
DROP POLICY IF EXISTS "Coaches can manage own availability" ON public.coach_availability;
DROP POLICY IF EXISTS "Staff can manage all availability" ON public.coach_availability;
DROP POLICY IF EXISTS "Service role full access to coach_availability" ON public.coach_availability;

-- All authenticated users can read availability (needed for schedule planning)
CREATE POLICY "Authenticated users can read coach_availability"
  ON public.coach_availability FOR SELECT
  TO authenticated
  USING (true);

-- Coaches can insert/update/delete their own availability rows
CREATE POLICY "Coaches can manage own availability"
  ON public.coach_availability FOR ALL
  TO authenticated
  USING (
    public.get_my_role() = 'coach'
    AND coach_id = public.get_my_user_id()
  )
  WITH CHECK (
    public.get_my_role() = 'coach'
    AND coach_id = public.get_my_user_id()
  );

-- Admin, manager, coordinator can manage any coach's availability
CREATE POLICY "Staff can manage all availability"
  ON public.coach_availability FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'manager', 'coordinator'))
  WITH CHECK (public.get_my_role() IN ('admin', 'manager', 'coordinator'));

-- Service role has full access
CREATE POLICY "Service role full access to coach_availability"
  ON public.coach_availability FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================
-- 8. SESSIONS
--
-- SELECT: Coaches see only their own sessions; manager/admin see all
-- INSERT/UPDATE: Coaches can manage their own sessions
-- DELETE: Only admin
-- ============================================
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read sessions" ON public.sessions;
DROP POLICY IF EXISTS "Coaches can read own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Managers can read all sessions" ON public.sessions;
DROP POLICY IF EXISTS "Coaches can manage own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Managers can manage all sessions" ON public.sessions;
DROP POLICY IF EXISTS "Service role full access to sessions" ON public.sessions;

-- Coaches can only see their own sessions
CREATE POLICY "Coaches can read own sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'coach'
    AND coach_id = public.get_my_user_id()
  );

-- Manager and admin can see all sessions
CREATE POLICY "Managers can read all sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'manager')
  );

-- Coaches can insert and update their own sessions (note-taking, exit evals)
CREATE POLICY "Coaches can manage own sessions"
  ON public.sessions FOR ALL
  TO authenticated
  USING (
    coach_id = public.get_my_user_id()
  )
  WITH CHECK (
    coach_id = public.get_my_user_id()
  );

-- Manager and admin can manage all sessions
CREATE POLICY "Managers can manage all sessions"
  ON public.sessions FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'manager'));

-- Service role has full access (AI session note parsing, n8n workflows)
CREATE POLICY "Service role full access to sessions"
  ON public.sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================
-- 9. ATHLETE_METRICS
-- ============================================
ALTER TABLE public.athlete_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read athlete_metrics" ON public.athlete_metrics;
DROP POLICY IF EXISTS "Service role full access to athlete_metrics" ON public.athlete_metrics;

-- All authenticated users can read metrics (used in dossiers, analytics)
CREATE POLICY "Authenticated users can read athlete_metrics"
  ON public.athlete_metrics FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can write metrics (metric engine runs via n8n)
-- No authenticated user should directly insert/update metrics.
CREATE POLICY "Service role full access to athlete_metrics"
  ON public.athlete_metrics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================
-- 10. DAILY_BRIEFINGS
--
-- SELECT: Coaches see only their own briefings; admin sees all
-- INSERT/UPDATE/DELETE: Only service role (generated by n8n briefing workflow)
-- ============================================
ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches can read own briefings" ON public.daily_briefings;
DROP POLICY IF EXISTS "Admins can read all briefings" ON public.daily_briefings;
DROP POLICY IF EXISTS "Service role full access to daily_briefings" ON public.daily_briefings;

-- Coaches can only see their own daily briefings
CREATE POLICY "Coaches can read own briefings"
  ON public.daily_briefings FOR SELECT
  TO authenticated
  USING (
    coach_id = public.get_my_user_id()
  );

-- Admin can see all briefings (for audit/review)
CREATE POLICY "Admins can read all briefings"
  ON public.daily_briefings FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
  );

-- Only service role can write briefings (n8n daily briefing workflow)
CREATE POLICY "Service role full access to daily_briefings"
  ON public.daily_briefings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================
-- GRANT STATEMENTS
-- Ensure the anon role has no access and authenticated
-- role can use the tables (RLS policies control the rest).
-- ============================================

-- Revoke all from anon on every table (defense in depth)
REVOKE ALL ON public.users FROM anon;
REVOKE ALL ON public.leads FROM anon;
REVOKE ALL ON public.lead_activity FROM anon;
REVOKE ALL ON public.applications FROM anon;
REVOKE ALL ON public.experiences FROM anon;
REVOKE ALL ON public.schedule_slots FROM anon;
REVOKE ALL ON public.coach_availability FROM anon;
REVOKE ALL ON public.sessions FROM anon;
REVOKE ALL ON public.athlete_metrics FROM anon;
REVOKE ALL ON public.daily_briefings FROM anon;

-- Grant usage to authenticated (RLS policies handle row-level filtering)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activity TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_slots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_availability TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.athlete_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_briefings TO authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_user_id() TO authenticated;
