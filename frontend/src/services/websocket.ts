import { io, Socket } from 'socket.io-client'

export interface TestUpdate {
  testId: string
  timestamp: string
  type: 'execution-started' | 'test-started' | 'test-completed' | 'execution-completed' | 'execution-error' | 'progress-update' | 'log-update' | 'results-ready'
  status?: string
  test?: {
    file: string
    line: string
    name: string
    startTime: string
    endTime?: string
    status?: 'passed' | 'failed' | 'skipped'
    duration?: number
  }
  progress?: {
    completed: number
    total: number
    currentTest?: {
      name: string
      file: string
      startTime: string
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
  error?: string
  command?: string
  testFiles?: string[]
  estimatedDuration?: string
  exitCode?: number
  startTime?: string
  endTime?: string
  duration?: number
}

export interface LogUpdate {
  testId: string
  timestamp: string
  source: 'stdout' | 'stderr'
  content: string
  level?: 'info' | 'error' | 'warn'
  currentTest?: {
    name: string
    file: string
    startTime: string
  }
}

export interface ExecutionHistory {
  id: string
  status: string
  startTime: Date
  endTime?: Date
  results?: {
    total: number
    passed: number
    failed: number
    skipped: number
    duration: string
  }
}

class WebSocketService {
  private socket: Socket | null = null
  private testUpdateCallbacks = new Map<string, (update: TestUpdate) => void>()
  private logUpdateCallbacks = new Map<string, (update: LogUpdate) => void>()
  private executionHistoryCallbacks: ((history: ExecutionHistory[]) => void)[] = []
  private connectionCallbacks: ((connected: boolean) => void)[] = []

  connect() {
    if (this.socket?.connected) {
      return this.socket
    }

    // Connect to the same origin (works for both dev and production)
    this.socket = io({
      transports: ['websocket', 'polling'],
      autoConnect: true
    })

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected')
      this.connectionCallbacks.forEach(callback => callback(true))
    })

    this.socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected')
      this.connectionCallbacks.forEach(callback => callback(false))
    })

    this.socket.on('testUpdate', (update: TestUpdate) => {
      console.log('📡 Received test update:', update)
      const callback = this.testUpdateCallbacks.get(update.testId)
      if (callback) {
        callback(update)
      }
    })

    this.socket.on('logUpdate', (update: LogUpdate) => {
      console.log('📝 Received log update:', update)
      const callback = this.logUpdateCallbacks.get(update.testId)
      if (callback) {
        callback(update)
      }
    })

    this.socket.on('executionHistory', (history: ExecutionHistory[]) => {
      console.log('📊 Received execution history:', history)
      this.executionHistoryCallbacks.forEach(callback => callback(history))
    })

    this.socket.on('logsHistory', (data: { testId: string; logs: Array<{ timestamp: string; source: string; content: string; level?: string }> }) => {
      console.log('📝 Received logs history:', data)
      // Process historical logs
      const callback = this.logUpdateCallbacks.get(data.testId)
      if (callback) {
        data.logs.forEach(log => {
          callback({
            testId: data.testId,
            timestamp: log.timestamp,
            source: log.source as 'stdout' | 'stderr',
            content: log.content,
            level: (log.level as 'info' | 'error' | 'warn') || 'info'
          })
        })
      }
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  // Subscribe to test execution updates
  subscribeToTestExecution(testId: string, callback: (update: TestUpdate) => void) {
    this.testUpdateCallbacks.set(testId, callback)
    
    if (this.socket?.connected) {
      this.socket.emit('joinTestExecution', testId)
    }
  }

  // Unsubscribe from test execution updates
  unsubscribeFromTestExecution(testId: string) {
    this.testUpdateCallbacks.delete(testId)
    
    if (this.socket?.connected) {
      this.socket.emit('leaveTestExecution', testId)
    }
  }

  // Subscribe to live logs
  subscribeToLogs(testId: string, callback: (update: LogUpdate) => void) {
    this.logUpdateCallbacks.set(testId, callback)
    
    if (this.socket?.connected) {
      this.socket.emit('subscribeLogs', testId)
    }
  }

  // Unsubscribe from live logs
  unsubscribeFromLogs(testId: string) {
    this.logUpdateCallbacks.delete(testId)
    
    if (this.socket?.connected) {
      this.socket.emit('unsubscribeLogs', testId)
    }
  }

  // Get execution history
  getExecutionHistory(callback: (history: ExecutionHistory[]) => void) {
    this.executionHistoryCallbacks.push(callback)
    
    if (this.socket?.connected) {
      this.socket.emit('getExecutionHistory')
    }
  }

  // Track user activity
  trackActivity(activity: string) {
    if (this.socket?.connected) {
      this.socket.emit('userActivity', activity)
    }
  }

  // Subscribe to connection status changes
  onConnectionChange(callback: (connected: boolean) => void) {
    this.connectionCallbacks.push(callback)
    
    // Immediately call with current status
    if (this.socket) {
      callback(this.socket.connected)
    }
  }

  // Remove connection status callback
  offConnectionChange(callback: (connected: boolean) => void) {
    const index = this.connectionCallbacks.indexOf(callback)
    if (index > -1) {
      this.connectionCallbacks.splice(index, 1)
    }
  }

  // Get connection status
  isConnected(): boolean {
    return this.socket?.connected || false
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService()

// Auto-connect when the service is imported
webSocketService.connect()

export default webSocketService
