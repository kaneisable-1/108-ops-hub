'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface LeadVolumeChartProps {
  data: Array<{ month: string; count: number }>
}

export default function LeadVolumeChart({ data }: LeadVolumeChartProps) {
  return (
    <div className="card p-4">
      <h3 className="section-label mb-4">
        Lead Volume
      </h3>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="leadVolumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#19B5E5" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#19B5E5" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#AEAEB2' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#AEAEB2' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
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
            formatter={(value: number | undefined) => [value ?? 0, 'Leads']}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#19B5E5"
            strokeWidth={2}
            fill="url(#leadVolumeGradient)"
            dot={{ r: 3, fill: '#19B5E5', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#19B5E5', strokeWidth: 2, stroke: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
