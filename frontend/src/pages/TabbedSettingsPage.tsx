import React, { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Layout from '../components/Layout'
import { updateTestExecutionSetting } from '../store/slices/settingsSlice'
import type { RootState } from '../store/store'
import { ValidationProvider } from '../contexts/ValidationContext'
import SaveSettingsComponent from '../components/settings/SaveSettingsComponent'
import LoadingOverlay from '../components/LoadingOverlay'
import ErrorNotification from '../components/ErrorNotification'
import SuccessNotification from '../components/SuccessNotification'
import { 
  SettingsError, 
  parseApiError, 
  createSaveSuccessInfo, 
  createLoadSuccessInfo, 
  createConnectionSuccessInfo, 
  createResetSuccessInfo 
} from '../utils/errorUtils'
import type { SuccessInfo } from '../utils/errorUtils'
import '../styles/SaveSettingsComponent.css'

// Import tab components
import GeneralTab from '../components/settings/GeneralTab'
import AzureDevOpsTab from '../components/settings/AzureDevOpsTab'
import PlaywrightTab from '../components/settings/PlaywrightTab'
import GitHubTab from '../components/settings/GitHubTab'
import JenkinsTab from '../components/settings/JenkinsTab'
import SecurityTab from '../components/settings/SecurityTab'

interface Settings {
  // General Settings
  applicationName: string
  defaultLanguage: string
  timezone: string
  notificationPreferences: {
    email: boolean
    push: boolean
    sms: boolean
  }
  
  // Browser Configuration (Playwright)
  defaultBrowser: string
  headlessMode: boolean
  browserTimeout: number
  
  // Test Execution (Playwright)
  maxRetries: number
  parallelWorkers: number
  testTimeout: number
  slowTestThreshold: number
  
  // Reporting & Output (Playwright)
  reportFormat: string
  screenshotMode: string
  videoRecording: boolean
  verboseLogging: boolean
  liveLogs: boolean
  
  // Environment Configuration
  baseUrl: string
  apiEndpoint: string
  testEnvironment: string
  
  // JIRA Integration (legacy - keeping for compatibility)
  jiraEnabled: boolean
  jiraUrl: string
  jiraProject: string
  jiraUsername: string
  jiraApiToken: string
  
  // Azure DevOps Integration
  adoEnabled: boolean
  adoOrganization: string
  adoProject: string
  adoPat: string
  adoWebhookSecret: string
  pipelineMonitoring: boolean
  buildDefinitionId: string
  
  // GitHub Integration
  githubEnabled: boolean
  githubToken: string
  githubRepository: string
  githubWebhookSecret: string
  branchMonitoring: boolean
  monitoredBranches: string[]
  prChecks: boolean
  issueTracking: boolean
  
  // Jenkins Integration
  jenkinsEnabled: boolean
  jenkinsUrl: string
  jenkinsUsername: string
  jenkinsApiToken: string
  jenkinsWebhookSecret: string
  jobMonitoring: boolean
  monitoredJobs: string[]
  buildTriggers: boolean
  pipelineIntegration: boolean
  
  // Advanced Settings (Playwright)
  fullyParallel: boolean
  forbidOnly: boolean
  updateSnapshots: string
  ignoreHttpsErrors: boolean
  playwrightConfigPath: string
  
  // Security Settings
  authenticationMethod: string
  requireMfa: boolean
  sessionTimeout: number
  maxLoginAttempts: number
  passwordMinLength: number
  passwordRequireUppercase: boolean
  passwordRequireLowercase: boolean
  passwordRequireNumbers: boolean
  passwordRequireSpecialChars: boolean
  passwordExpirationDays: number
  rateLimitEnabled: boolean
  rateLimitPerMinute: number
  rateLimitPerHour: number
  rbacEnabled: boolean
  defaultUserRole: string
  adminApprovalRequired: boolean
  enableCsrf: boolean
  enableCors: boolean
  corsOrigins: string[]
  securityHeaders: boolean
}

const defaultSettings: Settings = {
  // General Settings
  applicationName: 'Demo App',
  defaultLanguage: 'en',
  timezone: 'UTC',
  notificationPreferences: {
    email: true,
    push: false,
    sms: false
  },
  
  // Browser Configuration
  defaultBrowser: 'chromium',
  headlessMode: true,
  browserTimeout: 30000,
  
  // Test Execution
  maxRetries: 2,
  parallelWorkers: 4,
  testTimeout: 30000,
  slowTestThreshold: 10000,
  
  // Reporting & Output
  reportFormat: 'html',
  screenshotMode: 'only-on-failure',
  videoRecording: false,
  verboseLogging: false,
  liveLogs: true,
  
  // Environment Configuration
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  apiEndpoint: (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001') + '/api',
  testEnvironment: 'development',
  
  // JIRA Integration (legacy)
  jiraEnabled: false,
  jiraUrl: '',
  jiraProject: '',
  jiraUsername: '',
  jiraApiToken: '',
  
  // Azure DevOps Integration
  adoEnabled: false,
  adoOrganization: '',
  adoProject: '',
  adoPat: '',
  adoWebhookSecret: '',
  pipelineMonitoring: false,
  buildDefinitionId: '',
  
  // GitHub Integration
  githubEnabled: false,
  githubToken: '',
  githubRepository: '',
  githubWebhookSecret: '',
  branchMonitoring: false,
  monitoredBranches: ['main'],
  prChecks: false,
  issueTracking: false,
  
  // Jenkins Integration
  jenkinsEnabled: false,
  jenkinsUrl: '',
  jenkinsUsername: '',
  jenkinsApiToken: '',
  jenkinsWebhookSecret: '',
  jobMonitoring: false,
  monitoredJobs: [],
  buildTriggers: false,
  pipelineIntegration: false,
  
  // Advanced Settings
  fullyParallel: false,
  forbidOnly: true,
  updateSnapshots: 'missing',
  ignoreHttpsErrors: false,
  playwrightConfigPath: './playwright.config.ts',
  
  // Security Settings
  authenticationMethod: 'local',
  requireMfa: false,
  sessionTimeout: 30,
  maxLoginAttempts: 5,
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecialChars: false,
  passwordExpirationDays: 90,
  rateLimitEnabled: true,
  rateLimitPerMinute: 100,
  rateLimitPerHour: 1000,
  rbacEnabled: true,
  defaultUserRole: 'user',
  adminApprovalRequired: false,
  enableCsrf: true,
  enableCors: true,
  corsOrigins: ['http://localhost:3000', 'http://localhost:5173'],
  securityHeaders: true
}

type TabType = 'general' | 'azure-devops' | 'playwright' | 'github' | 'jenkins' | 'security'

const TabbedSettingsPage: React.FC = () => {
  const dispatch = useDispatch()
  const reduxLiveLogs = useSelector((state: RootState) => state.settings.testExecution.liveLogs)
  
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connectionTesting, setConnectionTesting] = useState<{[key: string]: boolean}>({})
  const [error, setError] = useState<string | null>(null)
  const [settingsError, setSettingsError] = useState<SettingsError | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('general')

  // Sync liveLogs setting with Redux store
  useEffect(() => {
    setSettings(prev => ({ ...prev, liveLogs: reduxLiveLogs }))
  }, [reduxLiveLogs])

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      setSettingsError(null)
      setError(null)
      setSuccessInfo(null)
      
      const response = await fetch('/api/settings', {
        credentials: 'include'
      })

      if (response.ok) {
        const loadedSettings = await response.json()
        setSettings({ ...defaultSettings, ...loadedSettings })
        
        // Show success notification for server load
        setSuccessInfo(createLoadSuccessInfo('server', {
          details: 'All settings have been synchronized from the server'
        }))
      } else {
        // Create SettingsError from API response
        const apiError = await parseApiError(response)
        const settingsError = new SettingsError({
          type: 'network',
          message: apiError.errorInfo.message,
          operation: 'load-settings',
          code: response.status,
          details: apiError.errorInfo.message,
          timestamp: new Date()
        })
        setSettingsError(settingsError)
        
        // Load from localStorage as fallback
        const localSettings = localStorage.getItem('testSettings')
        if (localSettings) {
          setSettings({ ...defaultSettings, ...JSON.parse(localSettings) })
          // Show success notification for local fallback
          setSuccessInfo(createLoadSuccessInfo('local', {
            details: 'Server unavailable, using cached settings'
          }))
        }
      }
    } catch (err) {
      console.error('Error loading settings:', err)
      
      // Create appropriate error based on error type
      let settingsError: SettingsError
      if (err instanceof TypeError && err.message.includes('fetch')) {
        settingsError = new SettingsError({
          type: 'network',
          message: 'Failed to connect to server',
          operation: 'load-settings',
          details: 'Network connection failed',
          timestamp: new Date()
        })
      } else {
        settingsError = new SettingsError({
          type: 'unknown',
          message: err instanceof Error ? err.message : 'Unknown error loading settings',
          operation: 'load-settings',
          details: 'Unexpected error occurred',
          timestamp: new Date()
        })
      }
      
      setSettingsError(settingsError)
      
      // Load from localStorage as fallback
      const localSettings = localStorage.getItem('testSettings')
      if (localSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(localSettings) })
        // Show success notification for local fallback
        setSuccessInfo(createLoadSuccessInfo('local', {
          details: 'Using cached settings due to connection error'
        }))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const validateCriticalFields = useCallback((): string[] => {
    const errors: string[] = [];
    
    // Validate GitHub settings if enabled
    if (settings.githubEnabled) {
      if (!settings.githubRepository || !settings.githubRepository.includes('/')) {
        errors.push('GitHub repository must be in format "owner/repository"');
      }
      if (!settings.githubToken || (!settings.githubToken.startsWith('ghp_') && !settings.githubToken.startsWith('github_pat_'))) {
        errors.push('GitHub token must start with "ghp_" or "github_pat_"');
      }
    }

    // Validate Jenkins settings if enabled
    if (settings.jenkinsEnabled) {
      if (!settings.jenkinsUrl) {
        errors.push('Jenkins URL is required when Jenkins integration is enabled');
      }
      if (!settings.jenkinsUsername || !settings.jenkinsApiToken) {
        errors.push('Jenkins username and API token are required when Jenkins integration is enabled');
      }
    }

    // Validate Azure DevOps settings if enabled
    if (settings.adoEnabled) {
      if (!settings.adoOrganization || !settings.adoProject || !settings.adoPat) {
        errors.push('Azure DevOps organization, project, and PAT are required when ADO integration is enabled');
      }
    }

    return errors;
  }, [settings])

  const saveSettings = useCallback(async () => {
    try {
      setSaving(true)
      setError(null)
      setSettingsError(null)
      setSuccess(null)
      setSuccessInfo(null)

      // Validate critical fields before saving
      const validationErrors = validateCriticalFields();
      if (validationErrors.length > 0) {
        const validationError = new SettingsError({
          type: 'validation',
          message: `Validation failed: ${validationErrors.join(', ')}`,
          operation: 'save-settings',
          details: validationErrors.join('\n'),
          timestamp: new Date()
        })
        setSettingsError(validationError)
        return;
      }

      // Save to server
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
        credentials: 'include'
      })

      if (response.ok) {
        await response.json(); // Parse response but don't need to store it
        
        // Create comprehensive success notification
        const changedSettings: string[] = []; // Could track which settings changed
        setSuccessInfo(createSaveSuccessInfo(changedSettings, {
          details: 'Settings synchronized with server and saved locally'
        }))
        
        // Keep the old success state for backward compatibility
        setSuccess('Settings saved successfully!');
        
        // Update Redux store for live logs
        if (settings.liveLogs !== reduxLiveLogs) {
          dispatch(updateTestExecutionSetting({ key: 'liveLogs', value: settings.liveLogs }))
        }
        
        // Also save to localStorage as backup
        localStorage.setItem('testSettings', JSON.stringify(settings))
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        // Parse API error and create SettingsError
        const apiError = await parseApiError(response)
        const saveError = new SettingsError({
          type: response.status >= 500 ? 'server' : 'network',
          message: apiError.message || 'Failed to save settings to server',
          operation: 'save-settings',
          code: response.status,
          details: apiError.message,
          timestamp: new Date()
        })
        setSettingsError(saveError)
        
        // Save to localStorage even if server fails
        localStorage.setItem('testSettings', JSON.stringify(settings))
      }
    } catch (err) {
      console.error('Error saving settings:', err)
      
      // Create appropriate error based on error type
      let saveError: SettingsError
      if (err instanceof TypeError && err.message.includes('fetch')) {
        saveError = new SettingsError({
          type: 'network',
          message: 'Failed to connect to server while saving',
          operation: 'save-settings',
          details: 'Network connection failed during save operation',
          timestamp: new Date()
        })
      } else {
        saveError = new SettingsError({
          type: 'unknown',
          message: err instanceof Error ? err.message : 'Unknown error saving settings',
          operation: 'save-settings',
          details: 'Unexpected error occurred during save',
          timestamp: new Date()
        })
      }
      
      setSettingsError(saveError)
      
      // Save to localStorage even if server fails
      localStorage.setItem('testSettings', JSON.stringify(settings))
    } finally {
      setSaving(false)
    }
  }, [settings, reduxLiveLogs, dispatch, validateCriticalFields])

  const testConnection = useCallback(async (service: string) => {
    setConnectionTesting(prev => ({ ...prev, [service]: true }));
    setSettingsError(null)
    setSuccessInfo(null)
    
    try {
      const response = await fetch(`/api/settings/test-connection/${service}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        
        // Use success notification instead of legacy success state
        setSuccessInfo(createConnectionSuccessInfo(service, result.message, {
          details: `Connection verified successfully with ${service} service`
        }))
        
        // Keep legacy success for backward compatibility
        setSuccess(`${service} connection test successful: ${result.message}`);
        setTimeout(() => setSuccess(null), 5000);
      } else {
        const apiError = await parseApiError(response);
        const connectionError = new SettingsError({
          type: 'network',
          message: `${service} connection test failed: ${apiError.message}`,
          operation: `test-connection-${service}`,
          code: response.status,
          details: apiError.message,
          timestamp: new Date()
        })
        setSettingsError(connectionError);
      }
    } catch (err) {
      console.error(`${service} connection test error:`, err);
      
      const connectionError = new SettingsError({
        type: err instanceof TypeError && err.message.includes('fetch') ? 'network' : 'unknown',
        message: `${service} connection test failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        operation: `test-connection-${service}`,
        details: 'Connection test could not be completed',
        timestamp: new Date()
      })
      setSettingsError(connectionError);
    } finally {
      setConnectionTesting(prev => ({ ...prev, [service]: false }));
    }
  }, [settings])

  const resetToDefaults = useCallback(() => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      setSettings(defaultSettings)
      
      // Use success notification instead of legacy success state
      setSuccessInfo(createResetSuccessInfo({
        details: 'All configuration has been restored to factory defaults'
      }))
      
      // Keep legacy success for backward compatibility
      setSuccess('Settings reset to defaults')
      setError(null)
      setSettingsError(null)
      
      // Clear validation errors
      setTimeout(() => setSuccess(null), 3000);
    }
  }, [])

  const handleRetryOperation = useCallback((operation: string) => {
    switch (operation) {
      case 'load-settings':
        loadSettings();
        break;
      case 'save-settings':
        saveSettings();
        break;
      default:
        if (operation.startsWith('test-connection-')) {
          const service = operation.replace('test-connection-', '');
          testConnection(service);
        }
        break;
    }
  }, [loadSettings, saveSettings, testConnection])

  const handleDismissError = useCallback(() => {
    setSettingsError(null);
  }, [])

  const handleDismissSuccess = useCallback(() => {
    setSuccessInfo(null);
  }, [])

  const updateSetting = useCallback((key: string, value: string | number | boolean | string[] | { email: boolean; push: boolean; sms: boolean }) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  if (loading) {
    return (
      <Layout>
        <div className="settings-container">
          <div className="loading">Loading settings...</div>
        </div>
      </Layout>
    )
  }

  const tabs = [
    { id: 'general' as TabType, label: 'General', icon: '⚙️' },
    { id: 'azure-devops' as TabType, label: 'MS Azure DevOps', icon: '☁️' },
    { id: 'playwright' as TabType, label: 'Playwright', icon: '🎭' },
    { id: 'github' as TabType, label: 'GitHub', icon: '🐙' },
    { id: 'jenkins' as TabType, label: 'Jenkins', icon: '🔧' },
    { id: 'security' as TabType, label: 'Security', icon: '🔒' }
  ]

  return (
    <Layout>
      <ValidationProvider>
        <LoadingOverlay isLoading={saving} message="Saving settings...">
          <div className="settings-container">
            <header className="page-header">
              <h1>Settings</h1>
              <p>Configure application settings, integrations, and security options</p>
            </header>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Settings Tabs */}
            <div className="settings-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={saving}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  <span className="tab-label">{tab.label}</span>
                </button>
              ))}
            </div>

          {/* Tab Content */}
          <div className="settings-content">
            {activeTab === 'general' && (
              <GeneralTab 
                settings={{
                  applicationName: settings.applicationName,
                  defaultLanguage: settings.defaultLanguage,
                  timezone: settings.timezone,
                  notificationPreferences: settings.notificationPreferences
                }}
                updateSetting={updateSetting}
              />
            )}

            {activeTab === 'azure-devops' && (
              <AzureDevOpsTab 
                settings={{
                  adoEnabled: settings.adoEnabled,
                  adoOrganization: settings.adoOrganization,
                  adoProject: settings.adoProject,
                  adoPat: settings.adoPat,
                  adoWebhookSecret: settings.adoWebhookSecret,
                  pipelineMonitoring: settings.pipelineMonitoring,
                  buildDefinitionId: settings.buildDefinitionId
                }}
                updateSetting={updateSetting}
              />
            )}

            {activeTab === 'playwright' && (
              <PlaywrightTab 
                settings={{
                  defaultBrowser: settings.defaultBrowser,
                  headlessMode: settings.headlessMode,
                  browserTimeout: settings.browserTimeout,
                  maxRetries: settings.maxRetries,
                  parallelWorkers: settings.parallelWorkers,
                  testTimeout: settings.testTimeout,
                  slowTestThreshold: settings.slowTestThreshold,
                  reportFormat: settings.reportFormat,
                  screenshotMode: settings.screenshotMode,
                  videoRecording: settings.videoRecording,
                  verboseLogging: settings.verboseLogging,
                  liveLogs: settings.liveLogs,
                  fullyParallel: settings.fullyParallel,
                  forbidOnly: settings.forbidOnly,
                  updateSnapshots: settings.updateSnapshots,
                  ignoreHttpsErrors: settings.ignoreHttpsErrors,
                  playwrightConfigPath: settings.playwrightConfigPath
                }}
                updateSetting={updateSetting}
              />
            )}

            {activeTab === 'github' && (
              <GitHubTab 
                settings={{
                  githubEnabled: settings.githubEnabled,
                  githubToken: settings.githubToken,
                  githubRepository: settings.githubRepository,
                  githubWebhookSecret: settings.githubWebhookSecret,
                  branchMonitoring: settings.branchMonitoring,
                  monitoredBranches: settings.monitoredBranches,
                  prChecks: settings.prChecks,
                  issueTracking: settings.issueTracking
                }}
                updateSetting={updateSetting}
                testConnection={() => testConnection('github')}
                isConnectionTesting={connectionTesting.github || false}
                isLoading={loading}
              />
            )}

            {activeTab === 'jenkins' && (
              <JenkinsTab 
                settings={{
                  jenkinsEnabled: settings.jenkinsEnabled,
                  jenkinsUrl: settings.jenkinsUrl,
                  jenkinsUsername: settings.jenkinsUsername,
                  jenkinsApiToken: settings.jenkinsApiToken,
                  jenkinsWebhookSecret: settings.jenkinsWebhookSecret,
                  jobMonitoring: settings.jobMonitoring,
                  monitoredJobs: settings.monitoredJobs,
                  buildTriggers: settings.buildTriggers,
                  pipelineIntegration: settings.pipelineIntegration
                }}
                updateSetting={updateSetting}
              />
            )}

            {activeTab === 'security' && (
              <SecurityTab 
                settings={{
                  authenticationMethod: settings.authenticationMethod,
                  requireMfa: settings.requireMfa,
                  sessionTimeout: settings.sessionTimeout,
                  maxLoginAttempts: settings.maxLoginAttempts,
                  passwordMinLength: settings.passwordMinLength,
                  passwordRequireUppercase: settings.passwordRequireUppercase,
                  passwordRequireLowercase: settings.passwordRequireLowercase,
                  passwordRequireNumbers: settings.passwordRequireNumbers,
                  passwordRequireSpecialChars: settings.passwordRequireSpecialChars,
                  passwordExpirationDays: settings.passwordExpirationDays,
                  rateLimitEnabled: settings.rateLimitEnabled,
                  rateLimitPerMinute: settings.rateLimitPerMinute,
                  rateLimitPerHour: settings.rateLimitPerHour,
                  rbacEnabled: settings.rbacEnabled,
                  defaultUserRole: settings.defaultUserRole,
                  adminApprovalRequired: settings.adminApprovalRequired,
                  enableCsrf: settings.enableCsrf,
                  enableCors: settings.enableCors,
                  corsOrigins: settings.corsOrigins,
                  securityHeaders: settings.securityHeaders
                }}
                updateSetting={updateSetting}
              />
            )}
          </div>

          {/* Action Buttons */}
          <SaveSettingsComponent
            onSave={saveSettings}
            onReset={resetToDefaults}
            saving={saving}
            disabled={loading}
          />
        </div>
        </LoadingOverlay>
        
        {/* Error Notification */}
        {settingsError && (
          <ErrorNotification
            error={settingsError.errorInfo}
            onDismiss={handleDismissError}
            onRetry={() => handleRetryOperation(settingsError.errorInfo.operation || '')}
          />
        )}
        
        {/* Success Notification */}
        {successInfo && (
          <SuccessNotification
            success={successInfo}
            onDismiss={handleDismissSuccess}
          />
        )}
      </ValidationProvider>
    </Layout>
  )
}

export default TabbedSettingsPage
