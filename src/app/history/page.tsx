'use client'

import { useState, useEffect } from 'react'
import { groupHistoryByDomain } from '@/utils/domainGrouping'
import { DomainGroup } from '@/components/DomainGroup'
import type { DomainGroup as DomainGroupType } from '@/utils/domainGrouping'
import { ScanSummary } from '@/components/ScanSummary'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trash2, ExternalLink, ChevronDown, ChevronUp, Filter, X, Download, FileText } from 'lucide-react'
import { exportToCSV, exportToJSON, exportToHTML, downloadFile } from '@/utils/export'
import { generateScanCSV, generateScanJSON, generateScanHTML } from '@/utils/scanExport'
import { ConfirmDialog } from '@/components/ConfirmDialog'

interface SearchHistoryItem {
  id: string
  sitemapUrl: string
  searchDate: Date
  status: string
  results: string
  parsedResults: any
}

interface ParsedResults {
  error?: string
  urlsAnalyzed?: number
  issues?: number
  details?: Array<{
    url: string
    title?: string
    description?: string
    ogImage?: string
    brokenLinks?: string[]
  }>
}

type SortField = 'date' | 'url' | 'status' | 'results'
type SortOrder = 'asc' | 'desc'

export default function HistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [domainGroups, setDomainGroups] = useState<DomainGroupType[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportingReport, setExportingReport] = useState<string | null>(null)
  const [openExportMenu, setOpenExportMenu] = useState<string | null>(null)
  const [history, setHistory] = useState<SearchHistoryItem[]>([])

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      fetchHistory()
    } else if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, session])

  const fetchHistory = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/history')
      const data = await response.json()
      
      // Convert date strings to Date objects and parse results
      const historyWithDates = data.map((item: SearchHistoryItem) => ({
        ...item,
        searchDate: new Date(item.searchDate),
        parsedResults: item.results ? JSON.parse(item.results) : null
      }))
      
      setHistory(historyWithDates)
      const grouped = groupHistoryByDomain(historyWithDates)
      setDomainGroups(grouped)
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (domain: string) => {
    try {
      const response = await fetch('/api/history/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete domain history')
      }

      // Refresh the history list
      await fetchHistory()
    } catch (error) {
      console.error('Error deleting domain history:', error)
    }
  }

  // Filter domain groups based on search and status
  const filteredGroups = domainGroups.filter(group => {
    const matchesSearch = group.domain.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || group.scans.some(scan => scan.status.toLowerCase() === statusFilter)
    return matchesSearch && matchesStatus
  })

  return (
    <div className="container mx-auto px-4 py-8">
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
              history={history.map(item => {
                // Safely parse and extract results
                const results = item.parsedResults?.results || []
                const issues = Array.isArray(results) ? results.reduce((sum, result) => {
                  return sum + (result.issues?.length || 0)
                }, 0) : 0

                return {
                  id: item.id,
                  date: item.searchDate,
                  status: item.status,
                  urlsAnalyzed: Array.isArray(results) ? results.length : 0,
                  issuesFound: issues
                }
              })}
            />
          </div>

          <div className="grid gap-6">
            {filteredGroups.map((group) => (
              <DomainGroup
                key={group.domain}
                group={group}
                onDelete={async () => {
                  setSelectedDomain(group.domain)
                  setIsDeleteModalOpen(true)
                }}
              />
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
    </div>
  )
}
