import React, { useState } from 'react'

interface JenkinsTabProps {
  settings: {
    jenkinsEnabled: boolean
    jenkinsUrl: string
    jenkinsUsername: string
    jenkinsApiToken: string
    jenkinsWebhookSecret: string
    jobMonitoring: boolean
    monitoredJobs: string[]
    buildTriggers: boolean
    pipelineIntegration: boolean
  }
  updateSetting: (key: string, value: string | boolean | string[]) => void
}

const JenkinsTab: React.FC<JenkinsTabProps> = ({ settings, updateSetting }) => {
  const [testingConnection, setTestingConnection] = useState(false)
  const [jobInput, setJobInput] = useState('')

  const testJenkinsConnection = async () => {
    try {
      setTestingConnection(true)
      const response = await fetch('/api/settings/test-connection/jenkins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: settings.jenkinsUrl,
          username: settings.jenkinsUsername,
          apiToken: settings.jenkinsApiToken,
        }),
        credentials: 'include'
      })

      const result = await response.json()
      if (result.success) {
        const message = `Jenkins connection successful!\n\n` +
                       `Version: ${result.jenkinsInfo.version}\n` +
                       `Node: ${result.jenkinsInfo.nodeName}\n` +
                       `Job Access: ${result.jobAccess ? 'Yes' : 'No'}\n` +
                       `Jobs Found: ${result.jobCount}`
        alert(message)
      } else {
        alert(`Jenkins connection failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Jenkins connection test failed:', error)
      alert('Failed to test Jenkins connection')
    } finally {
      setTestingConnection(false)
    }
  }

  const addMonitoredJob = () => {
    if (jobInput.trim() && !settings.monitoredJobs.includes(jobInput.trim())) {
      updateSetting('monitoredJobs', [...settings.monitoredJobs, jobInput.trim()])
      setJobInput('')
    }
  }

  const removeMonitoredJob = (job: string) => {
    updateSetting('monitoredJobs', settings.monitoredJobs.filter(j => j !== job))
  }

  return (
    <div className="settings-panel">
      <h3>Jenkins Integration</h3>
      
      <div className="setting-group">
        <label>
          <input 
            type="checkbox" 
            checked={settings.jenkinsEnabled}
            onChange={(e) => updateSetting('jenkinsEnabled', e.target.checked)}
          />
          Enable Jenkins Integration
        </label>
        <small className="setting-description">
          Connect to Jenkins for pipeline configuration and build monitoring
        </small>
      </div>

      <div className="setting-group">
        <label>Jenkins URL</label>
        <input 
          type="url" 
          value={settings.jenkinsUrl}
          onChange={(e) => updateSetting('jenkinsUrl', e.target.value)}
          placeholder="https://jenkins.yourcompany.com"
          disabled={!settings.jenkinsEnabled}
        />
        <small className="setting-description">
          Base URL of your Jenkins instance
        </small>
      </div>

      <div className="setting-group">
        <label>Username</label>
        <input 
          type="text" 
          value={settings.jenkinsUsername}
          onChange={(e) => updateSetting('jenkinsUsername', e.target.value)}
          placeholder="your-jenkins-username"
          disabled={!settings.jenkinsEnabled}
        />
      </div>

      <div className="setting-group">
        <label>API Token</label>
        <input 
          type="password" 
          value={settings.jenkinsApiToken}
          onChange={(e) => updateSetting('jenkinsApiToken', e.target.value)}
          placeholder="Your Jenkins API token"
          disabled={!settings.jenkinsEnabled}
        />
        <small className="setting-description">
          Generate API token from Jenkins User Configuration
        </small>
      </div>

      <div className="setting-group">
        <label>Webhook Secret (Optional)</label>
        <input 
          type="password" 
          value={settings.jenkinsWebhookSecret}
          onChange={(e) => updateSetting('jenkinsWebhookSecret', e.target.value)}
          placeholder="Webhook signature validation secret"
          disabled={!settings.jenkinsEnabled}
        />
        <small className="setting-description">
          Used to validate webhook signatures from Jenkins
        </small>
      </div>

      <div className="setting-group">
        <label>
          <input 
            type="checkbox" 
            checked={settings.jobMonitoring}
            onChange={(e) => updateSetting('jobMonitoring', e.target.checked)}
            disabled={!settings.jenkinsEnabled}
          />
          Enable Job Monitoring
        </label>
        <small className="setting-description">
          Monitor specified Jenkins jobs for build status changes
        </small>
      </div>

      {settings.jobMonitoring && (
        <div className="setting-group">
          <label>Monitored Jobs</label>
          <div className="job-management">
            <div className="job-input-container">
              <input 
                type="text" 
                value={jobInput}
                onChange={(e) => setJobInput(e.target.value)}
                placeholder="Enter job name (e.g., MyProject-Build)"
                onKeyPress={(e) => e.key === 'Enter' && addMonitoredJob()}
                disabled={!settings.jenkinsEnabled}
              />
              <button 
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={addMonitoredJob}
                disabled={!jobInput.trim() || !settings.jenkinsEnabled}
              >
                Add
              </button>
            </div>
            <div className="job-list">
              {settings.monitoredJobs.map((job, index) => (
                <div key={index} className="job-tag">
                  <span>{job}</span>
                  <button 
                    type="button"
                    className="btn-remove"
                    onClick={() => removeMonitoredJob(job)}
                    disabled={!settings.jenkinsEnabled}
                  >
                    ×
                  </button>
                </div>
              ))}
              {settings.monitoredJobs.length === 0 && (
                <div className="no-jobs">No jobs configured</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="setting-group">
        <label>
          <input 
            type="checkbox" 
            checked={settings.buildTriggers}
            onChange={(e) => updateSetting('buildTriggers', e.target.checked)}
            disabled={!settings.jenkinsEnabled}
          />
          Enable Build Triggers
        </label>
        <small className="setting-description">
          Allow triggering Jenkins builds from the application
        </small>
      </div>

      <div className="setting-group">
        <label>
          <input 
            type="checkbox" 
            checked={settings.pipelineIntegration}
            onChange={(e) => updateSetting('pipelineIntegration', e.target.checked)}
            disabled={!settings.jenkinsEnabled}
          />
          Enable Pipeline Integration
        </label>
        <small className="setting-description">
          Integrate with Jenkins Pipeline stages and steps
        </small>
      </div>

      {settings.jenkinsEnabled && (
        <div className="setting-group">
          <button 
            type="button"
            className="btn btn-secondary"
            onClick={testJenkinsConnection}
            disabled={testingConnection || !settings.jenkinsUrl || !settings.jenkinsUsername || !settings.jenkinsApiToken}
          >
            {testingConnection ? 'Testing...' : 'Test Jenkins Connection'}
          </button>
        </div>
      )}
    </div>
  )
}

export default JenkinsTab
