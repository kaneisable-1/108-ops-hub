'use client'

import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
}

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-navy-50 mb-3">
        <Inbox className="h-7 w-7 text-navy-300" />
      </div>
      <h3 className="text-base font-semibold text-navy-500">{title}</h3>
      <p className="mt-1 text-sm text-steel-400 max-w-xs">{description}</p>
    </div>
  )
}
