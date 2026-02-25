'use client'

import { cn } from '@/lib/utils'

export type ApplicationTab = 'review' | 'pipeline'

interface TabSwitcherProps {
  activeTab: ApplicationTab
  onTabChange: (tab: ApplicationTab) => void
}

const TABS: { value: ApplicationTab; label: string }[] = [
  { value: 'review', label: 'Review' },
  { value: 'pipeline', label: 'Pipeline' },
]

export default function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  return (
    <div className="flex w-full" style={{ borderBottom: '1px solid var(--border-light)' }}>
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={cn(
            'flex-1 py-3 text-sm font-semibold transition-all duration-200 ease-apple relative cursor-pointer'
          )}
          style={{
            color: activeTab === tab.value ? 'var(--accent-blue)' : 'var(--text-tertiary)',
          }}
        >
          {tab.label}
          {activeTab === tab.value && (
            <span
              className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
              style={{ background: 'var(--accent-blue)' }}
            />
          )}
        </button>
      ))}
    </div>
  )
}
