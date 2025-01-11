import { NextResponse } from 'next/server'
import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import * as cheerio from 'cheerio'
import { type AnalysisResult, type DebugInfo } from '@/types'

const RATE_LIMIT_DELAY = 1000 // 1 second between requests
const MAX_RETRIES = 3
const TIMEOUT = 10000 // 10 seconds

interface Progress {
  total: number;
  current: number;
  status: string;
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
    const parser = new XMLParser()
    const parsed = parser.parse(sitemapResponse.data)
    debugInfo.xmlParsingStatus = 'success'

    // Extract URLs from sitemap
    const urls = parsed.urlset?.url?.map((item: any) => item.loc) || []
    if (!urls.length) {
      throw new Error('No URLs found in sitemap')
    }

    const totalUrls = urls.length
    const results: AnalysisResult[] = []

    // Send initial progress
    await sendProgress(writer, {
      total: totalUrls,
      current: 0,
      status: 'Starting analysis...'
    })

    // Process each URL with rate limiting
    for (let i = 0; i < urls.length; i++) {
      const pageUrl = urls[i]
      let retries = 0
      let success = false

      while (retries < MAX_RETRIES && !success) {
        try {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY))
          
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

          results.push({
            url: pageUrl,
            status: issues.length === 0 ? 'pass' : 'fail',
            issues,
            metadata,
            technicalSpecs: {
              loadSpeed,
              pageSize,
            }
          })

          debugInfo.requestLogs.push({
            url: pageUrl,
            status: response.status,
            duration: Date.now() - pageStartTime,
          })

          // Send progress update
          await sendProgress(writer, {
            total: totalUrls,
            current: i + 1,
            status: `Analyzing URL ${i + 1} of ${totalUrls}`
          })

          success = true
        } catch (error) {
          retries++
          if (error instanceof Error) {
            if (retries === MAX_RETRIES) {
              debugInfo.networkErrors.push(`Failed to process ${pageUrl}: ${error.message}`)
            }
            if (axios.isAxiosError(error) && error.response?.status === 429) {
              debugInfo.rateLimitingIssues.push(`Rate limited on ${pageUrl}`)
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000))
            }
          }
        }
      }
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
