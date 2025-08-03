import { useState, useEffect, useCallback } from 'react';

// Interface definitions
export interface PipelineHealth {
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

export interface TestFailure {
  id: string;
  testName: string;
  pipeline: {
    id: string;
    name: string;
  };
  buildId: string;
  failureReason: string;
  failureType: 'assertion' | 'timeout' | 'setup' | 'teardown' | 'flaky' | 'infrastructure';
  failedAt: string;
  duration: number;
  stackTrace?: string;
  screenshots?: string[];
  jiraIssue?: {
    key: string;
    status: string;
    url: string;
  };
  flakyScore?: number;
  similarFailures: number;
  isAnalyzed: boolean;
}

export interface PipelineConfig {
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

export interface SystemConfig {
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

export interface Statistics {
  totalPipelines: number;
  activePipelines: number;
  healthyPipelines: number;
  failingPipelines: number;
  avgSuccessRate: number;
  totalBuilds24h: number;
  totalFailures24h: number;
}

export interface MVPData {
  pipelineHealth: PipelineHealth[];
  recentFailures: TestFailure[];
  pipelineConfigs: PipelineConfig[];
  systemConfig: SystemConfig;
  statistics: Statistics;
}

export interface MVPDataState {
  data: MVPData;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/mvp-dashboard';

export const useMVPData = () => {
  const [state, setState] = useState<MVPDataState>({
    data: {
      pipelineHealth: [],
      recentFailures: [],
      pipelineConfigs: [],
      systemConfig: {
        adoIntegration: {
          enabled: false,
          organization: '',
          pat: '',
          webhookUrl: ''
        },
        jiraIntegration: {
          enabled: false,
          baseUrl: '',
          username: '',
          apiToken: '',
          defaultProject: ''
        },
        notifications: {
          slack: {
            enabled: false,
            webhookUrl: '',
            channels: []
          },
          email: {
            enabled: false,
            smtpServer: '',
            recipients: []
          }
        },
        automation: {
          autoCreateIssues: false,
          autoTransitions: false,
          duplicateDetection: false,
          flakyTestDetection: false
        }
      },
      statistics: {
        totalPipelines: 0,
        activePipelines: 0,
        healthyPipelines: 0,
        failingPipelines: 0,
        avgSuccessRate: 0,
        totalBuilds24h: 0,
        totalFailures24h: 0
      }
    },
    isLoading: false,
    error: null,
    lastUpdated: null
  });

  // API Helper function
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }, []);

  // Fetch all MVP data
  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [pipelineHealth, recentFailures, pipelineConfigs, systemConfig, statistics] = await Promise.all([
        apiCall('/pipeline-health'),
        apiCall('/recent-failures'),
        apiCall('/pipeline-configs'),
        apiCall('/system-config'),
        apiCall('/statistics')
      ]);

      setState(prev => ({
        ...prev,
        data: {
          pipelineHealth: pipelineHealth.data || [],
          recentFailures: recentFailures.data || [],
          pipelineConfigs: pipelineConfigs.data || [],
          systemConfig: systemConfig.data || prev.data.systemConfig,
          statistics: statistics.data || prev.data.statistics
        },
        isLoading: false,
        lastUpdated: new Date()
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch data'
      }));
    }
  }, [apiCall]);

  // Refresh pipeline health data
  const refreshPipelineHealth = useCallback(async () => {
    try {
      const response = await apiCall('/pipeline-health');
      setState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          pipelineHealth: response.data || []
        },
        lastUpdated: new Date()
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh pipeline health'
      }));
    }
  }, [apiCall]);

  // Refresh recent failures data
  const refreshRecentFailures = useCallback(async () => {
    try {
      const response = await apiCall('/recent-failures');
      setState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          recentFailures: response.data || []
        },
        lastUpdated: new Date()
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh recent failures'
      }));
    }
  }, [apiCall]);

  // Save pipeline configuration
  const savePipelineConfig = useCallback(async (config: PipelineConfig): Promise<void> => {
    const method = config.id ? 'PUT' : 'POST';
    const endpoint = config.id ? `/pipeline-configs/${config.id}` : '/pipeline-configs';

    await apiCall(endpoint, {
      method,
      body: JSON.stringify(config)
    });

    // Refresh configs after save
    const response = await apiCall('/pipeline-configs');
    setState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        pipelineConfigs: response.data || []
      },
      lastUpdated: new Date()
    }));
  }, [apiCall]);

  // Delete pipeline configuration
  const deletePipelineConfig = useCallback(async (id: string): Promise<void> => {
    await apiCall(`/pipeline-configs/${id}`, {
      method: 'DELETE'
    });

    setState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        pipelineConfigs: prev.data.pipelineConfigs.filter(config => config.id !== id)
      },
      lastUpdated: new Date()
    }));
  }, [apiCall]);

  // Save system configuration
  const saveSystemConfig = useCallback(async (config: SystemConfig): Promise<void> => {
    await apiCall('/system-config', {
      method: 'PUT',
      body: JSON.stringify(config)
    });

    setState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        systemConfig: config
      },
      lastUpdated: new Date()
    }));
  }, [apiCall]);

  // Test connection to external services
  const testConnection = useCallback(async (type: 'ado' | 'jira' | 'slack'): Promise<boolean> => {
    try {
      const response = await apiCall(`/test-connection/${type}`, {
        method: 'POST'
      });
      return response.success || false;
    } catch (error) {
      return false;
    }
  }, [apiCall]);

  // Create JIRA issue for test failure
  const createJiraIssue = useCallback(async (failure: TestFailure): Promise<void> => {
    await apiCall('/create-jira-issue', {
      method: 'POST',
      body: JSON.stringify({ failureId: failure.id })
    });

    // Refresh failures to get updated JIRA issue info
    await refreshRecentFailures();
  }, [apiCall, refreshRecentFailures]);

  // Navigate to test details
  const navigateToTest = useCallback(async (testId: string): Promise<void> => {
    // This would typically open a test detail view or navigate to an external URL
    window.open(`/test-details/${testId}`, '_blank');
  }, []);

  // Navigate to pipeline details
  const navigateToPipeline = useCallback(async (pipelineId: string): Promise<void> => {
    // This would typically open a pipeline detail view
    window.open(`/pipeline-details/${pipelineId}`, '_blank');
  }, []);

  // View JIRA issue
  const viewJiraIssue = useCallback(async (jiraKey: string): Promise<void> => {
    // Get JIRA base URL from system config and open issue
    const { jiraIntegration } = state.data.systemConfig;
    if (jiraIntegration.baseUrl) {
      window.open(`${jiraIntegration.baseUrl}/browse/${jiraKey}`, '_blank');
    }
  }, [state.data.systemConfig]);

  // Handle dashboard navigation
  const handleNavigation = useCallback(async (type: string, id?: string): Promise<void> => {
    switch (type) {
      case 'pipeline':
        if (id) await navigateToPipeline(id);
        break;
      case 'test':
        if (id) await navigateToTest(id);
        break;
      case 'configuration':
        // Scroll to configuration panel or switch tabs
        break;
      default:
        console.warn('Unknown navigation type:', type);
    }
  }, [navigateToPipeline, navigateToTest]);

  // Initial data load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    fetchData,
    refreshPipelineHealth,
    refreshRecentFailures,
    savePipelineConfig,
    deletePipelineConfig,
    saveSystemConfig,
    testConnection,
    createJiraIssue,
    navigateToTest,
    navigateToPipeline,
    viewJiraIssue,
    handleNavigation
  };
};
