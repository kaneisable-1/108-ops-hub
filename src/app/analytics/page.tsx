'use client'

import RoleGate from '@/components/layout/RoleGate'

export default function AnalyticsPage() {
  return (
    <RoleGate allowedRoles={['admin']}>
      <div className="flex min-h-screen flex-col bg-gray-50">
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-2 text-sm text-gray-500 text-center">
            Pipeline metrics, conversion rates, and business intelligence. Coming soon.
          </p>
        </div>
      </div>
    </RoleGate>
  )
}
