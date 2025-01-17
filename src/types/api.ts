import { SearchHistory, User } from '@prisma/client'

export interface ApiResponse<T> {
  data?: T
  error?: string
  status: number
}

export interface HistoryResponse extends ApiResponse<SearchHistory[]> {
  data?: SearchHistory[]
}

export interface UserResponse extends ApiResponse<User> {
  data?: User
}

export interface DeleteHistoryResponse extends ApiResponse<void> {
  message?: string
}

export interface SearchHistoryItem extends SearchHistory {
  parsedResults: AnalysisResult
}

export interface AnalysisResult {
  urlsAnalyzed: number
  issues: number
  details: Array<{
    url: string
    title: string
    description: string
    issues: string[]
  }>
  error?: string
}

export interface DebugInfo {
  startTime: number
  memoryUsage: {
    heapUsed: number
    heapTotal: number
    rss: number
    external: number
    arrayBuffers: number
  }
  parsingErrors: string[]
  networkErrors: string[]
  rateLimitingIssues: string[]
  requestLogs: Array<{
    url: string
    status: number
    duration: number
  }>
  [key: string]: any
}

export interface ErrorResponse {
  error: string
  debugInfo?: DebugInfo
  status: 'failed'
  data?: {
    [key: string]: any
  }
}
