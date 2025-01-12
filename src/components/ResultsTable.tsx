'use client'

import { type AnalysisResult } from '@/types'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Search, Download, ExternalLink, CheckCircle2, XCircle, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'

interface ResultsTableProps {
  results: AnalysisResult[]
}

export function ResultsTable({ results }: ResultsTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  const filteredResults = results.filter(result => 
    result.metadata.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleExpand = (index: number) => {
    const newExpandedItems = new Set(expandedItems)
    if (expandedItems.has(index)) {
      newExpandedItems.delete(index)
    } else {
      newExpandedItems.add(index)
    }
    setExpandedItems(newExpandedItems)
  }

  const handleExport = () => {
    const csv = [
      ['URL', 'Issues', 'Title', 'Description', 'Keywords', 'OG Title', 'OG Description', 'OG Image'],
      ...results.map(result => [
        result.url,
        result.issues.join('; '),
        result.metadata.title,
        result.metadata.description,
        result.metadata.keywords,
        result.metadata.ogTitle,
        result.metadata.ogDescription,
        result.metadata.ogImage,
      ])
    ].map(row => row.map(cell => `"${cell?.replace(/"/g, '""') || ''}"`).join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'seo-analysis.csv'
    link.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Analysis Results</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-grow-0">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title..."
              className="pl-10 pr-4 py-2 w-full sm:w-64 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto text-sm"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredResults.map((result, index) => (
          <Card 
            key={index} 
            className={`overflow-hidden hover:bg-gray-50 transition-colors ${
              expandedItems.has(index) ? 'bg-gray-50' : 'bg-white'
            }`}
          >
            <CardContent className="p-0">
              <button
                onClick={() => toggleExpand(index)}
                className="w-full text-left p-3 sm:p-4 flex items-start sm:items-center gap-3 sm:gap-4"
              >
                {expandedItems.has(index) ? (
                  <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1 sm:mt-0" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1 sm:mt-0" />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <h3 className="font-medium text-gray-900 truncate text-sm sm:text-base">
                      {result.metadata.title || 'No title'}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {result.issues.length > 0 ? (
                        result.issues.slice(0, 2).map((issue, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700"
                          >
                            {issue}
                          </span>
                        ))
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700">
                          No issues
                        </span>
                      )}
                      {result.issues.length > 2 && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-600">
                          +{result.issues.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-1">
                    {result.url}
                  </p>
                </div>

                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </button>

              {/* Expanded Content */}
              {expandedItems.has(index) && (
                <div className="border-t border-gray-200 p-4 space-y-6">
                  {/* Content Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column - Issues and Technical Specs */}
                    <div className="space-y-6">
                      {/* Issues Section */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-3">Issues</h4>
                        {result.issues.length > 0 ? (
                          <div className="space-y-2">
                            {result.issues.map((issue, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-2 text-red-600 text-sm bg-red-50 rounded-lg p-3"
                              >
                                <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{issue}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 rounded-lg p-3">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>No issues found</span>
                          </div>
                        )}
                      </div>

                      {/* Technical Specs */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-3">Technical Specs</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="text-xs font-medium text-gray-500 mb-1">Load Speed</div>
                            <div className="text-sm font-semibold">
                              {result.technicalSpecs?.loadSpeed 
                                ? `${(result.technicalSpecs.loadSpeed / 1000).toFixed(2)}s`
                                : <span className="text-gray-500">Not available</span>
                              }
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="text-xs font-medium text-gray-500 mb-1">Page Size</div>
                            <div className="text-sm font-semibold">
                              {result.technicalSpecs?.pageSize 
                                ? `${(result.technicalSpecs.pageSize / 1024).toFixed(2)} KB`
                                : <span className="text-gray-500">Not available</span>
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Metadata */}
                    <div className="space-y-6">
                      {/* Basic Metadata */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-3">Metadata</h4>
                        <div className="space-y-4">
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex justify-between items-center mb-1">
                              <div className="text-xs font-medium text-gray-500">Page Title</div>
                              {result.metadata.title && (
                                <div className={`text-xs font-medium ${
                                  result.metadata.title.length <= 60
                                  ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {result.metadata.title.length}/60 chars
                                </div>
                              )}
                            </div>
                            {result.metadata.title ? (
                              <div className="text-sm text-gray-900">{result.metadata.title}</div>
                            ) : (
                              <div className="text-sm text-red-600 flex items-center gap-2">
                                <XCircle className="h-4 w-4" />
                                Missing
                              </div>
                            )}
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex justify-between items-center mb-1">
                              <div className="text-xs font-medium text-gray-500">Description</div>
                              {result.metadata.description && (
                                <div className={`text-xs font-medium ${
                                  result.metadata.description.length <= 160
                                  ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {result.metadata.description.length}/160 chars
                                </div>
                              )}
                            </div>
                            {result.metadata.description ? (
                              <div className={`text-sm ${result.issues.some(issue => issue.includes('description is too long')) ? 'text-red-600' : 'text-gray-900'}`}>
                                {result.metadata.description}
                              </div>
                            ) : (
                              <div className="text-sm text-red-600 flex items-center gap-2">
                                <XCircle className="h-4 w-4" />
                                Missing
                              </div>
                            )}
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="text-xs font-medium text-gray-500 mb-1">Keywords</div>
                            {result.metadata.keywords ? (
                              <div className="flex flex-wrap gap-1">
                                {result.metadata.keywords.split(',').map((keyword, i) => (
                                  <span 
                                    key={i} 
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                                  >
                                    {keyword.trim()}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-red-600 flex items-center gap-2">
                                <XCircle className="h-4 w-4" />
                                Missing
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Open Graph */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-3">Open Graph</h4>
                        <div className="space-y-4">
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex justify-between items-center mb-1">
                              <div className="text-xs font-medium text-gray-500">Title</div>
                              {result.metadata.ogTitle && (
                                <div className={`text-xs font-medium ${
                                  result.metadata.ogTitle.length <= 60
                                  ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {result.metadata.ogTitle.length}/60 chars
                                </div>
                              )}
                            </div>
                            {result.metadata.ogTitle ? (
                              <div className="text-sm text-gray-900">{result.metadata.ogTitle}</div>
                            ) : (
                              <div className="text-sm text-red-600 flex items-center gap-2">
                                <XCircle className="h-4 w-4" />
                                Missing
                              </div>
                            )}
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex justify-between items-center mb-1">
                              <div className="text-xs font-medium text-gray-500">Description</div>
                              {result.metadata.ogDescription && (
                                <div className={`text-xs font-medium ${
                                  result.metadata.ogDescription.length <= 160
                                  ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {result.metadata.ogDescription.length}/160 chars
                                </div>
                              )}
                            </div>
                            {result.metadata.ogDescription ? (
                              <div className={`text-sm ${result.issues.some(issue => issue.includes('og:description is too long')) ? 'text-red-600' : 'text-gray-900'}`}>
                                {result.metadata.ogDescription}
                              </div>
                            ) : (
                              <div className="text-sm text-red-600 flex items-center gap-2">
                                <XCircle className="h-4 w-4" />
                                Missing
                              </div>
                            )}
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="text-xs font-medium text-gray-500 mb-1">Image</div>
                            {result.metadata.ogImage ? (
                              <a 
                                href={result.metadata.ogImage}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm break-all"
                              >
                                {result.metadata.ogImage}
                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              </a>
                            ) : (
                              <div className="text-sm text-red-600 flex items-center gap-2">
                                <XCircle className="h-4 w-4" />
                                Missing
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
