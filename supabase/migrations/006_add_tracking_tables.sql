-- Migration 006: Add tracking tables for call records, failed webhooks, and notification logging
-- These tables exist in Supabase but were not in the migration files

-- ============================================
-- call_records: Log of outbound calls made by staff
-- ============================================
CREATE TABLE IF NOT EXISTS call_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  duration_seconds INTEGER,
  outcome TEXT CHECK (outcome IN ('answered', 'voicemail', 'no_answer', 'busy', 'wrong_number')),
  notes TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_records_lead_id ON call_records(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_records_user_id ON call_records(user_id);
CREATE INDEX IF NOT EXISTS idx_call_records_created_at ON call_records(created_at DESC);

-- RLS
ALTER TABLE call_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read call records"
  ON call_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert call records"
  ON call_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- failed_webhooks: Log of webhook delivery failures
-- ============================================
CREATE TABLE IF NOT EXISTS failed_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  payload JSONB,
  error_message TEXT,
  status_code INTEGER,
  headers JSONB,
  retry_count INTEGER DEFAULT 0,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_failed_webhooks_source ON failed_webhooks(source);
CREATE INDEX IF NOT EXISTS idx_failed_webhooks_resolved ON failed_webhooks(resolved) WHERE NOT resolved;
CREATE INDEX IF NOT EXISTS idx_failed_webhooks_created_at ON failed_webhooks(created_at DESC);

-- RLS
ALTER TABLE failed_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read failed webhooks"
  ON failed_webhooks FOR SELECT
  TO authenticated
  USING (true);

-- Service role inserts (no RLS needed for service role)

-- ============================================
-- notification_log: Log of all notifications sent
-- ============================================
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'discord', 'email', 'push')),
  recipient TEXT,
  subject TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_channel ON notification_log(channel);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status) WHERE status = 'failed';
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON notification_log(created_at DESC);

-- RLS
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read notification log"
  ON notification_log FOR SELECT
  TO authenticated
  USING (true);
