import React from 'react'

interface PlaywrightTabProps {
  settings: {
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
    
    // Advanced Settings
    fullyParallel: boolean
    forbidOnly: boolean
    updateSnapshots: string
    ignoreHttpsErrors: boolean
    
    // Config file path
    playwrightConfigPath: string
  }
  updateSetting: (key: string, value: string | number | boolean) => void
}

const PlaywrightTab: React.FC<PlaywrightTabProps> = ({ settings, updateSetting }) => {
  return (
    <div className="settings-panel">
      <h3>Playwright Test Configuration</h3>
      
      {/* Configuration File Path */}
      <div className="setting-group">
        <label>Playwright Configuration File Path</label>
        <input 
          type="text" 
          value={settings.playwrightConfigPath}
          onChange={(e) => updateSetting('playwrightConfigPath', e.target.value)}
          placeholder="./playwright.config.ts"
        />
        <small className="setting-description">
          Path to your Playwright configuration file relative to project root
        </small>
      </div>

      {/* Browser Settings */}
      <div className="settings-section">
        <h4>Browser Configuration</h4>
        
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
          <small className="setting-description">
            Run browsers without a GUI (faster for CI/CD)
          </small>
        </div>

        <div className="setting-group">
          <label>Browser Timeout (ms)</label>
          <input 
            type="number" 
            value={settings.browserTimeout}
            onChange={(e) => updateSetting('browserTimeout', parseInt(e.target.value))}
            min="5000"
            max="120000"
            step="5000"
          />
          <small className="setting-description">
            Maximum time to wait for browser operations
          </small>
        </div>
      </div>

      {/* Test Execution Settings */}
      <div className="settings-section">
        <h4>Test Execution</h4>
        
        <div className="setting-group">
          <label>Maximum Retries</label>
          <input 
            type="number" 
            value={settings.maxRetries}
            onChange={(e) => updateSetting('maxRetries', parseInt(e.target.value))}
            min="0"
            max="5"
          />
          <small className="setting-description">
            Number of times to retry failed tests
          </small>
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
          <small className="setting-description">
            Number of parallel test workers to run
          </small>
        </div>

        <div className="setting-group">
          <label>Test Timeout (ms)</label>
          <input 
            type="number" 
            value={settings.testTimeout}
            onChange={(e) => updateSetting('testTimeout', parseInt(e.target.value))}
            min="5000"
            max="300000"
            step="5000"
          />
          <small className="setting-description">
            Maximum time for individual test execution
          </small>
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
          <small className="setting-description">
            Mark tests as slow if they exceed this duration
          </small>
        </div>
      </div>

      {/* Reporting & Output */}
      <div className="settings-section">
        <h4>Reporting & Output</h4>
        
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
          <small className="setting-description">
            Record video of test execution for debugging
          </small>
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
          <small className="setting-description">
            Enable detailed console output for debugging
          </small>
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
          <small className="setting-description">
            Enable live streaming of test execution logs
          </small>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="settings-section">
        <h4>Advanced Options</h4>
        
        <div className="setting-group">
          <label>
            <input 
              type="checkbox" 
              checked={settings.fullyParallel}
              onChange={(e) => updateSetting('fullyParallel', e.target.checked)}
            />
            Fully Parallel
          </label>
          <small className="setting-description">
            Run tests in fully parallel mode for maximum speed
          </small>
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
          <small className="setting-description">
            Prevent accidentally committed .only() calls in test files
          </small>
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
          <small className="setting-description">
            Control when visual snapshots are updated
          </small>
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
          <small className="setting-description">
            Bypass SSL certificate errors during testing
          </small>
        </div>
      </div>
    </div>
  )
}

export default PlaywrightTab
