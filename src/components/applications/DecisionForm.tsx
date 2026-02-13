'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, HelpCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Decision = 'accepted' | 'rejected' | 'need_more_info'

interface DecisionFormProps {
  onSubmit: (
    decision: Decision,
    reviewNotes?: string,
    decisionReason?: string
  ) => Promise<void>
  loading?: boolean
}

export default function DecisionForm({ onSubmit, loading }: DecisionFormProps) {
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [decisionReason, setDecisionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const decisions: { value: Decision; label: string; icon: React.ReactNode; colors: string }[] = [
    {
      value: 'accepted',
      label: 'Accept',
      icon: <CheckCircle2 className="h-5 w-5" />,
      colors: 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100',
    },
    {
      value: 'rejected',
      label: 'Reject',
      icon: <XCircle className="h-5 w-5" />,
      colors: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
    },
    {
      value: 'need_more_info',
      label: 'Need Info',
      icon: <HelpCircle className="h-5 w-5" />,
      colors: 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100',
    },
  ]

  const selectedColors: Record<Decision, string> = {
    accepted: 'ring-2 ring-green-500 border-green-500',
    rejected: 'ring-2 ring-red-500 border-red-500',
    need_more_info: 'ring-2 ring-amber-500 border-amber-500',
  }

  const handleSubmit = async () => {
    if (!selectedDecision) return
    setSubmitting(true)
    try {
      await onSubmit(selectedDecision, reviewNotes || undefined, decisionReason || undefined)
    } finally {
      setSubmitting(false)
    }
  }

  const isDisabled = loading || submitting || !selectedDecision

  return (
    <div className="space-y-4">
      {/* Decision buttons */}
      <div>
        <label className="text-xs font-semibold uppercase text-gray-400 mb-2 block">
          Decision
        </label>
        <div className="grid grid-cols-3 gap-2">
          {decisions.map((d) => (
            <button
              key={d.value}
              onClick={() => setSelectedDecision(d.value)}
              disabled={loading || submitting}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all',
                d.colors,
                selectedDecision === d.value && selectedColors[d.value]
              )}
            >
              {d.icon}
              <span className="text-xs font-semibold">{d.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-semibold uppercase text-gray-400 mb-1 block">
          Review Notes
        </label>
        <textarea
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          placeholder="Internal notes about this application..."
          className="input min-h-[80px] resize-none"
          disabled={loading || submitting}
        />
      </div>

      {/* Decision reason (shown for reject / need more info) */}
      {selectedDecision && selectedDecision !== 'accepted' && (
        <div>
          <label className="text-xs font-semibold uppercase text-gray-400 mb-1 block">
            {selectedDecision === 'rejected' ? 'Rejection Reason' : 'What info is needed?'}
          </label>
          <textarea
            value={decisionReason}
            onChange={(e) => setDecisionReason(e.target.value)}
            placeholder={
              selectedDecision === 'rejected'
                ? 'Reason for rejection...'
                : 'Specify what additional information is needed...'
            }
            className="input min-h-[60px] resize-none"
            disabled={loading || submitting}
          />
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isDisabled}
        className={cn(
          'w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors',
          selectedDecision === 'accepted' && 'bg-green-600 hover:bg-green-700',
          selectedDecision === 'rejected' && 'bg-red-600 hover:bg-red-700',
          selectedDecision === 'need_more_info' && 'bg-amber-600 hover:bg-amber-700',
          !selectedDecision && 'bg-gray-300 cursor-not-allowed',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting...
          </span>
        ) : (
          `Submit ${selectedDecision ? decisions.find(d => d.value === selectedDecision)?.label : 'Decision'}`
        )}
      </button>
    </div>
  )
}
