import { useEffect, useState, useCallback, useRef } from 'react'
import webSocketService from '../services/websocket'
import type { TestUpdate, LogUpdate, ExecutionHistory } from '../services/websocket'

export interface TestExecutionState {
  status: 'idle' | 'running' | 'completed' | 'failed'
  progress: {
    completed: number
    total: number
    percentage: number
    currentTest?: {
      name: string
      file: string
      line?: number
      startTime?: string
    }
  }
  results?: {
    total: number
    passed: number
    failed: number
    skipped: number
    duration: string
  }
  summary?: {
    total: number
    passed: number
    failed: number
    skipped: number
    duration: string
    success: boolean
  }
  startTime?: string
  endTime?: string
  duration?: number
  error?: string
  logs: LogUpdate[]
  isConnected: boolean
}

export interface UseTestMonitoringOptions {
  autoScrollLogs?: boolean
  maxLogLines?: number
  enableLogs?: boolean
}

export function useTestMonitoring(testId: string | null, options: UseTestMonitoringOptions = {}) {
  const {
    autoScrollLogs = true,
    maxLogLines = 1000,
    enableLogs = true
  } = options

  const [state, setState] = useState<TestExecutionState>({
    status: 'idle',
    progress: {
      completed: 0,
      total: 0,
      percentage: 0
    },
    logs: [],
    isConnected: false
  })

  const [executionHistory, setExecutionHistory] = useState<ExecutionHistory[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom of logs
  const scrollToBottom = useCallback(() => {
    if (autoScrollLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [autoScrollLogs])

  // Handle test updates
  const handleTestUpdate = useCallback((update: TestUpdate) => {
    setState(prevState => {
      const newProgress = update.progress ? {
        ...update.progress,
        percentage: update.progress.total > 0 
          ? Math.round((update.progress.completed / update.progress.total) * 100)
          : 0
      } : prevState.progress

      const newState: TestExecutionState = {
        ...prevState,
        progress: newProgress
      }

      switch (update.type) {
        case 'execution-started':
          return {
            ...newState,
            status: 'running',
            startTime: update.startTime,
            endTime: undefined,
            error: undefined,
            logs: []
          }

        case 'test-started':
          return {
            ...newState,
            progress: {
              ...newProgress,
              currentTest: update.test
            }
          }

        case 'test-completed':
          // Update Redux store with test status and duration
          if (update.test && update.test.status) {
            // For now, skip individual test updates since we need the test index to match the ID format
            // The test IDs are constructed as ${file}_${index} but we only have file and name from WebSocket
            // TODO: Improve test ID matching or pass the test ID in WebSocket updates
            console.log('Test completed:', update.test.name, 'Duration:', update.test.duration);
          }
          
          return {
            ...newState,
            progress: newProgress
          }

        case 'execution-completed':
          return {
            ...newState,
            status: update.exitCode === 0 ? 'completed' : 'failed',
            endTime: update.endTime,
            duration: update.duration,
            progress: {
              ...newProgress,
              currentTest: undefined
            }
          }

        case 'execution-error':
          return {
            ...newState,
            status: 'failed',
            error: update.error
          }

        case 'results-ready':
          return {
            ...newState,
            results: update.results,
            summary: update.summary
          }

        case 'progress-update':
          return {
            ...newState,
            progress: newProgress
          }

        default:
          return newState
      }
    })
  }, [])

  // Handle log updates
  const handleLogUpdate = useCallback((update: LogUpdate) => {
    setState(prevState => {
      const newLogs = [...prevState.logs, update]
      
      // Limit log lines to prevent memory issues
      if (newLogs.length > maxLogLines) {
        newLogs.splice(0, newLogs.length - maxLogLines)
      }

      return {
        ...prevState,
        logs: newLogs
      }
    })

    // Auto-scroll after a short delay to allow DOM update
    setTimeout(scrollToBottom, 100)
  }, [maxLogLines, scrollToBottom])

  // Handle connection status changes
  const handleConnectionChange = useCallback((connected: boolean) => {
    setState(prevState => ({
      ...prevState,
      isConnected: connected
    }))
  }, [])

  // Get execution history
  const loadExecutionHistory = useCallback(() => {
    webSocketService.getExecutionHistory((history) => {
      setExecutionHistory(history)
    })
  }, [])

  // Clear logs
  const clearLogs = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      logs: []
    }))
  }, [])

  // Filter logs by level
  const getLogsByLevel = useCallback((level?: 'info' | 'error' | 'warn') => {
    if (!level) return state.logs
    return state.logs.filter(log => log.level === level)
  }, [state.logs])

  // Get logs for current test only
  const getCurrentTestLogs = useCallback(() => {
    const currentTest = state.progress.currentTest
    if (!currentTest) return []
    
    return state.logs.filter(log => 
      log.currentTest && 
      log.currentTest.name === currentTest.name
    )
  }, [state.logs, state.progress.currentTest])

  // Subscribe to test execution when testId changes
  useEffect(() => {
    if (!testId) return

    console.log(`🔄 Subscribing to test execution: ${testId}`)
    
    webSocketService.subscribeToTestExecution(testId, handleTestUpdate)
    
    if (enableLogs) {
      webSocketService.subscribeToLogs(testId, handleLogUpdate)
    }

    // Cleanup function
    return () => {
      console.log(`🔄 Unsubscribing from test execution: ${testId}`)
      webSocketService.unsubscribeFromTestExecution(testId)
      
      if (enableLogs) {
        webSocketService.unsubscribeFromLogs(testId)
      }
    }
  }, [testId, handleTestUpdate, handleLogUpdate, enableLogs])

  // Subscribe to connection status changes
  useEffect(() => {
    webSocketService.onConnectionChange(handleConnectionChange)
    
    return () => {
      webSocketService.offConnectionChange(handleConnectionChange)
    }
  }, [handleConnectionChange])

  // Load execution history on mount
  useEffect(() => {
    loadExecutionHistory()
  }, [loadExecutionHistory])

  return {
    state,
    executionHistory,
    actions: {
      clearLogs,
      loadExecutionHistory,
      scrollToBottom
    },
    utils: {
      getLogsByLevel,
      getCurrentTestLogs,
      logsEndRef
    }
  }
}

export default useTestMonitoring
