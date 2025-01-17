'use client'

interface ScanSummaryProps {
  history: Array<{
    id: string
    date: Date
    status: string
    urlsAnalyzed: number
    issuesFound: number
  }>
}

export function ScanSummary({ history }: ScanSummaryProps) {
  // Calculate summary stats
  const totalScans = history.length
  const totalUrlsAnalyzed = history.reduce((sum, scan) => sum + scan.urlsAnalyzed, 0)
  const totalIssuesFound = history.reduce((sum, scan) => sum + scan.issuesFound, 0)

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Scan History</h3>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-sm text-gray-500">Total Scans</div>
          <div className="text-xl font-semibold">{totalScans}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-500">URLs Analyzed</div>
          <div className="text-xl font-semibold">{totalUrlsAnalyzed}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-500">Issues Found</div>
          <div className="text-xl font-semibold">{totalIssuesFound}</div>
        </div>
      </div>
    </div>
  )
}
