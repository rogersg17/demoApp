export type Trend = 'improving' | 'worsening' | 'stable'

export interface FailurePatternSummary {
  testName: string
  totalOccurrences: number
  failureCount: number
  firstSeen: string
  lastSeen: string
  failureRate: number
  pattern: 'flaky' | 'persistent' | 'new' | 'intermittent' | 'stable'
  reliabilityScore: number
  trend: Trend
}

export interface PrioritizedTestSuggestion {
  testName: string
  suggestedPriority: number
  rationale: string[]
  reliabilityScore: number
  failureRate: number
}

export interface PlatformBenchmark {
  platform: string
  successRate?: number
  avgDurationMs?: number
  totalExecutions?: number
  failureRate?: number
  costEstimate?: number
}

export interface ReliabilityHistoryPoint {
  date: string
  failures: number
  executions: number
  failureRate: number
}

export interface ReliabilityHistory {
  testName: string
  windowDays: number
  daily: ReliabilityHistoryPoint[]
  overallFailureRate: number
}

export interface ReliabilityPrediction {
  testName: string
  predictedFailureProbability: number
  reliabilityScore: number
  basis: string[]
}

export interface PerformanceTrendPoint {
  date: string
  totalFailures: number
  uniqueTests: number
  persistentFailures: number
  newFailures: number
}

export interface NotificationRouting {
  channels: string[]
  priority: 'low' | 'normal' | 'high'
  rationale: string[]
}

export interface RemediationSuggestions {
  suggestions: string[]
}

// Azure-specific analytics
export interface AdoPipelineHealthItem {
  buildDefinitionId: number
  definitionName: string
  totalBuilds: number
  passedBuilds: number
  failedBuilds: number
  successRate: number
  avgDurationMs: number
}

export interface AdoDurationPoint { date: string; avgDurationMs: number; builds: number }
export interface AdoTaskBreakdownItem { taskName: string; runs: number; failures: number; avgDurationMs: number }
export interface AdoFailuresSummaryItem { pipelineConfigId: number; branchName: string | null; totalFailures: number; newFailures: number; persistentFailures: number }
export interface AdoThroughput { points: Array<{ hour: string; builds: number }>; avgPerHour: number }
