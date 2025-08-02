import React, { useState, useEffect } from 'react';
import './FlakyTestsPage.css';

interface FlakyTest {
  id: number;
  test_name: string;
  flaky_score: number;
  classification: 'stable' | 'unstable' | 'potentially_flaky' | 'flaky';
  confidence: number;
  last_analyzed: string;
  pattern_type?: string;
  analysis_data?: any;
}

interface FlakyTestStatistics {
  total_tests: number;
  flaky_tests: number;
  potentially_flaky_tests: number;
  stable_tests: number;
  avg_flaky_score: number;
  last_analysis_date: string;
}

interface AnalysisRun {
  id: number;
  analysis_type: string;
  total_tests: number;
  flaky_tests_found: number;
  potentially_flaky_tests: number;
  stable_tests: number;
  analysis_duration_ms: number;
  started_at: string;
  completed_at: string;
}

interface TestRecommendation {
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems: string[];
}

const FlakyTestsPage: React.FC = () => {
  const [flakyTests, setFlakyTests] = useState<FlakyTest[]>([]);
  const [statistics, setStatistics] = useState<FlakyTestStatistics | null>(null);
  const [analysisRuns, setAnalysisRuns] = useState<AnalysisRun[]>([]);
  const [selectedTest, setSelectedTest] = useState<FlakyTest | null>(null);
  const [testAnalysis, setTestAnalysis] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<TestRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [analyzingTest, setAnalyzingTest] = useState<string | null>(null);
  const [filterClassification, setFilterClassification] = useState<string>('all');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardResponse, testsResponse, runsResponse] = await Promise.all([
        fetch('/api/flaky-tests/dashboard'),
        fetch('/api/flaky-tests/tests'),
        fetch('/api/flaky-tests/analysis-runs')
      ]);

      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();
        setStatistics(dashboardData.statistics);
      }

      if (testsResponse.ok) {
        const testsData = await testsResponse.json();
        setFlakyTests(testsData.tests || []);
      }

      if (runsResponse.ok) {
        const runsData = await runsResponse.json();
        setAnalysisRuns(runsData.analysisRuns || []);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysisForAllTests = async () => {
    try {
      setAnalyzingAll(true);
      const response = await fetch('/api/flaky-tests/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisType: 'full' })
      });

      if (response.ok) {
        await loadDashboardData();
        alert('Analysis completed successfully!');
      } else {
        alert('Analysis failed. Please try again.');
      }
    } catch (error) {
      console.error('Error running analysis:', error);
      alert('Analysis failed. Please try again.');
    } finally {
      setAnalyzingAll(false);
    }
  };

  const analyzeSpecificTest = async (testName: string) => {
    try {
      setAnalyzingTest(testName);
      const response = await fetch(`/api/flaky-tests/tests/${encodeURIComponent(testName)}/analyze`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadDashboardData();
        if (selectedTest?.test_name === testName) {
          await loadTestDetails(testName);
        }
      }
    } catch (error) {
      console.error(`Error analyzing test ${testName}:`, error);
    } finally {
      setAnalyzingTest(null);
    }
  };

  const loadTestDetails = async (testName: string) => {
    try {
      const response = await fetch(`/api/flaky-tests/tests/${encodeURIComponent(testName)}/analysis`);
      if (response.ok) {
        const data = await response.json();
        setTestAnalysis(data.analysis);
        setRecommendations(data.analysis.recommendations || []);
      }
    } catch (error) {
      console.error(`Error loading test details for ${testName}:`, error);
    }
  };

  const updateTestClassification = async (testName: string, newClassification: string) => {
    try {
      const response = await fetch(`/api/flaky-tests/tests/${encodeURIComponent(testName)}/classification`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classification: newClassification })
      });

      if (response.ok) {
        await loadDashboardData();
        if (selectedTest?.test_name === testName) {
          setSelectedTest(prev => prev ? { ...prev, classification: newClassification as any } : null);
        }
      }
    } catch (error) {
      console.error(`Error updating classification for ${testName}:`, error);
    }
  };

  const getClassificationColor = (classification: string): string => {
    switch (classification) {
      case 'flaky': return '#dc3545'; // Red
      case 'potentially_flaky': return '#fd7e14'; // Orange
      case 'unstable': return '#ffc107'; // Yellow
      case 'stable': return '#28a745'; // Green
      default: return '#6c757d'; // Gray
    }
  };

  const getClassificationLabel = (classification: string): string => {
    switch (classification) {
      case 'flaky': return 'Flaky';
      case 'potentially_flaky': return 'Potentially Flaky';
      case 'unstable': return 'Unstable';
      case 'stable': return 'Stable';
      default: return 'Unknown';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return '#dc3545';
      case 'medium': return '#fd7e14';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const filteredTests = flakyTests.filter(test => 
    filterClassification === 'all' || test.classification === filterClassification
  );

  if (loading) {
    return (
      <div className="flaky-tests-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading flaky test data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flaky-tests-page">
      <div className="page-header">
        <h1>Flaky Test Detection</h1>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={runAnalysisForAllTests}
            disabled={analyzingAll}
          >
            {analyzingAll ? 'Analyzing...' : 'Run Full Analysis'}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="statistics-grid">
          <div className="stat-card">
            <h3>Total Tests</h3>
            <div className="stat-value">{statistics.total_tests}</div>
          </div>
          <div className="stat-card flaky">
            <h3>Flaky Tests</h3>
            <div className="stat-value">{statistics.flaky_tests}</div>
          </div>
          <div className="stat-card potentially-flaky">
            <h3>Potentially Flaky</h3>
            <div className="stat-value">{statistics.potentially_flaky_tests}</div>
          </div>
          <div className="stat-card stable">
            <h3>Stable Tests</h3>
            <div className="stat-value">{statistics.stable_tests}</div>
          </div>
        </div>
      )}

      <div className="content-grid">
        {/* Test List */}
        <div className="test-list-panel">
          <div className="panel-header">
            <h2>Test Results</h2>
            <div className="filter-controls">
              <select
                value={filterClassification}
                onChange={(e) => setFilterClassification(e.target.value)}
                className="classification-filter"
              >
                <option value="all">All Classifications</option>
                <option value="flaky">Flaky</option>
                <option value="potentially_flaky">Potentially Flaky</option>
                <option value="unstable">Unstable</option>
                <option value="stable">Stable</option>
              </select>
            </div>
          </div>

          <div className="test-list">
            {filteredTests.map(test => (
              <div
                key={test.id}
                className={`test-item ${selectedTest?.id === test.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedTest(test);
                  loadTestDetails(test.test_name);
                }}
              >
                <div className="test-header">
                  <h4 className="test-name">{test.test_name}</h4>
                  <div
                    className="classification-badge"
                    style={{ backgroundColor: getClassificationColor(test.classification) }}
                  >
                    {getClassificationLabel(test.classification)}
                  </div>
                </div>
                <div className="test-metrics">
                  <span className="flaky-score">
                    Score: {(test.flaky_score * 100).toFixed(1)}%
                  </span>
                  <span className="confidence">
                    Confidence: {(test.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="test-actions">
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      analyzeSpecificTest(test.test_name);
                    }}
                    disabled={analyzingTest === test.test_name}
                  >
                    {analyzingTest === test.test_name ? 'Analyzing...' : 'Re-analyze'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Test Details */}
        <div className="test-details-panel">
          {selectedTest ? (
            <>
              <div className="panel-header">
                <h2>Test Details: {selectedTest.test_name}</h2>
                <div className="classification-controls">
                  <label>Classification:</label>
                  <select
                    value={selectedTest.classification}
                    onChange={(e) => updateTestClassification(selectedTest.test_name, e.target.value)}
                    className="classification-select"
                  >
                    <option value="stable">Stable</option>
                    <option value="unstable">Unstable</option>
                    <option value="potentially_flaky">Potentially Flaky</option>
                    <option value="flaky">Flaky</option>
                  </select>
                </div>
              </div>

              <div className="test-details-content">
                {/* Analysis Summary */}
                {testAnalysis && (
                  <div className="analysis-summary">
                    <h3>Analysis Summary</h3>
                    <div className="metrics-grid">
                      <div className="metric">
                        <label>Flaky Score:</label>
                        <span className="score">{(selectedTest.flaky_score * 100).toFixed(1)}%</span>
                      </div>
                      <div className="metric">
                        <label>Confidence:</label>
                        <span>{(selectedTest.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div className="metric">
                        <label>Pattern Type:</label>
                        <span>{selectedTest.pattern_type || 'Unknown'}</span>
                      </div>
                      <div className="metric">
                        <label>Last Analyzed:</label>
                        <span>{new Date(selectedTest.last_analyzed).toLocaleString()}</span>
                      </div>
                    </div>

                    {testAnalysis.flakiness?.analysis && (
                      <div className="detailed-analysis">
                        <h4>Detailed Analysis</h4>
                        <div className="analysis-metrics">
                          <div className="metric">
                            <label>Pass Rate:</label>
                            <span>{(testAnalysis.flakiness.analysis.passRate * 100).toFixed(1)}%</span>
                          </div>
                          <div className="metric">
                            <label>Consistency Score:</label>
                            <span>{(testAnalysis.flakiness.analysis.consistencyScore * 100).toFixed(1)}%</span>
                          </div>
                          <div className="metric">
                            <label>Recent Executions:</label>
                            <span>{testAnalysis.flakiness.analysis.recentExecutions}</span>
                          </div>
                          <div className="metric">
                            <label>Total Executions:</label>
                            <span>{testAnalysis.flakiness.analysis.totalExecutions}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Recommendations */}
                {recommendations.length > 0 && (
                  <div className="recommendations">
                    <h3>Recommendations</h3>
                    {recommendations.map((rec, index) => (
                      <div key={index} className="recommendation-card">
                        <div className="recommendation-header">
                          <h4>{rec.title}</h4>
                          <span
                            className="priority-badge"
                            style={{ backgroundColor: getPriorityColor(rec.priority) }}
                          >
                            {rec.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className="recommendation-description">{rec.description}</p>
                        <div className="action-items">
                          <h5>Action Items:</h5>
                          <ul>
                            {rec.actionItems.map((item, itemIndex) => (
                              <li key={itemIndex}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-selection">
              <p>Select a test from the list to view detailed analysis and recommendations.</p>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Runs History */}
      {analysisRuns.length > 0 && (
        <div className="analysis-runs-section">
          <h2>Recent Analysis Runs</h2>
          <div className="runs-list">
            {analysisRuns.map(run => (
              <div key={run.id} className="run-item">
                <div className="run-header">
                  <span className="run-type">{run.analysis_type}</span>
                  <span className="run-date">{new Date(run.completed_at).toLocaleString()}</span>
                </div>
                <div className="run-stats">
                  <span>Total: {run.total_tests}</span>
                  <span>Flaky: {run.flaky_tests_found}</span>
                  <span>Potentially Flaky: {run.potentially_flaky_tests}</span>
                  <span>Duration: {(run.analysis_duration_ms / 1000).toFixed(1)}s</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlakyTestsPage;