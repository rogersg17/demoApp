import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  IconButton,
  Chip,
  Button,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Help as UnknownIcon,
  Visibility as ViewIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

interface PipelineHealth {
  id: string;
  name: string;
  status: 'success' | 'failed' | 'warning' | 'unknown';
  lastBuild: {
    id: string;
    status: string;
    startTime: string;
    duration: number;
    testResults?: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
    };
  };
  failureCount24h: number;
  successRate7d: number;
  avgDuration: number;
  isActive: boolean;
}

interface Statistics {
  totalPipelines: number;
  activePipelines: number;
  healthyPipelines: number;
  failingPipelines: number;
  avgSuccessRate: number;
  totalBuilds24h: number;
  totalFailures24h: number;
}

interface PipelineHealthOverviewProps {
  pipelineHealth: PipelineHealth[];
  statistics: Statistics;
  onRefresh: () => void;
  onNavigateToDetails: (type: string, id?: string) => void;
  isLoading: boolean;
}

const PipelineHealthOverview: React.FC<PipelineHealthOverviewProps> = ({
  pipelineHealth = [],
  statistics,
  onRefresh,
  onNavigateToDetails,
  isLoading
}) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <SuccessIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return <UnknownIcon color="disabled" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatSuccessRate = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (isLoading && pipelineHealth.length === 0) {
    return (
      <Card className="pipeline-health-overview">
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <Box textAlign="center">
              <CircularProgress size={40} />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Loading pipeline health data...
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="pipeline-health-overview">
      <CardContent>
        {/* Header */}
        <Box className="pipeline-health-header">
          <Typography variant="h6" component="h2">
            Pipeline Health Overview
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Refresh pipeline data">
              <IconButton 
                onClick={handleRefresh} 
                disabled={refreshing}
                size="small"
              >
                {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Configure pipelines">
              <IconButton 
                onClick={() => onNavigateToDetails('configuration')}
                size="small"
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Statistics Summary */}
        {statistics && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center" className="metric">
                <Typography variant="h5" color="primary">
                  {statistics.totalPipelines}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Pipelines
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center" className="metric">
                <Typography variant="h5" color="success.main">
                  {statistics.healthyPipelines}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Healthy
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center" className="metric">
                <Typography variant="h5" color="error.main">
                  {statistics.failingPipelines}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Failing
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center" className="metric">
                <Typography variant="h5" color="info.main">
                  {formatSuccessRate(statistics.avgSuccessRate || 0)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Avg Success Rate
                </Typography>
              </Box>
            </Grid>
          </Grid>
        )}

        {/* Pipeline Grid */}
        {pipelineHealth.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="body1" color="text.secondary">
              No pipelines configured yet.
            </Typography>
            <Button 
              variant="contained" 
              sx={{ mt: 2 }}
              onClick={() => onNavigateToDetails('configuration')}
            >
              Configure Pipelines
            </Button>
          </Box>
        ) : (
          <Grid container spacing={2} className="pipeline-health-grid">
            {pipelineHealth.map((pipeline) => (
              <Grid item xs={12} sm={6} md={4} key={pipeline.id}>
                <Card 
                  className={`pipeline-card ${pipeline.status}`}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => onNavigateToDetails('pipeline', pipeline.id)}
                >
                  <CardContent>
                    {/* Pipeline Status */}
                    <Box className="pipeline-status">
                      {getStatusIcon(pipeline.status)}
                      <Box flex={1}>
                        <Typography variant="subtitle2" noWrap>
                          {pipeline.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {pipeline.isActive ? 'Active' : 'Inactive'}
                        </Typography>
                      </Box>
                      <Chip 
                        size="small" 
                        label={pipeline.status}
                        color={getStatusColor(pipeline.status) as any}
                        variant="outlined"
                      />
                    </Box>

                    {/* Last Build Info */}
                    {pipeline.lastBuild && (
                      <Box sx={{ mt: 1, mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Last build: {getRelativeTime(pipeline.lastBuild.startTime)}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          Duration: {formatDuration(pipeline.lastBuild.duration)}
                        </Typography>
                      </Box>
                    )}

                    {/* Test Results */}
                    {pipeline.lastBuild?.testResults && (
                      <Box sx={{ mt: 1, mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Tests: {pipeline.lastBuild.testResults.passed}/
                          {pipeline.lastBuild.testResults.total} passed
                        </Typography>
                        {pipeline.lastBuild.testResults.failed > 0 && (
                          <Typography variant="caption" color="error.main" sx={{ ml: 1 }}>
                            ({pipeline.lastBuild.testResults.failed} failed)
                          </Typography>
                        )}
                      </Box>
                    )}

                    {/* Pipeline Metrics */}
                    <Grid container spacing={1} className="pipeline-metrics">
                      <Grid item xs={6}>
                        <Box textAlign="center" className="metric">
                          <Typography variant="caption" fontWeight="bold">
                            {pipeline.failureCount24h}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Failures 24h
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box textAlign="center" className="metric">
                          <Typography variant="caption" fontWeight="bold">
                            {formatSuccessRate(pipeline.successRate7d)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Success Rate 7d
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Actions */}
                    <Box sx={{ mt: 1 }}>
                      <Button
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToDetails('pipeline', pipeline.id);
                        }}
                      >
                        View Details
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </CardContent>
    </Card>
  );
};

export default PipelineHealthOverview;
