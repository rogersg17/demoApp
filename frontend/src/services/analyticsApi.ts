import type { 
  FailurePatternSummary, PrioritizedTestSuggestion, PlatformBenchmark, ReliabilityHistory, ReliabilityPrediction, PerformanceTrendPoint, NotificationRouting, RemediationSuggestions
} from '../types/analytics'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api/analytics${path}`, { credentials: 'include' })
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
}
