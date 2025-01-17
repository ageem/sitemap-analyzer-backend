import { describe, expect, test } from '@jest/globals'
import { 
  extractDomain, 
  calculateScanStats, 
  processScanItem,
  detectScanFrequency,
  type ScanHistory,
} from '@/utils/domainGrouping'
import { type AnalysisResult } from '@/types'

describe('domainGrouping utils', () => {
  describe('extractDomain', () => {
    test('extracts domain from URL', () => {
      expect(extractDomain('https://example.com/path')).toBe('example.com')
      expect(extractDomain('http://sub.example.com')).toBe('sub.example.com')
      expect(extractDomain('https://www.example.com')).toBe('www.example.com')
    })

    test('handles invalid URLs', () => {
      expect(extractDomain('invalid-url')).toBe('invalid-url')
    })
  })

  describe('calculateScanStats', () => {
    const mockResults: AnalysisResult[] = [
      {
        url: 'https://example.com/1',
        status: 'pass',
        issues: ['Missing description'],
        metadata: {
          title: 'Test 1',
          description: '',
          keywords: 'test',
          newsKeywords: '',
          ogSiteName: '',
          ogTitle: '',
          ogDescription: '',
          ogImage: '',
        },
        technicalSpecs: {
          loadSpeed: 500,
          pageSize: 1000,
        },
      },
      {
        url: 'https://example.com/2',
        status: 'fail',
        issues: ['Missing title', 'Missing og:image'],
        metadata: {
          title: '',
          description: 'Test 2',
          keywords: 'test',
          newsKeywords: '',
          ogSiteName: '',
          ogTitle: '',
          ogDescription: '',
          ogImage: '',
        },
        technicalSpecs: {
          loadSpeed: 1000,
          pageSize: 2000,
        },
      },
    ]

    test('calculates scan statistics correctly', () => {
      const stats = calculateScanStats(mockResults)

      expect(stats.urlsAnalyzed).toBe(2)
      expect(stats.totalUrlsAnalyzed).toBe(2)
      expect(stats.successRate).toBe(50)
      expect(stats.mostCommonIssue).toBe('Missing description')
      expect(stats.healthScore).toBeLessThanOrEqual(100)
      expect(stats.healthScore).toBeGreaterThanOrEqual(0)
      expect(stats.responseTimeAvg).toBe(750)
      expect(stats.issuesByType).toHaveLength(3)
      expect(stats.trendIndicators).toHaveProperty('responseTime')
      expect(stats.trendIndicators).toHaveProperty('successRate')
      expect(stats.trendIndicators).toHaveProperty('healthScore')
    })
  })

  describe('processScanItem', () => {
    test('processes scan item correctly', () => {
      const mockResult: AnalysisResult = {
        url: 'https://example.com',
        status: 'pass',
        issues: [],
        metadata: {
          title: 'Test',
          description: 'Test description',
          keywords: 'test',
          newsKeywords: '',
          ogSiteName: '',
          ogTitle: '',
          ogDescription: '',
          ogImage: '',
        },
        technicalSpecs: {
          loadSpeed: 500,
          pageSize: 1000,
        },
      }

      const processed = processScanItem(mockResult)
      expect(processed.url).toBe(mockResult.url)
      expect(processed.status).toBe(mockResult.status)
      expect(processed.stats).toBeDefined()
      expect(processed.scanDate).toBeInstanceOf(Date)
      expect(processed.timestamp).toBeDefined()
      expect(processed.id).toBeDefined()
    })
  })

  describe('detectScanFrequency', () => {
    test('detects scan frequency correctly', () => {
      const mockScans: ScanHistory[] = [
        {
          id: '1',
          url: 'https://example.com',
          scanDate: new Date(),
          status: 'pass',
          stats: calculateScanStats([]),
          timestamp: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
        },
        {
          id: '2',
          url: 'https://example.com',
          scanDate: new Date(),
          status: 'pass',
          stats: calculateScanStats([]),
          timestamp: Date.now() - 48 * 60 * 60 * 1000, // 2 days ago
        },
        {
          id: '3',
          url: 'https://example.com',
          scanDate: new Date(),
          status: 'pass',
          stats: calculateScanStats([]),
          timestamp: Date.now() - 72 * 60 * 60 * 1000, // 3 days ago
        },
      ]

      const frequency = detectScanFrequency(mockScans)
      expect(frequency).toBe('daily')
    })

    test('handles insufficient data', () => {
      const frequency = detectScanFrequency([{
        id: '1',
        url: 'https://example.com',
        scanDate: new Date(),
        status: 'pass',
        stats: calculateScanStats([]),
        timestamp: Date.now(),
      }])
      expect(frequency).toBe('one-time')
    })
  })
})
