import React from 'react'

interface SecurityTabProps {
  settings: {
    // Authentication Settings
    authenticationMethod: string
    requireMfa: boolean
    sessionTimeout: number
    maxLoginAttempts: number
    
    // Password Policies
    passwordMinLength: number
    passwordRequireUppercase: boolean
    passwordRequireLowercase: boolean
    passwordRequireNumbers: boolean
    passwordRequireSpecialChars: boolean
    passwordExpirationDays: number
    
    // Rate Limiting
    rateLimitEnabled: boolean
    rateLimitPerMinute: number
    rateLimitPerHour: number
    
    // Access Control
    rbacEnabled: boolean
    defaultUserRole: string
    adminApprovalRequired: boolean
    
    // Security Headers
    enableCsrf: boolean
    enableCors: boolean
    corsOrigins: string[]
    securityHeaders: boolean
  }
  updateSetting: (key: string, value: string | number | boolean | string[]) => void
}

const SecurityTab: React.FC<SecurityTabProps> = ({ settings, updateSetting }) => {
  const addCorsOrigin = () => {
    const input = document.getElementById('corsOriginInput') as HTMLInputElement
    const origin = input?.value.trim()
    if (origin && !settings.corsOrigins.includes(origin)) {
      updateSetting('corsOrigins', [...settings.corsOrigins, origin])
      input.value = ''
    }
  }

  const removeCorsOrigin = (origin: string) => {
    updateSetting('corsOrigins', settings.corsOrigins.filter(o => o !== origin))
  }

  return (
    <div className="settings-panel">
      <h3>Security Configuration</h3>
      
      {/* Authentication Settings */}
      <div className="settings-section">
        <h4>User Authentication</h4>
        
        <div className="setting-group">
          <label>Authentication Method</label>
          <select 
            value={settings.authenticationMethod} 
            onChange={(e) => updateSetting('authenticationMethod', e.target.value)}
          >
            <option value="local">Local Database</option>
            <option value="ldap">LDAP/Active Directory</option>
            <option value="oauth">OAuth 2.0</option>
            <option value="saml">SAML 2.0</option>
          </select>
        </div>

        <div className="setting-group">
          <label>
            <input 
              type="checkbox" 
              checked={settings.requireMfa}
              onChange={(e) => updateSetting('requireMfa', e.target.checked)}
            />
            Require Multi-Factor Authentication (MFA)
          </label>
          <small className="setting-description">
            Enforce MFA for all user accounts to enhance security
          </small>
        </div>

        <div className="setting-group">
          <label>Session Timeout (minutes)</label>
          <input 
            type="number" 
            value={settings.sessionTimeout}
            onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
            min="5"
            max="1440"
            step="5"
          />
          <small className="setting-description">
            Automatically log out users after inactive period
          </small>
        </div>

        <div className="setting-group">
          <label>Maximum Login Attempts</label>
          <input 
            type="number" 
            value={settings.maxLoginAttempts}
            onChange={(e) => updateSetting('maxLoginAttempts', parseInt(e.target.value))}
            min="3"
            max="10"
          />
          <small className="setting-description">
            Lock account after specified number of failed login attempts
          </small>
        </div>
      </div>

      {/* Password Policies */}
      <div className="settings-section">
        <h4>Password Policies</h4>
        
        <div className="setting-group">
          <label>Minimum Password Length</label>
          <input 
            type="number" 
            value={settings.passwordMinLength}
            onChange={(e) => updateSetting('passwordMinLength', parseInt(e.target.value))}
            min="8"
            max="32"
          />
        </div>

        <div className="setting-group">
          <label>Password Requirements</label>
          <div className="password-requirements">
            <label>
              <input 
                type="checkbox" 
                checked={settings.passwordRequireUppercase}
                onChange={(e) => updateSetting('passwordRequireUppercase', e.target.checked)}
              />
              Require uppercase letters (A-Z)
            </label>
            <label>
              <input 
                type="checkbox" 
                checked={settings.passwordRequireLowercase}
                onChange={(e) => updateSetting('passwordRequireLowercase', e.target.checked)}
              />
              Require lowercase letters (a-z)
            </label>
            <label>
              <input 
                type="checkbox" 
                checked={settings.passwordRequireNumbers}
                onChange={(e) => updateSetting('passwordRequireNumbers', e.target.checked)}
              />
              Require numbers (0-9)
            </label>
            <label>
              <input 
                type="checkbox" 
                checked={settings.passwordRequireSpecialChars}
                onChange={(e) => updateSetting('passwordRequireSpecialChars', e.target.checked)}
              />
              Require special characters (!@#$%^&*)
            </label>
          </div>
        </div>

        <div className="setting-group">
          <label>Password Expiration (days)</label>
          <input 
            type="number" 
            value={settings.passwordExpirationDays}
            onChange={(e) => updateSetting('passwordExpirationDays', parseInt(e.target.value))}
            min="0"
            max="365"
          />
          <small className="setting-description">
            Set to 0 to disable password expiration
          </small>
        </div>
      </div>

      {/* Rate Limiting */}
      <div className="settings-section">
        <h4>Rate Limiting</h4>
        
        <div className="setting-group">
          <label>
            <input 
              type="checkbox" 
              checked={settings.rateLimitEnabled}
              onChange={(e) => updateSetting('rateLimitEnabled', e.target.checked)}
            />
            Enable Rate Limiting
          </label>
          <small className="setting-description">
            Protect against abuse by limiting request frequency
          </small>
        </div>

        <div className="setting-group">
          <label>Requests per Minute</label>
          <input 
            type="number" 
            value={settings.rateLimitPerMinute}
            onChange={(e) => updateSetting('rateLimitPerMinute', parseInt(e.target.value))}
            min="10"
            max="1000"
            disabled={!settings.rateLimitEnabled}
          />
        </div>

        <div className="setting-group">
          <label>Requests per Hour</label>
          <input 
            type="number" 
            value={settings.rateLimitPerHour}
            onChange={(e) => updateSetting('rateLimitPerHour', parseInt(e.target.value))}
            min="100"
            max="10000"
            disabled={!settings.rateLimitEnabled}
          />
        </div>
      </div>

      {/* Access Control */}
      <div className="settings-section">
        <h4>Role-Based Access Control (RBAC)</h4>
        
        <div className="setting-group">
          <label>
            <input 
              type="checkbox" 
              checked={settings.rbacEnabled}
              onChange={(e) => updateSetting('rbacEnabled', e.target.checked)}
            />
            Enable Role-Based Access Control
          </label>
          <small className="setting-description">
            Control access to features based on user roles
          </small>
        </div>

        <div className="setting-group">
          <label>Default User Role</label>
          <select 
            value={settings.defaultUserRole} 
            onChange={(e) => updateSetting('defaultUserRole', e.target.value)}
            disabled={!settings.rbacEnabled}
          >
            <option value="viewer">Viewer</option>
            <option value="user">User</option>
            <option value="tester">Tester</option>
            <option value="admin">Administrator</option>
          </select>
          <small className="setting-description">
            Role assigned to new users by default
          </small>
        </div>

        <div className="setting-group">
          <label>
            <input 
              type="checkbox" 
              checked={settings.adminApprovalRequired}
              onChange={(e) => updateSetting('adminApprovalRequired', e.target.checked)}
              disabled={!settings.rbacEnabled}
            />
            Require Admin Approval for New Users
          </label>
          <small className="setting-description">
            New user accounts must be approved by administrators
          </small>
        </div>
      </div>

      {/* Security Headers & CORS */}
      <div className="settings-section">
        <h4>Security Headers & CORS</h4>
        
        <div className="setting-group">
          <label>
            <input 
              type="checkbox" 
              checked={settings.enableCsrf}
              onChange={(e) => updateSetting('enableCsrf', e.target.checked)}
            />
            Enable CSRF Protection
          </label>
          <small className="setting-description">
            Protect against Cross-Site Request Forgery attacks
          </small>
        </div>

        <div className="setting-group">
          <label>
            <input 
              type="checkbox" 
              checked={settings.enableCors}
              onChange={(e) => updateSetting('enableCors', e.target.checked)}
            />
            Enable CORS (Cross-Origin Resource Sharing)
          </label>
        </div>

        {settings.enableCors && (
          <div className="setting-group">
            <label>Allowed CORS Origins</label>
            <div className="cors-management">
              <div className="cors-input-container">
                <input 
                  id="corsOriginInput"
                  type="url" 
                  placeholder="https://example.com"
                  onKeyPress={(e) => e.key === 'Enter' && addCorsOrigin()}
                />
                <button 
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={addCorsOrigin}
                >
                  Add
                </button>
              </div>
              <div className="cors-list">
                {settings.corsOrigins.map((origin, index) => (
                  <div key={index} className="cors-tag">
                    <span>{origin}</span>
                    <button 
                      type="button"
                      className="btn-remove"
                      onClick={() => removeCorsOrigin(origin)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {settings.corsOrigins.length === 0 && (
                  <div className="no-origins">No CORS origins configured</div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="setting-group">
          <label>
            <input 
              type="checkbox" 
              checked={settings.securityHeaders}
              onChange={(e) => updateSetting('securityHeaders', e.target.checked)}
            />
            Enable Security Headers
          </label>
          <small className="setting-description">
            Add security headers like X-Frame-Options, X-Content-Type-Options, etc.
          </small>
        </div>
      </div>
    </div>
  )
}

export default SecurityTab
