import type { 
  FailurePatternSummary, PrioritizedTestSuggestion, PlatformBenchmark, ReliabilityHistory, ReliabilityPrediction, PerformanceTrendPoint, NotificationRouting, RemediationSuggestions,
  AdoPipelineHealthItem, AdoDurationPoint, AdoTaskBreakdownItem, AdoFailuresSummaryItem, AdoThroughput
} from '../types/analytics'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
const TIMEOUT_MS = 10000

async function fetchWithTimeout(resource: string, options: RequestInit = {}, timeout = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(resource, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(id)
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetchWithTimeout(`${API_BASE}/api/analytics${path}`, { credentials: 'include' })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json() as Promise<T>
}

export const AnalyticsApi = {
  getFailurePatterns: (limit = 100) => get<{ patterns: FailurePatternSummary[] }>(`/failures/patterns?limit=${limit}`),
  analyzeTest: (testName: string) => get<{ analysis: FailurePatternSummary }>(`/failures/analyze?testName=${encodeURIComponent(testName)}`),
  predictReliability: (testName: string) => get<{ prediction: ReliabilityPrediction }>(`/predict/reliability?testName=${encodeURIComponent(testName)}`),
  getPrioritizedQueue: () => get<{ queue: PrioritizedTestSuggestion[] }>(`/prioritization/queue`),
  getBenchmarks: () => get<{ benchmarks: PlatformBenchmark[] }>(`/performance/benchmark`),
  getReliabilityHistory: (testName: string, days = 30) => get<{ history: ReliabilityHistory }>(`/reliability/history?testName=${encodeURIComponent(testName)}&days=${days}`),
  getPerformanceTrends: (days = 30) => get<{ trends: PerformanceTrendPoint[] }>(`/trends/performance?days=${days}`),
  getCostEstimates: () => get<{ costs: { platform: string; costEstimate?: number }[] }>(`/cost/estimates`),
  getNotificationRouting: (testName: string) => get<{ routing: NotificationRouting }>(`/notifications/route?testName=${encodeURIComponent(testName)}`),
  getRemediation: (testName: string) => get<{ remediation: RemediationSuggestions }>(`/remediation/suggest?testName=${encodeURIComponent(testName)}`),
  // Azure DevOps specific
  getAdoPipelineHealth: (days = 30) => get<{ health: AdoPipelineHealthItem[] }>(`/ado/pipelines/health?days=${days}`),
  getAdoDurations: (days = 30, buildDefinitionId?: number) => get<{ durations: AdoDurationPoint[] }>(`/ado/pipelines/durations?days=${days}${buildDefinitionId ? `&buildDefinitionId=${buildDefinitionId}` : ''}`),
  getAdoTasks: (days = 30, buildDefinitionId?: number) => get<{ tasks: AdoTaskBreakdownItem[] }>(`/ado/tasks/breakdown?days=${days}${buildDefinitionId ? `&buildDefinitionId=${buildDefinitionId}` : ''}`),
  getAdoFailuresSummary: (days = 30) => get<{ summary: AdoFailuresSummaryItem[] }>(`/ado/failures/summary?days=${days}`),
  getAdoThroughput: (days = 14) => get<{ throughput: AdoThroughput }>(`/ado/throughput?days=${days}`),
}
