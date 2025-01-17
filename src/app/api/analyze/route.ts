import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import * as cheerio from 'cheerio'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { type ErrorResponse, type DebugInfo } from '@/types/api'
import { Prisma } from '@prisma/client'

interface Progress {
  total: number
  current: number
  status: 'starting' | 'analyzing' | 'complete'
}

const RATE_LIMIT_DELAY = 1000 // 1 second between requests
const MAX_RETRIES = 3
const BATCH_SIZE = 10  // Number of URLs to process in each batch
const CONCURRENT_REQUESTS = 5  // Number of concurrent requests
const MIN_DELAY = 200  // Minimum delay between requests in ms

let writer: WritableStreamDefaultWriter | undefined

export async function POST(req: Request) {
  const startTime = Date.now()
  const encoder = new TextEncoder()
  let searchHistoryId: string | undefined
  const memUsage = process.memoryUsage()
  const debugInfo: DebugInfo = {
    startTime,
    memoryUsage: {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
    },
    parsingErrors: [],
    networkErrors: [],
    rateLimitingIssues: [],
    requestLogs: []
  }

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated', status: 'failed' } as ErrorResponse,
        { status: 401 }
      )
    }

    const { url } = await req.json()
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required', status: 'failed' } as ErrorResponse,
        { status: 400 }
      )
    }

    debugInfo.url = url
    debugInfo.userEmail = session.user.email

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', status: 'failed' } as ErrorResponse,
        { status: 404 }
      )
    }

    // Create a search history entry
    const searchHistory = await prisma.searchHistory.create({
      data: {
        userId: user.id,
        sitemapUrl: url,
        status: 'in_progress',
        results: JSON.stringify({ status: 'starting' }),
      },
    })

    if (searchHistory) {
      searchHistoryId = searchHistory.id
    }

    // Create a TransformStream for sending progress updates
    const stream = new TransformStream()
    writer = stream.writable.getWriter()
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
            results: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
              debugInfo: {
                startTime,
                memoryUsage: {
                  heapUsed: String(memUsage.heapUsed),
                  heapTotal: String(memUsage.heapTotal),
                  rss: String(memUsage.rss),
                  external: String(memUsage.external),
                  arrayBuffers: String(memUsage.arrayBuffers)
                },
                errors: debugInfo.networkErrors || [],
                issues: debugInfo.rateLimitingIssues || [],
                logs: debugInfo.requestLogs || []
              }
            })
          },
        })
      }
    })

    return response
  } catch (error) {
    console.error('Error in analyze route:', error)
    const memUsage = process.memoryUsage()
    
    if (searchHistoryId) {
      await prisma.searchHistory.update({
        where: { id: searchHistoryId },
        data: {
          status: 'failed',
          results: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            debugInfo: {
              startTime,
              memoryUsage: {
                heapUsed: String(memUsage.heapUsed),
                heapTotal: String(memUsage.heapTotal),
                rss: String(memUsage.rss),
                external: String(memUsage.external),
                arrayBuffers: String(memUsage.arrayBuffers)
              },
              errors: debugInfo.networkErrors || [],
              issues: debugInfo.rateLimitingIssues || [],
              logs: debugInfo.requestLogs || []
            }
          })
        },
      })
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      status: 'failed'
    }, { status: 500 })
  } finally {
    try {
      await writer?.close()
    } catch (closeError) {
      console.error('Error closing writer:', closeError)
    }
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
    for (let i = 0; i < uniqueUrls.length; i += BATCH_SIZE) {
      const batch = uniqueUrls.slice(i, i + BATCH_SIZE)
      
      // Process each URL in the batch
      const batchPromises = batch.map(async (pageUrl) => {
        let retries = 0
        let success = false
        let result: any | null = null

        while (!success && retries < MAX_RETRIES) {
          try {
            const response = await axios.get(pageUrl, {
              timeout: 10000,
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

            result = {
              url: pageUrl,
              title,
              description,
              issues,
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
      if (i + BATCH_SIZE < uniqueUrls.length) {
        await new Promise(resolve => setTimeout(resolve, currentDelay))
      }
    }

    const analysisData = {
      urlsAnalyzed: results.length,
      issues: results.reduce((sum, r) => sum + (r.issues?.length || 0), 0),
      details: results,
      debugInfo: {
        startTime,
        memoryUsage: {
          heapUsed: String(memUsage.heapUsed),
          heapTotal: String(memUsage.heapTotal),
          rss: String(memUsage.rss),
          external: String(memUsage.external),
          arrayBuffers: String(memUsage.arrayBuffers)
        },
        errors: debugInfo.networkErrors || [],
        issues: debugInfo.rateLimitingIssues || [],
        logs: debugInfo.requestLogs || []
      }
    }

    // Update search history if user is authenticated
    if (searchHistoryId) {
      await prisma.searchHistory.update({
        where: { id: searchHistoryId },
        data: {
          status: 'complete',
          results: JSON.stringify(analysisData),
        },
      })
    }

    return analysisData
  } catch (error) {
    console.error('Error processing sitemap:', error)
    if (searchHistoryId) {
      const errorData = {
        error: error instanceof Error ? error.message : String(error),
        debugInfo: {
          startTime,
          memoryUsage: {
            heapUsed: String(memUsage.heapUsed),
            heapTotal: String(memUsage.heapTotal),
            rss: String(memUsage.rss),
            external: String(memUsage.external),
            arrayBuffers: String(memUsage.arrayBuffers)
          },
          errors: debugInfo.networkErrors || [],
          issues: debugInfo.rateLimitingIssues || [],
          logs: debugInfo.requestLogs || []
        },
        status: 'failed',
      }

      await prisma.searchHistory.update({
        where: { id: searchHistoryId },
        data: {
          status: 'failed',
          results: JSON.stringify(errorData),
        },
      })
    }
    throw error
  }
}

async function extractUrlsFromSitemap(sitemapUrl: string, debugInfo: DebugInfo): Promise<string[]> {
  try {
    const sitemapResponse = await axios.get(sitemapUrl, { 
      timeout: 10000,
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
