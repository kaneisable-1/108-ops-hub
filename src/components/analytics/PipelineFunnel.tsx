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
  '#FDBA74', // orange-300
  '#FB923C', // orange-400
  '#F97316', // orange-500 (brand)
  '#EA580C', // orange-600
  '#C2410C', // orange-700
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
    <div className="chart-card">
      <h3 className="chart-title">Pipeline Funnel</h3>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 48, bottom: 0, left: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="stage"
            width={80}
            tick={{ fontSize: 12, fill: '#A0A4B8' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '0.75rem',
              border: '1px solid rgba(255,255,255,0.1)',
              background: '#232538',
              color: '#F1F2F6',
              fontSize: 13,
            }}
            formatter={(value: number | undefined) => [value ?? 0, 'Count']}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={32}>
            {chartData.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={STAGE_COLORS[index]} />
            ))}
            <LabelList
              dataKey="count"
              position="right"
              style={{ fontSize: 12, fontWeight: 600, fill: '#A0A4B8' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Conversion rates */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        {chartData.slice(1).map((item) => (
          <span
            key={item.stage}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium"
            style={{ background: 'rgba(249,115,22,0.1)', color: '#FB923C' }}
          >
            {item.stage}: {item.conversion}
          </span>
        ))}
      </div>
    </div>
  )
}
