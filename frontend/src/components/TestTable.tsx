import type { Test } from '../store/slices/testSlice'
import './TestTable.css'

interface TestTableProps {
  tests: Test[]
  selectedTests: string[]
  onToggleTest: (testId: string) => void
  onSelectAll: () => void
  isLoading: boolean
}

const TestTable: React.FC<TestTableProps> = ({
  tests,
  selectedTests,
  onToggleTest,
  onSelectAll,
  isLoading
}) => {
  const formatDuration = (duration?: number) => {
    if (!duration) return '-'
    return duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`
  }

  const formatLastRun = (lastRun?: string) => {
    if (!lastRun) return 'Never'
    const date = new Date(lastRun)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60)
      return minutes <= 0 ? 'Just now' : `${minutes}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }
  }

  const getStatusIcon = (status: Test['status']) => {
    switch (status) {
      case 'passed':
        return <i className="fas fa-check-circle text-green"></i>
      case 'failed':
        return <i className="fas fa-times-circle text-red"></i>
      case 'running':
        return <i className="fas fa-spinner fa-spin text-blue"></i>
      case 'skipped':
        return <i className="fas fa-minus-circle text-yellow"></i>
      default:
        return <i className="fas fa-circle text-gray"></i>
    }
  }

  if (isLoading) {
    return (
      <div className="test-table-loading">
        <div className="loading-spinner"></div>
        <p>Loading tests...</p>
      </div>
    )
  }

  if (tests.length === 0) {
    return (
      <div className="test-table-empty">
        <i className="fas fa-vial"></i>
        <h3>No tests found</h3>
        <p>No test files were detected. Make sure your tests are in the correct directory.</p>
      </div>
    )
  }

  return (
    <div className="test-table-container">
      <div className="test-table-wrapper">
        <table className="test-table">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input
                  type="checkbox"
                  checked={selectedTests.length === tests.length && tests.length > 0}
                  onChange={onSelectAll}
                  className="test-checkbox"
                />
              </th>
              <th>Status</th>
              <th>Test Name</th>
              <th>File</th>
              <th>Duration</th>
              <th>Last Run</th>
              <th>Browser</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((test) => (
              <tr 
                key={test.id} 
                className={`test-row ${selectedTests.includes(test.id) ? 'selected' : ''} ${test.status}`}
              >
                <td className="checkbox-column">
                  <input
                    type="checkbox"
                    checked={selectedTests.includes(test.id)}
                    onChange={() => onToggleTest(test.id)}
                    className="test-checkbox"
                  />
                </td>
                <td className="status-column">
                  <div className="status-indicator">
                    {getStatusIcon(test.status)}
                    <span className="status-text">{test.status}</span>
                  </div>
                </td>
                <td className="test-name">
                  <div className="test-title">{test.title}</div>
                  {test.tags && test.tags.length > 0 && (
                    <div className="test-tags">
                      {test.tags.map((tag, index) => (
                        <span key={index} className="test-tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="file-column">
                  <code className="file-path">{test.file}</code>
                </td>
                <td className="duration-column">
                  {formatDuration(test.duration)}
                </td>
                <td className="last-run-column">
                  {formatLastRun(test.lastRun)}
                </td>
                <td className="browser-column">
                  {test.browser || 'chromium'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="test-table-footer">
        <p>
          Showing {tests.length} tests • {selectedTests.length} selected
        </p>
      </div>
    </div>
  )
}

export default TestTable
