import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Chip, 
  Grid, 
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Tooltip,
  LinearProgress,
  Alert,
  Button
} from '@mui/material';
import { 
  Build, 
  CloudUpload, 
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Schedule,
  ExpandMore,
  ExpandLess,
  Refresh,
  Launch,
  PlayArrow,
  Stop,
  History,
  Speed,
  Storage
} from '@mui/icons-material';
import ProgressIndicator, { ProgressStep, ProgressStatus } from './ProgressIndicator';
import { BuildProgressUpdate, DeploymentProgressUpdate } from '../../services/realTimeUpdates';
import realTimeUpdates from '../../services/realTimeUpdates';
import './BuildDeploymentProgress.css';

interface BuildStage {
  id: string;
  name: string;
  status: ProgressStatus;
  progress: number;
  message?: string;
  duration?: number;
  logs?: string[];
  artifacts?: string[];
}

interface Build {
  id: string;
  projectName: string;
  branch: string;
  commit: string;
  status: ProgressStatus;
  progress: number;
  stages: BuildStage[];
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  artifacts?: string[];
  size?: number;
}

interface Deployment {
  id: string;
  buildId: string;
  environment: string;
  status: ProgressStatus;
  progress: number;
  url?: string;
  stages: BuildStage[];
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  health?: 'healthy' | 'warning' | 'error';
}

interface BuildDeploymentProgressProps {
  onTriggerBuild?: (projectName: string) => void;
  onTriggerDeployment?: (buildId: string, environment: string) => void;
  onCancelBuild?: (buildId: string) => void;
  onCancelDeployment?: (deploymentId: string) => void;
  showLogs?: boolean;
  showArtifacts?: boolean;
  environments?: string[];
}

const BuildDeploymentProgress: React.FC<BuildDeploymentProgressProps> = ({
  onTriggerBuild,
  onTriggerDeployment,
  onCancelBuild,
  onCancelDeployment,
  showLogs = true,
  showArtifacts = true,
  environments = ['development', 'staging', 'production']
}) => {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [expandedBuilds, setExpandedBuilds] = useState<Set<string>>(new Set());
  const [expandedDeployments, setExpandedDeployments] = useState<Set<string>>(new Set());
  const [selectedTab, setSelectedTab] = useState<'builds' | 'deployments'>('builds');

  // Real-time update subscriptions
  useEffect(() => {
    const unsubscribeBuildStarted = realTimeUpdates.on('build:started', handleBuildStarted);
    const unsubscribeBuildProgress = realTimeUpdates.on('build:progress', handleBuildProgress);
    const unsubscribeBuildCompleted = realTimeUpdates.on('build:completed', handleBuildCompleted);
    const unsubscribeDeploymentStarted = realTimeUpdates.on('deployment:started', handleDeploymentStarted);
    const unsubscribeDeploymentProgress = realTimeUpdates.on('deployment:progress', handleDeploymentProgress);
    const unsubscribeDeploymentCompleted = realTimeUpdates.on('deployment:completed', handleDeploymentCompleted);

    return () => {
      unsubscribeBuildStarted();
      unsubscribeBuildProgress();
      unsubscribeBuildCompleted();
      unsubscribeDeploymentStarted();
      unsubscribeDeploymentProgress();
      unsubscribeDeploymentCompleted();
    };
  }, []);

  const handleBuildStarted = useCallback((data: BuildProgressUpdate) => {
    const newBuild: Build = {
      id: data.buildId,
      projectName: data.projectName,
      branch: 'main', // This should come from data
      commit: 'latest', // This should come from data
      status: 'running',
      progress: 0,
      stages: [{
        id: 'setup',
        name: 'Setup',
        status: 'running',
        progress: 0,
        message: 'Initializing build environment...'
      }],
      startTime: new Date(),
      artifacts: []
    };

    setBuilds(prev => [newBuild, ...prev.slice(0, 9)]); // Keep max 10 builds
    setExpandedBuilds(prev => new Set([...prev, data.buildId]));
  }, []);

  const handleBuildProgress = useCallback((data: BuildProgressUpdate) => {
    setBuilds(prev => prev.map(build => {
      if (build.id === data.buildId) {
        // Update current stage or add new stage
        const stages = [...build.stages];
        const currentStageIndex = stages.findIndex(stage => stage.name === data.stage);
        
        if (currentStageIndex !== -1) {
          stages[currentStageIndex] = {
            ...stages[currentStageIndex],
            status: data.status,
            progress: data.progress,
            message: data.message,
            logs: data.logs ? [...(stages[currentStageIndex].logs || []), ...data.logs] : stages[currentStageIndex].logs
          };
        } else {
          stages.push({
            id: data.stage.toLowerCase().replace(/\s+/g, '-'),
            name: data.stage,
            status: data.status,
            progress: data.progress,
            message: data.message,
            logs: data.logs || []
          });
        }

        return {
          ...build,
          status: data.status,
          progress: data.progress,
          stages
        };
      }
      return build;
    }));
  }, []);

  const handleBuildCompleted = useCallback((data: BuildProgressUpdate) => {
    setBuilds(prev => prev.map(build => {
      if (build.id === data.buildId) {
        return {
          ...build,
          status: data.status,
          progress: 100,
          endTime: new Date(),
          duration: data.duration,
          artifacts: ['dist.zip', 'source-map.js.map'], // Mock artifacts
          size: 2.5 * 1024 * 1024 // Mock size in bytes
        };
      }
      return build;
    }));
  }, []);

  const handleDeploymentStarted = useCallback((data: DeploymentProgressUpdate) => {
    const newDeployment: Deployment = {
      id: data.deploymentId,
      buildId: data.deploymentId.split('-')[0], // Mock relationship
      environment: data.environment,
      status: 'running',
      progress: 0,
      stages: [{
        id: 'prepare',
        name: 'Prepare',
        status: 'running',
        progress: 0,
        message: 'Preparing deployment...'
      }],
      startTime: new Date()
    };

    setDeployments(prev => [newDeployment, ...prev.slice(0, 9)]);
    setExpandedDeployments(prev => new Set([...prev, data.deploymentId]));
  }, []);

  const handleDeploymentProgress = useCallback((data: DeploymentProgressUpdate) => {
    setDeployments(prev => prev.map(deployment => {
      if (deployment.id === data.deploymentId) {
        const stages = [...deployment.stages];
        const currentStageIndex = stages.findIndex(stage => stage.name === data.stage);
        
        if (currentStageIndex !== -1) {
          stages[currentStageIndex] = {
            ...stages[currentStageIndex],
            status: data.status,
            progress: data.progress,
            message: data.message
          };
        } else {
          stages.push({
            id: data.stage.toLowerCase().replace(/\s+/g, '-'),
            name: data.stage,
            status: data.status,
            progress: data.progress,
            message: data.message
          });
        }

        return {
          ...deployment,
          status: data.status,
          progress: data.progress,
          url: data.url,
          stages
        };
      }
      return deployment;
    }));
  }, []);

  const handleDeploymentCompleted = useCallback((data: DeploymentProgressUpdate) => {
    setDeployments(prev => prev.map(deployment => {
      if (deployment.id === data.deploymentId) {
        return {
          ...deployment,
          status: data.status,
          progress: 100,
          endTime: new Date(),
          duration: data.duration,
          url: data.url,
          health: data.status === 'completed' ? 'healthy' : 'error'
        };
      }
      return deployment;
    }));
  }, []);

  const toggleBuildExpansion = (buildId: string) => {
    setExpandedBuilds(prev => {
      const updated = new Set(prev);
      if (updated.has(buildId)) {
        updated.delete(buildId);
      } else {
        updated.add(buildId);
      }
      return updated;
    });
  };

  const toggleDeploymentExpansion = (deploymentId: string) => {
    setExpandedDeployments(prev => {
      const updated = new Set(prev);
      if (updated.has(deploymentId)) {
        updated.delete(deploymentId);
      } else {
        updated.add(deploymentId);
      }
      return updated;
    });
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const formatSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
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

  const renderBuildStages = (build: Build) => {
    const steps: ProgressStep[] = build.stages.map(stage => ({
      id: stage.id,
      label: stage.name,
      status: stage.status,
      progress: stage.progress,
      message: stage.message,
      duration: stage.duration
    }));

    return (
      <Box sx={{ mt: 2 }}>
        <ProgressIndicator
          type="steps"
          steps={steps}
          animated={true}
        />
        
        {showLogs && build.stages.some(stage => stage.logs && stage.logs.length > 0) && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Build Logs
            </Typography>
            <Box 
              sx={{ 
                maxHeight: 200, 
                overflow: 'auto', 
                bgcolor: 'grey.900', 
                color: 'white', 
                p: 2, 
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '12px'
              }}
            >
              {build.stages.map(stage => 
                stage.logs?.map((log, index) => (
                  <div key={`${stage.id}-${index}`}>{log}</div>
                ))
              )}
            </Box>
          </Box>
        )}

        {showArtifacts && build.artifacts && build.artifacts.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Build Artifacts
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {build.artifacts.map((artifact, index) => (
                <Chip
                  key={index}
                  icon={<Storage />}
                  label={artifact}
                  size="small"
                  clickable
                  variant="outlined"
                />
              ))}
            </Box>
            {build.size && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Total size: {formatSize(build.size)}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    );
  };

  const renderDeploymentStages = (deployment: Deployment) => {
    const steps: ProgressStep[] = deployment.stages.map(stage => ({
      id: stage.id,
      label: stage.name,
      status: stage.status,
      progress: stage.progress,
      message: stage.message,
      duration: stage.duration
    }));

    return (
      <Box sx={{ mt: 2 }}>
        <ProgressIndicator
          type="steps"
          steps={steps}
          animated={true}
        />
        
        {deployment.url && deployment.status === 'completed' && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2">
                Deployment successful! Application is now live.
              </Typography>
              <Button
                size="small"
                startIcon={<Launch />}
                onClick={() => window.open(deployment.url, '_blank')}
              >
                View App
              </Button>
            </Box>
          </Alert>
        )}

        {deployment.health && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Health Status
            </Typography>
            <Chip
              icon={deployment.health === 'healthy' ? <CheckCircle /> : <ErrorIcon />}
              label={deployment.health.charAt(0).toUpperCase() + deployment.health.slice(1)}
              color={deployment.health === 'healthy' ? 'success' : 'error'}
              size="small"
            />
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box className="build-deployment-progress">
      {/* Tab Navigation */}
      <Box sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            onClick={() => setSelectedTab('builds')}
            variant={selectedTab === 'builds' ? 'contained' : 'outlined'}
            startIcon={<Build />}
          >
            Builds ({builds.length})
          </Button>
          <Button
            onClick={() => setSelectedTab('deployments')}
            variant={selectedTab === 'deployments' ? 'contained' : 'outlined'}
            startIcon={<CloudUpload />}
          >
            Deployments ({deployments.length})
          </Button>
        </Box>
      </Box>

      {/* Builds Tab */}
      {selectedTab === 'builds' && (
        <Box>
          {/* Build Trigger */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Build Management</Typography>
                <Button
                  variant="contained"
                  startIcon={<PlayArrow />}
                  onClick={() => onTriggerBuild?.('demo-project')}
                >
                  Trigger Build
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Build List */}
          {builds.map((build) => {
            const isExpanded = expandedBuilds.has(build.id);
            
            return (
              <Card key={build.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box 
                    className="build-header"
                    onClick={() => toggleBuildExpansion(build.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Box className="build-info">
                      {getStatusIcon(build.status)}
                      <Box sx={{ ml: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {build.projectName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {build.branch} • {build.commit}
                        </Typography>
                      </Box>
                      <Box sx={{ ml: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={build.status}
                          size="small"
                          color={getStatusColor(build.status) as any}
                        />
                        {build.duration && (
                          <Chip
                            icon={<History />}
                            label={formatDuration(build.duration)}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {build.size && (
                          <Chip
                            icon={<Storage />}
                            label={formatSize(build.size)}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {build.status === 'running' && onCancelBuild && (
                        <IconButton size="small" onClick={(e) => {
                          e.stopPropagation();
                          onCancelBuild(build.id);
                        }}>
                          <Stop />
                        </IconButton>
                      )}
                      <IconButton size="small">
                        {isExpanded ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>
                  </Box>

                  <ProgressIndicator
                    type="linear"
                    progress={build.progress}
                    status={build.status}
                    showPercentage={true}
                    showStatus={false}
                    size="small"
                    animated={true}
                  />

                  <Collapse in={isExpanded}>
                    {renderBuildStages(build)}
                  </Collapse>
                </CardContent>
              </Card>
            );
          })}

          {builds.length === 0 && (
            <Card>
              <CardContent>
                <Typography variant="body1" color="text.secondary" align="center">
                  No builds in progress. Trigger a build to get started.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Deployments Tab */}
      {selectedTab === 'deployments' && (
        <Box>
          {/* Deployment Trigger */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Deployment Management</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {environments.map(env => (
                    <Button
                      key={env}
                      variant="outlined"
                      size="small"
                      startIcon={<CloudUpload />}
                      onClick={() => onTriggerDeployment?.('latest-build', env)}
                    >
                      Deploy to {env}
                    </Button>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Deployment List */}
          {deployments.map((deployment) => {
            const isExpanded = expandedDeployments.has(deployment.id);
            
            return (
              <Card key={deployment.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box 
                    className="deployment-header"
                    onClick={() => toggleDeploymentExpansion(deployment.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Box className="deployment-info">
                      {getStatusIcon(deployment.status)}
                      <Box sx={{ ml: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {deployment.environment}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Build: {deployment.buildId}
                        </Typography>
                      </Box>
                      <Box sx={{ ml: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={deployment.status}
                          size="small"
                          color={getStatusColor(deployment.status) as any}
                        />
                        {deployment.duration && (
                          <Chip
                            icon={<History />}
                            label={formatDuration(deployment.duration)}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {deployment.health && (
                          <Chip
                            label={deployment.health}
                            size="small"
                            color={deployment.health === 'healthy' ? 'success' : 'error'}
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {deployment.url && deployment.status === 'completed' && (
                        <IconButton size="small" onClick={(e) => {
                          e.stopPropagation();
                          window.open(deployment.url, '_blank');
                        }}>
                          <Launch />
                        </IconButton>
                      )}
                      {deployment.status === 'running' && onCancelDeployment && (
                        <IconButton size="small" onClick={(e) => {
                          e.stopPropagation();
                          onCancelDeployment(deployment.id);
                        }}>
                          <Stop />
                        </IconButton>
                      )}
                      <IconButton size="small">
                        {isExpanded ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>
                  </Box>

                  <ProgressIndicator
                    type="linear"
                    progress={deployment.progress}
                    status={deployment.status}
                    showPercentage={true}
                    showStatus={false}
                    size="small"
                    animated={true}
                  />

                  <Collapse in={isExpanded}>
                    {renderDeploymentStages(deployment)}
                  </Collapse>
                </CardContent>
              </Card>
            );
          })}

          {deployments.length === 0 && (
            <Card>
              <CardContent>
                <Typography variant="body1" color="text.secondary" align="center">
                  No deployments in progress. Deploy a build to get started.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      )}
    </Box>
  );
};

export default BuildDeploymentProgress;