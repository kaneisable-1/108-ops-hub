import { createBrowserClient } from '@supabase/ssr'

// Provide fallback dummy values during build/SSG — these pages
// are 'use client' and will re-run with real env vars at runtime.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
