export interface MetaData {
  title: string;
  description: string;
  keywords: string;
  newsKeywords: string;
  ogSiteName: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
}

export interface TechnicalSpecs {
  loadSpeed: number; // in milliseconds
  pageSize: number; // in bytes
}

export interface RequestLog {
  url: string;
  status: number;
  duration: number;
}

export interface MemoryUsageInfo {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  arrayBuffers: number;
}

export interface DebugInfo {
  xmlParsingStatus: string;
  httpStatus: number;
  networkErrors: string[];
  parsingErrors: string[];
  rateLimitingIssues: string[];
  memoryUsage: MemoryUsageInfo;
  processingTime: number;
  requestLogs: RequestLog[];
}

export interface AnalysisResult {
  url: string;
  status: 'pass' | 'fail';
  issues: string[];
  metadata: MetaData;
  technicalSpecs: TechnicalSpecs;
}

export interface AnalysisResponse {
  results: AnalysisResult[];
  debugInfo: DebugInfo;
}

export interface ErrorResponse {
  error: string;
  debugInfo: DebugInfo;
}
