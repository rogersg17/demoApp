// TypeScript definitions for the demo app

export interface Test {
  id: string
  title: string
  file: string
  status: 'not-run' | 'passed' | 'failed' | 'skipped' | 'running'
  duration?: number
  lastRun?: string
  error?: string
  browser?: string
  tags?: string[]
}

export interface TestExecutionProgress {
  current: number
  total: number
  currentTest?: string
  elapsedTime: number
  completed?: boolean
}

export interface ExecutionResults {
  passed: number
  failed: number
  total: number
  duration: number
}

export interface TestState {
  tests: Test[]
  selectedTests: string[]
  isLoading: boolean
  isExecuting: boolean
  executionProgress: TestExecutionProgress | null
  lastExecutionResults: ExecutionResults | null
  error: string | null
}
