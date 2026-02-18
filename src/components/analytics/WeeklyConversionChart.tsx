'use client'

import { format } from 'date-fns'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

interface WeeklyData {
  week: string
  leads: number
  converted: number
  booked: number
  conversionRate: number
}

export default function WeeklyConversionChart({ data }: { data: WeeklyData[] }) {
  if (data.length === 0) return null

  const chartData = data.map((d) => ({
    ...d,
    label: format(new Date(d.week + 'T00:00:00'), 'MMM d'),
  }))

  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold uppercase text-gray-400 mb-4">
        Weekly Conversion Trend
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              unit="%"
            />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                fontSize: '12px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              }}
            />
            <Bar yAxisId="left" dataKey="leads" fill="#e5e7eb" radius={[4, 4, 0, 0]} name="New Leads" />
            <Bar yAxisId="left" dataKey="booked" fill="#9ca3af" radius={[4, 4, 0, 0]} name="Booked" />
            <Bar yAxisId="left" dataKey="converted" fill="#111827" radius={[4, 4, 0, 0]} name="Converted" />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="conversionRate"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ r: 3, fill: '#f97316' }}
              name="Conversion %"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
