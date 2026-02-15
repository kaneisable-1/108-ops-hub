'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'

interface CoachPerformanceChartProps {
  data: Array<{
    coach_name: string
    sessions_count: number
    green_count: number
    yellow_count: number
    red_count: number
  }>
}

export default function CoachPerformanceChart({ data }: CoachPerformanceChartProps) {
  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold uppercase text-gray-400 mb-4">
        Coach Performance
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="coach_name"
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
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
          <Bar
            dataKey="green_count"
            name="Green"
            stackId="sentiment"
            fill="#D1D5DB"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="yellow_count"
            name="Yellow"
            stackId="sentiment"
            fill="#9CA3AF"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="red_count"
            name="Red"
            stackId="sentiment"
            fill="#374151"
            radius={[4, 4, 0, 0]}
            barSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
