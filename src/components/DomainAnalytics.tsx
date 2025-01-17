'use client'

interface DomainAnalyticsProps {
  stats: {
    totalScans: number
    totalUrlsAnalyzed: number
    totalIssuesFound: number
    averageIssuesPerScan: number
    successRate: number
    scanFrequency: string
    mostCommonIssue: string
    healthScore: number
    responseTimeAvg: number
    lastScanDuration: number
    issuesByType: {
      type: string
      count: number
      percentage: number
    }[]
    trendIndicators?: {
      urlGrowth: number
      issueReduction: number
      healthScoreChange: number
    }
  }
}

export function DomainAnalytics({ stats }: DomainAnalyticsProps) {
  // Ensure we have default values for trend indicators
  const trends = stats.trendIndicators ?? {
    urlGrowth: 0,
    issueReduction: 0,
    healthScoreChange: 0
  }

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50'
    if (score >= 70) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getTrendIcon = (value: number) => {
    if (value > 0) return '↑'
    if (value < 0) return '↓'
    return '→'
  }

  const getTrendColor = (value: number, inverse: boolean = false) => {
    if (value === 0) return 'text-gray-600'
    const isPositive = inverse ? value < 0 : value > 0
    return isPositive ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Health Score</h3>
          <div className="mt-2 flex items-center">
            <span className={`text-2xl font-bold ${getHealthColor(stats.healthScore)}`}>
              {stats.healthScore}
            </span>
            <span className="ml-2 text-sm font-medium text-gray-500">/100</span>
            <span className={`ml-2 text-sm ${getTrendColor(trends.healthScoreChange)}`}>
              {getTrendIcon(trends.healthScoreChange)}
              {Math.abs(trends.healthScoreChange)}%
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Success Rate</h3>
          <div className="mt-2 flex items-center">
            <span className="text-2xl font-bold text-gray-900">
              {stats.successRate}%
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Avg Response Time</h3>
          <div className="mt-2 flex items-center">
            <span className="text-2xl font-bold text-gray-900">
              {stats.responseTimeAvg}
            </span>
            <span className="ml-1 text-sm font-medium text-gray-500">ms</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">URL Growth</h3>
          <div className="mt-2 flex items-center">
            <span className="text-2xl font-bold text-gray-900">
              {stats.totalUrlsAnalyzed}
            </span>
            <span className={`ml-2 text-sm ${getTrendColor(trends.urlGrowth)}`}>
              {getTrendIcon(trends.urlGrowth)}
              {Math.abs(trends.urlGrowth)}%
            </span>
          </div>
        </div>
      </div>

      {/* Issues Analysis */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Issues by Type</h3>
        <div className="space-y-3">
          {(stats.issuesByType || []).map((issue) => (
            <div key={issue.type} className="flex items-center">
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {issue.type}
                  </span>
                  <span className="text-sm text-gray-500">
                    {issue.count} ({issue.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${issue.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Scan Frequency</h3>
          <p className="mt-2 text-lg font-semibold text-gray-900 capitalize">
            {stats.scanFrequency}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Last Scan Duration</h3>
          <p className="mt-2 text-lg font-semibold text-gray-900">
            {stats.lastScanDuration}s
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Issue Reduction</h3>
          <div className="mt-2 flex items-center">
            <span className="text-lg font-semibold text-gray-900">
              {Math.abs(trends.issueReduction)}%
            </span>
            <span className={`ml-2 ${getTrendColor(trends.issueReduction, true)}`}>
              {getTrendIcon(-trends.issueReduction)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
