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
      <h3 className="text-xs font-semibold uppercase text-steel-400 mb-4">
        Lead Volume
      </h3>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="leadVolumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#001a3c" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#001a3c" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#707372' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#707372' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '0.75rem',
              border: '1px solid #E4E4E4',
              fontSize: 13,
            }}
            formatter={(value: number | undefined) => [value ?? 0, 'Leads']}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#001a3c"
            strokeWidth={2}
            fill="url(#leadVolumeGradient)"
            dot={{ r: 3, fill: '#001a3c', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#001a3c', strokeWidth: 2, stroke: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
