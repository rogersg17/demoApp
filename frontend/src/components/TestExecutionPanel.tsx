import { useEffect, useState } from 'react'
import './TestExecutionPanel.css'

interface TestExecutionProgress {
  current: number
  total: number
  currentTest?: string
  elapsedTime: number
  completed?: boolean
}

interface TestExecutionPanelProps {
  progress: TestExecutionProgress | null
  isExecuting: boolean
}

const TestExecutionPanel: React.FC<TestExecutionPanelProps> = ({ progress, isExecuting }) => {
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isExecuting) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
    } else {
      setElapsedTime(0)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isExecuting])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercentage = progress ? Math.round((progress.current / progress.total) * 100) : 0

  if (!isExecuting && !progress) {
    return null
  }

  return (
    <div className="test-execution-panel">
      <div className="execution-header">
        <div className="execution-status">
          <div className="status-icon">
            {isExecuting ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-check-circle"></i>
            )}
          </div>
          <div className="status-text">
            <h3>
              {isExecuting ? 'Running Tests...' : 'Test Execution Complete'}
            </h3>
            <p>
              {progress ? `${progress.current} of ${progress.total} tests` : 'Preparing...'}
            </p>
          </div>
        </div>
        <div className="execution-time">
          <i className="fas fa-clock"></i>
          <span>{formatTime(elapsedTime)}</span>
        </div>
      </div>

      <div className="execution-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <div className="progress-text">
          <span>{progressPercentage}%</span>
        </div>
      </div>

      {progress?.currentTest && (
        <div className="current-test">
          <div className="current-test-label">Currently running:</div>
          <div className="current-test-name">{progress.currentTest}</div>
        </div>
      )}

      <div className="execution-details">
        <div className="detail-item">
          <span className="detail-label">Tests Completed:</span>
          <span className="detail-value">
            {progress ? `${progress.current} / ${progress.total}` : '0 / 0'}
          </span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Progress:</span>
          <span className="detail-value">{progressPercentage}%</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Elapsed Time:</span>
          <span className="detail-value">{formatTime(elapsedTime)}</span>
        </div>
      </div>
    </div>
  )
}

export default TestExecutionPanel
