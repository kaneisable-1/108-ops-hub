'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function SessionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Sessions error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
        <AlertCircle className="h-7 w-7 text-gray-500" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-bold text-gray-900">Sessions Error</h2>
        <p className="mt-1 text-sm text-gray-500 max-w-sm">
          Something went wrong loading sessions. Please try again.
        </p>
      </div>
      <button onClick={reset} className="btn-secondary text-sm">
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-600 max-w-lg overflow-auto">
          {error.message}
        </pre>
      )}
    </div>
  )
}
