'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon, TrashIcon } from '@heroicons/react/24/solid'
import type { DomainGroup as DomainGroupType } from '@/utils/domainGrouping'
import { DomainTrends } from './DomainTrends'
import { DomainAnalytics } from './DomainAnalytics'
import { ConfirmDialog } from './ConfirmDialog'

interface DomainGroupProps {
  group: DomainGroupType
  onDelete?: () => Promise<void>
}

export function DomainGroup({ group, onDelete }: DomainGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [contentHeight, setContentHeight] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [isExpanded, group])

  const handleDelete = async (event: React.MouseEvent) => {
    event.stopPropagation() // Prevent expanding the group when clicking delete
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!onDelete) return
    
    setIsDeleting(true)
    try {
      await onDelete()
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error('Error deleting domain:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const latestStats = group.latestScan?.stats
  const successRate = Math.round(group.overallStats?.successRate)

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 overflow-hidden">
        <div 
          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {group.domain}
              </h3>
              <span className="text-sm text-gray-500">
                {group.totalScans} scan{group.totalScans !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {onDelete && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                  title="Delete all scans for this domain"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}
              <button 
                className="text-gray-400 hover:text-gray-600 transition-transform duration-200"
                aria-expanded={isExpanded}
              >
                <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                  <ChevronDownIcon className="h-5 w-5" />
                </div>
              </button>
            </div>
          </div>

          {/* Latest scan summary */}
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Latest Scan</p>
              <p className="mt-1 text-sm text-gray-900">
                {group.latestScan?.scanDate ? new Date(group.latestScan.scanDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">URLs Analyzed</p>
              <p className="mt-1 text-sm text-gray-900">{latestStats?.urlsAnalyzed || 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Issues Found</p>
              <p className="mt-1 text-sm text-gray-900">{latestStats?.issuesFound || 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Success Rate</p>
              <div className="mt-1 flex items-center">
                <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ease-out ${
                      successRate >= 90 ? 'bg-green-500' :
                      successRate >= 70 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${successRate}%`, transition: 'width 0.5s ease-out' }}
                  />
                </div>
                <span className="ml-2 text-sm text-gray-900">{successRate}%</span>
              </div>
            </div>
          </div>
        </div>

        <div
          ref={contentRef}
          className={`transition-all duration-300 ease-in-out ${
            isExpanded ? 'opacity-100' : 'opacity-0 max-h-0'
          }`}
          style={{ maxHeight: isExpanded ? contentHeight : 0 }}
        >
          <div className="p-4 border-t border-gray-200">
            {/* Content sections */}
            <div className="space-y-6">
              <div className="space-y-6">
                {/* Domain Analytics */}
                <div className="pb-4 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Domain Analytics</h4>
                  <DomainAnalytics stats={{
                    totalScans: group.totalScans,
                    totalUrlsAnalyzed: group.overallStats?.totalUrlsAnalyzed || 0,
                    totalIssuesFound: group.scans.reduce((sum, scan) => sum + scan.stats.issuesFound, 0),
                    averageIssuesPerScan: Math.round(
                      group.scans.reduce((sum, scan) => sum + scan.stats.issuesFound, 0) / group.totalScans
                    ),
                    successRate: group.overallStats?.successRate || 0,
                    scanFrequency: group.overallStats?.scanFrequency || '',
                    mostCommonIssue: group.overallStats?.mostCommonIssue || '',
                    healthScore: group.overallStats?.healthScore || 0,
                    responseTimeAvg: group.overallStats?.responseTimeAvg || 0,
                    lastScanDuration: group.overallStats?.lastScanDuration || 0,
                    issuesByType: group.overallStats?.issuesByType || [],
                    trendIndicators: group.overallStats?.trendIndicators || []
                  }} />
                </div>

                {/* Trend Graph */}
                {group.scans.length > 1 && (
                  <div className="pb-4 border-b border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Trend Analysis</h4>
                    <DomainTrends
                      urlsAnalyzed={group.trends?.urlsAnalyzed || []}
                      issuesFound={group.trends?.issuesFound || []}
                      dates={group.trends?.dates || []}
                    />
                  </div>
                )}

                {/* Scan History */}
                {isExpanded && (
                  <div className="mt-4">
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <div className="px-4 py-5 sm:p-6">
                        <div className="grid grid-cols-1 gap-6">
                          <div>
                            <h4 className="text-lg font-medium">Scan History</h4>
                            <div className="mt-3 max-h-64 overflow-y-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0">
                                  <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Date
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Status
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      URLs Analyzed
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Issues Found
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {group.scans.map((scan) => (
                                    <tr key={scan.id}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {scan.scanDate ? new Date(scan.scanDate).toLocaleString() : 'N/A'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                          scan.status === 'complete' 
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {scan.status}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {scan.stats.urlsAnalyzed}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {scan.stats.issuesFound}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Domain History"
        message={`Are you sure you want to delete all scan history for ${group.domain}? This action cannot be undone.`}
      />
    </>
  )
}
