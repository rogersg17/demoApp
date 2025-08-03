import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

interface PipelineConfig {
  id: string;
  name: string;
  adoProjectId: string;
  adoBuildDefinitionId: string;
  enabled: boolean;
  monitoringEnabled: boolean;
  autoCreateJiraIssues: boolean;
  jiraProjectKey?: string;
  notificationSettings: {
    slack: boolean;
    email: boolean;
    webhooks: string[];
  };
  testPatterns: string[];
  flakyDetection: {
    enabled: boolean;
    threshold: number;
    minRuns: number;
  };
}

interface SystemConfig {
  adoIntegration: {
    enabled: boolean;
    organization: string;
    pat: string;
    webhookUrl: string;
  };
  jiraIntegration: {
    enabled: boolean;
    baseUrl: string;
    username: string;
    apiToken: string;
    defaultProject: string;
  };
  notifications: {
    slack: {
      enabled: boolean;
      webhookUrl: string;
      channels: string[];
    };
    email: {
      enabled: boolean;
      smtpServer: string;
      recipients: string[];
    };
  };
  automation: {
    autoCreateIssues: boolean;
    autoTransitions: boolean;
    duplicateDetection: boolean;
    flakyTestDetection: boolean;
  };
}

interface ConfigurationPanelProps {
  pipelineConfigs: PipelineConfig[];
  systemConfig: SystemConfig;
  onSavePipelineConfig: (config: PipelineConfig) => Promise<void>;
  onDeletePipelineConfig: (id: string) => Promise<void>;
  onSaveSystemConfig: (config: SystemConfig) => Promise<void>;
  onTestConnection: (type: 'ado' | 'jira' | 'slack') => Promise<boolean>;
  onRefresh: () => void;
  isLoading: boolean;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  pipelineConfigs = [],
  systemConfig,
  onSavePipelineConfig,
  onDeletePipelineConfig,
  onSaveSystemConfig,
  onTestConnection,
  onRefresh,
  isLoading
}) => {
  const [activeTab, setActiveTab] = useState<'pipelines' | 'system'>('pipelines');
  const [editingPipeline, setEditingPipeline] = useState<PipelineConfig | null>(null);
  const [editingSystem, setEditingSystem] = useState<SystemConfig | null>(null);
  const [pipelineDialogOpen, setPipelineDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, boolean | null>>({});

  const handleAddPipeline = () => {
    const newPipeline: PipelineConfig = {
      id: '',
      name: '',
      adoProjectId: '',
      adoBuildDefinitionId: '',
      enabled: true,
      monitoringEnabled: true,
      autoCreateJiraIssues: false,
      notificationSettings: {
        slack: false,
        email: false,
        webhooks: []
      },
      testPatterns: ['**/*.spec.ts', '**/*.test.ts'],
      flakyDetection: {
        enabled: true,
        threshold: 0.7,
        minRuns: 5
      }
    };
    setEditingPipeline(newPipeline);
    setPipelineDialogOpen(true);
  };

  const handleEditPipeline = (pipeline: PipelineConfig) => {
    setEditingPipeline({ ...pipeline });
    setPipelineDialogOpen(true);
  };

  const handleSavePipeline = async () => {
    if (!editingPipeline) return;
    
    setSaving(true);
    try {
      await onSavePipelineConfig(editingPipeline);
      setPipelineDialogOpen(false);
      setEditingPipeline(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePipeline = async (id: string) => {
    setSaving(true);
    try {
      await onDeletePipelineConfig(id);
      setDeleteDialogOpen(null);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSystemConfig = async () => {
    if (!editingSystem) return;
    
    setSaving(true);
    try {
      await onSaveSystemConfig(editingSystem);
      setEditingSystem(null);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (type: 'ado' | 'jira' | 'slack') => {
    setConnectionStatus({ ...connectionStatus, [type]: null });
    try {
      const success = await onTestConnection(type);
      setConnectionStatus({ ...connectionStatus, [type]: success });
    } catch (error) {
      setConnectionStatus({ ...connectionStatus, [type]: false });
    }
  };

  const renderConnectionStatus = (type: string) => {
    const status = connectionStatus[type];
    if (status === null) return <CircularProgress size={16} />;
    if (status === true) return <CheckIcon color="success" fontSize="small" />;
    if (status === false) return <ErrorIcon color="error" fontSize="small" />;
    return null;
  };

  if (isLoading) {
    return (
      <Card className="configuration-panel">
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <Box textAlign="center">
              <CircularProgress size={40} />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Loading configuration...
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="configuration-panel">
      <CardContent>
        {/* Header */}
        <Box className="configuration-header">
          <Typography variant="h6" component="h2">
            Configuration
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Refresh configuration">
              <IconButton onClick={onRefresh} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Tab Navigation */}
        <Box sx={{ mb: 3 }}>
          <Button 
            variant={activeTab === 'pipelines' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('pipelines')}
            sx={{ mr: 1 }}
          >
            Pipeline Configurations
          </Button>
          <Button 
            variant={activeTab === 'system' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('system')}
          >
            System Settings
          </Button>
        </Box>

        {/* Pipeline Configurations Tab */}
        {activeTab === 'pipelines' && (
          <Box>
            <Box display="flex" justifyContent="between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">
                Pipeline Configurations ({pipelineConfigs.length})
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddPipeline}
              >
                Add Pipeline
              </Button>
            </Box>

            {pipelineConfigs.length === 0 ? (
              <Alert severity="info">
                No pipelines configured yet. Add your first pipeline to start monitoring test results.
              </Alert>
            ) : (
              <List>
                {pipelineConfigs.map((pipeline) => (
                  <ListItem 
                    key={pipeline.id}
                    sx={{ 
                      border: 1, 
                      borderColor: 'divider', 
                      borderRadius: 1, 
                      mb: 1 
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1">
                            {pipeline.name}
                          </Typography>
                          <Chip 
                            size="small" 
                            label={pipeline.enabled ? 'Enabled' : 'Disabled'}
                            color={pipeline.enabled ? 'success' : 'default'}
                            variant="outlined"
                          />
                          {pipeline.autoCreateJiraIssues && (
                            <Chip 
                              size="small" 
                              label="Auto JIRA"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            ADO Project: {pipeline.adoProjectId} • Build Definition: {pipeline.adoBuildDefinitionId}
                          </Typography>
                          {pipeline.jiraProjectKey && (
                            <Typography variant="body2" color="text.secondary">
                              JIRA Project: {pipeline.jiraProjectKey}
                            </Typography>
                          )}
                          <Typography variant="body2" color="text.secondary">
                            Test Patterns: {pipeline.testPatterns.join(', ')}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        onClick={() => handleEditPipeline(pipeline)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        edge="end" 
                        onClick={() => setDeleteDialogOpen(pipeline.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}

        {/* System Settings Tab */}
        {activeTab === 'system' && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              System Settings
            </Typography>

            {!editingSystem ? (
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => setEditingSystem({ ...systemConfig })}
                  sx={{ mb: 3 }}
                >
                  Edit System Configuration
                </Button>

                <Grid container spacing={3}>
                  {/* ADO Integration Status */}
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
                          <Typography variant="h6">Azure DevOps Integration</Typography>
                          {renderConnectionStatus('ado')}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Status: {systemConfig.adoIntegration.enabled ? 'Enabled' : 'Disabled'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Organization: {systemConfig.adoIntegration.organization || 'Not configured'}
                        </Typography>
                        <Button 
                          size="small" 
                          onClick={() => handleTestConnection('ado')}
                          disabled={!systemConfig.adoIntegration.enabled}
                        >
                          Test Connection
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* JIRA Integration Status */}
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
                          <Typography variant="h6">JIRA Integration</Typography>
                          {renderConnectionStatus('jira')}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Status: {systemConfig.jiraIntegration.enabled ? 'Enabled' : 'Disabled'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Base URL: {systemConfig.jiraIntegration.baseUrl || 'Not configured'}
                        </Typography>
                        <Button 
                          size="small" 
                          onClick={() => handleTestConnection('jira')}
                          disabled={!systemConfig.jiraIntegration.enabled}
                        >
                          Test Connection
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Automation Status */}
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                          Automation Settings
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6} sm={3}>
                            <Box textAlign="center">
                              <Typography variant="body2" color="text.secondary">
                                Auto Create Issues
                              </Typography>
                              <Typography variant="h6" color={systemConfig.automation.autoCreateIssues ? 'success.main' : 'text.secondary'}>
                                {systemConfig.automation.autoCreateIssues ? 'ON' : 'OFF'}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Box textAlign="center">
                              <Typography variant="body2" color="text.secondary">
                                Auto Transitions
                              </Typography>
                              <Typography variant="h6" color={systemConfig.automation.autoTransitions ? 'success.main' : 'text.secondary'}>
                                {systemConfig.automation.autoTransitions ? 'ON' : 'OFF'}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Box textAlign="center">
                              <Typography variant="body2" color="text.secondary">
                                Duplicate Detection
                              </Typography>
                              <Typography variant="h6" color={systemConfig.automation.duplicateDetection ? 'success.main' : 'text.secondary'}>
                                {systemConfig.automation.duplicateDetection ? 'ON' : 'OFF'}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Box textAlign="center">
                              <Typography variant="body2" color="text.secondary">
                                Flaky Detection
                              </Typography>
                              <Typography variant="h6" color={systemConfig.automation.flakyTestDetection ? 'success.main' : 'text.secondary'}>
                                {systemConfig.automation.flakyTestDetection ? 'ON' : 'OFF'}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            ) : (
              // System Configuration Edit Form
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Edit System Configuration
                </Typography>
                
                {/* Implementation of edit form would go here */}
                <Alert severity="info" sx={{ mb: 2 }}>
                  System configuration editing form would be implemented here with all the necessary fields.
                </Alert>

                <Box display="flex" gap={2}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveSystemConfig}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Configuration'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={() => setEditingSystem(null)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* Pipeline Configuration Dialog */}
        <Dialog 
          open={pipelineDialogOpen} 
          onClose={() => setPipelineDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingPipeline?.id ? 'Edit Pipeline Configuration' : 'Add New Pipeline'}
          </DialogTitle>
          <DialogContent>
            {editingPipeline && (
              <Box sx={{ pt: 1 }}>
                <TextField
                  fullWidth
                  label="Pipeline Name"
                  value={editingPipeline.name}
                  onChange={(e) => setEditingPipeline({ ...editingPipeline, name: e.target.value })}
                  sx={{ mb: 2 }}
                />
                
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="ADO Project ID"
                      value={editingPipeline.adoProjectId}
                      onChange={(e) => setEditingPipeline({ ...editingPipeline, adoProjectId: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="ADO Build Definition ID"
                      value={editingPipeline.adoBuildDefinitionId}
                      onChange={(e) => setEditingPipeline({ ...editingPipeline, adoBuildDefinitionId: e.target.value })}
                    />
                  </Grid>
                </Grid>

                <FormControlLabel
                  control={
                    <Switch
                      checked={editingPipeline.enabled}
                      onChange={(e) => setEditingPipeline({ ...editingPipeline, enabled: e.target.checked })}
                    />
                  }
                  label="Enable Pipeline Monitoring"
                  sx={{ mb: 2 }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={editingPipeline.autoCreateJiraIssues}
                      onChange={(e) => setEditingPipeline({ ...editingPipeline, autoCreateJiraIssues: e.target.checked })}
                    />
                  }
                  label="Auto-create JIRA Issues for Failures"
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPipelineDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSavePipeline} disabled={saving} variant="contained">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={deleteDialogOpen !== null} 
          onClose={() => setDeleteDialogOpen(null)}
        >
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this pipeline configuration? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(null)} disabled={saving}>
              Cancel
            </Button>
            <Button 
              onClick={() => deleteDialogOpen && handleDeletePipeline(deleteDialogOpen)} 
              disabled={saving}
              color="error"
              variant="contained"
            >
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ConfigurationPanel;
