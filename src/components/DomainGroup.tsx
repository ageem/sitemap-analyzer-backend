'use client'

import React, { useState, useRef, useEffect } from 'react';
import { type DomainGroup as DomainGroupType } from '@/utils/domainGrouping';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ConfirmDialog } from './ConfirmDialog';

interface DomainGroupProps {
  group: DomainGroupType;
  onDelete?: () => Promise<void>;
}

export function DomainGroup({ group, onDelete }: DomainGroupProps) {
  const { domain, totalScans, scans, latestScan, overallStats, trends } = group;
  const [isExpanded, setIsExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const chartData = trends.dates.map((date, i) => ({
    date,
    urlsAnalyzed: trends.urlsAnalyzed[i],
    issueCount: scans[i].stats.issuesByType.reduce((sum, issue) => sum + issue.count, 0),
  }));

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [isExpanded]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete?.();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{domain}</h2>
            <p className="text-gray-600">Total Scans: {totalScans}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">
              Last Scan: {new Date(latestScan.scanDate).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-500">
              Duration: {overallStats.lastScanDuration}s
            </p>
            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                title="Delete all scans for this domain"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h3.382l-.76 3.84A2 2 0 0111 16V6a1 1 0 00-.553-.894L9 2zm5 14.5a1 1 0 00-1.106.553L13.382 16h-3.382l-.76-3.84A2 2 0 0111 12V6a1 1 0 012 0v6a2 2 0 001 2h3.382l.76 3.84A2 2 0 0116 16V6a1 1 0 001.106.553L15 2z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            <button 
              className="text-gray-400 hover:text-gray-600 transition-transform duration-200"
              aria-expanded={isExpanded}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </button>
          </div>
        </div>

        <div
          ref={contentRef}
          className={`transition-all duration-300 ease-in-out ${
            isExpanded ? 'opacity-100' : 'opacity-0 max-h-0'
          }`}
          style={{ maxHeight: isExpanded ? contentHeight : 0 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800">Health Score</h3>
              <p className="text-3xl font-bold text-blue-600">
                {overallStats.healthScore}%
              </p>
              <p className="text-sm text-blue-700">
                {overallStats.trendIndicators.healthScore === 'improving'
                  ? '↑ Improving'
                  : overallStats.trendIndicators.healthScore === 'degrading'
                  ? '↓ Degrading'
                  : '→ Stable'}
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800">Success Rate</h3>
              <p className="text-3xl font-bold text-green-600">
                {overallStats.successRate.toFixed(1)}%
              </p>
              <p className="text-sm text-green-700">
                {overallStats.trendIndicators.successRate === 'improving'
                  ? '↑ Improving'
                  : overallStats.trendIndicators.successRate === 'degrading'
                  ? '↓ Degrading'
                  : '→ Stable'}
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-800">Response Time</h3>
              <p className="text-3xl font-bold text-purple-600">
                {overallStats.responseTimeAvg}ms
              </p>
              <p className="text-sm text-purple-700">
                {overallStats.trendIndicators.responseTime === 'improving'
                  ? '↑ Improving'
                  : overallStats.trendIndicators.responseTime === 'degrading'
                  ? '↓ Degrading'
                  : '→ Stable'}
              </p>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-orange-800">URLs Analyzed</h3>
              <p className="text-3xl font-bold text-orange-600">
                {overallStats.totalUrlsAnalyzed}
              </p>
              <p className="text-sm text-orange-700">
                {overallStats.scanFrequency} scans
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Issues by Type</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {overallStats.issuesByType.map((issue, index) => (
                <div
                  key={index}
                  className="bg-gray-50 p-4 rounded-lg"
                >
                  <h4 className="font-medium text-gray-800">{issue.type}</h4>
                  <p className="text-2xl font-bold text-gray-900">{issue.count}</p>
                  <p className="text-sm text-gray-600">
                    {issue.percentage.toFixed(1)}% of URLs
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Trends</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <Line
                    type="monotone"
                    dataKey="urlsAnalyzed"
                    stroke="#4F46E5"
                    name="URLs Analyzed"
                  />
                  <Line
                    type="monotone"
                    dataKey="issueCount"
                    stroke="#EF4444"
                    name="Issues Found"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Domain History"
        message={`Are you sure you want to delete all scan history for ${domain}? This action cannot be undone.`}
      />
    </>
  );
}
