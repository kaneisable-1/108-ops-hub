'use client'

import { cn } from '@/lib/utils'

interface PipelineData {
  stage: string
  count: number
}

const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  applied: 'Applied',
  accepted: 'Accepted',
  booked: 'Booked',
  arrived: 'Arrived',
  completed: 'Completed',
  converting: 'Converting',
  converted: 'Converted',
  nurture: 'Nurture',
}

export default function PipelineDistributionChart({ data }: { data: PipelineData[] }) {
  if (data.length === 0) return null

  const total = data.reduce((sum, d) => sum + d.count, 0)
  const maxCount = Math.max(...data.map((d) => d.count))

  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold uppercase text-gray-400 mb-3">
        Pipeline Distribution
      </h3>
      <div className="space-y-2">
        {data.map((d) => {
          const pct = total > 0 ? Math.round((d.count / total) * 100) : 0
          const barPct = maxCount > 0 ? Math.round((d.count / maxCount) * 100) : 0

          return (
            <div key={d.stage} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-20 truncate capitalize">
                {STAGE_LABELS[d.stage] || d.stage}
              </span>
              <div className="flex-1 h-7 bg-gray-50 rounded-lg overflow-hidden relative">
                <div
                  className={cn(
                    'h-full rounded-lg transition-all duration-500',
                    d.stage === 'converted' ? 'bg-gray-900' :
                    d.stage === 'nurture' ? 'bg-gray-300' :
                    'bg-brand-500/80'
                  )}
                  style={{ width: `${barPct}%` }}
                />
                <span className="absolute inset-y-0 right-2 flex items-center text-xs font-medium text-gray-500">
                  {d.count} ({pct}%)
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-gray-400 mt-2 text-right">{total} total</p>
    </div>
  )
}
