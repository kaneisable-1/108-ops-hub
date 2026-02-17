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
  '#E4E4E4', // steel-200
  '#D1D1D1', // steel-300
  '#707372', // steel-500
  '#5A5C5B', // steel-600
  '#001a3c', // navy-500
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
      <h3 className="text-xs font-semibold uppercase text-steel-400 mb-4">
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
            tick={{ fontSize: 12, fill: '#5A5C5B' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '0.75rem',
              border: '1px solid #E4E4E4',
              fontSize: 13,
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
              style={{ fontSize: 12, fontWeight: 600, fill: '#001a3c' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Conversion rates */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {chartData.slice(1).map((item) => (
          <span
            key={item.stage}
            className="inline-flex items-center gap-1 rounded-full bg-steel-50 px-2.5 py-0.5 text-xs font-medium text-steel-700"
          >
            {item.stage}: {item.conversion}
          </span>
        ))}
      </div>
    </div>
  )
}
