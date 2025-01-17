'use client'

import React from 'react';
import { type DebugInfo } from '@/types'

interface DebugPanelProps {
  debugInfo: DebugInfo;
  onClose: () => void;
}

export function DebugPanel({ debugInfo, onClose }: DebugPanelProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Debug Information</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>

        <div className="space-y-4">
          <section>
            <h3 className="font-semibold mb-2">XML Parsing Status</h3>
            <p>{debugInfo.xmlParsingStatus}</p>
          </section>

          <section>
            <h3 className="font-semibold mb-2">HTTP Status</h3>
            <p>{debugInfo.httpStatus}</p>
          </section>

          <section>
            <h3 className="font-semibold mb-2">Network Errors</h3>
            <ul className="list-disc pl-5">
              {debugInfo.networkErrors.map((error, index) => (
                <li key={index} className="text-red-600">{error}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="font-semibold mb-2">Parsing Errors</h3>
            <ul className="list-disc pl-5">
              {debugInfo.parsingErrors.map((error, index) => (
                <li key={index} className="text-orange-600">{error}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="font-semibold mb-2">Rate Limiting Issues</h3>
            <ul className="list-disc pl-5">
              {debugInfo.rateLimitingIssues.map((issue, index) => (
                <li key={index} className="text-yellow-600">{issue}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="font-semibold mb-2">Memory Usage</h3>
            <pre className="bg-gray-100 p-2 rounded">
              {JSON.stringify(debugInfo.memoryUsage, null, 2)}
            </pre>
          </section>

          <section>
            <h3 className="font-semibold mb-2">Processing Time</h3>
            <p>{debugInfo.processingTime.toFixed(2)} seconds</p>
          </section>

          <section>
            <h3 className="font-semibold mb-2">Request Logs</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="text-left">URL</th>
                    <th className="text-left">Status</th>
                    <th className="text-left">Duration (ms)</th>
                  </tr>
                </thead>
                <tbody>
                  {debugInfo.requestLogs.map((log, index) => (
                    <tr key={index}>
                      <td className="truncate max-w-xs">{log.url}</td>
                      <td>{log.status}</td>
                      <td>{log.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
