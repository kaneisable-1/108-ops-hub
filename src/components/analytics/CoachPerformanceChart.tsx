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
      <h3 className="section-label mb-4">
        Coach Performance
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
          <XAxis
            dataKey="coach_name"
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
            fill="#2EBD85"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="yellow_count"
            name="Yellow"
            stackId="sentiment"
            fill="#F5A623"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="red_count"
            name="Red"
            stackId="sentiment"
            fill="#E5484D"
            radius={[4, 4, 0, 0]}
            barSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
