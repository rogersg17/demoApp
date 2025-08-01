// Test execution settings management
let settings = {};
let isLoading = false;

// Default configuration
const defaultSettings = {
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
  baseUrl: 'http://localhost:3000',
  apiEndpoint: 'http://localhost:3000/api',
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
};

// Initialize the settings page
document.addEventListener('DOMContentLoaded', async function() {
  // Check if user is logged in
  const loggedInUser = sessionStorage.getItem('loggedInUser');
  if (!loggedInUser) {
    window.location.href = '../login/index.html';
    return;
  }

  // Display welcome message
  document.getElementById('welcomeMessage').textContent = `Welcome, ${loggedInUser}!`;
  
  // Load current settings
  await loadSettings();
  
  // Setup event listeners
  setupEventListeners();
  
  // Update status display
  updateStatusDisplay();
});

// Load settings from server or localStorage
async function loadSettings() {
  try {
    showLoading(true);
    
    // Try to load from server first
    const response = await fetch('/api/settings');
    if (response.ok) {
      const serverSettings = await response.json();
      settings = { ...defaultSettings, ...serverSettings };
      updateConfigFileStatus('Loaded from server');
    } else {
      // Fallback to localStorage
      const localSettings = localStorage.getItem('testExecutionSettings');
      if (localSettings) {
        settings = { ...defaultSettings, ...JSON.parse(localSettings) };
        updateConfigFileStatus('Loaded from local storage');
      } else {
        settings = { ...defaultSettings };
        updateConfigFileStatus('Using defaults');
      }
    }
    
    // Populate form with loaded settings
    populateForm();
    
  } catch (error) {
    console.error('Error loading settings:', error);
    showNotification('Failed to load settings, using defaults', 'warning');
    settings = { ...defaultSettings };
    populateForm();
    updateConfigFileStatus('Error loading - using defaults');
  } finally {
    showLoading(false);
  }
}

// Populate form with current settings
function populateForm() {
  Object.keys(settings).forEach(key => {
    const element = document.getElementById(key);
    if (element) {
      if (element.type === 'checkbox') {
        element.checked = settings[key];
      } else {
        element.value = settings[key];
      }
    }
  });
  
  // Update JIRA settings visibility
  toggleJiraSettings();
  
  // Update last modified
  const lastModified = localStorage.getItem('settingsLastModified');
  document.getElementById('lastModified').textContent = lastModified 
    ? new Date(lastModified).toLocaleString()
    : 'Never';
}

// Setup event listeners
function setupEventListeners() {
  const form = document.getElementById('settingsForm');
  
  // Form submission
  form.addEventListener('submit', handleFormSubmit);
  
  // JIRA integration toggle
  document.getElementById('jiraEnabled').addEventListener('change', toggleJiraSettings);
  
  // Button actions
  document.getElementById('resetBtn').addEventListener('click', resetToDefaults);
  document.getElementById('testConnectionBtn').addEventListener('click', testConnections);
  
  // Real-time validation
  setupValidation();
  
  // Auto-save on change (debounced)
  let saveTimeout;
  form.addEventListener('change', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      collectFormData();
      saveToLocalStorage();
    }, 1000);
  });
}

// Handle form submission
async function handleFormSubmit(event) {
  event.preventDefault();
  
  if (isLoading) return;
  
  try {
    showLoading(true);
    
    // Collect form data
    collectFormData();
    
    // Validate settings
    const validation = validateSettings();
    if (!validation.isValid) {
      showNotification(`Validation failed: ${validation.errors.join(', ')}`, 'error');
      return;
    }
    
    // Save to server
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });
    
    if (response.ok) {
      showNotification('Settings saved successfully!', 'success');
      updateConfigFileStatus('Saved to server');
    } else {
      throw new Error('Failed to save to server');
    }
    
    // Also save to localStorage as backup
    saveToLocalStorage();
    
    // Update status
    updateStatusDisplay();
    
  } catch (error) {
    console.error('Error saving settings:', error);
    
    // Fallback to localStorage only
    saveToLocalStorage();
    showNotification('Settings saved locally (server unavailable)', 'warning');
    updateConfigFileStatus('Saved to local storage only');
  } finally {
    showLoading(false);
  }
}

// Collect form data into settings object
function collectFormData() {
  const formData = new FormData(document.getElementById('settingsForm'));
  
  // Handle regular inputs
  for (const [key, value] of formData.entries()) {
    const element = document.getElementById(key);
    if (element) {
      if (element.type === 'checkbox') {
        settings[key] = element.checked;
      } else if (element.type === 'number') {
        settings[key] = parseInt(value, 10);
      } else {
        settings[key] = value;
      }
    }
  }
  
  // Handle unchecked checkboxes
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    if (!formData.has(checkbox.name)) {
      settings[checkbox.name] = false;
    }
  });
}

// Save settings to localStorage
function saveToLocalStorage() {
  try {
    localStorage.setItem('testExecutionSettings', JSON.stringify(settings));
    localStorage.setItem('settingsLastModified', new Date().toISOString());
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    showNotification('Failed to save settings locally', 'error');
  }
}

// Validate settings
function validateSettings() {
  const errors = [];
  
  // Browser timeout validation
  if (settings.browserTimeout < 5000 || settings.browserTimeout > 120000) {
    errors.push('Browser timeout must be between 5 and 120 seconds');
  }
  
  // Test timeout validation
  if (settings.testTimeout < 5000 || settings.testTimeout > 300000) {
    errors.push('Test timeout must be between 5 and 300 seconds');
  }
  
  // Parallel workers validation
  if (settings.parallelWorkers < 1 || settings.parallelWorkers > 16) {
    errors.push('Parallel workers must be between 1 and 16');
  }
  
  // URL validation
  if (settings.baseUrl && !isValidUrl(settings.baseUrl)) {
    errors.push('Base URL must be a valid URL');
  }
  
  if (settings.apiEndpoint && !isValidUrl(settings.apiEndpoint)) {
    errors.push('API Endpoint must be a valid URL');
  }
  
  // JIRA validation if enabled
  if (settings.jiraEnabled) {
    if (!settings.jiraUrl || !isValidUrl(settings.jiraUrl)) {
      errors.push('JIRA URL is required and must be valid');
    }
    
    if (!settings.jiraProject || !/^[A-Z]+$/.test(settings.jiraProject)) {
      errors.push('JIRA Project Key is required and must contain only uppercase letters');
    }
    
    if (!settings.jiraUsername) {
      errors.push('JIRA Username is required');
    }
    
    if (!settings.jiraApiToken) {
      errors.push('JIRA API Token is required');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// URL validation helper
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Setup real-time validation
function setupValidation() {
  // URL validation
  const urlInputs = ['baseUrl', 'apiEndpoint', 'jiraUrl'];
  urlInputs.forEach(inputId => {
    const input = document.getElementById(inputId);
    if (input) {
      input.addEventListener('blur', () => validateUrlInput(input));
    }
  });
  
  // Number range validation
  const numberInputs = [
    { id: 'browserTimeout', min: 5000, max: 120000 },
    { id: 'testTimeout', min: 5000, max: 300000 },
    { id: 'parallelWorkers', min: 1, max: 16 },
    { id: 'maxRetries', min: 0, max: 5 }
  ];
  
  numberInputs.forEach(({ id, min, max }) => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('blur', () => validateNumberInput(input, min, max));
    }
  });
}

// Validate URL input
function validateUrlInput(input) {
  const value = input.value.trim();
  const settingItem = input.closest('.setting-item');
  
  if (value && !isValidUrl(value)) {
    setValidationState(settingItem, 'error', 'Please enter a valid URL');
  } else {
    setValidationState(settingItem, 'success');
  }
}

// Validate number input
function validateNumberInput(input, min, max) {
  const value = parseInt(input.value, 10);
  const settingItem = input.closest('.setting-item');
  
  if (isNaN(value) || value < min || value > max) {
    setValidationState(settingItem, 'error', `Value must be between ${min} and ${max}`);
  } else {
    setValidationState(settingItem, 'success');
  }
}

// Set validation state for setting item
function setValidationState(settingItem, state, message = '') {
  // Remove existing validation classes
  settingItem.classList.remove('success', 'error');
  
  // Remove existing validation message
  const existingMessage = settingItem.querySelector('.validation-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  if (state !== 'neutral') {
    settingItem.classList.add(state);
    
    if (message) {
      const messageElement = document.createElement('div');
      messageElement.className = `validation-message ${state}`;
      messageElement.textContent = message;
      settingItem.appendChild(messageElement);
    }
  }
}

// Toggle JIRA settings visibility
function toggleJiraSettings() {
  const jiraEnabled = document.getElementById('jiraEnabled').checked;
  const jiraSettings = document.querySelectorAll('.jira-setting');
  
  jiraSettings.forEach(setting => {
    if (jiraEnabled) {
      setting.style.display = 'grid';
      setting.classList.add('visible');
    } else {
      setting.style.display = 'none';
      setting.classList.remove('visible');
    }
  });
  
  // Update JIRA status
  updateJiraStatus();
}

// Reset to default settings
function resetToDefaults() {
  if (confirm('Are you sure you want to reset all settings to their default values? This action cannot be undone.')) {
    settings = { ...defaultSettings };
    populateForm();
    showNotification('Settings reset to defaults', 'info');
    updateConfigFileStatus('Reset to defaults');
  }
}

// Test connections
async function testConnections() {
  if (isLoading) return;
  
  const button = document.getElementById('testConnectionBtn');
  const originalText = button.innerHTML;
  
  try {
    showButtonLoading(button, true);
    
    const results = {
      api: false,
      jira: false
    };
    
    // Test API connection
    try {
      const apiResponse = await fetch(settings.apiEndpoint + '/health', {
        method: 'GET',
        timeout: 5000
      });
      results.api = apiResponse.ok;
    } catch (error) {
      console.warn('API connection test failed:', error);
    }
    
    // Test JIRA connection if enabled
    if (settings.jiraEnabled && settings.jiraUrl && settings.jiraUsername && settings.jiraApiToken) {
      try {
        const jiraResponse = await fetch('/api/jira/test-connection', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: settings.jiraUrl,
            username: settings.jiraUsername,
            token: settings.jiraApiToken
          }),
          timeout: 10000
        });
        results.jira = jiraResponse.ok;
      } catch (error) {
        console.warn('JIRA connection test failed:', error);
      }
    }
    
    // Show results
    let message = 'Connection Test Results:\n';
    message += `API: ${results.api ? '✅ Connected' : '❌ Failed'}\n`;
    if (settings.jiraEnabled) {
      message += `JIRA: ${results.jira ? '✅ Connected' : '❌ Failed'}`;
    }
    
    const type = (results.api && (!settings.jiraEnabled || results.jira)) ? 'success' : 'warning';
    showNotification(message, type);
    
    // Update status display
    updateStatusDisplay();
    
  } catch (error) {
    console.error('Error testing connections:', error);
    showNotification('Connection test failed', 'error');
  } finally {
    showButtonLoading(button, false);
    button.innerHTML = originalText;
  }
}

// Update status display
function updateStatusDisplay() {
  // Current environment
  document.getElementById('currentEnvironment').textContent = 
    settings.testEnvironment?.charAt(0).toUpperCase() + settings.testEnvironment?.slice(1) || 'Unknown';
  
  // JIRA status
  updateJiraStatus();
}

// Update JIRA status
function updateJiraStatus() {
  const jiraStatusElement = document.getElementById('jiraStatus');
  
  if (settings.jiraEnabled) {
    if (settings.jiraUrl && settings.jiraProject && settings.jiraUsername && settings.jiraApiToken) {
      jiraStatusElement.innerHTML = '<span class="connection-status connected">Configured</span>';
    } else {
      jiraStatusElement.innerHTML = '<span class="connection-status disconnected">Incomplete</span>';
    }
  } else {
    jiraStatusElement.innerHTML = '<span class="connection-status disconnected">Disabled</span>';
  }
}

// Update config file status
function updateConfigFileStatus(status) {
  document.getElementById('configFileStatus').textContent = status;
}

// Show/hide loading state
function showLoading(loading) {
  isLoading = loading;
  const form = document.getElementById('settingsForm');
  const buttons = form.querySelectorAll('button');
  
  buttons.forEach(button => {
    button.disabled = loading;
    if (loading) {
      button.classList.add('loading');
    } else {
      button.classList.remove('loading');
    }
  });
}

// Show button loading state
function showButtonLoading(button, loading) {
  if (loading) {
    button.classList.add('loading');
    button.disabled = true;
    const icon = button.querySelector('i');
    if (icon) {
      icon.className = 'fas fa-spinner';
    }
  } else {
    button.classList.remove('loading');
    button.disabled = false;
  }
}

// Show notification
function showNotification(message, type = 'info') {
  // Create notification container if it doesn't exist
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }
  
  // Create notification
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    background: ${getNotificationColor(type)};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    pointer-events: auto;
    transform: translateX(100%);
    opacity: 0;
    transition: all 0.3s ease-out;
    max-width: 400px;
    word-wrap: break-word;
    white-space: pre-line;
  `;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
      <span style="flex: 1;">${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" 
              style="background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem; padding: 0;">×</button>
    </div>
  `;
  
  container.appendChild(notification);
  
  // Animate in
  requestAnimationFrame(() => {
    notification.style.transform = 'translateX(0)';
    notification.style.opacity = '1';
  });
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.transform = 'translateX(100%)';
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 300);
    }
  }, 5000);
}

// Get notification color based on type
function getNotificationColor(type) {
  switch (type) {
    case 'success': return '#32D74B';
    case 'warning': return '#FF9F0A';
    case 'error': return '#FF3B30';
    case 'info': default: return '#007AFF';
  }
}

// Export settings for use by other modules
window.testExecutionSettings = {
  getSettings: () => ({ ...settings }),
  updateSetting: (key, value) => {
    settings[key] = value;
    saveToLocalStorage();
  },
  resetToDefaults,
  validateSettings
};
