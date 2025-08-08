import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Card, CardContent, Chip, IconButton, Collapse, List, ListItem, ListItemText, ListItemIcon, Divider, Tooltip } from '@mui/material';
import { 
  PlayArrow, 
  Pause, 
  Stop, 
  ExpandMore, 
  ExpandLess,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Schedule,
  Speed,
  Timer,
  Assessment
} from '@mui/icons-material';
import ProgressIndicator from './ProgressIndicator';
import type { ProgressStatus } from './ProgressIndicator';
import type { TestProgressUpdate } from '../../services/realTimeUpdates';
import realTimeUpdates from '../../services/realTimeUpdates';
import './TestExecutionProgress.css';

interface TestSuite {
  id: string;
  name: string;
  status: ProgressStatus;
  progress: number;
  tests: TestCase[];
  startTime?: Date;
  endTime?: Date;
  duration?: number;
}

interface TestCase {
  id: string;
  name: string;
  status: ProgressStatus;
  duration?: number;
  error?: string;
  logs?: string[];
  retries?: number;
}

interface TestExecutionProgressProps {
  onStart?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onRetry?: (testId: string) => void;
  showDetailedLogs?: boolean;
  showPerformanceMetrics?: boolean;
  autoExpand?: boolean;
}

const TestExecutionProgress: React.FC<TestExecutionProgressProps> = ({
  onStart,
  onPause,
  onStop,
  onRetry,
  showPerformanceMetrics = true,
  autoExpand = false
}) => {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [overallStatus, setOverallStatus] = useState<ProgressStatus>('idle');
  const [overallProgress, setOverallProgress] = useState(0);
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());
  const [executionStartTime, setExecutionStartTime] = useState<Date | null>(null);
  const [executionStats, setExecutionStats] = useState({
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    avgTestTime: 0,
    slowestTest: { name: '', duration: 0 },
    fastestTest: { name: '', duration: Infinity }
  });

  // Handlers are defined first, subscription effect is placed later to avoid use-before-define

  const handleTestStarted = useCallback((data: TestProgressUpdate) => {
    if (!executionStartTime) {
      setExecutionStartTime(new Date());
    }

    setOverallStatus('running');
    
    setTestSuites(prev => {
      const updated = [...prev];
      let suiteIndex = updated.findIndex(suite => suite.name === data.testName.split(' ')[0]);
      
      if (suiteIndex === -1) {
        // Create new test suite
        const newSuite: TestSuite = {
          id: `suite-${data.testId}`,
          name: data.testName.split(' ')[0] || 'Unknown Suite',
          status: 'running',
          progress: 0,
          tests: [],
          startTime: new Date()
        };
        updated.push(newSuite);
        suiteIndex = updated.length - 1;
      }

      // Add test case to suite
      const testCase: TestCase = {
        id: data.testId,
        name: data.testName,
        status: 'running'
      };

      updated[suiteIndex].tests.push(testCase);
      updated[suiteIndex].status = 'running';

      return updated;
    });

    if (autoExpand) {
      setExpandedSuites(prev => new Set([...prev, `suite-${data.testId}`]));
    }
  }, [executionStartTime, autoExpand]);

  const handleTestProgress = useCallback((data: TestProgressUpdate) => {
    setTestSuites(prev => {
      return prev.map(suite => {
        const testIndex = suite.tests.findIndex(test => test.id === data.testId);
        if (testIndex !== -1) {
          const updatedTests = [...suite.tests];
          updatedTests[testIndex] = {
            ...updatedTests[testIndex],
            status: data.status,
          };

          const completedTests = updatedTests.filter(test => 
            test.status === 'completed' || test.status === 'failed'
          ).length;
          const suiteProgress = (completedTests / updatedTests.length) * 100;

          return {
            ...suite,
            tests: updatedTests,
            progress: suiteProgress,
            status: suiteProgress === 100 ? 'completed' : 'running'
          };
        }
        return suite;
      });
    });

    // Update overall progress
    const totalTests = testSuites.reduce((sum, suite) => sum + suite.tests.length, 0);
    const completedTests = testSuites.reduce((sum, suite) => 
      sum + suite.tests.filter(test => 
        test.status === 'completed' || test.status === 'failed'
      ).length, 0
    );
    
    if (totalTests > 0) {
      setOverallProgress((completedTests / totalTests) * 100);
    }
  }, [testSuites]);

  const updateExecutionStats = useCallback(() => {
    let total = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let totalDuration = 0;
    let slowest = { name: '', duration: 0 };
    let fastest = { name: '', duration: Infinity };

    testSuites.forEach(suite => {
      suite.tests.forEach(test => {
        total++;
        if (test.status === 'completed') passed++;
        else if (test.status === 'failed') failed++;
        else if (test.status === 'cancelled') skipped++;

        if (test.duration) {
          totalDuration += test.duration;
          if (test.duration > slowest.duration) {
            slowest = { name: test.name, duration: test.duration };
          }
          if (test.duration < fastest.duration) {
            fastest = { name: test.name, duration: test.duration };
          }
        }
      });
    });

    setExecutionStats({
      total,
      passed,
      failed,
      skipped,
      duration: totalDuration,
      avgTestTime: total > 0 ? totalDuration / total : 0,
      slowestTest: slowest,
      fastestTest: fastest.duration === Infinity ? { name: '', duration: 0 } : fastest
    });
  }, [testSuites]);

  const handleTestCompleted = useCallback((data: TestProgressUpdate) => {
    setTestSuites(prev => {
      return prev.map(suite => {
        const testIndex = suite.tests.findIndex(test => test.id === data.testId);
        if (testIndex !== -1) {
          const updatedTests = [...suite.tests];
          updatedTests[testIndex] = {
            ...updatedTests[testIndex],
            status: data.status,
            duration: data.duration,
            error: data.status === 'failed' ? data.message : undefined
          };

          const completedTests = updatedTests.filter(test => 
            test.status === 'completed' || test.status === 'failed'
          ).length;
          const suiteProgress = (completedTests / updatedTests.length) * 100;

          const updatedSuite = {
            ...suite,
            tests: updatedTests,
            progress: suiteProgress,
          };

          if (suiteProgress === 100) {
            updatedSuite.status = updatedTests.some(test => test.status === 'failed') ? 'failed' : 'completed';
            updatedSuite.endTime = new Date();
            if (updatedSuite.startTime) {
              updatedSuite.duration = updatedSuite.endTime.getTime() - updatedSuite.startTime.getTime();
            }
          }

          return updatedSuite;
        }
        return suite;
      });
    });

    // Update execution stats
  updateExecutionStats();

    // Check if all tests are completed
    const allCompleted = testSuites.every(suite => 
      suite.tests.every(test => test.status === 'completed' || test.status === 'failed')
    );

    if (allCompleted) {
      const hasFailures = testSuites.some(suite => 
        suite.tests.some(test => test.status === 'failed')
      );
      setOverallStatus(hasFailures ? 'failed' : 'completed');
      setOverallProgress(100);
    }
  }, [testSuites, updateExecutionStats]);

  

  // Real-time update subscriptions (after handlers are declared)
  useEffect(() => {
    const unsubscribeTestStarted = realTimeUpdates.on('test:started', handleTestStarted);
    const unsubscribeTestProgress = realTimeUpdates.on('test:progress', handleTestProgress);
    const unsubscribeTestCompleted = realTimeUpdates.on('test:completed', handleTestCompleted);

    return () => {
      unsubscribeTestStarted();
      unsubscribeTestProgress();
      unsubscribeTestCompleted();
    };
  }, [handleTestStarted, handleTestProgress, handleTestCompleted]);

  const toggleSuiteExpansion = (suiteId: string) => {
    setExpandedSuites(prev => {
      const updated = new Set(prev);
      if (updated.has(suiteId)) {
        updated.delete(suiteId);
      } else {
        updated.add(suiteId);
      }
      return updated;
    });
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const getStatusColor = (status: ProgressStatus) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'warning': return 'warning';
      case 'running': return 'primary';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: ProgressStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle color="success" />;
      case 'failed': return <ErrorIcon color="error" />;
      case 'warning': return <Warning color="warning" />;
      case 'running': return <PlayArrow color="primary" />;
      case 'cancelled': return <Stop color="disabled" />;
      default: return <Schedule color="disabled" />;
    }
  };

  return (
    <Box className="test-execution-progress">
      {/* Overall Progress Header */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box className="execution-header">
            <Box className="header-info">
              <Typography variant="h6" fontWeight={600}>
                Test Execution Progress
              </Typography>
              <Box className="execution-controls">
                <Tooltip title="Start Tests">
                  <IconButton onClick={onStart} disabled={overallStatus === 'running'}>
                    <PlayArrow />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Pause Tests">
                  <IconButton onClick={onPause} disabled={overallStatus !== 'running'}>
                    <Pause />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Stop Tests">
                  <IconButton onClick={onStop} disabled={overallStatus === 'idle'}>
                    <Stop />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            
            <ProgressIndicator
              type="linear"
              progress={overallProgress}
              status={overallStatus}
              showPercentage={true}
              showStatus={true}
              showTimer={overallStatus === 'running'}
              animated={true}
              size="medium"
            />

            {/* Execution Stats */}
            <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
              <Box className="stat-item">
                  <Typography variant="h4" color="primary.main">
                    {executionStats.total}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Tests
                  </Typography>
                </Box>
              <Box className="stat-item">
                  <Typography variant="h4" color="success.main">
                    {executionStats.passed}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Passed
                  </Typography>
                </Box>
              <Box className="stat-item">
                  <Typography variant="h4" color="error.main">
                    {executionStats.failed}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Failed
                  </Typography>
                </Box>
              <Box className="stat-item">
                  <Typography variant="h4" color="warning.main">
                    {executionStats.skipped}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Skipped
                  </Typography>
                </Box>
            </Box>

            {/* Performance Metrics */}
            {showPerformanceMetrics && executionStats.total > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                  <Box className="perf-metric">
                      <Timer fontSize="small" color="primary" />
                      <Typography variant="body2">
                        Avg: {formatDuration(executionStats.avgTestTime)}
                      </Typography>
                    </Box>
                  <Box className="perf-metric">
                      <Speed fontSize="small" color="error" />
                      <Typography variant="body2">
                        Slowest: {formatDuration(executionStats.slowestTest.duration)}
                      </Typography>
                    </Box>
                  <Box className="perf-metric">
                      <Assessment fontSize="small" color="success" />
                      <Typography variant="body2">
                        Fastest: {formatDuration(executionStats.fastestTest.duration)}
                      </Typography>
                    </Box>
                </Box>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Test Suites */}
      {testSuites.map((suite) => {
        const isExpanded = expandedSuites.has(suite.id);
        
        return (
          <Card key={suite.id} sx={{ mb: 2 }}>
            <CardContent>
              <Box 
                className="suite-header"
                onClick={() => toggleSuiteExpansion(suite.id)}
                sx={{ cursor: 'pointer' }}
              >
                <Box className="suite-info">
                  {getStatusIcon(suite.status)}
                  <Typography variant="subtitle1" fontWeight={600} sx={{ ml: 1 }}>
                    {suite.name}
                  </Typography>
                  <Chip
                    label={`${suite.tests.length} tests`}
                    size="small"
                    color={getStatusColor(suite.status)}
                    variant="outlined"
                    sx={{ ml: 2 }}
                  />
                  {suite.duration && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                      {formatDuration(suite.duration)}
                    </Typography>
                  )}
                </Box>
                <IconButton size="small">
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>

              <ProgressIndicator
                type="linear"
                progress={suite.progress}
                status={suite.status}
                showPercentage={true}
                showStatus={false}
                size="small"
                animated={true}
              />

              <Collapse in={isExpanded}>
                <List dense sx={{ mt: 1 }}>
                  {suite.tests.map((test, index) => (
                    <React.Fragment key={test.id}>
                      <ListItem
                        secondaryAction={
                          test.status === 'failed' && onRetry ? (
                            <IconButton 
                              edge="end" 
                              size="small"
                              onClick={() => onRetry(test.id)}
                            >
                              <PlayArrow />
                            </IconButton>
                          ) : test.duration ? (
                            <Typography variant="caption" color="text.secondary">
                              {formatDuration(test.duration)}
                            </Typography>
                          ) : null
                        }
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          {getStatusIcon(test.status)}
                        </ListItemIcon>
                        <ListItemText
                          primary={test.name}
                          secondary={test.error}
                          secondaryTypographyProps={{
                            color: 'error.main',
                            variant: 'caption'
                          }}
                        />
                      </ListItem>
                      {index < suite.tests.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Collapse>
            </CardContent>
          </Card>
        );
      })}

      {testSuites.length === 0 && (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" align="center">
              No test execution in progress. Click start to begin testing.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default TestExecutionProgress;