import { NextResponse } from 'next/server'
import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import * as cheerio from 'cheerio'
import { type AnalysisResult, type DebugInfo } from '@/types'

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
    processRequest(url, writer, debugInfo, startTime).catch(console.error)

    return response
  } catch (error) {
    debugInfo.processingTime = (Date.now() - startTime) / 1000
    debugInfo.memoryUsage = process.memoryUsage()
    
    if (error instanceof Error) {
      debugInfo.stackTrace = error.stack
      return NextResponse.json({
        error: error.message,
        debugInfo,
      }, { status: 500 })
    }
    
    return NextResponse.json({
      error: 'An unknown error occurred',
      debugInfo,
    }, { status: 500 })
  }
}

async function processRequest(url: string, writer: WritableStreamDefaultWriter, debugInfo: DebugInfo, startTime: number) {
  const encoder = new TextEncoder()
  
  try {
    // Fetch and parse sitemap
    debugInfo.xmlParsingStatus = 'fetching'
    const sitemapResponse = await axios.get(url, { timeout: TIMEOUT })
    debugInfo.httpStatus = sitemapResponse.status

    debugInfo.xmlParsingStatus = 'parsing'
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true,
    })
    const parsed = parser.parse(sitemapResponse.data)
    debugInfo.xmlParsingStatus = 'success'

    // Extract URLs from sitemap, handling different sitemap formats
    let urls: string[] = []
    if (parsed.urlset?.url) {
      // Standard sitemap format
      urls = Array.isArray(parsed.urlset.url)
        ? parsed.urlset.url.map((item: any) => item.loc)
        : [parsed.urlset.url.loc]
    } else if (parsed.sitemapindex?.sitemap) {
      // Sitemap index format
      const sitemaps = Array.isArray(parsed.sitemapindex.sitemap)
        ? parsed.sitemapindex.sitemap
        : [parsed.sitemapindex.sitemap]
      urls = sitemaps.map((item: any) => item.loc)
    }

    // Clean up URLs
    urls = urls.filter(url => url && typeof url === 'string')

    if (!urls.length) {
      throw new Error('No URLs found in sitemap')
    }

    const totalUrls = urls.length
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
    for (let i = 0; i < urls.length; i += CONCURRENT_REQUESTS) {
      const batch = urls.slice(i, i + CONCURRENT_REQUESTS)
      const batchPromises = batch.map(async (pageUrl) => {
        let retries = 0
        let success = false
        let result = null

        while (retries < MAX_RETRIES && !success) {
          try {
            await new Promise(resolve => setTimeout(resolve, currentDelay))
            
            const pageStartTime = Date.now()
            const response = await axios.get(pageUrl, { timeout: TIMEOUT })
            const loadSpeed = Date.now() - pageStartTime
            
            const $ = cheerio.load(response.data)
            const pageSize = Buffer.byteLength(response.data, 'utf8')
            
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

    await writer.write(encoder.encode(`data: ${JSON.stringify({
      type: 'complete',
      results,
      debugInfo
    })}\n\n`))
  } catch (error) {
    if (error instanceof Error) {
      await writer.write(encoder.encode(`data: ${JSON.stringify({
        type: 'error',
        error: error.message
      })}\n\n`))
    }
  } finally {
    await writer.close()
  }
}

async function sendProgress(writer: WritableStreamDefaultWriter, progress: Progress) {
  const encoder = new TextEncoder()
  await writer.write(encoder.encode(`data: ${JSON.stringify({
    type: 'progress',
    ...progress
  })}\n\n`))
}
