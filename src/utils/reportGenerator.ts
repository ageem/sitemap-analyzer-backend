interface UrlAnalysis {
  url: string;
  title?: string;
  description?: string;
  ogImage?: string;
  brokenLinks?: string[];
  statusCode?: number;
  loadTime?: number;
}

export function generateScanReport(data: {
  sitemapUrl: string;
  scanDate: Date;
  results: string;
}): string {
  const parsedResults: UrlAnalysis[] = JSON.parse(data.results);
  const domain = new URL(data.sitemapUrl).hostname;
  
  // Calculate statistics
  const totalUrls = parsedResults.length;
  const urlsWithIssues = parsedResults.filter(url => 
    !url.title || !url.description || !url.ogImage || (url.brokenLinks && url.brokenLinks.length > 0)
  ).length;
  const urlsWithBrokenLinks = parsedResults.filter(url => url.brokenLinks && url.brokenLinks.length > 0).length;
  const urlsWithoutTitle = parsedResults.filter(url => !url.title).length;
  const urlsWithoutDescription = parsedResults.filter(url => !url.description).length;
  const urlsWithoutOgImage = parsedResults.filter(url => !url.ogImage).length;

  // Generate the report HTML
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sitemap Analysis Report - ${domain}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @media print {
            .no-print { display: none; }
            .page-break { page-break-before: always; }
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <!-- Header -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div class="flex justify-between items-start">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900">Sitemap Analysis Report</h1>
                    <p class="mt-2 text-gray-600">Generated on ${new Date().toLocaleString()}</p>
                </div>
                <button onclick="window.print()" class="no-print inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                    Print Report
                </button>
            </div>
            <div class="mt-6 border-t pt-6">
                <dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div>
                        <dt class="text-sm font-medium text-gray-500">Sitemap URL</dt>
                        <dd class="mt-1 text-sm text-gray-900">${data.sitemapUrl}</dd>
                    </div>
                    <div>
                        <dt class="text-sm font-medium text-gray-500">Scan Date</dt>
                        <dd class="mt-1 text-sm text-gray-900">${new Date(data.scanDate).toLocaleString()}</dd>
                    </div>
                </dl>
            </div>
        </div>

        <!-- Summary -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-6">Summary</h2>
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div class="bg-blue-50 rounded-lg p-4">
                    <div class="text-blue-900 text-sm font-medium">Total URLs</div>
                    <div class="mt-2 text-3xl font-bold text-blue-900">${totalUrls}</div>
                </div>
                <div class="bg-yellow-50 rounded-lg p-4">
                    <div class="text-yellow-900 text-sm font-medium">URLs with Issues</div>
                    <div class="mt-2 text-3xl font-bold text-yellow-900">${urlsWithIssues}</div>
                </div>
                <div class="bg-red-50 rounded-lg p-4">
                    <div class="text-red-900 text-sm font-medium">URLs with Broken Links</div>
                    <div class="mt-2 text-3xl font-bold text-red-900">${urlsWithBrokenLinks}</div>
                </div>
            </div>

            <div class="mt-8">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Missing Metadata</h3>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div class="border rounded-lg p-4">
                        <div class="text-gray-500 text-sm">Missing Title</div>
                        <div class="mt-2 text-2xl font-semibold text-gray-900">${urlsWithoutTitle}</div>
                    </div>
                    <div class="border rounded-lg p-4">
                        <div class="text-gray-500 text-sm">Missing Description</div>
                        <div class="mt-2 text-2xl font-semibold text-gray-900">${urlsWithoutDescription}</div>
                    </div>
                    <div class="border rounded-lg p-4">
                        <div class="text-gray-500 text-sm">Missing OG Image</div>
                        <div class="mt-2 text-2xl font-semibold text-gray-900">${urlsWithoutOgImage}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Detailed Results -->
        <div class="bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-6">Detailed Results</h2>
            <div class="space-y-8">
                ${parsedResults.map((result, index) => `
                    <div class="border-b pb-8 last:border-b-0 last:pb-0">
                        <div class="flex items-start justify-between">
                            <h3 class="text-lg font-medium text-gray-900">
                                <a href="${result.url}" target="_blank" class="hover:underline">${result.url}</a>
                            </h3>
                            <div class="flex space-x-2">
                                ${result.statusCode ? `
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        result.statusCode >= 200 && result.statusCode < 300 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                    }">
                                        Status: ${result.statusCode}
                                    </span>
                                ` : ''}
                                ${result.loadTime ? `
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        Load Time: ${result.loadTime}ms
                                    </span>
                                ` : ''}
                            </div>
                        </div>

                        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                                <div class="text-sm font-medium text-gray-500">Title</div>
                                <div class="mt-1 text-sm ${result.title ? 'text-gray-900' : 'text-red-600'}">
                                    ${result.title || 'Missing'}
                                </div>
                            </div>
                            <div>
                                <div class="text-sm font-medium text-gray-500">Description</div>
                                <div class="mt-1 text-sm ${result.description ? 'text-gray-900' : 'text-red-600'}">
                                    ${result.description || 'Missing'}
                                </div>
                            </div>
                            <div>
                                <div class="text-sm font-medium text-gray-500">OG Image</div>
                                <div class="mt-1 text-sm ${result.ogImage ? 'text-gray-900' : 'text-red-600'}">
                                    ${result.ogImage || 'Missing'}
                                </div>
                            </div>
                        </div>

                        ${result.brokenLinks && result.brokenLinks.length > 0 ? `
                            <div class="mt-4">
                                <div class="text-sm font-medium text-red-500">Broken Links (${result.brokenLinks.length})</div>
                                <ul class="mt-2 list-disc list-inside text-sm text-red-600">
                                    ${result.brokenLinks.map(link => `
                                        <li>${link}</li>
                                    `).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    </div>

    <script>
        // Add any interactive features here
        document.addEventListener('DOMContentLoaded', function() {
            // Add click handlers for expandable sections if needed
        });
    </script>
</body>
</html>
  `;
}
