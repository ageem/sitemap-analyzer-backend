export type JsonPrimitive = string | number | boolean | null
export type JsonArray = JsonValue[]
export type JsonObject = { [key: string]: JsonValue }
export type JsonValue = JsonPrimitive | JsonObject | JsonArray

export interface MetaData extends JsonObject {
  title: string;
  description: string;
  keywords: string;
  newsKeywords: string;
  ogSiteName: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
}

export interface TechnicalSpecs extends JsonObject {
  loadSpeed: string;
  pageSize: string;
}

export interface MemoryUsage extends JsonObject {
  heapUsed: string;
  heapTotal: string;
  rss: string;
  external: string;
  arrayBuffers: string;
}

export interface RequestLog extends JsonObject {
  url: string;
  status: string;
  duration: string;
}

export interface DebugInfo extends JsonObject {
  xmlParsingStatus: string;
  httpStatus: string;
  networkErrors: string[];
  parsingErrors: string[];
  rateLimitingIssues: string[];
  memoryUsage: MemoryUsage;
  processingTime: string;
  stackTrace?: string;
  requestLogs: RequestLog[];
}

export interface AnalysisResult extends JsonObject {
  url: string;
  status: 'pass' | 'fail';
  issues: string[];
  metadata: MetaData;
  technicalSpecs: TechnicalSpecs;
  debugInfo?: DebugInfo;
}

export interface ErrorResult extends JsonObject {
  error: string;
  debugInfo: DebugInfo;
}

export type AnalysisResponse = {
  type: 'progress';
  progress: {
    total: number;
    current: number;
    status: 'starting' | 'analyzing' | 'complete';
  };
} | {
  type: 'complete';
  results: AnalysisResult[];
} | {
  type: 'error';
  error: string;
  debugInfo: DebugInfo;
}
