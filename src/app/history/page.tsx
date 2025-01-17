'use client'

import { useState, useEffect } from 'react'
import { groupHistoryByDomain } from '@/utils/domainGrouping'
import { DomainGroup } from '@/components/DomainGroup'
import type { SearchHistoryItem, AnalysisResult } from '@/types/api'
import { ScanSummary } from '@/components/ScanSummary'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trash2, ExternalLink, ChevronDown, ChevronUp, Filter, X, Download, FileText } from 'lucide-react'
import { exportToCSV, exportToJSON, exportToHTML, downloadFile } from '@/utils/export'
import { generateScanCSV, generateScanJSON, generateScanHTML } from '@/utils/scanExport'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ClientSessionCheck } from '@/components/ClientSessionCheck'
import { toast } from '@/components/ui/toast'

type SortField = 'date' | 'domain' | 'status'
type SortOrder = 'asc' | 'desc'

export default function HistoryPage() {
  return (
    <ClientSessionCheck>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Scan History</h1>
          <p className="text-gray-600">View and manage your previous sitemap scans.</p>
        </div>
        <HistoryContent />
      </div>
    </ClientSessionCheck>
  )
}

function HistoryContent() {
  const router = useRouter()
  const { data: session } = useSession()
  const [history, setHistory] = useState<SearchHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)

  useEffect(() => {
    const fetchHistory = async () => {
      if (!session?.user?.email) return

      try {
        setError(null)
        const response = await fetch('/api/history')
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch history')
        }

        const { data } = await response.json()
        if (!data) {
          throw new Error('No data received from server')
        }

        const parsedHistory = data.map((item: SearchHistoryItem) => {
          const parsedResults = typeof item.results === 'string' 
            ? JSON.parse(item.results)
            : item.results

          return {
            ...item,
            searchDate: new Date(item.searchDate),
            results: typeof item.results === 'string' ? item.results : JSON.stringify(item.results),
            parsedResults: {
              urlsAnalyzed: parsedResults.urlsAnalyzed || 0,
              issues: parsedResults.issues || 0,
              details: parsedResults.details || [],
              error: parsedResults.error
            } as AnalysisResult
          }
        })

        setHistory(parsedHistory)
      } catch (error) {
        console.error('Error fetching history:', error)
        setError(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistory()
  }, [session?.user?.email])

  const handleDelete = async (domain: string) => {
    try {
      setError(null)
      const response = await fetch('/api/history/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete history')
      }

      // Refresh the history after successful deletion
      const updatedHistory = history.filter(item => 
        !item.sitemapUrl.includes(domain)
      )
      setHistory(updatedHistory)
      setIsDeleteModalOpen(false)
    } catch (error) {
      console.error('Error deleting history:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete history')
    }
  }

  const handleExport = (format: string) => {
    const selectedGroup = filteredGroups.find(g => g.domain === selectedDomain)
    if (!selectedGroup) return

    const { scans } = selectedGroup
    let content = ''
    let filename = `sitemap-analysis-${selectedDomain}-${new Date().toISOString().split('T')[0]}`

    try {
      switch (format) {
        case 'csv':
          content = generateScanCSV({
            sitemapUrl: selectedGroup.domain,
            scanDate: scans[0].scanDate,
            results: JSON.stringify(scans[0].stats)
          })
          filename += '.csv'
          break
        case 'json':
          content = generateScanJSON({
            sitemapUrl: selectedGroup.domain,
            scanDate: scans[0].scanDate,
            results: JSON.stringify(scans[0].stats)
          })
          filename += '.json'
          break
        case 'html':
          content = generateScanHTML({
            sitemapUrl: selectedGroup.domain,
            scanDate: scans[0].scanDate,
            results: JSON.stringify(scans[0].stats)
          })
          filename += '.html'
          break
        default:
          throw new Error(`Unsupported format: ${format}`)
      }

      downloadFile(content, filename, format)
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error)
      toast(`Failed to export to ${format}. Please try again.`)
    }
  }

  const handleExportAll = (format: string) => {
    try {
      let content = ''
      let filename = `all-sitemap-analysis-${new Date().toISOString().split('T')[0]}`

      const exportData = {
        sitemapUrl: 'All Domains',
        scanDate: new Date(),
        results: JSON.stringify(filteredGroups.map(group => ({
          domain: group.domain,
          stats: group.latestScan.stats,
          scanDate: group.latestScan.scanDate
        })))
      }

      switch (format) {
        case 'csv':
          content = generateScanCSV(exportData)
          filename += '.csv'
          break
        case 'json':
          content = generateScanJSON(exportData)
          filename += '.json'
          break
        case 'html':
          content = generateScanHTML(exportData)
          filename += '.html'
          break
        default:
          throw new Error(`Unsupported format: ${format}`)
      }

      downloadFile(content, filename, format)
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error)
      toast(`Failed to export to ${format}. Please try again.`)
    }
  }

  const groups = groupHistoryByDomain(history.map(item => {
    const stringResults = typeof item.results === 'string' ? item.results : JSON.stringify(item.results)
    const { parsedResults, ...rest } = item
    return {
      ...rest,
      results: stringResults
    }
  }))
  const filteredGroups = groups
    .filter((group) => 
      group.domain.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (statusFilter === 'all' || group.latestScan.status === statusFilter)
    )
    .sort((a, b) => {
      if (sortField === 'domain') {
        return sortOrder === 'asc' 
          ? a.domain.localeCompare(b.domain)
          : b.domain.localeCompare(a.domain)
      } else if (sortField === 'date') {
        return sortOrder === 'asc'
          ? a.latestScan.scanDate.getTime() - b.latestScan.scanDate.getTime()
          : b.latestScan.scanDate.getTime() - a.latestScan.scanDate.getTime()
      }
      return 0
    })

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Analysis History</h1>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search domains..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            />
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="complete">Complete</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <ScanSummary
              history={history.map(item => ({
                id: item.id,
                date: item.searchDate,
                status: item.status,
                urlsAnalyzed: item.parsedResults.urlsAnalyzed,
                issuesFound: item.parsedResults.issues
              }))}
            />
          </div>

          <div className="grid gap-6">
            {filteredGroups.map((group) => (
              <div key={group.domain} className="mb-6">
                <DomainGroup 
                  group={group}
                  onDelete={async () => {
                    setSelectedDomain(group.domain)
                    setIsDeleteModalOpen(true)
                  }}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Delete confirmation dialog */}
      {isDeleteModalOpen && selectedDomain && (
        <ConfirmDialog
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={() => {
            handleDelete(selectedDomain)
            setIsDeleteModalOpen(false)
          }}
          title="Delete Domain History"
          message={`Are you sure you want to delete all scan history for ${selectedDomain}?`}
        />
      )}
    </>
  )
}
