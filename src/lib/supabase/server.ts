import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getServiceRoleKey } from '@/lib/env'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(
        cookiesToSet: {
          name: string
          value: string
          options?: Record<string, unknown>
        }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as never)
          )
        } catch {
          // Server component — can't set cookies
        }
      },
    },
  })
}

export async function createServiceRoleClient() {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(supabaseUrl, getServiceRoleKey())
}
