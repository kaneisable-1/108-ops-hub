-- ============================================
-- Migration 004: Add pipeline_stage to leads
-- Run in Supabase SQL Editor after migrations 001-003
-- ============================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'lead'
  CHECK (pipeline_stage IN (
    'lead', 'applied', 'accepted', 'booked',
    'arrived', 'completed', 'converting', 'converted', 'nurture'
  ));

CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON public.leads(pipeline_stage);

-- Backfill existing leads based on current status
UPDATE public.leads SET pipeline_stage = 'lead' WHERE pipeline_stage IS NULL AND status = 'new';
UPDATE public.leads SET pipeline_stage = 'lead' WHERE pipeline_stage IS NULL AND status = 'claimed';
UPDATE public.leads SET pipeline_stage = 'lead' WHERE pipeline_stage IS NULL AND status = 'contacted';
UPDATE public.leads SET pipeline_stage = 'converted' WHERE pipeline_stage IS NULL AND status = 'converted';
UPDATE public.leads SET pipeline_stage = 'nurture' WHERE pipeline_stage IS NULL AND status = 'lost';
