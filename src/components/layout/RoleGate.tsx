'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldX } from 'lucide-react'
import type { UserRole } from '@/types'

interface RoleGateProps {
  allowedRoles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function RoleGate({
  allowedRoles,
  children,
  fallback,
}: RoleGateProps) {
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading')

  useEffect(() => {
    async function checkRole() {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser?.email) {
          router.push('/login')
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
        router.push('/login')
      }
    }

    checkRole()
  }, [supabase, allowedRoles, router])

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
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-8">
        <ShieldX className="h-12 w-12 text-gray-400" />
        <h1 className="text-xl font-bold text-gray-900">Access Denied</h1>
        <p className="text-sm text-gray-500 text-center">
          You don&apos;t have permission to view this page. Contact your
          admin if you believe this is an error.
        </p>
        <button
          onClick={() => router.push('/')}
          className="btn-primary mt-2 px-6 py-2 text-sm"
        >
          Go to Dashboard
        </button>
      </div>
    )
  }

  return <>{children}</>
}
