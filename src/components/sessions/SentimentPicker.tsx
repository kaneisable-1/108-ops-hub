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
    color: 'border-green-200 text-green-700 hover:bg-green-50',
    activeColor: 'bg-green-500 text-white border-green-500',
  },
  {
    value: 'yellow',
    label: 'Yellow',
    description: 'Needs discussion',
    color: 'border-amber-200 text-amber-700 hover:bg-amber-50',
    activeColor: 'bg-amber-500 text-white border-amber-500',
  },
  {
    value: 'red',
    label: 'Red',
    description: 'No-go',
    color: 'border-red-200 text-red-700 hover:bg-red-50',
    activeColor: 'bg-red-500 text-white border-red-500',
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
