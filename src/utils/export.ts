interface ExportItem {
  date: string;
  url: string;
  status: string;
  urlsAnalyzed: number;
  issuesFound: number;
  details?: Array<{
    url: string;
    title?: string;
    description?: string;
    ogImage?: string;
    brokenLinks?: string[];
  }>;
}

export function exportToCSV(data: ExportItem[]): string {
  const headers = ['Date', 'Sitemap URL', 'Status', 'URLs Analyzed', 'Issues Found']
  const rows = data.map(item => [
    item.date,
    item.url,
    item.status,
    item.urlsAnalyzed.toString(),
    item.issuesFound.toString()
  ])

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
  ].join('\n')
}

export function exportToJSON(data: ExportItem[]): string {
  return JSON.stringify(data, null, 2)
}

export function exportToHTML(data: ExportItem[]): string {
  const rows = data.map(item => {
    let detailsHtml = ''
    if (item.details && item.details.length > 0) {
      detailsHtml = `
        <details>
          <summary>View Details (${item.details.length} URLs)</summary>
          <div style="margin-left: 20px; margin-top: 10px;">
            ${item.details.map(detail => `
              <div style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <h4 style="margin: 0 0 5px 0;"><a href="${detail.url}">${detail.url}</a></h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                  <div>
                    <strong>Title:</strong> 
                    <span style="color: ${detail.title ? 'black' : 'red'}">${detail.title || 'Missing'}</span>
                  </div>
                  <div>
                    <strong>Description:</strong> 
                    <span style="color: ${detail.description ? 'black' : 'red'}">${detail.description || 'Missing'}</span>
                  </div>
                  <div>
                    <strong>OG Image:</strong> 
                    <span style="color: ${detail.ogImage ? 'black' : 'red'}">${detail.ogImage || 'Missing'}</span>
                  </div>
                  ${detail.brokenLinks && detail.brokenLinks.length > 0 ? `
                    <div>
                      <strong style="color: red;">Broken Links (${detail.brokenLinks.length}):</strong>
                      <ul style="margin: 5px 0; padding-left: 20px;">
                        ${detail.brokenLinks.map(link => `<li style="color: red;">${link}</li>`).join('')}
                      </ul>
                    </div>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </details>
      `
    }

    return `
      <tr>
        <td>${item.date}</td>
        <td>${item.url}</td>
        <td>
          <span style="
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
            background-color: ${
              item.status === 'complete' ? '#DEF7EC' :
              item.status === 'failed' ? '#FDE8E8' :
              '#FEF3C7'
            };
            color: ${
              item.status === 'complete' ? '#03543F' :
              item.status === 'failed' ? '#9B1C1C' :
              '#8B5C0C'
            };"
          >
            ${item.status}
          </span>
        </td>
        <td>${item.urlsAnalyzed}</td>
        <td>${item.issuesFound}</td>
        <td>${detailsHtml}</td>
      </tr>
    `
  }).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Sitemap Analysis History</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; margin: 2rem; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 2rem; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background-color: #f9fafb; font-weight: 600; color: #374151; }
        tr:hover { background-color: #f9fafb; }
        h1 { color: #111827; margin-bottom: 2rem; }
        details { margin-top: 0.5rem; }
        summary { cursor: pointer; color: #2563eb; }
        a { color: #2563eb; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>Sitemap Analysis History</h1>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Sitemap URL</th>
            <th>Status</th>
            <th>URLs Analyzed</th>
            <th>Issues Found</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <footer style="color: #6B7280; font-size: 0.875rem;">
        Generated on ${new Date().toLocaleString()}
      </footer>
    </body>
    </html>
  `
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
