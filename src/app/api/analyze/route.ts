import { NextResponse } from 'next/server'
import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import * as cheerio from 'cheerio'
import { prisma } from '@/lib/db'
import { type AnalysisResult, type DebugInfo } from '@/types'
import { serializeForPrisma, serializeDebugInfo } from '@/lib/serialization'

const RATE_LIMIT_DELAY = 1000 // 1 second between requests
const MAX_RETRIES = 3
const TIMEOUT = 10000 // 10 seconds
const CONCURRENT_REQUESTS = 5  // Number of concurrent requests
const MIN_DELAY = 200  // Minimum delay between requests in ms

interface Progress {
  total: number
  current: number
  status: 'starting' | 'analyzing' | 'complete'
}

export async function POST(req: Request) {
  const startTime = Date.now()
  const debugInfo: DebugInfo = {
    xmlParsingStatus: 'pending',
    httpStatus: '0',
    networkErrors: [],
    parsingErrors: [],
    rateLimitingIssues: [],
    memoryUsage: {
      heapUsed: String(process.memoryUsage().heapUsed),
      heapTotal: String(process.memoryUsage().heapTotal),
      rss: String(process.memoryUsage().rss),
      external: String(process.memoryUsage().external),
      arrayBuffers: String(process.memoryUsage().arrayBuffers)
    },
    processingTime: '0',
    requestLogs: []
  }

  let searchHistoryId: string | undefined

  try {
    const { url } = await req.json()

    // Create a TransformStream for sending progress updates
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()
    const response = new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

    // Process in the background
    processRequest(url, writer, debugInfo, startTime, searchHistoryId).catch(async (error) => {
      console.error('Background processing error:', error)
      if (searchHistoryId) {
        await prisma.searchHistory.update({
          where: { id: searchHistoryId },
          data: {
            status: 'failed',
            results: serializeForPrisma({
              error: error instanceof Error ? error.message : String(error),
              debugInfo: serializeDebugInfo(debugInfo)
            })
          },
        })
      }
    })

    return response
  } catch (error) {
    console.error('Error in analyze route:', error)
    
    if (searchHistoryId) {
      await prisma.searchHistory.update({
        where: { id: searchHistoryId },
        data: {
          status: 'failed',
          results: serializeForPrisma({
            error: error instanceof Error ? error.message : String(error),
            debugInfo: serializeDebugInfo(debugInfo)
          })
        },
      })
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      status: 'failed'
    }, { status: 500 })
  }
}

async function processRequest(url: string, writer: WritableStreamDefaultWriter | undefined, debugInfo: DebugInfo, startTime: number, searchHistoryId?: string) {
  try {
    const uniqueUrls = await extractUrlsFromSitemap(url, debugInfo)
    const totalUrls = uniqueUrls.length
    const results: any[] = []
    let currentDelay = MIN_DELAY
    let processedCount = 0

    // Process URLs in batches
    for (let i = 0; i < uniqueUrls.length; i += CONCURRENT_REQUESTS) {
      const batch = uniqueUrls.slice(i, i + CONCURRENT_REQUESTS)
      
      // Process each URL in the batch
      const batchPromises = batch.map(async (pageUrl) => {
        let retries = 0
        let success = false
        let result: any | null = null

        while (!success && retries < MAX_RETRIES) {
          try {
            const response = await axios.get(pageUrl, {
              timeout: TIMEOUT,
              maxRedirects: 5,
              validateStatus: (status) => status < 400,
            })

            const $ = cheerio.load(response.data)
            const title = $('title').text().trim()
            const description = $('meta[name="description"]').attr('content')?.trim() || ''
            const issues: string[] = []

            // Check for common SEO issues
            if (!title) issues.push('Missing title')
            if (!description) issues.push('Missing meta description')
            if (title && title.length > 60) issues.push('Title too long (>60 chars)')
            if (description && description.length > 160) issues.push('Meta description too long (>160 chars)')

            const endTime = Date.now()
            result = {
              url: pageUrl,
              status: issues.length > 0 ? 'fail' : 'pass',
              issues,
              metadata: {
                title: $('title').text() || '',
                description: $('meta[name="description"]').attr('content') || '',
                keywords: $('meta[name="keywords"]').attr('content') || '',
                newsKeywords: $('meta[name="news_keywords"]').attr('content') || '',
                ogSiteName: $('meta[property="og:site_name"]').attr('content') || '',
                ogTitle: $('meta[property="og:title"]').attr('content') || '',
                ogDescription: $('meta[property="og:description"]').attr('content') || '',
                ogImage: $('meta[property="og:image"]').attr('content') || '',
              },
              technicalSpecs: {
                loadSpeed: String(endTime - startTime),
                pageSize: String(response.data.length),
              },
              debugInfo: {
                ...debugInfo,
                processingTime: String((Date.now() - startTime) / 1000),
                requestLogs: debugInfo.requestLogs.map(log => ({
                  ...log,
                  status: String(log.status),
                  duration: String(log.duration)
                }))
              },
            }

            success = true
            debugInfo.requestLogs.push({
              url: pageUrl,
              status: response.status,
              duration: Date.now() - startTime,
            })

            // Adaptive rate limiting
            if (retries === 0) {
              currentDelay = Math.max(MIN_DELAY, currentDelay - 50)
            }
          } catch (error) {
            retries++
            currentDelay += 100 // Increase delay on error

            if (error.response?.status === 429) {
              debugInfo.rateLimitingIssues.push(`Rate limit hit for ${pageUrl}`)
              await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY))
            } else if (error.code === 'ECONNABORTED') {
              debugInfo.networkErrors.push(`Timeout for ${pageUrl}`)
            } else {
              debugInfo.networkErrors.push(`Error fetching ${pageUrl}: ${error.message}`)
            }

            if (retries === MAX_RETRIES) {
              result = {
                url: pageUrl,
                error: error.message,
                issues: ['Failed to analyze page'],
              }
            }
          }

          if (!success) {
            await new Promise(resolve => setTimeout(resolve, currentDelay))
          }
        }

        return result
      })

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults.filter((r): r is any => r !== null))
      processedCount += batch.length

      // Send progress update
      await sendProgress(writer, {
        total: totalUrls,
        current: processedCount,
        status: processedCount === totalUrls ? 'complete' : 'analyzing',
      })

      // Add small delay between batches
      if (i + CONCURRENT_REQUESTS < uniqueUrls.length) {
        await new Promise(resolve => setTimeout(resolve, currentDelay))
      }
    }

    const analysisData = {
      urlsAnalyzed: results.length,
      issues: results.reduce((sum, r) => sum + (r.issues?.length || 0), 0),
      details: results,
      debugInfo: {
        ...debugInfo,
        processingTime: String((Date.now() - startTime) / 1000),
        requestLogs: debugInfo.requestLogs.map(log => ({
          ...log,
          status: String(log.status),
          duration: String(log.duration)
        }))
      },
    }

    // Update search history if user is authenticated
    if (searchHistoryId) {
      await prisma.searchHistory.update({
        where: { id: searchHistoryId },
        data: {
          status: 'complete',
          results: serializeForPrisma(analysisData),
        },
      })
    }

    return analysisData
  } catch (error) {
    console.error('Error processing sitemap:', error)
    if (searchHistoryId) {
      const errorData = {
        error: error instanceof Error 
          ? { 
              error: error.message, 
              debugInfo: serializeDebugInfo(debugInfo)
            }
          : { 
              error: String(error),
              debugInfo: serializeDebugInfo(debugInfo)
            },
        status: 'failed',
      }

      await prisma.searchHistory.update({
        where: { id: searchHistoryId },
        data: {
          status: 'failed',
          results: serializeForPrisma(errorData),
        },
      })
    }
    throw error
  }
}

async function extractUrlsFromSitemap(sitemapUrl: string, debugInfo: DebugInfo): Promise<string[]> {
  try {
    const sitemapResponse = await axios.get(sitemapUrl, { 
      timeout: TIMEOUT,
      maxRedirects: 5,
      validateStatus: (status) => status < 400,
    })

    const parser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true,
      trimValues: true,
      parseTagValue: true,
      stopNodes: ['**.loc'],
      isArray: (name) => name === 'url' || name === 'sitemap',
    })

    let parsed;
    try {
      parsed = parser.parse(sitemapResponse.data)
    } catch (parseError) {
      debugInfo.parsingErrors.push(`Error parsing XML from ${sitemapUrl}: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
      return []
    }

    if (parsed.urlset?.url) {
      // Standard sitemap format
      const urls = parsed.urlset.url
        .map((item: { loc: string }) => item.loc)
        .filter((url: string) => typeof url === 'string')
      return urls
    } else if (parsed.sitemapindex?.sitemap) {
      // Sitemap index - recursively process child sitemaps
      const sitemapUrls = parsed.sitemapindex.sitemap
        .map((item: { loc: string }) => item.loc)
        .filter((url: string) => typeof url === 'string')

      // Process all child sitemaps in parallel with a concurrency limit
      const results = []
      for (let i = 0; i < sitemapUrls.length; i += CONCURRENT_REQUESTS) {
        const batch = sitemapUrls.slice(i, i + CONCURRENT_REQUESTS)
        const batchResults = await Promise.all(
          batch.map((url: string) => extractUrlsFromSitemap(url, debugInfo))
        )
        results.push(...batchResults)
      }
      
      return results.flat()
    }
    return []
  } catch (error) {
    if (error instanceof Error) {
      debugInfo.parsingErrors.push(`Error processing sitemap ${sitemapUrl}: ${error.message}`)
    }
    return [] // Continue with other sitemaps if one fails
  }
}

async function sendProgress(writer: WritableStreamDefaultWriter | undefined, progress: Progress) {
  if (!writer) return
  
  const encoder = new TextEncoder()
  try {
    await writer.write(encoder.encode(`data: ${JSON.stringify({
      type: 'progress',
      ...progress
    })}\n\n`))
  } catch (error) {
    console.error('Error sending progress:', error)
  }
}
