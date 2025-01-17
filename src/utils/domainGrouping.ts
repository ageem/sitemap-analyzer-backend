interface SearchHistoryItem {
  id: string;
  sitemapUrl: string;
  searchDate: Date;
  status: string;
  results: string;
}

interface UrlAnalysis {
  url: string;
  title?: string;
  description?: string;
  ogImage?: string;
  brokenLinks?: string[];
  statusCode?: number;
  loadTime?: number;
}

interface ScanStats {
  urlsAnalyzed: number
  issuesFound: number
  averageResponseTime: number
  scanDuration: number
  issueTypes?: {
    type: string
    count: number
  }[]
}

interface ScanHistory {
  id: string
  stats: ScanStats
  url: string
  scanDate: string
  status: 'complete' | 'error' | 'pending'
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
      urlGrowth: number
      issueReduction: number
      healthScoreChange: number
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
function extractDomain(url: string): string {
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
function calculateScanStats(results: string): ScanStats {
  try {
    const parsedResults = JSON.parse(results);
    
    // Handle the case where results is an error object
    if (parsedResults.error) {
      return {
        urlsAnalyzed: 0,
        issuesFound: 0,
        averageResponseTime: 0,
        scanDuration: 0,
        issueTypes: []
      };
    }

    // Handle array of results
    const resultsArray = Array.isArray(parsedResults) ? parsedResults : [parsedResults];
    
    const stats: ScanStats = {
      urlsAnalyzed: resultsArray.length,
      issuesFound: 0,
      averageResponseTime: 0,
      scanDuration: 0,
      issueTypes: []
    };

    let totalResponseTime = 0;
    const issueTypeCounts: { [key: string]: number } = {};

    resultsArray.forEach(result => {
      // Count issues
      if (result.issues && Array.isArray(result.issues)) {
        stats.issuesFound += result.issues.length;
        
        // Count issue types
        result.issues.forEach((issue: string) => {
          issueTypeCounts[issue] = (issueTypeCounts[issue] || 0) + 1;
        });
      }

      // Calculate average response time
      if (result.technicalSpecs?.loadSpeed) {
        totalResponseTime += result.technicalSpecs.loadSpeed;
      }
    });

    // Calculate average response time
    if (stats.urlsAnalyzed > 0) {
      stats.averageResponseTime = Math.round(totalResponseTime / stats.urlsAnalyzed);
    }

    // Convert issue type counts to array format
    stats.issueTypes = Object.entries(issueTypeCounts).map(([type, count]) => ({
      type,
      count
    }));

    return stats;
  } catch (error) {
    console.error('Error calculating scan stats:', error);
    return {
      urlsAnalyzed: 0,
      issuesFound: 0,
      averageResponseTime: 0,
      scanDuration: 0,
      issueTypes: []
    };
  }
}

/**
 * Processes a scan item into the DomainScan format
 */
function processScanItem(item: SearchHistoryItem): ScanHistory {
  return {
    id: item.id,
    url: item.sitemapUrl,
    scanDate: item.searchDate.toISOString(),
    status: item.status as 'complete' | 'error' | 'pending',
    stats: calculateScanStats(item.results)
  };
}

/**
 * Calculates health score for a group of scans
 */
function calculateHealthScore(scans: ScanHistory[]): number {
  if (scans.length === 0) return 0

  const latestScan = scans[0]
  const successRate = (latestScan.stats.urlsAnalyzed - latestScan.stats.issuesFound) / latestScan.stats.urlsAnalyzed * 100
  const responseTimeScore = Math.min(100, (2000 - (latestScan.stats.averageResponseTime || 0)) / 15)
  const issueReductionScore = scans.length > 1 
    ? Math.min(100, ((scans[1].stats.issuesFound - latestScan.stats.issuesFound) / scans[1].stats.issuesFound) * 100)
    : 100

  return Math.round((successRate * 0.5) + (responseTimeScore * 0.3) + (issueReductionScore * 0.2))
}

/**
 * Calculates trend indicators for a group of scans
 */
function calculateTrendIndicators(scans: ScanHistory[]): { urlGrowth: number; issueReduction: number; healthScoreChange: number } {
  if (scans.length < 2) {
    return { urlGrowth: 0, issueReduction: 0, healthScoreChange: 0 }
  }

  const latest = scans[0]
  const previous = scans[1]

  const urlGrowth = ((latest.stats.urlsAnalyzed - previous.stats.urlsAnalyzed) / previous.stats.urlsAnalyzed) * 100
  const issueReduction = ((previous.stats.issuesFound - latest.stats.issuesFound) / previous.stats.issuesFound) * 100
  const healthScoreChange = calculateHealthScore([latest]) - calculateHealthScore([previous])

  return {
    urlGrowth: Math.round(urlGrowth),
    issueReduction: Math.round(issueReduction),
    healthScoreChange: Math.round(healthScoreChange)
  }
}

/**
 * Calculates issues by type for a group of scans
 */
function calculateIssuesByType(scans: ScanHistory[]): { type: string; count: number; percentage: number }[] {
  const issueTypes: { [key: string]: number } = {}
  let totalIssues = 0

  scans.forEach(scan => {
    scan.stats.issueTypes?.forEach(issue => {
      issueTypes[issue.type] = (issueTypes[issue.type] || 0) + issue.count
      totalIssues += issue.count
    })
  })

  return Object.entries(issueTypes).map(([type, count]) => ({
    type,
    count,
    percentage: Math.round((count / totalIssues) * 100)
  })).sort((a, b) => b.count - a.count)
}

/**
 * Detects scan frequency for a group of scans
 */
function detectScanFrequency(scans: ScanHistory[]): string {
  if (scans.length < 2) return 'one-time'

  const intervals: number[] = []
  for (let i = 1; i < scans.length; i++) {
    const diff = new Date(scans[i-1].scanDate).getTime() - new Date(scans[i].scanDate).getTime()
    intervals.push(diff)
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
  const dayInMs = 24 * 60 * 60 * 1000

  if (avgInterval <= dayInMs * 1.5) return 'daily'
  if (avgInterval <= dayInMs * 7.5) return 'weekly'
  if (avgInterval <= dayInMs * 32) return 'monthly'
  return 'irregular'
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
    const scans = sortedItems.map(processScanItem);
    
    // Calculate trends
    const trends = {
      dates: scans.map(scan => scan.scanDate).reverse(),
      urlsAnalyzed: scans.map(scan => scan.stats.urlsAnalyzed).reverse(),
      issuesFound: scans.map(scan => scan.stats.issuesFound).reverse()
    };

    // Calculate overall statistics
    const totalUrlsAnalyzed = scans.reduce((sum, scan) => sum + scan.stats.urlsAnalyzed, 0);
    const successRate = Math.round(
      (scans.reduce((sum, scan) => sum + (scan.stats.urlsAnalyzed - scan.stats.issuesFound), 0) / totalUrlsAnalyzed) * 100
    );

    // Find most common issue type
    const issueTypes = calculateIssuesByType(scans);
    const mostCommonIssue = issueTypes[0]?.type || 'None';

    return {
      domain,
      totalScans: items.length,
      scans,
      latestScan: scans[0],
      overallStats: {
        totalUrlsAnalyzed,
        successRate,
        scanFrequency: detectScanFrequency(scans),
        mostCommonIssue,
        healthScore: calculateHealthScore(scans),
        responseTimeAvg: Math.round(
          scans.reduce((sum, scan) => sum + (scan.stats.averageResponseTime || 0), 0) / scans.length
        ),
        lastScanDuration: Math.round((scans[0].stats.scanDuration || 0) / 1000),
        issuesByType: issueTypes,
        trendIndicators: calculateTrendIndicators(scans)
      },
      trends
    };
  }).sort((a, b) => new Date(b.latestScan.scanDate).getTime() - new Date(a.latestScan.scanDate).getTime());
}
