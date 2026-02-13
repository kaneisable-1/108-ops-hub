'use client'

import RoleGate from '@/components/layout/RoleGate'

export default function ApplicationsPage() {
  return (
    <RoleGate allowedRoles={['coordinator', 'manager', 'admin']}>
      <div className="flex min-h-screen flex-col bg-gray-50">
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              <path d="M9 14l2 2 4-4" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Applications</h1>
          <p className="mt-2 text-sm text-gray-500 text-center">
            Review and manage athlete experience applications. Coming soon.
          </p>
        </div>
      </div>
    </RoleGate>
  )
}
