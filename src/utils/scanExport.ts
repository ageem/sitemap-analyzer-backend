interface UrlAnalysis {
  url: string;
  title?: string;
  description?: string;
  ogImage?: string;
  brokenLinks?: string[];
  statusCode?: number;
  loadTime?: number;
}

export function generateScanCSV(data: {
  sitemapUrl: string;
  scanDate: Date;
  results: string;
}): string {
  const parsedResults: UrlAnalysis[] = JSON.parse(data.results);
  
  const headers = [
    'URL',
    'Status Code',
    'Load Time (ms)',
    'Has Title',
    'Has Description',
    'Has OG Image',
    'Broken Links Count',
    'Broken Links'
  ].join(',');

  const rows = parsedResults.map(result => [
    `"${result.url}"`,
    result.statusCode || '',
    result.loadTime || '',
    result.title ? 'Yes' : 'No',
    result.description ? 'Yes' : 'No',
    result.ogImage ? 'Yes' : 'No',
    result.brokenLinks?.length || 0,
    result.brokenLinks ? `"${result.brokenLinks.join(', ')}"` : ''
  ].join(','));

  return [headers, ...rows].join('\n');
}

export function generateScanJSON(data: {
  sitemapUrl: string;
  scanDate: Date;
  results: string;
}): string {
  const parsedResults: UrlAnalysis[] = JSON.parse(data.results);
  const domain = new URL(data.sitemapUrl).hostname;

  // Calculate summary statistics
  const summary = {
    totalUrls: parsedResults.length,
    urlsWithIssues: parsedResults.filter(url => 
      !url.title || !url.description || !url.ogImage || (url.brokenLinks && url.brokenLinks.length > 0)
    ).length,
    urlsWithBrokenLinks: parsedResults.filter(url => url.brokenLinks && url.brokenLinks.length > 0).length,
    urlsWithoutTitle: parsedResults.filter(url => !url.title).length,
    urlsWithoutDescription: parsedResults.filter(url => !url.description).length,
    urlsWithoutOgImage: parsedResults.filter(url => !url.ogImage).length,
  };

  const exportData = {
    scanInfo: {
      sitemapUrl: data.sitemapUrl,
      domain,
      scanDate: data.scanDate.toISOString(),
      exportDate: new Date().toISOString()
    },
    summary,
    results: parsedResults
  };

  return JSON.stringify(exportData, null, 2);
}

// Re-export the HTML generator for consistency
export { generateScanReport as generateScanHTML } from './reportGenerator';
