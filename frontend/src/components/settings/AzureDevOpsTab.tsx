import React, { useState } from 'react'

interface AzureDevOpsTabProps {
  settings: {
    adoEnabled: boolean
    adoOrganization: string
    adoProject: string
    adoPat: string
    adoWebhookSecret: string
    pipelineMonitoring: boolean
    buildDefinitionId: string
  }
  updateSetting: (key: string, value: string | boolean) => void
}

const AzureDevOpsTab: React.FC<AzureDevOpsTabProps> = ({ settings, updateSetting }) => {
  const [testingConnection, setTestingConnection] = useState(false)

  const testAdoConnection = async () => {
    try {
      setTestingConnection(true)
      const response = await fetch('/api/settings/test-connection/ado', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization: settings.adoOrganization,
          project: settings.adoProject,
          pat: settings.adoPat,
        }),
        credentials: 'include'
      })

      const result = await response.json()
      if (result.success) {
        alert('Azure DevOps connection successful!')
      } else {
        alert(`Azure DevOps connection failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Azure DevOps connection test failed:', error)
      alert('Failed to test Azure DevOps connection')
    } finally {
      setTestingConnection(false)
    }
  }

  return (
    <div className="settings-panel">
      <h3>MS Azure DevOps Integration</h3>
      
      <div className="setting-group">
        <label>
          <input 
            type="checkbox" 
            checked={settings.adoEnabled}
            onChange={(e) => updateSetting('adoEnabled', e.target.checked)}
          />
          Enable Azure DevOps Integration
        </label>
        <small className="setting-description">
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
        <small className="setting-description">
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
        <small className="setting-description">
          Used to validate webhook signatures from Azure DevOps
        </small>
      </div>

      <div className="setting-group">
        <label>
          <input 
            type="checkbox" 
            checked={settings.pipelineMonitoring}
            onChange={(e) => updateSetting('pipelineMonitoring', e.target.checked)}
            disabled={!settings.adoEnabled}
          />
          Enable Pipeline Monitoring
        </label>
        <small className="setting-description">
          Automatically track pipeline status and notify on build completion
        </small>
      </div>

      <div className="setting-group">
        <label>Build Definition ID (Optional)</label>
        <input 
          type="text" 
          value={settings.buildDefinitionId}
          onChange={(e) => updateSetting('buildDefinitionId', e.target.value)}
          placeholder="123"
          disabled={!settings.adoEnabled}
        />
        <small className="setting-description">
          Specific build definition to monitor (leave empty to monitor all)
        </small>
      </div>

      {settings.adoEnabled && (
        <div className="setting-group">
          <button 
            type="button"
            className="btn btn-secondary"
            onClick={testAdoConnection}
            disabled={testingConnection || !settings.adoOrganization || !settings.adoProject || !settings.adoPat}
          >
            {testingConnection ? 'Testing...' : 'Test Azure DevOps Connection'}
          </button>
        </div>
      )}
    </div>
  )
}

export default AzureDevOpsTab
