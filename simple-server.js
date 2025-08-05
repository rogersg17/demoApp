const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Simple auth middleware that always passes for testing
const requireAuth = (req, res, next) => {
    req.session = { user: { id: 1 } }; // Mock session
    next();
};

const SETTINGS_FILE = path.join(__dirname, 'config', 'test-settings.json');

// GET /api/settings - Get current settings
app.get('/api/settings', requireAuth, async (req, res) => {
    try {
        console.log('📖 Getting settings from:', SETTINGS_FILE);
        
        let settings = {};
        try {
            const data = await fs.readFile(SETTINGS_FILE, 'utf8');
            settings = JSON.parse(data);
            console.log('✅ Settings loaded successfully');
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('⚠️ Settings file not found, using defaults');
                settings = getDefaultSettings();
            } else {
                throw error;
            }
        }

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('❌ Error loading settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load settings'
        });
    }
});

// POST /api/settings - Save settings
app.post('/api/settings', requireAuth, async (req, res) => {
    try {
        console.log('💾 Saving settings:', req.body);
        
        // Ensure config directory exists
        const configDir = path.dirname(SETTINGS_FILE);
        await fs.mkdir(configDir, { recursive: true });
        
        // Save settings
        await fs.writeFile(SETTINGS_FILE, JSON.stringify(req.body, null, 2));
        
        console.log('✅ Settings saved successfully to:', SETTINGS_FILE);
        
        res.json({
            success: true,
            message: 'Settings saved successfully'
        });
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save settings'
        });
    }
});

function getDefaultSettings() {
    return {
        // GitHub Integration
        githubEnabled: false,
        githubToken: '',
        githubRepository: '',
        githubWebhookSecret: '',
        branchMonitoring: false,
        
        // Jenkins Integration
        jenkinsEnabled: false,
        jenkinsUrl: '',
        jenkinsUsername: '',
        jenkinsPassword: '',
        jenkinsBuildTrigger: false,
        jenkinsJobName: '',
        
        // JIRA Integration
        jiraEnabled: false,
        jiraUrl: '',
        jiraUsername: '',
        jiraPassword: '',
        jiraProjectKey: '',
        jiraTicketCreation: false,
        
        // Azure DevOps Integration
        adoEnabled: false,
        adoUrl: '',
        adoPersonalAccessToken: '',
        adoProject: '',
        adoOrganization: '',
        adoPipelineIntegration: false,
        
        // Notification Settings
        notificationsEnabled: true,
        emailNotifications: false,
        slackNotifications: false,
        emailAddress: '',
        slackWebhookUrl: '',
        notificationLevel: 'all'
    };
}

app.listen(PORT, () => {
    console.log(`🚀 Simple settings server running on http://localhost:${PORT}`);
    console.log(`📁 Settings file location: ${SETTINGS_FILE}`);
});
