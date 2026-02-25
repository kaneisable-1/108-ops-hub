'use client'

export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { useUser } from '@/hooks/useUser'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { LogIn, AlertCircle } from 'lucide-react'

function LoginContent() {
  const { user, loading, signInWithGoogle } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    if (user) {
      router.push('/')
    }
  }, [user, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-8 px-8"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-3xl text-3xl font-bold text-white shadow-lg tabular-nums"
          style={{ background: 'var(--accent-blue)', boxShadow: '0 8px 24px rgba(25, 181, 229, 0.3)' }}
        >
          108
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Ops Hub</h1>
          <p className="mt-2" style={{ color: 'var(--text-tertiary)' }}>
            AI-powered operations for 108 Performance
          </p>
        </div>
      </div>

      {error && (
        <div
          className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm animate-fade-in"
          style={{ background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)', color: 'var(--color-danger)' }}
        >
          <AlertCircle size={16} strokeWidth={1.75} className="flex-shrink-0" />
          Authentication failed. Please try again.
        </div>
      )}

      <button
        onClick={signInWithGoogle}
        className="flex items-center justify-center gap-2 rounded-lg px-8 py-3 text-base font-semibold text-white shadow-sm active:scale-[0.98] transition-all duration-200 ease-apple cursor-pointer"
        style={{ background: 'var(--accent-blue)', boxShadow: '0 2px 8px rgba(25, 181, 229, 0.25)' }}
      >
        <LogIn size={20} strokeWidth={1.75} />
        Sign in with Google
      </button>

      <p className="text-xs text-center max-w-xs leading-relaxed" style={{ color: 'var(--text-placeholder)' }}>
        Sign in with your @108performanceacademy.com Google account to access the dashboard.
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }}
        />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
