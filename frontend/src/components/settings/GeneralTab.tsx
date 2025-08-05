import React from 'react'

interface GeneralTabProps {
  settings: {
    applicationName: string
    defaultLanguage: string
    timezone: string
    notificationPreferences: {
      email: boolean
      push: boolean
      sms: boolean
    }
  }
  updateSetting: (key: string, value: string | boolean | { email: boolean; push: boolean; sms: boolean }) => void
}

const GeneralTab: React.FC<GeneralTabProps> = ({ settings, updateSetting }) => {
  return (
    <div className="settings-panel">
      <h3>General Settings</h3>
      
      <div className="setting-group">
        <label>Application Name</label>
        <input 
          type="text" 
          value={settings.applicationName}
          onChange={(e) => updateSetting('applicationName', e.target.value)}
          placeholder="Demo App"
        />
      </div>

      <div className="setting-group">
        <label>Default Language</label>
        <select 
          value={settings.defaultLanguage} 
          onChange={(e) => updateSetting('defaultLanguage', e.target.value)}
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="ja">Japanese</option>
          <option value="zh">Chinese</option>
        </select>
      </div>

      <div className="setting-group">
        <label>Timezone</label>
        <select 
          value={settings.timezone} 
          onChange={(e) => updateSetting('timezone', e.target.value)}
        >
          <option value="UTC">UTC</option>
          <option value="America/New_York">Eastern Time (US & Canada)</option>
          <option value="America/Chicago">Central Time (US & Canada)</option>
          <option value="America/Denver">Mountain Time (US & Canada)</option>
          <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
          <option value="Europe/London">London</option>
          <option value="Europe/Paris">Paris</option>
          <option value="Asia/Tokyo">Tokyo</option>
          <option value="Asia/Shanghai">Shanghai</option>
        </select>
      </div>

      <div className="setting-group">
        <label>Notification Preferences</label>
        <div className="notification-options">
          <label>
            <input 
              type="checkbox" 
              checked={settings.notificationPreferences.email}
              onChange={(e) => updateSetting('notificationPreferences', {
                ...settings.notificationPreferences,
                email: e.target.checked
              })}
            />
            Email Notifications
          </label>
          <label>
            <input 
              type="checkbox" 
              checked={settings.notificationPreferences.push}
              onChange={(e) => updateSetting('notificationPreferences', {
                ...settings.notificationPreferences,
                push: e.target.checked
              })}
            />
            Push Notifications
          </label>
          <label>
            <input 
              type="checkbox" 
              checked={settings.notificationPreferences.sms}
              onChange={(e) => updateSetting('notificationPreferences', {
                ...settings.notificationPreferences,
                sms: e.target.checked
              })}
            />
            SMS Notifications
          </label>
        </div>
      </div>
    </div>
  )
}

export default GeneralTab
