import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import * as cheerio from 'cheerio'
import { type AnalysisResult, type DebugInfo } from '@/types'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'

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
  const encoder = new TextEncoder()
  let writer: WritableStreamDefaultWriter | undefined
  let searchHistoryId: string | undefined
  const debugInfo: DebugInfo = {
    xmlParsingStatus: 'pending',
    httpStatus: 0,
    networkErrors: [],
    parsingErrors: [],
    rateLimitingIssues: [],
    memoryUsage: process.memoryUsage(),
    processingTime: 0,
    requestLogs: [],
  }

  try {
    const { url } = await req.json()
    const session = await getServerSession(authOptions)
    let userId: string | undefined

    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      })
      userId = user?.id
    }

    // Create initial search history record if user is authenticated
    if (userId) {
      const searchHistory = await prisma.searchHistory.create({
        data: {
          userId,
          sitemapUrl: url,
          status: 'in_progress',
        },
      })
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
    processRequest(url, writer, debugInfo, startTime, searchHistoryId).catch(console.error)

    return response
  } catch (error) {
    console.error('Error processing sitemap:', error)
    debugInfo.processingTime = (Date.now() - startTime) / 1000
    debugInfo.memoryUsage = process.memoryUsage()

    // Update search history if user is authenticated
    if (searchHistoryId) {
      await prisma.searchHistory.update({
        where: { id: searchHistoryId },
        data: {
          status: 'failed',
          results: JSON.stringify({ error: error.message }),
        },
      })
    }

    try {
      await writer?.write(encoder.encode(`data: ${JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : 'An error occurred while processing the sitemap',
      })}\n\n`))
    } catch (writeError) {
      console.error('Error writing to stream:', writeError)
    }
  } finally {
    try {
      await writer?.close()
    } catch (closeError) {
      console.error('Error closing writer:', closeError)
    }
  }
}

async function processRequest(url: string, writer: WritableStreamDefaultWriter | undefined, debugInfo: DebugInfo, startTime: number, searchHistoryId?: string) {
  const encoder = new TextEncoder()
  
  try {
    // Extract all URLs recursively from sitemaps
    debugInfo.xmlParsingStatus = 'fetching'
    const urls = await extractUrlsFromSitemap(url, debugInfo)
    debugInfo.xmlParsingStatus = 'success'

    if (!urls.length) {
      throw new Error('No URLs found in sitemap(s)')
    }

    // Remove duplicates
    const uniqueUrls = [...new Set(urls)]
    const totalUrls = uniqueUrls.length
    const results: AnalysisResult[] = []
    let currentDelay = MIN_DELAY
    let processedCount = 0

    // Send initial progress
    await sendProgress(writer, {
      total: totalUrls,
      current: 0,
      status: 'starting',
    })

    // Process URLs in batches
    for (let i = 0; i < uniqueUrls.length; i += CONCURRENT_REQUESTS) {
      const batch = uniqueUrls.slice(i, i + CONCURRENT_REQUESTS)
      const batchPromises = batch.map(async (pageUrl) => {
        let retries = 0
        let success = false
        let result: AnalysisResult | null = null

        while (!success && retries < MAX_RETRIES) {
          try {
            const pageStartTime = Date.now()
            const response = await axios.get(pageUrl, { timeout: TIMEOUT })
            const $ = cheerio.load(response.data)
            const loadSpeed = Date.now() - pageStartTime
            const pageSize = Buffer.byteLength(response.data, 'utf8')

            // Extract metadata
            const metadata = {
              title: $('title').text() || '',
              description: $('meta[name="description"]').attr('content') || '',
              keywords: $('meta[name="keywords"]').attr('content') || '',
              newsKeywords: $('meta[name="news_keywords"]').attr('content') || '',
              ogSiteName: $('meta[property="og:site_name"]').attr('content') || '',
              ogTitle: $('meta[property="og:title"]').attr('content') || '',
              ogDescription: $('meta[property="og:description"]').attr('content') || '',
              ogImage: $('meta[property="og:image"]').attr('content') || '',
            }

            const issues: string[] = []
            
            // Validate metadata
            if (metadata.title.length > 60) {
              issues.push('Title exceeds 60 characters')
            }
            if (metadata.description.length > 160) {
              issues.push('Description exceeds 160 characters')
            }
            if (!metadata.keywords) {
              issues.push('Missing keywords')
            }
            if (!metadata.ogImage) {
              issues.push('Missing OpenGraph image')
            }

            result = {
              url: pageUrl,
              status: issues.length === 0 ? 'pass' : 'fail',
              issues,
              metadata,
              technicalSpecs: {
                loadSpeed,
                pageSize,
              }
            }

            debugInfo.requestLogs.push({
              url: pageUrl,
              status: response.status,
              duration: Date.now() - pageStartTime,
            })

            // Adjust delay based on response time
            if (loadSpeed < 500) {
              currentDelay = Math.max(MIN_DELAY, currentDelay - 50)
            } else {
              currentDelay += 50
            }

            success = true
          } catch (error) {
            retries++
            if (error instanceof Error) {
              if (retries === MAX_RETRIES) {
                debugInfo.networkErrors.push(`Failed to process ${pageUrl}: ${error.message}`)
              }
              if (axios.isAxiosError(error) && error.response?.status === 429) {
                debugInfo.rateLimitingIssues.push(`Rate limited on ${pageUrl}`)
                currentDelay *= 2  // Double the delay when rate limited
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000))
              }
            }
          }
        }
        return result
      })

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults.filter(r => r !== null))
      processedCount += batch.length

      // Send progress update
      await sendProgress(writer, {
        total: totalUrls,
        current: processedCount,
        status: 'analyzing',
      })
    }

    // Send final results
    debugInfo.processingTime = (Date.now() - startTime) / 1000
    debugInfo.memoryUsage = process.memoryUsage()

    // Update search history if user is authenticated
    if (searchHistoryId) {
      await prisma.searchHistory.update({
        where: { id: searchHistoryId },
        data: {
          status: 'complete',
          results: JSON.stringify(results),
        },
      })
    }

    await writer?.write(encoder.encode(`data: ${JSON.stringify({
      type: 'complete',
      results,
      debugInfo
    })}\n\n`))
  } catch (error) {
    console.error('Error processing sitemap:', error)
    debugInfo.processingTime = (Date.now() - startTime) / 1000
    debugInfo.memoryUsage = process.memoryUsage()

    // Update search history if user is authenticated
    if (searchHistoryId) {
      await prisma.searchHistory.update({
        where: { id: searchHistoryId },
        data: {
          status: 'failed',
          results: JSON.stringify({ error: error.message }),
        },
      })
    }

    try {
      await writer?.write(encoder.encode(`data: ${JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : 'An error occurred while processing the sitemap',
      })}\n\n`))
    } catch (writeError) {
      console.error('Error writing to stream:', writeError)
    }
  } finally {
    try {
      await writer?.close()
    } catch (closeError) {
      console.error('Error closing writer:', closeError)
    }
  }
}

async function extractUrlsFromSitemap(sitemapUrl: string, debugInfo: DebugInfo): Promise<string[]> {
  try {
    const sitemapResponse = await axios.get(sitemapUrl, { timeout: TIMEOUT })
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true,
    })
    const parsed = parser.parse(sitemapResponse.data)

    if (parsed.urlset?.url) {
      // Standard sitemap format
      const urls = Array.isArray(parsed.urlset.url)
        ? parsed.urlset.url.map((item: any) => item.loc)
        : [parsed.urlset.url.loc]
      return urls.filter(url => url && typeof url === 'string')
    } else if (parsed.sitemapindex?.sitemap) {
      // Sitemap index - recursively process child sitemaps
      const sitemaps = Array.isArray(parsed.sitemapindex.sitemap)
        ? parsed.sitemapindex.sitemap
        : [parsed.sitemapindex.sitemap]
      const sitemapUrls = sitemaps.map((item: any) => item.loc).filter(url => url && typeof url === 'string')
      
      // Process all child sitemaps in parallel
      const urlPromises = sitemapUrls.map(url => extractUrlsFromSitemap(url, debugInfo))
      const nestedUrls = await Promise.all(urlPromises)
      
      // Flatten and return all URLs
      return nestedUrls.flat()
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
  const encoder = new TextEncoder()
  await writer?.write(encoder.encode(`data: ${JSON.stringify({
    type: 'progress',
    ...progress
  })}\n\n`))
}
