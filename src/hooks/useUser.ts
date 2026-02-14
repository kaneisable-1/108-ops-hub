'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

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
          setUser(null)
          setError(null)
          return
        }

        const { data, error: dbError } = await supabase
          .from('users')
          .select('*')
          .eq('email', authUser.email)
          .single()

        if (dbError || !data) {
          setUser(null)
          setError('Account not provisioned. Contact admin to get access.')
          return
        }

        setUser(data)
        setError(null)
      } catch {
        setUser(null)
        setError('Failed to load user data')
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
    setUser(null)
    setError(null)
  }

  return { user, loading, error, signInWithGoogle, signOut }
}
