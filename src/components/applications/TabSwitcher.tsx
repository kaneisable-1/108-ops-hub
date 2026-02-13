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
    <div className="flex w-full border-b border-gray-200">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={cn(
            'flex-1 py-3 text-sm font-semibold transition-colors relative',
            activeTab === tab.value
              ? 'text-brand-600'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {tab.label}
          {activeTab === tab.value && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-t-full" />
          )}
        </button>
      ))}
    </div>
  )
}
