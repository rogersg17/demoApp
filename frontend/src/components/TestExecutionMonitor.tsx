import React from 'react'
import { useSelector } from 'react-redux'
import useTestMonitoring from '../hooks/useTestMonitoring'
import type { TestExecutionState } from '../hooks/useTestMonitoring'
import type { RootState } from '../store/store'
import './TestExecutionMonitor.css'

interface TestExecutionMonitorProps {
  testId: string | null
  onClose?: () => void
  className?: string
}

const TestExecutionMonitor: React.FC<TestExecutionMonitorProps> = ({
  testId,
  onClose,
  className = ''
}) => {
  const liveLogs = useSelector((state: RootState) => state.settings.testExecution.liveLogs)
  
  const { state, actions, utils } = useTestMonitoring(testId, {
    autoScrollLogs: true,
    maxLogLines: 500,
    enableLogs: liveLogs
  })

  if (!testId) {
    return null
  }

  const getStatusColor = (status: TestExecutionState['status']) => {
    switch (status) {
      case 'running': return 'text-blue-600'
      case 'completed': return 'text-green-600'
      case 'failed': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: TestExecutionState['status']) => {
    switch (status) {
      case 'running': return '🔄'
      case 'completed': return '✅'
      case 'failed': return '❌'
      default: return '⚪'
    }
  }

  const formatDuration = (startTime?: string, endTime?: string) => {
    if (!startTime) return 'N/A'
    
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const duration = Math.round((end.getTime() - start.getTime()) / 1000)
    
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
  }

  const getLogLevelClass = (level?: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50'
      case 'warn': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-700'
    }
  }

  return (
    <div className={`test-execution-monitor ${className}`}>
      {/* Header */}
      <div className="monitor-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getStatusIcon(state.status)}</span>
            <div>
              <h3 className="font-semibold text-lg">Test Execution</h3>
              <p className="text-sm text-gray-600">ID: {testId}</p>
            </div>
            <div className={`connection-indicator ${state.isConnected ? 'connected' : 'disconnected'}`}>
              {state.isConnected ? '🟢 Live' : '🔴 Disconnected'}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close monitor"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Status and Progress */}
      <div className="monitor-status">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="status-card">
            <h4 className="font-medium text-gray-700">Status</h4>
            <p className={`font-semibold ${getStatusColor(state.status)}`}>
              {state.status.charAt(0).toUpperCase() + state.status.slice(1)}
            </p>
          </div>
          
          <div className="status-card">
            <h4 className="font-medium text-gray-700">Duration</h4>
            <p className="font-semibold">
              {formatDuration(state.startTime, state.endTime)}
            </p>
          </div>
          
          <div className="status-card">
            <h4 className="font-medium text-gray-700">Progress</h4>
            <p className="font-semibold">
              {state.progress.completed} / {state.progress.total} ({state.progress.percentage}%)
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {state.progress.total > 0 && (
          <div className="progress-section">
            <div className="progress-bar-container">
              <div 
                className="progress-bar"
                style={{ width: `${state.progress.percentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {state.progress.percentage}% complete
            </p>
          </div>
        )}

        {/* Current Test */}
        {state.progress.currentTest && (
          <div className="current-test">
            <h4 className="font-medium text-gray-700 mb-2">Current Test</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="font-medium text-blue-900">{state.progress.currentTest.name}</p>
              <p className="text-sm text-blue-700">
                {state.progress.currentTest.file}:{state.progress.currentTest.line}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Started: {new Date(state.progress.currentTest.startTime).toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      {state.summary && (
        <div className="results-summary">
          <h4 className="font-medium text-gray-700 mb-3">Results Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="result-stat passed">
              <span className="result-number">{state.summary.passed}</span>
              <span className="result-label">Passed</span>
            </div>
            <div className="result-stat failed">
              <span className="result-number">{state.summary.failed}</span>
              <span className="result-label">Failed</span>
            </div>
            <div className="result-stat skipped">
              <span className="result-number">{state.summary.skipped}</span>
              <span className="result-label">Skipped</span>
            </div>
            <div className="result-stat total">
              <span className="result-number">{state.summary.total}</span>
              <span className="result-label">Total</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Duration: {state.summary.duration} | 
            Status: <span className={state.summary.success ? 'text-green-600' : 'text-red-600'}>
              {state.summary.success ? 'Success' : 'Failed'}
            </span>
          </p>
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="error-display">
          <h4 className="font-medium text-red-700 mb-2">Error</h4>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 font-mono text-sm">{state.error}</p>
          </div>
        </div>
      )}

      {/* Live Logs */}
      <div className="logs-section">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <h4 className="font-medium text-gray-700">Live Logs</h4>
            <span className={`text-sm px-2 py-1 rounded ${liveLogs ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {liveLogs ? '🟢 Enabled' : '🔴 Disabled'}
            </span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={actions.clearLogs}
              className="btn-secondary btn-sm"
              disabled={state.logs.length === 0}
            >
              Clear
            </button>
            <button
              onClick={actions.scrollToBottom}
              className="btn-secondary btn-sm"
            >
              Scroll to Bottom
            </button>
          </div>
        </div>
        
        <div className="logs-container">
          {!liveLogs ? (
            <div className="no-logs logs-disabled">
              <p className="text-gray-500 text-center py-8">
                📝 Live logs are disabled. Go to <strong>Settings</strong> to enable real-time test execution logs.
              </p>
            </div>
          ) : state.logs.length === 0 ? (
            <div className="no-logs">
              <p className="text-gray-500 text-center py-8">
                {state.status === 'running' ? 'Waiting for logs...' : 'No logs available'}
              </p>
            </div>
          ) : (
            <div className="logs-content">
              {state.logs.map((log, index) => (
                <div 
                  key={index}
                  className={`log-line ${getLogLevelClass(log.level)}`}
                >
                  <span className="log-timestamp">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="log-source">
                    [{log.source}]
                  </span>
                  <span className="log-content">
                    {log.content}
                  </span>
                </div>
              ))}
              <div ref={utils.logsEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TestExecutionMonitor
