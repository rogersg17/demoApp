import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Layout from '../components/Layout'
import { updateTestExecutionSetting } from '../store/slices/settingsSlice'
import type { RootState } from '../store/store'

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
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  apiEndpoint: (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000') + '/api',
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
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('general')

  useEffect(() => {
    loadSettings()
  }, [])

  // Sync liveLogs setting with Redux store
  useEffect(() => {
    setSettings(prev => ({ ...prev, liveLogs: reduxLiveLogs }))
  }, [reduxLiveLogs])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings', {
        credentials: 'include'
      })

      if (response.ok) {
        const loadedSettings = await response.json()
        setSettings({ ...defaultSettings, ...loadedSettings })
      } else {
        // Load from localStorage as fallback
        const localSettings = localStorage.getItem('testSettings')
        if (localSettings) {
          setSettings({ ...defaultSettings, ...JSON.parse(localSettings) })
        }
      }
    } catch (err) {
      console.error('Error loading settings:', err)
      // Load from localStorage as fallback
      const localSettings = localStorage.getItem('testSettings')
      if (localSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(localSettings) })
      }
      setError('Failed to load settings from server, using local cache.')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

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
        setSuccess('Settings saved successfully!')
        
        // Update Redux store for live logs
        if (settings.liveLogs !== reduxLiveLogs) {
          dispatch(updateTestExecutionSetting({ key: 'liveLogs', value: settings.liveLogs }))
        }
        
        // Also save to localStorage as backup
        localStorage.setItem('testSettings', JSON.stringify(settings))
      } else {
        throw new Error('Failed to save settings to server')
      }
    } catch (err) {
      console.error('Error saving settings:', err)
      // Save to localStorage even if server fails
      localStorage.setItem('testSettings', JSON.stringify(settings))
      setError('Settings saved locally, but failed to sync with server.')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    setSettings(defaultSettings)
    setSuccess('Settings reset to defaults')
  }

  const updateSetting = (key: string, value: string | number | boolean | string[] | { email: boolean; push: boolean; sms: boolean }) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

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
        <div className="settings-actions">
          <button 
            className="btn btn-primary" 
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={resetToDefaults}
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </Layout>
  )
}

export default TabbedSettingsPage
