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

export interface DebugInfo {
  xmlParsingStatus: string;
  httpStatus: number;
  networkErrors: string[];
  parsingErrors: string[];
  rateLimitingIssues: string[];
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
  };
  processingTime: number;
  stackTrace?: string;
  requestLogs: {
    url: string;
    status: number;
    duration: number;
  }[];
}

export interface AnalysisResult {
  url: string;
  status: 'pass' | 'fail';
  issues: string[];
  metadata: MetaData;
  technicalSpecs: TechnicalSpecs;
  debugInfo?: DebugInfo;
}
