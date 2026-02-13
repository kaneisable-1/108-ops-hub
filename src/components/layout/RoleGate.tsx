'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types'

interface RoleGateProps {
  allowedRoles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function RoleGate({ allowedRoles, children, fallback }: RoleGateProps) {
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading')

  useEffect(() => {
    async function checkRole() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser?.email) {
          setStatus('denied')
          return
        }

        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('email', authUser.email)
          .single()

        if (data && allowedRoles.includes(data.role as UserRole)) {
          setStatus('allowed')
        } else {
          setStatus('denied')
        }
      } catch {
        setStatus('denied')
      }
    }

    checkRole()
  }, [supabase, allowedRoles])

  if (status === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  if (status === 'denied') {
    if (fallback) {
      return <>{fallback}</>
    }
    router.push('/')
    return null
  }

  return <>{children}</>
}
