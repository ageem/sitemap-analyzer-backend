import axios from 'axios';

export interface RobotsParserResult {
  sitemaps: string[];
  error?: string;
}

export async function findSitemapsInRobotsTxt(domain: string): Promise<RobotsParserResult> {
  try {
    // Ensure domain is properly formatted
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const robotsUrl = `https://${cleanDomain}/robots.txt`;

    // Fetch robots.txt content
    const response = await axios.get(robotsUrl);
    const robotsTxtContent = response.data;

    // Parse sitemap entries using regex
    const sitemapRegex = /^Sitemap:\s*(.+)$/gm;
    const sitemaps: string[] = [];
    let match;

    while ((match = sitemapRegex.exec(robotsTxtContent)) !== null) {
      sitemaps.push(match[1].trim());
    }

    return {
      sitemaps: sitemaps,
    };
  } catch (error) {
    return {
      sitemaps: [],
      error: error instanceof Error ? error.message : 'Failed to fetch robots.txt'
    };
  }
}
