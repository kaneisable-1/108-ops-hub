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
    <div className="chart-card">
      <h3 className="chart-title">Coach Performance</h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="coach_name"
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
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8, color: '#A0A4B8' }}
          />
          <Bar
            dataKey="green_count"
            name="Green"
            stackId="sentiment"
            fill="#22C55E"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="yellow_count"
            name="Yellow"
            stackId="sentiment"
            fill="#F59E0B"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="red_count"
            name="Red"
            stackId="sentiment"
            fill="#EF4444"
            radius={[4, 4, 0, 0]}
            barSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
