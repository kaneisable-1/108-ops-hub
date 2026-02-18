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
    <div className="chart-card">
      <h3 className="chart-title">Lead Volume</h3>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="leadVolumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F97316" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#F97316" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#6B6F82' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6B6F82' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '0.75rem',
              border: '1px solid rgba(255,255,255,0.1)',
              background: '#232538',
              color: '#F1F2F6',
              fontSize: 13,
            }}
            formatter={(value: number | undefined) => [value ?? 0, 'Leads']}
            cursor={{ stroke: 'rgba(249,115,22,0.3)' }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#F97316"
            strokeWidth={2}
            fill="url(#leadVolumeGradient)"
            dot={{ r: 3, fill: '#F97316', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#F97316', strokeWidth: 2, stroke: '#1C1E2B' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
