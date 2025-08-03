import React, { useState, useEffect } from 'react';
import { Grid, Container, Typography, Box, Alert, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PipelineHealthOverview from './PipelineHealthOverview';
import RecentFailures from './RecentFailures';
import ConfigurationPanel from './ConfigurationPanel';
import { useWebSocketMVP } from '../../hooks/useWebSocketMVP';
import { useMVPData } from '../../hooks/useMVPData';
import './MVPDashboard.css';

interface MVPDashboardProps {
  onNavigate?: (page: string) => void;
}

const MVPDashboard: React.FC<MVPDashboardProps> = ({ onNavigate }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // WebSocket connection for real-time updates
  const {
    isConnected,
    connectionStatus,
    subscribe,
    unsubscribe
  } = useWebSocketMVP();

  // Data hooks for MVP dashboard data
  const {
    pipelineHealth,
    recentFailures,
    configurations,
    statistics,
    refreshData,
    isLoading: dataLoading
  } = useMVPData();

  useEffect(() => {
    let mounted = true;

    const initializeDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        // Subscribe to WebSocket events for real-time updates
        subscribe('pipeline-monitoring');
        subscribe('failure-monitoring');
        subscribe('workflow-monitoring');
        subscribe('system-monitoring');

        // Initial data load
        await refreshData();

        if (mounted) {
          setLoading(false);
          setLastUpdate(new Date());
        }
      } catch (err) {
        console.error('Failed to initialize MVP dashboard:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard');
          setLoading(false);
        }
      }
    };

    initializeDashboard();

    return () => {
      mounted = false;
      unsubscribe('pipeline-monitoring');
      unsubscribe('failure-monitoring');
      unsubscribe('workflow-monitoring');
      unsubscribe('system-monitoring');
    };
  }, [subscribe, unsubscribe, refreshData]);

  // Handle real-time updates
  useEffect(() => {
    const handleRealtimeUpdate = () => {
      setLastUpdate(new Date());
      // Refresh data when receiving real-time updates
      refreshData();
    };

    if (isConnected) {
      // Listen for specific events that should trigger data refresh
      window.addEventListener('mvp-pipeline-updated', handleRealtimeUpdate);
      window.addEventListener('mvp-failure-detected', handleRealtimeUpdate);
      window.addEventListener('mvp-workflow-executed', handleRealtimeUpdate);

      return () => {
        window.removeEventListener('mvp-pipeline-updated', handleRealtimeUpdate);
        window.removeEventListener('mvp-failure-detected', handleRealtimeUpdate);
        window.removeEventListener('mvp-workflow-executed', handleRealtimeUpdate);
      };
    }
  }, [isConnected, refreshData]);

  const handleRefresh = async () => {
    try {
      await refreshData();
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to refresh dashboard:', err);
      setError('Failed to refresh data');
    }
  };

  const handleConfigurationChange = () => {
    // Refresh data when configuration changes
    handleRefresh();
  };

  const handleNavigateToConfiguration = () => {
    if (onNavigate) {
      onNavigate('settings');
    }
  };

  const handleNavigateToDetails = (type: string, id?: string) => {
    if (onNavigate) {
      switch (type) {
        case 'pipeline':
          onNavigate(`pipeline-details/${id}`);
          break;
        case 'failure':
          onNavigate(`failure-details/${id}`);
          break;
        case 'workflow':
          onNavigate(`workflow-details/${id}`);
          break;
        default:
          onNavigate('details');
      }
    }
  };

  if (loading || dataLoading) {
    return (
      <Container maxWidth="xl" className="mvp-dashboard-loading">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <Box textAlign="center">
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Loading MVP Dashboard...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Connecting to pipelines and loading real-time data
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" className="mvp-dashboard">
      {/* Header */}
      <Box className="mvp-dashboard-header" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          MVP Test Management Dashboard
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Typography>
          <Box 
            className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}
            display="flex" 
            alignItems="center" 
            gap={1}
          >
            <Box 
              className="status-indicator"
              width={8} 
              height={8} 
              borderRadius="50%" 
              bgcolor={isConnected ? 'success.main' : 'error.main'}
            />
            <Typography variant="caption">
              {isConnected ? 'Live' : 'Disconnected'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Connection Status Alert */}
      {!isConnected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Real-time updates are currently unavailable. Data may not be up to date.
        </Alert>
      )}

      {/* Main Dashboard Grid */}
      <Grid container spacing={3}>
        {/* Pipeline Health Overview - Top Row */}
        <Grid item xs={12}>
          <PipelineHealthOverview
            pipelineHealth={pipelineHealth}
            statistics={statistics}
            onRefresh={handleRefresh}
            onNavigateToDetails={handleNavigateToDetails}
            isLoading={dataLoading}
          />
        </Grid>

        {/* Recent Failures - Left Column */}
        <Grid item xs={12} lg={8}>
          <RecentFailures
            failures={recentFailures}
            onRefresh={handleRefresh}
            onNavigateToDetails={handleNavigateToDetails}
            isLoading={dataLoading}
          />
        </Grid>

        {/* Configuration Panel - Right Column */}
        <Grid item xs={12} lg={4}>
          <ConfigurationPanel
            configurations={configurations}
            onConfigurationChange={handleConfigurationChange}
            onNavigateToConfiguration={handleNavigateToConfiguration}
            isLoading={dataLoading}
          />
        </Grid>
      </Grid>

      {/* Dashboard Statistics Summary */}
      <Box className="mvp-dashboard-footer" mt={4} pt={2}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <Box textAlign="center">
              <Typography variant="h6" color="primary">
                {statistics?.totalPipelines || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Monitored Pipelines
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box textAlign="center">
              <Typography variant="h6" color="error">
                {statistics?.activeFailures || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Active Failures
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box textAlign="center">
              <Typography variant="h6" color="success">
                {statistics?.jiraIssuesCreated || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                JIRA Issues Created
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box textAlign="center">
              <Typography variant="h6" color="info">
                {statistics?.workflowsExecuted || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Workflows Executed
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default MVPDashboard;
