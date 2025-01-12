'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { DebugPanel } from '@/components/DebugPanel'
import { ResultsTable } from '@/components/ResultsTable'
import { ProgressBar } from '@/components/ProgressBar'
import { SummaryDashboard } from '@/components/SummaryDashboard'
import { type AnalysisResult, type DebugInfo } from '@/types'

interface ApiResponse {
  results: AnalysisResult[];
  debugInfo: DebugInfo;
}

interface Progress {
  total: number;
  current: number;
  status: string;
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [progress, setProgress] = useState<Progress | null>(null)
  
  const { mutate, data, isPending, error } = useMutation({
    mutationKey: ['analyze'],
    mutationFn: async (sitemapUrl: string) => {
      setProgress(null)
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: sitemapUrl }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze sitemap')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Failed to read response')
      }

      let result: ApiResponse | null = null
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            if (!result) {
              throw new Error('No results received')
            }
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(5))
                
                if (data.type === 'progress') {
                  setProgress({
                    total: data.total,
                    current: data.current,
                    status: data.status,
                  })
                } else if (data.type === 'complete') {
                  result = {
                    results: data.results,
                    debugInfo: data.debugInfo,
                  }
                } else if (data.type === 'error') {
                  throw new Error(data.error)
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      return result
    }
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    mutate(url)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">Sitemap SEO Analyzer</h1>
          <p className="text-base sm:text-lg text-gray-600 px-4">Analyze your sitemap.xml for SEO issues and metadata completeness</p>
        </div>
        
        <div className="max-w-3xl mx-auto mb-8 sm:mb-12 px-4 sm:px-0">
          <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <input
                type="url"
                placeholder="Enter sitemap URL..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                required
              />
              <button
                type="submit"
                disabled={isPending}
                className="px-4 sm:px-8 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors text-sm sm:text-base whitespace-nowrap"
              >
                {isPending ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="max-w-3xl mx-auto mb-8">
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    {error instanceof Error ? error.message : 'An error occurred'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {isPending && progress && (
          <div className="max-w-3xl mx-auto mb-8">
            <ProgressBar
              progress={(progress.current / progress.total) * 100}
              status={progress.status}
              total={progress.total}
              current={progress.current}
            />
          </div>
        )}

        {data?.results && (
          <>
            <div className="mb-8">
              <SummaryDashboard results={data.results} />
            </div>
            <div className="mt-8">
              <ResultsTable results={data.results} />
            </div>
          </>
        )}

        {/* Debug Panel - Commented out for now
        {data?.debugInfo && <DebugPanel info={data.debugInfo} />}
        */}
      </div>
    </main>
  )
}
