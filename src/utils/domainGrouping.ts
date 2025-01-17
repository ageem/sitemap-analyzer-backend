import { AnalysisResult } from '@/types'

export interface ScanStats {
  urlsAnalyzed: number;
  totalUrlsAnalyzed: number;
  successRate: number;
  scanFrequency: string;
  mostCommonIssue: string;
  healthScore: number;
  responseTimeAvg: number;
  lastScanDuration: number;
  issuesByType: {
    type: string;
    count: number;
    percentage: number;
  }[];
  trendIndicators: {
    responseTime: 'improving' | 'stable' | 'degrading';
    successRate: 'improving' | 'stable' | 'degrading';
    healthScore: 'improving' | 'stable' | 'degrading';
  };
}

export interface SearchHistoryItem {
  id: string;
  sitemapUrl: string;
  searchDate: Date;
  status: string;
  results: string;
}

export interface ScanHistory {
  id: string;
  url: string;
  scanDate: Date;
  status: string;
  stats: ScanStats;
  timestamp: number;
}

export interface DomainGroup {
  domain: string
  totalScans: number
  scans: ScanHistory[]
  latestScan: ScanHistory
  overallStats: {
    totalUrlsAnalyzed: number
    successRate: number
    scanFrequency: string
    mostCommonIssue: string
    healthScore: number
    responseTimeAvg: number
    lastScanDuration: number
    issuesByType: {
      type: string
      count: number
      percentage: number
    }[]
    trendIndicators: {
      responseTime: 'improving' | 'stable' | 'degrading'
      successRate: 'improving' | 'stable' | 'degrading'
      healthScore: 'improving' | 'stable' | 'degrading'
    }
  }
  trends: {
    dates: string[]
    urlsAnalyzed: number[]
    issuesFound: number[]
  }
}

/**
 * Extracts domain from a URL string
 * Handles various URL formats and removes www if present
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    return url
  }
}

/**
 * Calculates statistics for a single scan
 */
export function calculateScanStats(results: AnalysisResult[]): ScanStats {
  const totalUrls = results.length
  const successfulScans = results.filter(r => r.status === 'pass').length
  const successRate = (successfulScans / totalUrls) * 100

  // Collect all issues
  const allIssues = results.flatMap(r => r.issues)
  const issueCount: { [key: string]: number } = {}
  allIssues.forEach(issue => {
    issueCount[issue] = (issueCount[issue] || 0) + 1
  })

  // Find most common issue
  const mostCommonIssue = Object.entries(issueCount)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'None'

  // Calculate average response time
  const totalResponseTime = results.reduce((sum, r) => sum + r.technicalSpecs.loadSpeed, 0)
  const responseTimeAvg = totalResponseTime / totalUrls

  // Calculate health score (0-100)
  const healthScore = Math.round((successRate * 0.6) + 
    (Math.min(1000, responseTimeAvg) / 1000 * 40))

  // Calculate issues by type
  const issuesByType = Object.entries(issueCount).map(([type, count]) => ({
    type,
    count,
    percentage: (count / totalUrls) * 100
  }))

  return {
    urlsAnalyzed: totalUrls,
    totalUrlsAnalyzed: totalUrls,
    successRate,
    scanFrequency: 'daily', // This could be calculated based on historical data
    mostCommonIssue,
    healthScore,
    responseTimeAvg,
    lastScanDuration: Date.now(), // This should be passed in from the scan
    issuesByType,
    trendIndicators: {
      responseTime: 'stable',
      successRate: 'stable',
      healthScore: 'stable'
    }
  }
}

/**
 * Processes a scan item into the ScanHistory format
 */
export function processScanItem(result: AnalysisResult): ScanHistory {
  return {
    id: crypto.randomUUID(),
    url: result.url,
    scanDate: new Date(),
    status: result.status,
    stats: calculateScanStats([result]),
    timestamp: Date.now()
  }
}

/**
 * Detects scan frequency for a group of scans
 */
export function detectScanFrequency(scans: ScanHistory[]): string {
  if (scans.length < 2) return 'one-time'

  const intervals: number[] = []
  const sortedScans = [...scans].sort((a, b) => b.timestamp - a.timestamp)

  for (let i = 1; i < sortedScans.length; i++) {
    intervals.push(sortedScans[i - 1].timestamp - sortedScans[i].timestamp)
  }

  const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
  const avgIntervalHours = avgInterval / (1000 * 60 * 60)

  if (avgIntervalHours <= 1) return 'hourly'
  if (avgIntervalHours <= 24) return 'daily'
  if (avgIntervalHours <= 168) return 'weekly'
  return 'monthly'
}

/**
 * Groups history items by domain and calculates statistics
 */
export function groupHistoryByDomain(historyItems: SearchHistoryItem[]): DomainGroup[] {
  // First, group items by domain
  const domainMap = new Map<string, SearchHistoryItem[]>();
  
  historyItems.forEach(item => {
    const domain = extractDomain(item.sitemapUrl);
    const items = domainMap.get(domain) || [];
    items.push(item);
    domainMap.set(domain, items);
  });

  // Process each domain group
  return Array.from(domainMap.entries()).map(([domain, items]) => {
    // Sort items by date (newest first)
    const sortedItems = [...items].sort(
      (a, b) => new Date(b.searchDate).getTime() - new Date(a.searchDate).getTime()
    );

    // Process each scan
    const scans = sortedItems.map(item => processScanItem(JSON.parse(item.results) as AnalysisResult));
    
    // Calculate trends
    const trends = {
      dates: scans.map(scan => scan.scanDate.toISOString()).reverse(),
      urlsAnalyzed: scans.map(scan => scan.stats.urlsAnalyzed).reverse(),
      issuesFound: scans.map(scan => scan.stats.issuesByType.reduce((sum, issue) => sum + issue.count, 0)).reverse()
    };

    // Calculate overall statistics
    const totalUrlsAnalyzed = scans.reduce((sum, scan) => sum + scan.stats.urlsAnalyzed, 0);
    const successRate = Math.round(
      (scans.reduce((sum, scan) => sum + (scan.stats.successRate), 0) / scans.length)
    );

    // Find most common issue
    const issueTypes = scans.flatMap(scan => scan.stats.issuesByType);
    const mostCommonIssue = issueTypes.reduce((max, issue) => issue.count > max.count ? issue : max, issueTypes[0]).type;

    // Calculate trend indicators
    const calculateTrend = (current: number, previous: number): 'improving' | 'stable' | 'degrading' => {
      const percentChange = ((current - previous) / previous) * 100;
      if (percentChange > 5) return 'improving';
      if (percentChange < -5) return 'degrading';
      return 'stable';
    };

    const trendIndicators = {
      responseTime: calculateTrend(
        scans[0].stats.responseTimeAvg,
        scans[1]?.stats.responseTimeAvg || scans[0].stats.responseTimeAvg
      ),
      successRate: calculateTrend(
        scans[0].stats.successRate,
        scans[1]?.stats.successRate || scans[0].stats.successRate
      ),
      healthScore: calculateTrend(
        scans[0].stats.healthScore,
        scans[1]?.stats.healthScore || scans[0].stats.healthScore
      )
    };

    return {
      domain,
      totalScans: scans.length,
      scans,
      latestScan: scans[0],
      overallStats: {
        totalUrlsAnalyzed,
        successRate,
        scanFrequency: detectScanFrequency(scans),
        mostCommonIssue,
        healthScore: Math.round(scans.reduce((sum, scan) => sum + scan.stats.healthScore, 0) / scans.length),
        responseTimeAvg: Math.round(scans.reduce((sum, scan) => sum + scan.stats.responseTimeAvg, 0) / scans.length),
        lastScanDuration: Math.round(scans[0].stats.lastScanDuration / 1000),
        issuesByType: issueTypes,
        trendIndicators
      },
      trends
    };
  }).sort((a, b) => new Date(b.latestScan.scanDate).getTime() - new Date(a.latestScan.scanDate).getTime());
}
