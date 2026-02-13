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
      <h3 className="text-xs font-semibold uppercase text-gray-400 mb-4">
        Lead Volume
      </h3>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="leadVolumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#F97316" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '0.75rem',
              border: '1px solid #E5E7EB',
              fontSize: 13,
            }}
            formatter={(value: number | undefined) => [value ?? 0, 'Leads']}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#F97316"
            strokeWidth={2}
            fill="url(#leadVolumeGradient)"
            dot={{ r: 3, fill: '#F97316', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#F97316', strokeWidth: 2, stroke: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
