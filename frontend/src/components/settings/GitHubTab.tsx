import React, { useState } from 'react'
import { ValidatedInput, ValidationErrors } from '../ValidationComponents'
import LoadingOverlay from '../LoadingOverlay'

interface GitHubTabProps {
  settings: {
    githubEnabled: boolean
    githubToken: string
    githubRepository: string
    githubWebhookSecret: string
    branchMonitoring: boolean
    monitoredBranches: string[]
    prChecks: boolean
    issueTracking: boolean
  }
  updateSetting: (key: string, value: string | boolean | string[]) => void
  testConnection?: () => Promise<void>
  isConnectionTesting?: boolean
  isLoading?: boolean
}

const GitHubTab: React.FC<GitHubTabProps> = ({ 
  settings, 
  updateSetting, 
  testConnection,
  isConnectionTesting = false,
  isLoading = false 
}) => {
  const [branchInput, setBranchInput] = useState('')

  const handleTestConnection = async () => {
    if (testConnection) {
      await testConnection();
    } else {
      // Fallback to local implementation if external function not provided
      await testGitHubConnection();
    }
  };

  const testGitHubConnection = async () => {
    try {
      // This is now handled by the parent component
      // Parse repository to get organization and repo name
      const [organization, repository] = settings.githubRepository.split('/')
      
      const response = await fetch('/api/settings/test-connection/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: settings.githubToken,
          organization: organization,
          repository: repository,
        }),
        credentials: 'include'
      })

      const result = await response.json()
      if (result.success) {
        const message = `GitHub connection successful!\n\nUser: ${result.user.name || result.user.login}\n` +
                       `Repository Access: ${result.repositoryAccess ? 'Yes' : 'No'}\n` +
                       (result.repositoryInfo ? `Repository: ${result.repositoryInfo.fullName}` : '')
        alert(message)
      } else {
        alert(`GitHub connection failed: ${result.error}`)
      }
    } catch (error) {
      console.error('GitHub connection test failed:', error)
      alert('Failed to test GitHub connection')
    }
  }

  const addMonitoredBranch = () => {
    if (branchInput.trim() && !settings.monitoredBranches.includes(branchInput.trim())) {
      updateSetting('monitoredBranches', [...settings.monitoredBranches, branchInput.trim()])
      setBranchInput('')
    }
  }

  const removeMonitoredBranch = (branch: string) => {
    updateSetting('monitoredBranches', settings.monitoredBranches.filter(b => b !== branch))
  }

  return (
    <LoadingOverlay isLoading={isLoading} message="Loading GitHub settings...">
      <div className="settings-panel">
        <h3>GitHub Integration</h3>
      
      <div className="setting-group">
        <label>
          <input 
            type="checkbox" 
            checked={settings.githubEnabled}
            onChange={(e) => updateSetting('githubEnabled', e.target.checked)}
          />
          Enable GitHub Integration
        </label>
        <small className="setting-description">
          Connect to GitHub for repository management and webhook notifications
        </small>
      </div>

      <div className="setting-group">
        <label>Repository</label>
        <ValidatedInput 
          type="text" 
          fieldName="githubRepository"
          validationType="github-repo"
          value={settings.githubRepository}
          onChange={(e) => updateSetting('githubRepository', e.target.value)}
          placeholder="owner/repository-name"
          disabled={!settings.githubEnabled}
        />
        <ValidationErrors fieldName="githubRepository" />
        <small className="setting-description">
          Format: owner/repository-name (e.g., microsoft/playwright)
        </small>
      </div>

      <div className="setting-group">
        <label>Personal Access Token</label>
        <ValidatedInput 
          type="password" 
          fieldName="githubToken"
          validationType="github-token"
          value={settings.githubToken}
          onChange={(e) => updateSetting('githubToken', e.target.value)}
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          disabled={!settings.githubEnabled}
        />
        <ValidationErrors fieldName="githubToken" />
        <small className="setting-description">
          Required scopes: repo, webhook, issues (for private repos)
        </small>
      </div>

      <div className="setting-group">
        <label>Webhook Secret (Optional)</label>
        <input 
          type="password" 
          value={settings.githubWebhookSecret}
          onChange={(e) => updateSetting('githubWebhookSecret', e.target.value)}
          placeholder="Your webhook secret for signature validation"
          disabled={!settings.githubEnabled}
        />
        <small className="setting-description">
          Used to validate webhook signatures from GitHub
        </small>
      </div>

      <div className="setting-group">
        <label>
          <input 
            type="checkbox" 
            checked={settings.branchMonitoring}
            onChange={(e) => updateSetting('branchMonitoring', e.target.checked)}
            disabled={!settings.githubEnabled}
          />
          Enable Branch Monitoring
        </label>
        <small className="setting-description">
          Monitor specified branches for commits and pull requests
        </small>
      </div>

      {settings.branchMonitoring && (
        <div className="setting-group">
          <label>Monitored Branches</label>
          <div className="branch-management">
            <div className="branch-input-container">
              <input 
                type="text" 
                value={branchInput}
                onChange={(e) => setBranchInput(e.target.value)}
                placeholder="Enter branch name (e.g., main, develop)"
                onKeyPress={(e) => e.key === 'Enter' && addMonitoredBranch()}
                disabled={!settings.githubEnabled}
              />
              <button 
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={addMonitoredBranch}
                disabled={!branchInput.trim() || !settings.githubEnabled}
              >
                Add
              </button>
            </div>
            <div className="branch-list">
              {settings.monitoredBranches.map((branch, index) => (
                <div key={index} className="branch-tag">
                  <span>{branch}</span>
                  <button 
                    type="button"
                    className="btn-remove"
                    onClick={() => removeMonitoredBranch(branch)}
                    disabled={!settings.githubEnabled}
                  >
                    ×
                  </button>
                </div>
              ))}
              {settings.monitoredBranches.length === 0 && (
                <div className="no-branches">No branches configured</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="setting-group">
        <label>
          <input 
            type="checkbox" 
            checked={settings.prChecks}
            onChange={(e) => updateSetting('prChecks', e.target.checked)}
            disabled={!settings.githubEnabled}
          />
          Enable PR Checks
        </label>
        <small className="setting-description">
          Automatically run tests on pull requests and update status
        </small>
      </div>

      <div className="setting-group">
        <label>
          <input 
            type="checkbox" 
            checked={settings.issueTracking}
            onChange={(e) => updateSetting('issueTracking', e.target.checked)}
            disabled={!settings.githubEnabled}
          />
          Enable Issue Tracking
        </label>
        <small className="setting-description">
          Create GitHub issues for failed tests and track test results
        </small>
      </div>

      {settings.githubEnabled && (
        <div className="setting-group">
          <button 
            type="button"
            className="btn btn-secondary"
            onClick={handleTestConnection}
            disabled={isConnectionTesting || !settings.githubToken || !settings.githubRepository}
          >
            {isConnectionTesting ? (
              <>
                <div className="connection-test-loading">
                  <span className="spinner"></span>
                  Testing...
                </div>
              </>
            ) : (
              'Test GitHub Connection'
            )}
          </button>
        </div>
      )}
      </div>
    </LoadingOverlay>
  )
}

export default GitHubTab
