'use client'

import { cn } from '@/lib/utils'
import type { CoachSentiment } from '@/types'

interface SentimentPickerProps {
  value: CoachSentiment | null
  reason: string
  onSentimentChange: (sentiment: CoachSentiment) => void
  onReasonChange: (reason: string) => void
}

const sentiments: { value: CoachSentiment; label: string; description: string; color: string; activeColor: string }[] = [
  {
    value: 'green',
    label: 'Green',
    description: 'No issues',
    color: 'border-gray-200 text-gray-700 hover:bg-gray-50',
    activeColor: 'bg-gray-200 text-gray-900 border-gray-400',
  },
  {
    value: 'yellow',
    label: 'Yellow',
    description: 'Needs discussion',
    color: 'border-gray-200 text-gray-500 hover:bg-gray-50',
    activeColor: 'bg-gray-500 text-white border-gray-500',
  },
  {
    value: 'red',
    label: 'Red',
    description: 'No-go',
    color: 'border-gray-300 text-gray-600 hover:bg-gray-50',
    activeColor: 'bg-gray-900 text-white border-gray-900',
  },
]

export default function SentimentPicker({
  value,
  reason,
  onSentimentChange,
  onReasonChange,
}: SentimentPickerProps) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold uppercase text-gray-400">
        Coach Sentiment
      </label>

      <div className="grid grid-cols-3 gap-2">
        {sentiments.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onSentimentChange(s.value)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all',
              value === s.value ? s.activeColor : s.color
            )}
          >
            <span className="text-sm font-semibold">{s.label}</span>
            <span className={cn(
              'text-xs',
              value === s.value ? 'text-white/80' : 'text-gray-400'
            )}>
              {s.description}
            </span>
          </button>
        ))}
      </div>

      {value && (
        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            {value === 'green' ? 'Positive feedback (required)' :
             value === 'yellow' ? 'What needs to be discussed? (required)' :
             'Why is this a no-go? (required)'}
          </label>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder={
              value === 'green' ? 'Great attitude, worked hard today...' :
              value === 'yellow' ? 'Showed up late, attitude was off...' :
              'Refused to follow instructions, safety concern...'
            }
            className="input w-full resize-none"
            rows={2}
          />
        </div>
      )}
    </div>
  )
}
