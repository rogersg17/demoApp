import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Layout from '../components/Layout'
import { updateTestExecutionSetting } from '../store/slices/settingsSlice'
import type { RootState } from '../store/store'

interface Settings {
  // Browser Configuration
  defaultBrowser: string
  headlessMode: boolean
  browserTimeout: number
  
  // Test Execution
  maxRetries: number
  parallelWorkers: number
  testTimeout: number
  slowTestThreshold: number
  
  // Reporting & Output
  reportFormat: string
  screenshotMode: string
  videoRecording: boolean
  verboseLogging: boolean
  liveLogs: boolean
  
  // Environment Configuration
  baseUrl: string
  apiEndpoint: string
  testEnvironment: string
  
  // JIRA Integration
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
  
  // Advanced Settings
  fullyParallel: boolean
  forbidOnly: boolean
  updateSnapshots: string
  ignoreHttpsErrors: boolean
}

const defaultSettings: Settings = {
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
  
  // JIRA Integration
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
  
  // Advanced Settings
  fullyParallel: false,
  forbidOnly: true,
  updateSnapshots: 'missing',
  ignoreHttpsErrors: false
}

const SettingsPage: React.FC = () => {
  const dispatch = useDispatch()
  const reduxLiveLogs = useSelector((state: RootState) => state.settings.testExecution.liveLogs)
  
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [testingJira, setTestingJira] = useState(false)
  const [testingAdo, setTestingAdo] = useState(false)

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
    } catch (error) {
      console.error('Error loading settings:', error)
      // Load from localStorage as fallback
      const localSettings = localStorage.getItem('testSettings')
      if (localSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(localSettings) })
      }
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
        credentials: 'include',
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        setSuccess('Settings saved successfully!')
      } else {
        throw new Error('Failed to save to server')
      }

      // Always save to localStorage as backup
      localStorage.setItem('testSettings', JSON.stringify(settings))
      
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

  const updateSetting = <T extends keyof Settings>(key: T, value: Settings[T]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
    
    // Sync liveLogs setting with Redux store
    if (key === 'liveLogs') {
      dispatch(updateTestExecutionSetting({ key: 'liveLogs', value: value as boolean }))
    }
  }

  const testJiraConnection = async () => {
    try {
      setTestingJira(true)
      setError(null)
      
      const response = await fetch('/api/jira/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          url: settings.jiraUrl,
          username: settings.jiraUsername,
          token: settings.jiraApiToken
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        setSuccess('JIRA connection successful!')
      } else {
        setError(`JIRA connection failed: ${result.error}`)
      }
    } catch (err) {
      console.error('JIRA connection test failed:', err)
      setError('Failed to test JIRA connection')
    } finally {
      setTestingJira(false)
    }
  }

  const testAdoConnection = async () => {
    try {
      setTestingAdo(true)
      setError(null)
      
      const response = await fetch('/api/ado/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          organization: settings.adoOrganization,
          project: settings.adoProject,
          pat: settings.adoPat
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        setSuccess('Azure DevOps connection successful!')
      } else {
        setError(`Azure DevOps connection failed: ${result.error}`)
      }
    } catch (err) {
      console.error('Azure DevOps connection test failed:', err)
      setError('Failed to test Azure DevOps connection')
    } finally {
      setTestingAdo(false)
    }
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

  return (
    <Layout>
      <div className="settings-container">
        <header className="page-header">
          <h1>Settings</h1>
          <p>Configure your test execution settings</p>
        </header>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Settings Grid */}
        <div className="settings-grid">
          {/* Browser Settings Panel */}
          <div className="settings-panel">
            <h3>Browser Configuration</h3>
            <div className="setting-group">
              <label>Default Browser</label>
              <select 
                value={settings.defaultBrowser} 
                onChange={(e) => updateSetting('defaultBrowser', e.target.value)}
              >
                <option value="chromium">Chromium</option>
                <option value="firefox">Firefox</option>
                <option value="webkit">WebKit</option>
              </select>
            </div>
            <div className="setting-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={settings.headlessMode}
                  onChange={(e) => updateSetting('headlessMode', e.target.checked)}
                />
                Headless Mode
              </label>
            </div>
            <div className="setting-group">
              <label>Browser Timeout (ms)</label>
              <input 
                type="number" 
                value={settings.browserTimeout}
                onChange={(e) => updateSetting('browserTimeout', parseInt(e.target.value))}
                min="1000"
                max="120000"
                step="1000"
              />
            </div>
          </div>

          {/* Test Execution Panel */}
          <div className="settings-panel">
            <h3>Test Execution</h3>
            <div className="setting-group">
              <label>Max Retries</label>
              <input 
                type="number" 
                value={settings.maxRetries}
                onChange={(e) => updateSetting('maxRetries', parseInt(e.target.value))}
                min="0"
                max="10"
              />
            </div>
            <div className="setting-group">
              <label>Parallel Workers</label>
              <input 
                type="number" 
                value={settings.parallelWorkers}
                onChange={(e) => updateSetting('parallelWorkers', parseInt(e.target.value))}
                min="1"
                max="16"
              />
            </div>
            <div className="setting-group">
              <label>Test Timeout (ms)</label>
              <input 
                type="number" 
                value={settings.testTimeout}
                onChange={(e) => updateSetting('testTimeout', parseInt(e.target.value))}
                min="1000"
                max="300000"
                step="1000"
              />
            </div>
            <div className="setting-group">
              <label>Slow Test Threshold (ms)</label>
              <input 
                type="number" 
                value={settings.slowTestThreshold}
                onChange={(e) => updateSetting('slowTestThreshold', parseInt(e.target.value))}
                min="1000"
                max="60000"
                step="1000"
              />
            </div>
          </div>

          {/* Reporting & Output Panel */}
          <div className="settings-panel">
            <h3>Reporting & Output</h3>
            <div className="setting-group">
              <label>Report Format</label>
              <select 
                value={settings.reportFormat} 
                onChange={(e) => updateSetting('reportFormat', e.target.value)}
              >
                <option value="html">HTML</option>
                <option value="json">JSON</option>
                <option value="junit">JUnit</option>
                <option value="list">List</option>
              </select>
            </div>
            <div className="setting-group">
              <label>Screenshot Mode</label>
              <select 
                value={settings.screenshotMode} 
                onChange={(e) => updateSetting('screenshotMode', e.target.value)}
              >
                <option value="off">Off</option>
                <option value="only-on-failure">Only on Failure</option>
                <option value="on">Always</option>
              </select>
            </div>
            <div className="setting-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={settings.videoRecording}
                  onChange={(e) => updateSetting('videoRecording', e.target.checked)}
                />
                Video Recording
              </label>
            </div>
            <div className="setting-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={settings.verboseLogging}
                  onChange={(e) => updateSetting('verboseLogging', e.target.checked)}
                />
                Verbose Logging
              </label>
            </div>
            <div className="setting-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={settings.liveLogs}
                  onChange={(e) => updateSetting('liveLogs', e.target.checked)}
                />
                Real-time Live Logs
              </label>
              <small 
                className="setting-description"
                style={{ 
                  display: 'block', 
                  marginTop: '4px', 
                  color: '#6b7280', 
                  fontSize: '0.875rem',
                  fontStyle: 'italic'
                }}
              >
                Enable live streaming of test execution logs in real-time monitoring
              </small>
            </div>
          </div>

          {/* Environment Configuration Panel */}
          <div className="settings-panel">
            <h3>Environment Configuration</h3>
            <div className="setting-group">
              <label>Base URL</label>
              <input 
                type="url" 
                value={settings.baseUrl}
                onChange={(e) => updateSetting('baseUrl', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="setting-group">
              <label>API Endpoint</label>
              <input 
                type="url" 
                value={settings.apiEndpoint}
                onChange={(e) => updateSetting('apiEndpoint', e.target.value)}
                placeholder="https://api.example.com"
              />
            </div>
            <div className="setting-group">
              <label>Test Environment</label>
              <select 
                value={settings.testEnvironment} 
                onChange={(e) => updateSetting('testEnvironment', e.target.value)}
              >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>
          </div>

          {/* JIRA Integration Panel */}
          <div className="settings-panel">
            <h3>JIRA Integration</h3>
            <div className="setting-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={settings.jiraEnabled}
                  onChange={(e) => updateSetting('jiraEnabled', e.target.checked)}
                />
                Enable JIRA Integration
              </label>
            </div>
            <div className="setting-group">
              <label>JIRA URL</label>
              <input 
                type="url" 
                value={settings.jiraUrl}
                onChange={(e) => updateSetting('jiraUrl', e.target.value)}
                placeholder="https://yourcompany.atlassian.net"
                disabled={!settings.jiraEnabled}
              />
            </div>
            <div className="setting-group">
              <label>Project Key</label>
              <input 
                type="text" 
                value={settings.jiraProject}
                onChange={(e) => updateSetting('jiraProject', e.target.value)}
                placeholder="PROJ"
                disabled={!settings.jiraEnabled}
              />
            </div>
            <div className="setting-group">
              <label>Username</label>
              <input 
                type="text" 
                value={settings.jiraUsername}
                onChange={(e) => updateSetting('jiraUsername', e.target.value)}
                placeholder="your.email@company.com"
                disabled={!settings.jiraEnabled}
              />
            </div>
            <div className="setting-group">
              <label>API Token</label>
              <input 
                type="password" 
                value={settings.jiraApiToken}
                onChange={(e) => updateSetting('jiraApiToken', e.target.value)}
                placeholder="Your JIRA API token"
                disabled={!settings.jiraEnabled}
              />
            </div>
            {settings.jiraEnabled && (
              <div className="setting-group">
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={testJiraConnection}
                  disabled={testingJira || !settings.jiraUrl || !settings.jiraUsername || !settings.jiraApiToken}
                >
                  {testingJira ? 'Testing...' : 'Test JIRA Connection'}
                </button>
              </div>
            )}
          </div>

          {/* Azure DevOps Integration Panel */}
          <div className="settings-panel">
            <h3>Azure DevOps Integration</h3>
            <div className="setting-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={settings.adoEnabled}
                  onChange={(e) => updateSetting('adoEnabled', e.target.checked)}
                />
                Enable Azure DevOps Integration
              </label>
              <small 
                className="setting-description"
                style={{ 
                  display: 'block', 
                  marginTop: '4px', 
                  color: '#6b7280', 
                  fontSize: '0.875rem',
                  fontStyle: 'italic'
                }}
              >
                Monitor Azure DevOps pipelines as projects with real-time build results
              </small>
            </div>
            <div className="setting-group">
              <label>Organization URL</label>
              <input 
                type="url" 
                value={settings.adoOrganization}
                onChange={(e) => updateSetting('adoOrganization', e.target.value)}
                placeholder="https://dev.azure.com/yourorganization"
                disabled={!settings.adoEnabled}
              />
            </div>
            <div className="setting-group">
              <label>Project Name</label>
              <input 
                type="text" 
                value={settings.adoProject}
                onChange={(e) => updateSetting('adoProject', e.target.value)}
                placeholder="YourProjectName"
                disabled={!settings.adoEnabled}
              />
            </div>
            <div className="setting-group">
              <label>Personal Access Token (PAT)</label>
              <input 
                type="password" 
                value={settings.adoPat}
                onChange={(e) => updateSetting('adoPat', e.target.value)}
                placeholder="Your Azure DevOps PAT"
                disabled={!settings.adoEnabled}
              />
              <small 
                className="setting-description"
                style={{ 
                  display: 'block', 
                  marginTop: '4px', 
                  color: '#6b7280', 
                  fontSize: '0.875rem'
                }}
              >
                Required scopes: Build (Read), Test Management (Read), Work Items (Read & Write)
              </small>
            </div>
            <div className="setting-group">
              <label>Webhook Secret (Optional)</label>
              <input 
                type="password" 
                value={settings.adoWebhookSecret}
                onChange={(e) => updateSetting('adoWebhookSecret', e.target.value)}
                placeholder="Webhook signature validation secret"
                disabled={!settings.adoEnabled}
              />
              <small 
                className="setting-description"
                style={{ 
                  display: 'block', 
                  marginTop: '4px', 
                  color: '#6b7280', 
                  fontSize: '0.875rem'
                }}
              >
                Used to validate webhook signatures from Azure DevOps
              </small>
            </div>
            {settings.adoEnabled && (
              <div className="setting-group">
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={testAdoConnection}
                  disabled={testingAdo || !settings.adoOrganization || !settings.adoProject || !settings.adoPat}
                >
                  {testingAdo ? 'Testing...' : 'Test Azure DevOps Connection'}
                </button>
              </div>
            )}
          </div>

          {/* Advanced Settings Panel */}
          <div className="settings-panel">
            <h3>Advanced Settings</h3>
            <div className="setting-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={settings.fullyParallel}
                  onChange={(e) => updateSetting('fullyParallel', e.target.checked)}
                />
                Fully Parallel
              </label>
            </div>
            <div className="setting-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={settings.forbidOnly}
                  onChange={(e) => updateSetting('forbidOnly', e.target.checked)}
                />
                Forbid .only() in Tests
              </label>
            </div>
            <div className="setting-group">
              <label>Update Snapshots</label>
              <select 
                value={settings.updateSnapshots} 
                onChange={(e) => updateSetting('updateSnapshots', e.target.value)}
              >
                <option value="missing">Missing</option>
                <option value="all">All</option>
                <option value="none">None</option>
              </select>
            </div>
            <div className="setting-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={settings.ignoreHttpsErrors}
                  onChange={(e) => updateSetting('ignoreHttpsErrors', e.target.checked)}
                />
                Ignore HTTPS Errors
              </label>
            </div>
          </div>
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

export default SettingsPage
