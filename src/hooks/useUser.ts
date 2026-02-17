'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

// TEST MODE: Mock user for testing without auth
const TEST_USER: User = {
  id: 'test-greg-admin',
  email: 'greg@108performanceacademy.com',
  name: 'Greg (Test)',
  role: 'admin',
  ghl_user_id: null,
  phone: null,
  notify_sms: false,
  notify_discord: false,
  is_coach: false,
  coach_tier: null,
  disciplines: [],
  created_at: new Date().toISOString(),
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      try {
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !authUser?.email) {
          // AUTH DISABLED: fall back to test user instead of null
          setUser(TEST_USER)
          setError(null)
          return
        }

        const { data, error: dbError } = await supabase
          .from('users')
          .select('*')
          .eq('email', authUser.email)
          .single()

        if (dbError || !data) {
          // AUTH DISABLED: fall back to test user
          setUser(TEST_USER)
          setError(null)
          return
        }

        setUser(data)
        setError(null)
      } catch {
        // AUTH DISABLED: fall back to test user
        setUser(TEST_USER)
        setError(null)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      getUser()
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(TEST_USER) // AUTH DISABLED: keep test user
    setError(null)
  }

  return { user, loading, error, signInWithGoogle, signOut }
}
