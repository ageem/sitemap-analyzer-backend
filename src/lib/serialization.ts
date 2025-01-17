import { type DebugInfo, type AnalysisResult, type JsonValue } from '@/types'

export type JsonValue = 
  | string 
  | number 
  | boolean 
  | null 
  | { [key: string]: JsonValue } 
  | JsonValue[]

export function serializeForPrisma<T extends JsonValue>(data: T): string {
  return JSON.stringify(data, (_, value) => {
    if (typeof value === 'bigint') {
      return value.toString()
    }
    if (value instanceof Error) {
      return value.message
    }
    if (typeof value === 'number') {
      return String(value)
    }
    return value
  })
}

export function deserializeFromPrisma<T>(data: string | null): T | null {
  if (!data) return null
  return JSON.parse(data) as T
}

export function serializeDebugInfo(debugInfo: DebugInfo): DebugInfo {
  return {
    xmlParsingStatus: debugInfo.xmlParsingStatus,
    httpStatus: String(debugInfo.httpStatus),
    networkErrors: debugInfo.networkErrors.map(String),
    parsingErrors: debugInfo.parsingErrors.map(String),
    rateLimitingIssues: debugInfo.rateLimitingIssues.map(String),
    memoryUsage: {
      heapUsed: String(debugInfo.memoryUsage.heapUsed),
      heapTotal: String(debugInfo.memoryUsage.heapTotal),
      rss: String(debugInfo.memoryUsage.rss),
      external: String(debugInfo.memoryUsage.external),
      arrayBuffers: String(debugInfo.memoryUsage.arrayBuffers)
    },
    processingTime: String(debugInfo.processingTime),
    requestLogs: debugInfo.requestLogs.map(log => ({
      url: log.url,
      status: String(log.status),
      duration: String(log.duration)
    }))
  }
}

export function serializeAnalysisResult(result: AnalysisResult): AnalysisResult {
  return {
    url: result.url,
    status: result.status,
    issues: result.issues,
    metadata: result.metadata,
    technicalSpecs: {
      loadSpeed: String(result.technicalSpecs.loadSpeed),
      pageSize: String(result.technicalSpecs.pageSize)
    },
    debugInfo: result.debugInfo ? serializeDebugInfo(result.debugInfo) : undefined
  }
}
