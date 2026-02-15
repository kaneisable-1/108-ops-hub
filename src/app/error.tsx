'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
        <AlertCircle className="h-8 w-8 text-gray-900" />
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-gray-500 max-w-md">
          An unexpected error occurred. Please try again or contact support if
          the problem persists.
        </p>
      </div>

      <button onClick={reset} className="btn-primary">
        Try again
      </button>

      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-4 rounded-xl bg-gray-100 p-4 text-xs text-gray-700 max-w-2xl overflow-auto">
          {error.message}
        </pre>
      )}
    </div>
  )
}
