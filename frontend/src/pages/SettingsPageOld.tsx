import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { apiCall } from '../config/api'

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
  
  // Environment Configuration
  baseUrl: 'http://localhost:8080',
  apiEndpoint: 'http://localhost:8080/api',
  testEnvironment: 'local',
  
  // JIRA Integration
  jiraEnabled: false,
  jiraUrl: '',
  jiraProject: '',
  jiraUsername: '',
  jiraApiToken: '',
  
  // Advanced Settings
  fullyParallel: false,
  forbidOnly: true,
  updateSnapshots: 'missing',
  ignoreHttpsErrors: false
}

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('browser')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await apiCall('/api/settings')
      
      if (response.ok) {
        const serverSettings = await response.json()
        setSettings({ ...defaultSettings, ...serverSettings })
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
      const response = await apiCall('/api/settings', {
        method: 'POST',
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
          <button 
            className={`tab-btn ${activeTab === 'browser' ? 'active' : ''}`}
            onClick={() => setActiveTab('browser')}
          >
            Browser
          </button>
          <button 
            className={`tab-btn ${activeTab === 'execution' ? 'active' : ''}`}
            onClick={() => setActiveTab('execution')}
          >
            Execution
          </button>
          <button 
            className={`tab-btn ${activeTab === 'reporting' ? 'active' : ''}`}
            onClick={() => setActiveTab('reporting')}
          >
            Reporting
          </button>
          <button 
            className={`tab-btn ${activeTab === 'environment' ? 'active' : ''}`}
            onClick={() => setActiveTab('environment')}
          >
            Environment
          </button>
          <button 
            className={`tab-btn ${activeTab === 'jira' ? 'active' : ''}`}
            onClick={() => setActiveTab('jira')}
          >
            JIRA
          </button>
          <button 
            className={`tab-btn ${activeTab === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            Advanced
          </button>
        </div>

        <div className="settings-content">
          {/* Browser Settings */}
          {activeTab === 'browser' && (
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
                />
              </div>
            </div>
          )}

          {/* Execution Settings */}
          {activeTab === 'execution' && (
            <div className="settings-panel">
              <h3>Test Execution</h3>
              <div className="setting-group">
                <label>Max Retries</label>
                <input 
                  type="number" 
                  value={settings.maxRetries}
                  onChange={(e) => updateSetting('maxRetries', parseInt(e.target.value))}
                />
              </div>
              <div className="setting-group">
                <label>Parallel Workers</label>
                <input 
                  type="number" 
                  value={settings.parallelWorkers}
                  onChange={(e) => updateSetting('parallelWorkers', parseInt(e.target.value))}
                />
              </div>
              <div className="setting-group">
                <label>Test Timeout (ms)</label>
                <input 
                  type="number" 
                  value={settings.testTimeout}
                  onChange={(e) => updateSetting('testTimeout', parseInt(e.target.value))}
                />
              </div>
              <div className="setting-group">
                <label>Slow Test Threshold (ms)</label>
                <input 
                  type="number" 
                  value={settings.slowTestThreshold}
                  onChange={(e) => updateSetting('slowTestThreshold', parseInt(e.target.value))}
                />
              </div>
            </div>
          )}

          {/* Reporting Settings */}
          {activeTab === 'reporting' && (
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
                  <option value="line">Line</option>
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
            </div>
          )}

          {/* Environment Settings */}
          {activeTab === 'environment' && (
            <div className="settings-panel">
              <h3>Environment Configuration</h3>
              <div className="setting-group">
                <label>Base URL</label>
                <input 
                  type="text" 
                  value={settings.baseUrl}
                  onChange={(e) => updateSetting('baseUrl', e.target.value)}
                />
              </div>
              <div className="setting-group">
                <label>API Endpoint</label>
                <input 
                  type="text" 
                  value={settings.apiEndpoint}
                  onChange={(e) => updateSetting('apiEndpoint', e.target.value)}
                />
              </div>
              <div className="setting-group">
                <label>Test Environment</label>
                <select 
                  value={settings.testEnvironment} 
                  onChange={(e) => updateSetting('testEnvironment', e.target.value)}
                >
                  <option value="local">Local</option>
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
              </div>
            </div>
          )}

          {/* JIRA Settings */}
          {activeTab === 'jira' && (
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
              {settings.jiraEnabled && (
                <>
                  <div className="setting-group">
                    <label>JIRA URL</label>
                    <input 
                      type="text" 
                      value={settings.jiraUrl}
                      onChange={(e) => updateSetting('jiraUrl', e.target.value)}
                      placeholder="https://your-domain.atlassian.net"
                    />
                  </div>
                  <div className="setting-group">
                    <label>JIRA Project Key</label>
                    <input 
                      type="text" 
                      value={settings.jiraProject}
                      onChange={(e) => updateSetting('jiraProject', e.target.value)}
                      placeholder="PROJECT"
                    />
                  </div>
                  <div className="setting-group">
                    <label>JIRA Username</label>
                    <input 
                      type="text" 
                      value={settings.jiraUsername}
                      onChange={(e) => updateSetting('jiraUsername', e.target.value)}
                    />
                  </div>
                  <div className="setting-group">
                    <label>JIRA API Token</label>
                    <input 
                      type="password" 
                      value={settings.jiraApiToken}
                      onChange={(e) => updateSetting('jiraApiToken', e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Advanced Settings */}
          {activeTab === 'advanced' && (
            <div className="settings-panel">
              <h3>Advanced Settings</h3>
              <div className="setting-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={settings.fullyParallel}
                    onChange={(e) => updateSetting('fullyParallel', e.target.checked)}
                  />
                  Fully Parallel Execution
                </label>
              </div>
              <div className="setting-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={settings.forbidOnly}
                    onChange={(e) => updateSetting('forbidOnly', e.target.checked)}
                  />
                  Forbid test.only in CI
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

export default SettingsPage
