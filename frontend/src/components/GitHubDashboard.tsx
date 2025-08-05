/**
 * GitHub Dashboard Component
 * Multi-platform CI/CD dashboard supporting GitHub Actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Grid, Typography, Button, Box, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert, CircularProgress, LinearProgress } from '@mui/material';
import { 
  PlayArrow, 
  Stop, 
  Refresh, 
  Schedule,
  CheckCircle,
  Error,
  Warning,
  Settings,
  GitHub
} from '@mui/icons-material';
import { format } from 'date-fns';

interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
}

interface WorkflowRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  head_branch: string;
  event: string;
  created_at: string;
  updated_at: string;
  run_number: number;
  head_commit: {
    message: string;
    author: {
      name: string;
    };
  };
}

interface WorkflowJob {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  started_at: string;
  completed_at: string | null;
  steps: Array<{
    name: string;
    status: 'queued' | 'in_progress' | 'completed';
    conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
    number: number;
  }>;
}

interface WorkflowStatistics {
  totalRuns: number;
  successRate: number;
  averageDuration: number;
  failureCount: number;
  successCount: number;
  cancelledCount: number;
  todaysRuns: number;
  weeklyTrend: number;
}

const GitHubDashboard: React.FC = () => {
  const [config, setConfig] = useState<GitHubConfig>({
    owner: '',
    repo: '',
    token: ''
  });
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [statistics, setStatistics] = useState<WorkflowStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = config.owner && config.repo && config.token;

  const fetchWorkflowRuns = useCallback(async () => {
    if (!isConfigured) return;

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        owner: config.owner,
        repo: config.repo,
        token: config.token,
        per_page: '20'
      });

      const response = await fetch(`/api/github/workflows/runs?${queryParams}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch workflow runs');
      }

      setRuns(data.data.runs);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [config, isConfigured]);

  const fetchWorkflowJobs = useCallback(async (runId: number) => {
    if (!isConfigured) return;

    try {
      const queryParams = new URLSearchParams({
        owner: config.owner,
        repo: config.repo,
        token: config.token
      });

      const response = await fetch(`/api/github/workflows/runs/${runId}/jobs?${queryParams}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch workflow jobs');
      }

      setJobs(data.data);
    } catch (err: unknown) {
      console.error('Error fetching jobs:', err);
    }
  }, [config, isConfigured]);

  const fetchStatistics = useCallback(async () => {
    if (!isConfigured) return;

    try {
      const queryParams = new URLSearchParams({
        owner: config.owner,
        repo: config.repo,
        token: config.token,
        timeframe: 'week'
      });

      const response = await fetch(`/api/github/analytics/statistics?${queryParams}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch statistics');
      }

      setStatistics(data.data.statistics);
    } catch (err: unknown) {
      console.error('Error fetching statistics:', err);
    }
  }, [config, isConfigured]);

  const cancelWorkflowRun = async (runId: number) => {
    if (!isConfigured) return;

    try {
      const response = await fetch(`/api/github/workflows/runs/${runId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: config.owner,
          repo: config.repo,
          token: config.token
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel workflow run');
      }

      // Refresh the runs list
      fetchWorkflowRuns();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    }
  };

  const triggerWorkflow = async (eventType: string) => {
    if (!isConfigured) return;

    try {
      const response = await fetch('/api/github/workflows/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: config.owner,
          repo: config.repo,
          token: config.token,
          eventType,
          clientPayload: {
            triggeredBy: 'TMS Dashboard',
            timestamp: new Date().toISOString()
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger workflow');
      }

      // Refresh the runs list after a delay
      setTimeout(fetchWorkflowRuns, 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    }
  };

  const getStatusColor = (status: string, conclusion: string | null) => {
    if (status === 'in_progress') return 'info';
    if (status === 'queued') return 'warning';
    if (conclusion === 'success') return 'success';
    if (conclusion === 'failure') return 'error';
    if (conclusion === 'cancelled') return 'default';
    return 'default';
  };

  const getStatusIcon = (status: string, conclusion: string | null) => {
    if (status === 'in_progress') return <CircularProgress size={16} />;
    if (status === 'queued') return <Schedule fontSize="small" />;
    if (conclusion === 'success') return <CheckCircle fontSize="small" color="success" />;
    if (conclusion === 'failure') return <Error fontSize="small" color="error" />;
    if (conclusion === 'cancelled') return <Warning fontSize="small" />;
    return <Schedule fontSize="small" />;
  };

  useEffect(() => {
    if (isConfigured) {
      fetchWorkflowRuns();
      fetchStatistics();
    }
  }, [isConfigured, fetchWorkflowRuns, fetchStatistics]);

  useEffect(() => {
    if (selectedRun) {
      fetchWorkflowJobs(selectedRun.id);
    }
  }, [selectedRun, fetchWorkflowJobs]);

  if (!isConfigured) {
    return (
      <Box sx={{ p: 3 }}>
        <Card sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <GitHub sx={{ mr: 1 }} />
            <Typography variant="h6">GitHub Actions Configuration</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure your GitHub repository to monitor workflow runs and manage CI/CD pipelines.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <input
              type="text"
              placeholder="Repository Owner (e.g., microsoft)"
              value={config.owner}
              onChange={(e) => setConfig(prev => ({ ...prev, owner: e.target.value }))}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <input
              type="text"
              placeholder="Repository Name (e.g., vscode)"
              value={config.repo}
              onChange={(e) => setConfig(prev => ({ ...prev, repo: e.target.value }))}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <input
              type="password"
              placeholder="GitHub Personal Access Token"
              value={config.token}
              onChange={(e) => setConfig(prev => ({ ...prev, token: e.target.value }))}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <Typography variant="caption" color="text.secondary">
              GitHub token requires 'actions:read' and 'repo' permissions
            </Typography>
          </Box>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <GitHub sx={{ mr: 1 }} />
          <Typography variant="h5">GitHub Actions Dashboard</Typography>
          <Chip 
            label={`${config.owner}/${config.repo}`} 
            size="small" 
            sx={{ ml: 2 }} 
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchWorkflowRuns}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={() => triggerWorkflow('test-trigger')}
            disabled={loading}
          >
            Trigger Test
          </Button>
          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={() => {
              // Reset configuration to show config form
              setConfig({ owner: '', repo: '', token: '' });
            }}
          >
            Settings
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Statistics */}
      {statistics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {statistics.totalRuns}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Runs
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {Math.round(statistics.successRate)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Success Rate
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {Math.round(statistics.averageDuration)}m
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Duration
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {statistics.todaysRuns}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Today's Runs
              </Typography>
            </Card>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={3}>
        {/* Workflow Runs */}
        <Grid item xs={12} lg={8}>
          <Card>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">Recent Workflow Runs</Typography>
            </Box>
            {loading ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Workflow</TableCell>
                      <TableCell>Branch</TableCell>
                      <TableCell>Commit</TableCell>
                      <TableCell>Started</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {runs.map((run) => (
                      <TableRow 
                        key={run.id}
                        hover
                        onClick={() => setSelectedRun(run)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getStatusIcon(run.status, run.conclusion)}
                            <Chip
                              label={run.conclusion || run.status}
                              size="small"
                              color={getStatusColor(run.status, run.conclusion)}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {run.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            #{run.run_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={run.head_branch} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {run.head_commit.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            by {run.head_commit.author.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {format(new Date(run.created_at), 'MMM dd, HH:mm')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {run.status === 'in_progress' && (
                            <Button
                              size="small"
                              startIcon={<Stop />}
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                cancelWorkflowRun(run.id);
                              }}
                            >
                              Cancel
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Grid>

        {/* Job Details */}
        <Grid item xs={12} lg={4}>
          <Card>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">
                {selectedRun ? `Jobs for Run #${selectedRun.run_number}` : 'Select a Run'}
              </Typography>
            </Box>
            {selectedRun ? (
              <Box sx={{ p: 2 }}>
                {jobs.map((job) => (
                  <Card key={job.id} variant="outlined" sx={{ mb: 2 }}>
                    <Box sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2">{job.name}</Typography>
                        {getStatusIcon(job.status, job.conclusion)}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {job.started_at && `Started: ${format(new Date(job.started_at), 'HH:mm:ss')}`}
                      </Typography>
                      {job.status === 'in_progress' && (
                        <LinearProgress sx={{ mt: 1 }} />
                      )}
                      {job.steps && (
                        <Box sx={{ mt: 1 }}>
                          {job.steps.slice(0, 3).map((step) => (
                            <Box key={step.number} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              {getStatusIcon(step.status, step.conclusion)}
                              <Typography variant="caption" noWrap>
                                {step.name}
                              </Typography>
                            </Box>
                          ))}
                          {job.steps.length > 3 && (
                            <Typography variant="caption" color="text.secondary">
                              ... and {job.steps.length - 3} more steps
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Card>
                ))}
              </Box>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Click on a workflow run to see job details
                </Typography>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GitHubDashboard;
