'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'

interface TrendData {
  date: string
  urlsAnalyzed: number
  issuesFound: number
}

interface DomainTrendsProps {
  urlsAnalyzed: number[]
  issuesFound: number[]
  dates: string[]
}

export function DomainTrends({ urlsAnalyzed, issuesFound, dates }: DomainTrendsProps) {
  // Format data for Recharts
  const data: TrendData[] = dates.map((date, index) => ({
    date: new Date(date).toLocaleDateString(),
    urlsAnalyzed: urlsAnalyzed[index],
    issuesFound: issuesFound[index]
  }))

  // Calculate max values for better graph scaling
  const maxUrls = Math.max(...urlsAnalyzed)
  const maxIssues = Math.max(...issuesFound)
  const yAxisMax = Math.max(maxUrls, maxIssues) * 1.1 // Add 10% padding

  return (
    <div className="w-full h-[300px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            domain={[0, yAxisMax]}
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#E5E7EB' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '0.375rem',
              padding: '0.5rem'
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="urlsAnalyzed"
            name="URLs Analyzed"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ fill: '#3B82F6', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="issuesFound"
            name="Issues Found"
            stroke="#EF4444"
            strokeWidth={2}
            dot={{ fill: '#EF4444', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
