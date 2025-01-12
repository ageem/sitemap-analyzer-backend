import { type AnalysisResult } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'

interface SummaryDashboardProps {
  results: AnalysisResult[]
}

export function SummaryDashboard({ results }: SummaryDashboardProps) {
  // Calculate summary statistics
  const totalUrls = results.length
  const urlsWithIssues = results.filter(r => r.issues.length > 0).length
  const urlsWithoutIssues = totalUrls - urlsWithIssues
  
  // Count specific issues
  const issueCount: { [key: string]: number } = {}
  results.forEach(result => {
    result.issues.forEach(issue => {
      issueCount[issue] = (issueCount[issue] || 0) + 1
    })
  })

  // Sort issues by frequency
  const sortedIssues = Object.entries(issueCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3) // Top 3 issues

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total URLs Card */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-white">
        <div className="absolute right-0 top-0 h-16 sm:h-24 w-16 sm:w-24 translate-x-6 sm:translate-x-8 -translate-y-6 sm:-translate-y-8 transform opacity-20">
          <Globe className="h-full w-full text-blue-600" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium text-blue-800">Total URLs</CardTitle>
          <Globe className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl sm:text-3xl font-bold text-blue-900">{totalUrls}</div>
            <div className="text-xs sm:text-sm font-medium text-blue-700">pages</div>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-blue-100">
            <div className="h-full w-full rounded-full bg-blue-600" />
          </div>
        </CardContent>
      </Card>

      {/* URLs Without Issues Card */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-white">
        <div className="absolute right-0 top-0 h-16 sm:h-24 w-16 sm:w-24 translate-x-6 sm:translate-x-8 -translate-y-6 sm:-translate-y-8 transform opacity-20">
          <CheckCircle className="h-full w-full text-green-600" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium text-green-800">Passed Checks</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl sm:text-3xl font-bold text-green-900">{urlsWithoutIssues}</div>
            <div className="text-xs sm:text-sm font-medium text-green-700">
              ({((urlsWithoutIssues / totalUrls) * 100).toFixed(1)}%)
            </div>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-green-100">
            <div 
              className="h-full rounded-full bg-green-600 transition-all duration-500" 
              style={{ width: `${(urlsWithoutIssues / totalUrls) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* URLs With Issues Card */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-red-50 to-white">
        <div className="absolute right-0 top-0 h-16 sm:h-24 w-16 sm:w-24 translate-x-6 sm:translate-x-8 -translate-y-6 sm:-translate-y-8 transform opacity-20">
          <AlertCircle className="h-full w-full text-red-600" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium text-red-800">Need Attention</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl sm:text-3xl font-bold text-red-900">{urlsWithIssues}</div>
            <div className="text-xs sm:text-sm font-medium text-red-700">
              ({((urlsWithIssues / totalUrls) * 100).toFixed(1)}%)
            </div>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-red-100">
            <div 
              className="h-full rounded-full bg-red-600 transition-all duration-500" 
              style={{ width: `${(urlsWithIssues / totalUrls) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Top Issues Card */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-white">
        <div className="absolute right-0 top-0 h-16 sm:h-24 w-16 sm:w-24 translate-x-6 sm:translate-x-8 -translate-y-6 sm:-translate-y-8 transform opacity-20">
          <AlertTriangle className="h-full w-full text-amber-600" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium text-amber-800">Top Issues</CardTitle>
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedIssues.length > 0 ? (
              sortedIssues.map(([issue, count], index) => (
                <div key={issue}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-gray-600 font-medium truncate pr-2">{issue}</span>
                    <span className="text-amber-700 font-semibold whitespace-nowrap">
                      {count} {count === 1 ? 'page' : 'pages'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-amber-100">
                    <div 
                      className="h-full rounded-full bg-amber-600 transition-all duration-500" 
                      style={{ width: `${(count / totalUrls) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-24 text-sm text-gray-600">
                No issues found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
