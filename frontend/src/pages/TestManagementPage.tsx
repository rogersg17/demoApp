import React, { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'

interface TestResult {
  id: string
  name?: string  // The API uses 'name' 
  title?: string  // Legacy property for backwards compatibility
  status: 'not-run' | 'passed' | 'failed' | 'skipped' | 'running'
  duration?: number
  error?: string
  lastRun?: string
  suite: string
  file?: string  // Added based on API response
  retries?: number
}

interface TestExecutionSummary {
  passed: number
  failed: number
  total: number
  duration: number
  timestamp: string
}

interface TestExecutionResult {
  id: string
  status: 'passed' | 'failed' | 'skipped'
  duration?: number
  error?: string
}

interface TestExecutionResponse {
  tests?: TestExecutionResult[]
  summary?: {
    passed: number
    failed: number
    total: number
    duration: number
  }
}

interface TestApiResponse {
  totalTests: number
  passingTests: number
  failingTests: number
  skippedTests: number
  lastRun: string | null
  tests: TestResult[]
}

const TestManagementPage: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([])
  const [filteredTests, setFilteredTests] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTests, setSelectedTests] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSuite, setFilterSuite] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [executionSummary, setExecutionSummary] = useState<TestExecutionSummary | null>(null)

  const loadTests = useCallback(async () => {
    try {
      console.log('🔄 Starting to load tests...')
      setLoading(true)
      const response = await fetch('/api/tests', {
        credentials: 'include'
      })
      
      console.log('📡 API response status:', response.status)
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('🔐 Authentication required, redirecting to login')
          window.location.href = '/login'
          return
        }
        throw new Error(`Failed to load tests: ${response.status} ${response.statusText}`)
      }
      
      const testResponse: TestApiResponse = await response.json()
      console.log('✅ Loaded test data:', testResponse)
      
      // Extract the tests array from the API response
      setTests(testResponse.tests || [])
      setError(null)
    } catch (err) {
      console.error('❌ Error loading tests:', err)
      setError('Failed to load tests. Please refresh the page.')
      // Load mock data as fallback
      console.log('🔄 Loading mock data as fallback...')
      loadMockTests()
    } finally {
      setLoading(false)
      console.log('✅ Finished loading tests')
    }
  }, [])

  const loadMockTests = () => {
    console.log('📝 Loading mock test data...')
    const mockTests: TestResult[] = [
      {
        id: 'login-001',
        title: 'Valid admin login',
        status: 'passed',
        duration: 2500,
        lastRun: new Date(Date.now() - 3600000).toISOString(),
        suite: 'Login Functional'
      },
      {
        id: 'login-002',
        title: 'Invalid password login',
        status: 'passed',
        duration: 1800,
        lastRun: new Date(Date.now() - 3600000).toISOString(),
        suite: 'Login Functional'
      },
      {
        id: 'login-003',
        title: 'Empty credentials login',
        status: 'failed',
        duration: 1200,
        error: 'Expected error message not found',
        lastRun: new Date(Date.now() - 3600000).toISOString(),
        suite: 'Login Functional'
      },
      {
        id: 'nav-001',
        title: 'Navigation to dashboard',
        status: 'passed',
        duration: 3200,
        lastRun: new Date(Date.now() - 7200000).toISOString(),
        suite: 'Navigation'
      },
      {
        id: 'nav-002',
        title: 'Navigation to users page',
        status: 'not-run',
        suite: 'Navigation'
      },
      {
        id: 'ui-001',
        title: 'Login form validation',
        status: 'passed',
        duration: 1500,
        lastRun: new Date(Date.now() - 1800000).toISOString(),
        suite: 'UI Tests'
      }
    ]
    console.log('✅ Mock tests loaded:', mockTests)
    setTests(mockTests)
  }

  const filterTests = useCallback(() => {
    let filtered = tests

    if (searchTerm) {
      filtered = filtered.filter(test => {
        // Use the correct property names from the API
        const title = test.name || test.title || ''
        const suite = test.suite || ''
        
        const matchesTitle = title.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesSuite = suite.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesTitle || matchesSuite
      })
    }

    if (filterStatus) {
      filtered = filtered.filter(test => test.status === filterStatus)
    }

    if (filterSuite) {
      filtered = filtered.filter(test => test.suite === filterSuite)
    }

    setFilteredTests(filtered)
  }, [tests, searchTerm, filterStatus, filterSuite])

  useEffect(() => {
    loadTests()
  }, [loadTests])

  useEffect(() => {
    filterTests()
  }, [filterTests])

  const executeTests = async (testIds?: string[]) => {
    try {
      setExecuting(true)
      setError(null)

      const testsToRun = testIds || selectedTests
      if (testsToRun.length === 0) {
        setError('Please select tests to execute')
        return
      }

      // Update test statuses to running
      setTests(prev => prev.map(test => 
        testsToRun.includes(test.id) 
          ? { ...test, status: 'running' as const }
          : test
      ))

      const response = await fetch('/api/tests/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ testIds: testsToRun })
      })

      if (!response.ok) {
        throw new Error('Failed to execute tests')
      }

      const results: TestExecutionResponse = await response.json()
      
      // Update test results
      setTests(prev => prev.map(test => {
        const result = results.tests?.find((r: TestExecutionResult) => r.id === test.id)
        if (result) {
          return {
            ...test,
            status: result.status,
            duration: result.duration,
            error: result.error,
            lastRun: new Date().toISOString()
          }
        }
        return test
      }))

      setExecutionSummary({
        passed: results.summary?.passed || 0,
        failed: results.summary?.failed || 0,
        total: results.summary?.total || testsToRun.length,
        duration: results.summary?.duration || 0,
        timestamp: new Date().toISOString()
      })

      setSelectedTests([])
    } catch (err) {
      console.error('Error executing tests:', err)
      setError('Failed to execute tests. Please try again.')
      
      // Reset running tests back to their previous state
      setTests(prev => prev.map(test => 
        test.status === 'running' 
          ? { ...test, status: 'not-run' as const }
          : test
      ))
    } finally {
      setExecuting(false)
    }
  }

  const toggleTestSelection = (testId: string) => {
    setSelectedTests(prev => 
      prev.includes(testId)
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    )
  }

  const selectAllFiltered = () => {
    setSelectedTests(filteredTests.map(test => test.id))
  }

  const clearSelection = () => {
    setSelectedTests([])
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'passed': return 'status-passed'
      case 'failed': return 'status-failed'
      case 'running': return 'status-running'
      case 'skipped': return 'status-skipped'
      default: return 'status-not-run'
    }
  }

  const getTestStats = () => {
    const total = tests.length
    const passed = tests.filter(t => t.status === 'passed').length
    const failed = tests.filter(t => t.status === 'failed').length
    const notRun = tests.filter(t => t.status === 'not-run').length
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0

    return { total, passed, failed, notRun, passRate }
  }

  const stats = getTestStats()
  const suites = [...new Set(tests.map(test => test.suite))]

  if (loading) {
    return (
      <Layout>
        <div className="test-management-container">
          <div className="loading">Loading tests...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="test-management-container">
        <header className="page-header">
          <h1>Test Management</h1>
          <p>Execute and manage your test suites</p>
        </header>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Test Statistics */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Tests</h3>
            <div className="stat-number">{stats.total}</div>
          </div>
          <div className="stat-card">
            <h3>Passed</h3>
            <div className="stat-number text-green">{stats.passed}</div>
          </div>
          <div className="stat-card">
            <h3>Failed</h3>
            <div className="stat-number text-red">{stats.failed}</div>
          </div>
          <div className="stat-card">
            <h3>Pass Rate</h3>
            <div className="stat-number">{stats.passRate}%</div>
          </div>
        </div>

        {/* Execution Summary */}
        {executionSummary && (
          <div className="execution-summary">
            <h3>Last Execution Results</h3>
            <p>
              {executionSummary.passed} passed, {executionSummary.failed} failed 
              out of {executionSummary.total} tests in {formatDuration(executionSummary.duration)}
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="test-controls">
          <div className="control-group">
            <button 
              className="btn btn-primary" 
              onClick={() => executeTests()}
              disabled={executing || selectedTests.length === 0}
            >
              {executing ? 'Running...' : `Run Selected (${selectedTests.length})`}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => executeTests(tests.map(t => t.id))}
              disabled={executing}
            >
              Run All Tests
            </button>
            <button className="btn btn-outline" onClick={selectAllFiltered}>
              Select All Filtered
            </button>
            <button className="btn btn-outline" onClick={clearSelection}>
              Clear Selection
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search tests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="not-run">Not Run</option>
              <option value="running">Running</option>
              <option value="skipped">Skipped</option>
            </select>
            <select value={filterSuite} onChange={(e) => setFilterSuite(e.target.value)}>
              <option value="">All Suites</option>
              {suites.map(suite => (
                <option key={suite} value={suite}>{suite}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tests Table */}
        <div className="tests-table-container">
          <table className="tests-table">
            <thead>
              <tr>
                <th>
                  <input 
                    type="checkbox" 
                    checked={selectedTests.length === filteredTests.length && filteredTests.length > 0}
                    onChange={() => 
                      selectedTests.length === filteredTests.length 
                        ? clearSelection() 
                        : selectAllFiltered()
                    }
                  />
                </th>
                <th>Test</th>
                <th>Suite</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Last Run</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTests.map((test) => (
                <tr key={test.id} className={selectedTests.includes(test.id) ? 'selected' : ''}>
                  <td>
                    <input 
                      type="checkbox" 
                      checked={selectedTests.includes(test.id)}
                      onChange={() => toggleTestSelection(test.id)}
                    />
                  </td>
                  <td>
                    <div className="test-info">
                      <div className="test-title">{test.name || test.title}</div>
                      {test.error && (
                        <div className="test-error">{test.error}</div>
                      )}
                    </div>
                  </td>
                  <td>{test.suite}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(test.status)}`}>
                      {test.status === 'not-run' ? 'Not Run' : test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                    </span>
                  </td>
                  <td>{formatDuration(test.duration)}</td>
                  <td>{formatLastRun(test.lastRun)}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-run"
                        onClick={() => executeTests([test.id])}
                        disabled={executing}
                      >
                        Run
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTests.length === 0 && (
          <div className="no-results">
            No tests found matching your criteria.
          </div>
        )}
      </div>
    </Layout>
  )
}

export default TestManagementPage