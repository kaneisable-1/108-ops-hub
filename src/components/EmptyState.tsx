'use client'

import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
}

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4" style={{ background: 'var(--surface-secondary)' }}>
        <Inbox className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
      </div>
      <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      <p className="mt-1 text-sm max-w-xs" style={{ color: 'var(--text-tertiary)' }}>{description}</p>
    </div>
  )
}
