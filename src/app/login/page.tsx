'use client'

import { Suspense } from 'react'
import { useUser } from '@/hooks/useUser'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { LogIn, AlertCircle, Loader2 } from 'lucide-react'

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
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gray-50 px-8">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-500 text-3xl font-bold text-white shadow-lg shadow-brand-500/30">
          108
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Lead Intelligence</h1>
          <p className="mt-2 text-gray-500">
            AI-powered lead management for 108 Performance
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-900">
          <AlertCircle className="h-4 w-4" />
          Authentication failed. Please try again.
        </div>
      )}

      <button onClick={signInWithGoogle} className="btn-primary text-base px-8 py-3">
        <LogIn className="h-5 w-5" />
        Sign in with Google
      </button>

      <p className="text-xs text-gray-400 text-center max-w-xs">
        Sign in with your @108performanceacademy.com Google account to access the lead dashboard.
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
