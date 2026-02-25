-- Add social_profiles JSONB column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS social_profiles JSONB DEFAULT '{}';
