import {
  extractDomain,
  calculateScanStats,
  processScanItem,
  calculateScanFrequency,
  groupHistoryByDomain
} from '@/utils/domainGrouping';

describe('extractDomain', () => {
  it('extracts domain correctly from various URL formats', () => {
    expect(extractDomain('https://www.example.com/sitemap.xml')).toBe('example.com');
    expect(extractDomain('http://example.com/sitemap.xml')).toBe('example.com');
    expect(extractDomain('https://subdomain.example.com/sitemap.xml')).toBe('subdomain.example.com');
    expect(extractDomain('https://example.co.uk/sitemap.xml')).toBe('example.co.uk');
  });

  it('handles invalid URLs gracefully', () => {
    expect(extractDomain('invalid-url')).toBe('invalid-url');
    expect(extractDomain('')).toBe('');
  });
});

describe('calculateScanStats', () => {
  it('calculates correct statistics from scan results', () => {
    const mockResults = JSON.stringify([
      {
        url: 'https://example.com/1',
        title: 'Title 1',
        description: 'Description 1',
        ogImage: 'image1.jpg',
        loadTime: 100
      },
      {
        url: 'https://example.com/2',
        title: null,
        description: null,
        ogImage: null,
        brokenLinks: ['broken1.html', 'broken2.html'],
        loadTime: 200
      }
    ]);

    const stats = calculateScanStats(mockResults);
    expect(stats.urlsAnalyzed).toBe(2);
    expect(stats.missingTitles).toBe(1);
    expect(stats.missingDescriptions).toBe(1);
    expect(stats.missingOgImages).toBe(1);
    expect(stats.brokenLinksCount).toBe(2);
    expect(stats.averageLoadTime).toBe(150);
  });

  it('handles empty results', () => {
    const stats = calculateScanStats('[]');
    expect(stats.urlsAnalyzed).toBe(0);
    expect(stats.issuesFound).toBe(0);
  });

  it('handles invalid JSON gracefully', () => {
    const stats = calculateScanStats('invalid-json');
    expect(stats.urlsAnalyzed).toBe(0);
    expect(stats.issuesFound).toBe(0);
  });
});

describe('calculateScanFrequency', () => {
  it('identifies multiple-daily scans', () => {
    const dates = [
      new Date('2025-01-15T12:00:00'),
      new Date('2025-01-15T15:00:00'),
      new Date('2025-01-15T18:00:00')
    ];
    expect(calculateScanFrequency(dates)).toBe('multiple-daily');
  });

  it('identifies daily scans', () => {
    const dates = [
      new Date('2025-01-15T12:00:00'),
      new Date('2025-01-14T12:00:00'),
      new Date('2025-01-13T12:00:00')
    ];
    expect(calculateScanFrequency(dates)).toBe('daily');
  });

  it('identifies weekly scans', () => {
    const dates = [
      new Date('2025-01-15T12:00:00'),
      new Date('2025-01-08T12:00:00'),
      new Date('2025-01-01T12:00:00')
    ];
    expect(calculateScanFrequency(dates)).toBe('weekly');
  });

  it('handles single scan', () => {
    const dates = [new Date('2025-01-15T12:00:00')];
    expect(calculateScanFrequency(dates)).toBe('one-time');
  });
});

describe('groupHistoryByDomain', () => {
  const mockHistory = [
    {
      id: '1',
      sitemapUrl: 'https://example.com/sitemap.xml',
      searchDate: new Date('2025-01-15T12:00:00'),
      status: 'complete',
      results: JSON.stringify([
        {
          url: 'https://example.com/1',
          title: 'Title 1',
          description: 'Description 1',
          ogImage: 'image1.jpg'
        }
      ])
    },
    {
      id: '2',
      sitemapUrl: 'https://example.com/sitemap.xml',
      searchDate: new Date('2025-01-14T12:00:00'),
      status: 'complete',
      results: JSON.stringify([
        {
          url: 'https://example.com/1',
          title: null,
          description: null,
          ogImage: null
        }
      ])
    },
    {
      id: '3',
      sitemapUrl: 'https://another.com/sitemap.xml',
      searchDate: new Date('2025-01-15T12:00:00'),
      status: 'complete',
      results: JSON.stringify([
        {
          url: 'https://another.com/1',
          title: 'Title 1',
          description: null,
          ogImage: 'image1.jpg'
        }
      ])
    }
  ];

  it('groups history items correctly by domain', () => {
    const groups = groupHistoryByDomain(mockHistory);
    
    expect(groups.length).toBe(2);
    expect(groups[0].domain).toBe('example.com');
    expect(groups[0].totalScans).toBe(2);
    expect(groups[1].domain).toBe('another.com');
    expect(groups[1].totalScans).toBe(1);
  });

  it('calculates trends correctly', () => {
    const groups = groupHistoryByDomain(mockHistory);
    const exampleGroup = groups.find(g => g.domain === 'example.com')!;

    expect(exampleGroup.trends.urlsAnalyzed.length).toBe(2);
    expect(exampleGroup.trends.issuesFound.length).toBe(2);
    expect(exampleGroup.trends.dates.length).toBe(2);
  });

  it('calculates overall statistics correctly', () => {
    const groups = groupHistoryByDomain(mockHistory);
    const exampleGroup = groups.find(g => g.domain === 'example.com')!;

    expect(exampleGroup.overallStats.totalUrlsAnalyzed).toBe(2);
    expect(exampleGroup.overallStats.successRate).toBe(100);
    expect(typeof exampleGroup.overallStats.averageIssuesPerScan).toBe('number');
    expect(typeof exampleGroup.overallStats.scanFrequency).toBe('string');
  });

  it('handles empty history', () => {
    const groups = groupHistoryByDomain([]);
    expect(groups.length).toBe(0);
  });
});
