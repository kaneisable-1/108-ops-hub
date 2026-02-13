'use client'

import { useState } from 'react'
import { X, Check, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SlotSuggestion, CoachSuggestionScore, CoachTier } from '@/types'

interface SuggestionReviewProps {
  suggestions: SlotSuggestion[]
  onAccept: (assignments: { date: string; timeBlock: string; coachId: string }[]) => Promise<void>
  onClose: () => void
}

function getTierColor(tier: CoachTier): string {
  switch (tier) {
    case 'S1': return 'text-amber-700'
    case 'S2': return 'text-blue-700'
    case 'J1': return 'text-gray-600'
  }
}

export default function SuggestionReview({ suggestions, onAccept, onClose }: SuggestionReviewProps) {
  // State: for each block, which coach is selected
  const [selections, setSelections] = useState<Map<string, CoachSuggestionScore>>(() => {
    const map = new Map<string, CoachSuggestionScore>()
    for (const day of suggestions) {
      for (const block of day.blocks) {
        const key = `${day.date}|${block.time_block}`
        if (block.suggested_coach) {
          map.set(key, block.suggested_coach)
        }
      }
    }
    return map
  })

  const [submitting, setSubmitting] = useState(false)

  const selectCoach = (key: string, coach: CoachSuggestionScore) => {
    setSelections((prev) => {
      const next = new Map(prev)
      next.set(key, coach)
      return next
    })
  }

  const handleAccept = async () => {
    setSubmitting(true)
    try {
      const assignments = Array.from(selections.entries()).map(([key, coach]) => {
        const [date, timeBlock] = key.split('|')
        return { date, timeBlock, coachId: coach.id }
      })
      await onAccept(assignments)
      onClose()
    } catch {
      // Error handled by parent
    } finally {
      setSubmitting(false)
    }
  }

  const totalBlocks = suggestions.reduce((sum, d) => sum + d.blocks.length, 0)
  const assignedBlocks = selections.size
  const conflicts = suggestions.flatMap((d) =>
    d.blocks.filter((b) => b.conflict).map((b) => b.conflict!)
  )

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white pb-safe shadow-xl">
        <div className="sticky top-0 z-10 bg-white px-4 pt-3 pb-2 border-b border-gray-100 rounded-t-3xl">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-gray-300" />
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Review Suggestions</h2>
              <p className="text-xs text-gray-500">
                {assignedBlocks}/{totalBlocks} blocks assigned
                {conflicts.length > 0 && (
                  <span className="text-red-600 ml-1">
                    ({conflicts.length} {conflicts.length === 1 ? 'conflict' : 'conflicts'})
                  </span>
                )}
              </p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {suggestions.map((day) => (
            <div key={day.date} className="card p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  Day {day.day_number}
                  {day.is_final_day && (
                    <span className="ml-2 badge bg-purple-100 text-purple-700 text-[10px]">EXIT</span>
                  )}
                </h3>
                <span className="text-xs text-gray-400">{day.date}</span>
              </div>

              {day.blocks.map((block) => {
                const key = `${day.date}|${block.time_block}`
                const selected = selections.get(key)
                const allOptions = [
                  ...(block.suggested_coach ? [block.suggested_coach] : []),
                  ...block.alternatives,
                ]

                return (
                  <div key={key} className="mt-2 border-t border-gray-100 pt-2">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-medium text-gray-500 capitalize">
                        {block.time_block} — {block.skill}
                      </span>
                      {block.conflict && (
                        <span className="badge bg-red-100 text-red-700 text-[10px]">CONFLICT</span>
                      )}
                    </div>

                    {block.conflict && !block.suggested_coach ? (
                      <p className="text-xs text-red-600">{block.conflict}</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {allOptions.map((coach) => (
                          <button
                            key={coach.id}
                            onClick={() => selectCoach(key, coach)}
                            className={cn(
                              'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                              selected?.id === coach.id
                                ? 'border-brand-500 bg-brand-50 text-brand-700'
                                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            )}
                          >
                            <span className={getTierColor(coach.tier)}>{coach.tier}</span>
                            {' '}{coach.name}
                            <span className="ml-1 text-gray-400">({coach.score})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={handleAccept}
              disabled={submitting || assignedBlocks === 0}
              className="btn-primary flex-1"
            >
              {submitting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Confirm ({assignedBlocks})
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
