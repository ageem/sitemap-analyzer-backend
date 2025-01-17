import axios from 'axios';

export interface SitemapLocation {
  url: string;
  exists: boolean;
  isIndex?: boolean;
}

const COMMON_SITEMAP_PATHS = [
  '/sitemap.xml',
  '/sitemap_index.xml',
  '/sitemaps.xml',
  '/sitemap/sitemap.xml'
];

function normalizeUrl(url: string): string {
  // Remove protocol and trailing slashes
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export async function findSitemaps(domain: string): Promise<{
  fromRobotsTxt: string[];
  commonLocations: SitemapLocation[];
  error?: string;
}> {
  try {
    // Clean the domain
    const cleanDomain = normalizeUrl(domain);
    const baseUrl = `https://${cleanDomain}`;

    // First try robots.txt
    const robotsTxtUrl = `${baseUrl}/robots.txt`;
    const robotsResponse = await axios.get(robotsTxtUrl);
    const robotsTxtContent = robotsResponse.data;
    
    // Parse sitemap entries from robots.txt
    const sitemapRegex = /^Sitemap:\s*(.+)$/gm;
    const sitemapsFromRobots: string[] = [];
    const seenUrls = new Set<string>();
    let match;

    while ((match = sitemapRegex.exec(robotsTxtContent)) !== null) {
      const sitemapUrl = match[1].trim();
      const normalizedUrl = normalizeUrl(sitemapUrl);
      if (!seenUrls.has(normalizedUrl)) {
        sitemapsFromRobots.push(sitemapUrl);
        seenUrls.add(normalizedUrl);
      }
    }

    // Check common locations
    const commonLocations: SitemapLocation[] = [];
    
    for (const path of COMMON_SITEMAP_PATHS) {
      const url = `${baseUrl}${path}`;
      const normalizedUrl = normalizeUrl(url);
      
      // Skip if we've already found this URL in robots.txt
      if (seenUrls.has(normalizedUrl)) {
        continue;
      }

      try {
        const response = await axios.head(url);
        const exists = response.status === 200;
        const contentType = response.headers['content-type'] || '';
        
        if (exists) {
          commonLocations.push({
            url,
            exists,
            isIndex: contentType.includes('xml') && path.includes('index')
          });
          seenUrls.add(normalizedUrl);
        }
      } catch {
        commonLocations.push({
          url,
          exists: false
        });
      }
    }

    return {
      fromRobotsTxt: sitemapsFromRobots,
      commonLocations
    };

  } catch (error) {
    return {
      fromRobotsTxt: [],
      commonLocations: [],
      error: error instanceof Error ? error.message : 'Failed to check sitemap locations'
    };
  }
}
