'use client'

import RoleGate from '@/components/layout/RoleGate'

export default function SessionsPage() {
  return (
    <RoleGate allowedRoles={['coach', 'manager', 'admin']}>
      <div className="flex min-h-screen flex-col bg-gray-50">
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Sessions</h1>
          <p className="mt-2 text-sm text-gray-500 text-center">
            Log session notes, track athlete progress, and manage evaluations. Coming soon.
          </p>
        </div>
      </div>
    </RoleGate>
  )
}
