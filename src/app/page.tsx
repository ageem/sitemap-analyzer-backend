'use client'

import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { DebugPanel } from '@/components/DebugPanel'
import { ResultsTable } from '@/components/ResultsTable'
import { ProgressBar } from '@/components/ProgressBar'
import { SummaryDashboard } from '@/components/SummaryDashboard'
import { type AnalysisResult, type DebugInfo } from '@/types'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface ApiResponse {
  results: AnalysisResult[];
  debugInfo: DebugInfo;
}

interface Progress {
  total: number;
  current: number;
  status: 'starting' | 'analyzing' | 'complete';
}

interface SitemapLocation {
  url: string
  exists: boolean
  isIndex?: boolean
}

interface SitemapSearchResponse {
  fromRobotsTxt: string[]
  commonLocations: SitemapLocation[]
  error?: string
}

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [url, setUrl] = useState('')
  const [progress, setProgress] = useState<Progress | null>(null)
  const [sitemapResults, setSitemapResults] = useState<SitemapSearchResponse | null>(null)
  const [isLoadingSitemaps, setIsLoadingSitemaps] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false)

  const { mutate: analyzeSitemap, data, isPending } = useMutation({
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

  const { mutate: analyzeAllSitemaps, data: allSitemapsData } = useMutation({
    mutationKey: ['analyzeAll'],
    mutationFn: async () => {
      if (!sitemapResults) return

      setIsAnalyzingAll(true)
      let totalUrlsProcessed = 0
      let totalUrlsToProcess = 0
      const allResults: AnalysisResult[] = []

      const allSitemaps = [
        ...sitemapResults.fromRobotsTxt,
        ...sitemapResults.commonLocations.filter(l => l.exists).map(l => l.url)
      ]

      // Process sitemaps sequentially to better track progress
      for (const sitemapUrl of allSitemaps) {
        try {
          const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: sitemapUrl })
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to analyze sitemap')
          }

          const reader = response.body?.getReader()
          if (!reader) throw new Error('Failed to read response')

          const decoder = new TextDecoder()
          let lastProgress = { total: 0, current: 0 }
            
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (!line.trim()) continue
              const data = JSON.parse(line.replace('data: ', ''))
              
              if (data.type === 'progress') {
                // Update total URLs count when we first get it
                if (data.total > 0 && lastProgress.total === 0) {
                  totalUrlsToProcess += data.total
                  setProgress(prev => ({
                    total: totalUrlsToProcess,
                    current: totalUrlsProcessed,
                    status: 'analyzing'
                  }))
                }
                
                // Calculate the delta of processed URLs since last update
                const delta = data.current - lastProgress.current
                if (delta > 0) {
                  totalUrlsProcessed += delta
                  setProgress(prev => ({
                    total: totalUrlsToProcess,
                    current: totalUrlsProcessed,
                    status: 'analyzing'
                  }))
                }
                
                lastProgress = { total: data.total, current: data.current }
              } else if (data.type === 'complete') {
                allResults.push(...(data.results || []))
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            }
          }

          reader.releaseLock()
        } catch (error) {
          console.error(`Error analyzing sitemap ${sitemapUrl}:`, error)
          toast({
            title: 'Warning',
            description: `Failed to analyze ${sitemapUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            variant: 'warning'
          })
        }
      }

      setProgress({
        total: totalUrlsToProcess,
        current: totalUrlsProcessed,
        status: 'complete'
      })
      setIsAnalyzingAll(false)
      
      return { results: allResults }
    }
  })

  const findSitemaps = async (domain: string) => {
    setError(null)
    setIsLoadingSitemaps(true)
    setSitemapResults(null)
    
    try {
      const response = await fetch('/api/find-sitemaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain }),
      })

      const data: SitemapSearchResponse = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      setSitemapResults(data)
      
      // If we found exactly one sitemap, set it as the URL
      const allSitemaps = [...data.fromRobotsTxt, ...data.commonLocations.filter(loc => loc.exists).map(loc => loc.url)]
      if (allSitemaps.length === 1) {
        setUrl(allSitemaps[0])
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to find sitemaps')
    } finally {
      setIsLoadingSitemaps(false)
    }
  }

  const handleDomainSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const domain = url.replace(/^https?:\/\//, '').split('/')[0]
    findSitemaps(domain)
  }

  const handleSitemapSelect = (sitemap: string) => {
    setUrl(sitemap)
    setSitemapResults(null)
    setProgress(null)
    analyzeSitemap(sitemap)
  }

  const handleAnalyzeClick = () => {
    setSitemapResults(null)
    setProgress(null)
    analyzeSitemap(url)
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Sitemap SEO Analyzer</h1>
          <p className="text-gray-600">Analyze your sitemap.xml for SEO issues and metadata completeness</p>
        </div>
        
        <div className="max-w-3xl mx-auto mb-8 sm:mb-12 px-4 sm:px-0">
          <form onSubmit={handleDomainSearch} className="w-full max-w-2xl space-y-4">
            <div className="flex flex-col space-y-2">
              <Input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter domain (e.g., example.com) or full sitemap URL"
                className="flex-1"
              />
              <div className="text-sm text-gray-500">
                Tip: Enter just the domain name to discover available sitemaps
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                type="submit"
                disabled={!url || isLoadingSitemaps || isPending || isAnalyzingAll}
              >
                {isLoadingSitemaps ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finding Sitemaps...
                  </>
                ) : (
                  'Find Sitemaps'
                )}
              </Button>
              {url.endsWith('.xml') && (
                <Button
                  type="button"
                  onClick={handleAnalyzeClick}
                  disabled={!url || isLoadingSitemaps || isPending || isAnalyzingAll}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Sitemap'
                  )}
                </Button>
              )}
            </div>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {sitemapResults && (
            <div className="mt-6 w-full max-w-2xl space-y-6">
              {sitemapResults.fromRobotsTxt.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Sitemaps found in robots.txt:</h3>
                  <div className="space-y-2">
                    {sitemapResults.fromRobotsTxt.map((sitemap, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                      >
                        <span className="text-sm text-gray-600 truncate flex-1 mr-4">
                          {sitemap}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleSitemapSelect(sitemap)}
                          disabled={isPending || isAnalyzingAll}
                        >
                          Analyze
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sitemapResults.commonLocations.some(loc => loc.exists) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    {sitemapResults.fromRobotsTxt.length === 0 
                      ? 'Found these sitemaps:' 
                      : 'Additional sitemaps found:'}
                  </h3>
                  <div className="space-y-2">
                    {sitemapResults.commonLocations
                      .filter(loc => loc.exists)
                      .map((location, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                        >
                          <div className="flex-1 mr-4">
                            <span className="text-sm text-gray-600 truncate block">
                              {location.url}
                            </span>
                            {location.isIndex && (
                              <span className="text-xs text-blue-600 mt-1">
                                This appears to be a sitemap index file
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleSitemapSelect(location.url)}
                            disabled={isPending || isAnalyzingAll}
                          >
                            Analyze
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {(sitemapResults.fromRobotsTxt.length > 0 || sitemapResults.commonLocations.some(loc => loc.exists)) && (
                <div className="flex justify-center mt-6">
                  <Button
                    onClick={() => analyzeAllSitemaps()}
                    disabled={isPending || isAnalyzingAll}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    {isAnalyzingAll ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing All Sitemaps...
                      </>
                    ) : (
                      'Analyze All Sitemaps'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="max-w-5xl mx-auto">
          {(isPending || isAnalyzingAll) && progress && (
            <div className="mb-8">
              <ProgressBar
                progress={(progress.current / progress.total) * 100}
                status={progress.status}
                total={progress.total}
                current={progress.current}
              />
            </div>
          )}

          {(data?.results || allSitemapsData?.results) && (
            <>
              <div className="mb-8">
                <SummaryDashboard results={allSitemapsData?.results || data?.results || []} />
              </div>
              <div className="mt-8">
                <ResultsTable results={allSitemapsData?.results || data?.results || []} />
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
