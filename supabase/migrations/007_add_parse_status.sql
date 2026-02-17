-- Migration 007: Add parse status tracking to sessions table
-- Tracks AI parse lifecycle: none → pending → completed | failed

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS parse_status TEXT DEFAULT 'none'
    CHECK (parse_status IN ('none', 'pending', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS parse_error TEXT;

CREATE INDEX IF NOT EXISTS idx_sessions_parse_status
  ON sessions(parse_status) WHERE parse_status IN ('pending', 'failed');
