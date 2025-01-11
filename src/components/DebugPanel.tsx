'use client'

import { type DebugInfo } from '@/types'

export function DebugPanel({ info }: { info: DebugInfo }) {
  return (
    <div className="mb-8 p-4 bg-gray-100 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Debug Information</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold">XML Parsing Status</h3>
          <p>{info.xmlParsingStatus}</p>
        </div>

        <div>
          <h3 className="font-semibold">HTTP Status</h3>
          <p>{info.httpStatus}</p>
        </div>

        {info.networkErrors.length > 0 && (
          <div>
            <h3 className="font-semibold">Network Errors</h3>
            <ul className="list-disc pl-4">
              {info.networkErrors.map((error, i) => (
                <li key={i} className="text-red-600">{error}</li>
              ))}
            </ul>
          </div>
        )}

        {info.parsingErrors.length > 0 && (
          <div>
            <h3 className="font-semibold">Parsing Errors</h3>
            <ul className="list-disc pl-4">
              {info.parsingErrors.map((error, i) => (
                <li key={i} className="text-orange-600">{error}</li>
              ))}
            </ul>
          </div>
        )}

        {info.rateLimitingIssues.length > 0 && (
          <div>
            <h3 className="font-semibold">Rate Limiting Issues</h3>
            <ul className="list-disc pl-4">
              {info.rateLimitingIssues.map((issue, i) => (
                <li key={i} className="text-yellow-600">{issue}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="font-semibold">Memory Usage</h3>
          <p>Heap Used: {Math.round(info.memoryUsage.heapUsed / 1024 / 1024)}MB</p>
          <p>Heap Total: {Math.round(info.memoryUsage.heapTotal / 1024 / 1024)}MB</p>
        </div>

        <div>
          <h3 className="font-semibold">Processing Time</h3>
          <p>{info.processingTime.toFixed(2)}s</p>
        </div>

        {info.stackTrace && (
          <div>
            <h3 className="font-semibold">Stack Trace</h3>
            <pre className="bg-gray-800 text-white p-4 rounded-lg overflow-x-auto">
              {info.stackTrace}
            </pre>
          </div>
        )}

        <div>
          <h3 className="font-semibold">Request Logs</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="text-left">URL</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Duration</th>
                </tr>
              </thead>
              <tbody>
                {info.requestLogs.map((log, i) => (
                  <tr key={i}>
                    <td className="truncate max-w-md">{log.url}</td>
                    <td>{log.status}</td>
                    <td>{log.duration.toFixed(2)}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
