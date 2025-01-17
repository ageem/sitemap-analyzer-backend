import { useState } from 'react'
import { ChevronDown, ChevronUp, LayoutList, LayoutGrid } from 'lucide-react'
import { Button } from './ui/Button'
import { formatDistanceToNow } from 'date-fns'

interface ScanHistoryProps {
  history: Array<{
    id: string
    date: Date
    status: string
    urlsAnalyzed: number
    issuesFound: number
  }>
}

export function ScanHistory({ history }: ScanHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCompactView, setIsCompactView] = useState(true)
  
  // Calculate summary stats
  const totalScans = history.length
  const totalUrlsAnalyzed = history.reduce((sum, scan) => sum + scan.urlsAnalyzed, 0)
  const totalIssuesFound = history.reduce((sum, scan) => sum + scan.issuesFound, 0)

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header with summary and controls */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Scan History</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCompactView(!isCompactView)}
              title={isCompactView ? "Switch to detailed view" : "Switch to compact view"}
            >
              {isCompactView ? <LayoutGrid size={16} /> : <LayoutList size={16} />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {isExpanded ? "Show Less" : "Show More"}
            </Button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-2">
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

      {/* Scrollable history list */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-96" : "max-h-32"
        }`}
      >
        <div className="overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {!isCompactView && (
                  <>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      URLs
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issues
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {history.map((scan) => (
                <tr key={scan.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {formatDistanceToNow(scan.date, { addSuffix: true })}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        scan.status === 'Complete'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {scan.status}
                    </span>
                  </td>
                  {!isCompactView && (
                    <>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {scan.urlsAnalyzed}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {scan.issuesFound}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
