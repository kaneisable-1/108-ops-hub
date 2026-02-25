'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'

interface PipelineFunnelProps {
  data: {
    leads: number
    applied: number
    booked: number
    arrived: number
    completed: number
  }
}

const STAGE_COLORS = [
  '#5DD5F5', // blue lightest
  '#19B5E5', // blue base
  '#0EA5D5', // blue deeper
  '#0891B8', // blue dark
  '#067A9E', // blue darkest
]

const STAGE_LABELS = ['Leads', 'Applied', 'Booked', 'Arrived', 'Completed']

function conversionPct(current: number, previous: number): string {
  if (previous === 0) return '0%'
  return `${Math.round((current / previous) * 100)}%`
}

export default function PipelineFunnel({ data }: PipelineFunnelProps) {
  const values = [data.leads, data.applied, data.booked, data.arrived, data.completed]

  const chartData = STAGE_LABELS.map((label, i) => ({
    stage: label,
    count: values[i],
    conversion: i === 0 ? '' : conversionPct(values[i], values[i - 1]),
  }))

  return (
    <div className="card p-4">
      <h3 className="section-label mb-4">
        Pipeline Funnel
      </h3>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="stage"
            width={80}
            tick={{ fontSize: 12, fill: '#6E6E73' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid var(--border-light)',
              fontSize: 13,
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
            }}
            formatter={(value: number | undefined) => [value ?? 0, 'Count']}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={32}>
            {chartData.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={STAGE_COLORS[index]} />
            ))}
            <LabelList
              dataKey="count"
              position="right"
              style={{ fontSize: 12, fontWeight: 600, fill: '#1D1D1F', fontVariantNumeric: 'tabular-nums' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Conversion rates */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {chartData.slice(1).map((item) => (
          <span
            key={item.stage}
            className="badge tabular-nums"
            style={{
              background: 'color-mix(in srgb, var(--accent-blue) 12%, transparent)',
              color: 'var(--accent-blue)',
            }}
          >
            {item.stage}: {item.conversion}
          </span>
        ))}
      </div>
    </div>
  )
}
