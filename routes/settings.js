const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

/**
 * Settings API Routes
 * Handles application settings management and connection testing
 */

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ 
            success: false, 
            error: 'Authentication required' 
        });
    }
    next();
};

// Path to settings file
const getSettingsPath = () => path.join(__dirname, '..', 'config', 'test-settings.json');

/**
 * GET /api/settings
 * Get current application settings
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const settingsPath = getSettingsPath();
        
        // Check if settings file exists
        const exists = await fs.access(settingsPath).then(() => true).catch(() => false);
        
        if (exists) {
            const settingsData = await fs.readFile(settingsPath, 'utf8');
            const settings = JSON.parse(settingsData);
            res.json(settings);
        } else {
            // Return default settings if no file exists
            res.json({
                defaultBrowser: "chromium",
                headlessMode: true,
                jiraEnabled: false,
                adoEnabled: false,
                githubEnabled: false,
                jenkinsEnabled: false
            });
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load settings' 
        });
    }
});

/**
 * POST /api/settings
 * Update application settings
 */
router.post('/', requireAuth, async (req, res) => {
    try {
        const settings = req.body;
        
        // Add metadata
        settings.lastModified = new Date().toISOString();
        settings.modifiedBy = req.session.user.username || 'unknown';
        
        const settingsPath = getSettingsPath();
        
        // Ensure config directory exists
        const configDir = path.dirname(settingsPath);
        await fs.mkdir(configDir, { recursive: true });
        
        // Write settings to file
        await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
        
        res.json({ 
            success: true, 
            message: 'Settings updated successfully' 
        });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to save settings' 
        });
    }
});

/**
 * POST /api/settings/test-connection/github
 * Test GitHub connection
 */
router.post('/test-connection/github', requireAuth, async (req, res) => {
    try {
        const { token, organization, repository } = req.body;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'GitHub token is required'
            });
        }
        
        // Test GitHub API connection
        const { Octokit } = require('@octokit/rest');
        const octokit = new Octokit({ auth: token });
        
        try {
            // Test authentication by getting user info
            const { data: user } = await octokit.rest.users.getAuthenticated();
            
            let repositoryAccess = false;
            let repositoryInfo = null;
            
            // If organization and repository are provided, test repository access
            if (organization && repository) {
                try {
                    const { data: repo } = await octokit.rest.repos.get({
                        owner: organization,
                        repo: repository
                    });
                    repositoryAccess = true;
                    repositoryInfo = {
                        name: repo.name,
                        fullName: repo.full_name,
                        private: repo.private,
                        permissions: {
                            admin: repo.permissions?.admin || false,
                            push: repo.permissions?.push || false,
                            pull: repo.permissions?.pull || false
                        }
                    };
                } catch (repoError) {
                    console.warn('Repository access test failed:', repoError.message);
                }
            }
            
            res.json({
                success: true,
                user: {
                    login: user.login,
                    id: user.id,
                    name: user.name,
                    email: user.email
                },
                repositoryAccess,
                repositoryInfo,
                message: 'GitHub connection successful'
            });
            
        } catch (apiError) {
            console.error('GitHub API error:', apiError);
            res.status(400).json({
                success: false,
                error: 'GitHub API authentication failed',
                details: apiError.message
            });
        }
        
    } catch (error) {
        console.error('GitHub connection test error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test GitHub connection',
            details: error.message
        });
    }
});

/**
 * POST /api/settings/test-connection/jenkins
 * Test Jenkins connection
 */
router.post('/test-connection/jenkins', requireAuth, async (req, res) => {
    try {
        const { url, username, apiToken } = req.body;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'Jenkins URL is required'
            });
        }
        
        // Test Jenkins connection using HTTP requests
        const fetch = require('node-fetch');
        
        try {
            // Clean URL and create API endpoint
            const cleanUrl = url.replace(/\/$/, '');
            const apiUrl = `${cleanUrl}/api/json`;
            
            // Create authentication header
            const auth = username && apiToken 
                ? Buffer.from(`${username}:${apiToken}`).toString('base64')
                : null;
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (auth) {
                headers['Authorization'] = `Basic ${auth}`;
            }
            
            // Test connection by getting Jenkins info
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: headers,
                timeout: 10000
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const info = await response.json();
            
            // Test job listing capability
            let jobAccess = false;
            let jobCount = 0;
            
            if (info.jobs) {
                jobAccess = true;
                jobCount = info.jobs.length;
            }
            
            res.json({
                success: true,
                jenkinsInfo: {
                    version: info.version || 'Unknown',
                    nodeDescription: info.nodeDescription || 'Jenkins Server',
                    nodeName: info.nodeName || 'master',
                    mode: info.mode || 'NORMAL',
                    url: cleanUrl
                },
                jobAccess,
                jobCount,
                message: 'Jenkins connection successful'
            });
            
        } catch (jenkinsError) {
            console.error('Jenkins API error:', jenkinsError);
            res.status(400).json({
                success: false,
                error: 'Jenkins connection failed',
                details: jenkinsError.message
            });
        }
        
    } catch (error) {
        console.error('Jenkins connection test error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test Jenkins connection',
            details: error.message
        });
    }
});

/**
 * POST /api/settings/test-connection/jira
 * Test JIRA connection (uses existing enhanced JIRA integration)
 */
router.post('/test-connection/jira', requireAuth, async (req, res) => {
    try {
        const { url, username, apiToken, projectKey } = req.body;
        
        if (!url || !username || !apiToken) {
            return res.status(400).json({
                success: false,
                error: 'JIRA URL, username, and API token are required'
            });
        }
        
        // Use the existing JIRA integration from test-result-processing
        const JiraApi = require('jira-client');
        
        const jira = new JiraApi({
            protocol: url.startsWith('https') ? 'https' : 'http',
            host: url.replace(/^https?:\/\//, '').replace(/\/$/, ''),
            username: username,
            password: apiToken,
            apiVersion: '2',
            strictSSL: true
        });
        
        try {
            // Test authentication by getting user info
            const myself = await jira.getCurrentUser();
            
            let projectAccess = false;
            let projectInfo = null;
            
            // If project key is provided, test project access
            if (projectKey) {
                try {
                    const project = await jira.getProject(projectKey);
                    projectAccess = true;
                    projectInfo = {
                        key: project.key,
                        name: project.name,
                        projectTypeKey: project.projectTypeKey,
                        issueTypes: project.issueTypes?.map(type => ({
                            id: type.id,
                            name: type.name
                        })) || []
                    };
                } catch (projectError) {
                    console.warn('Project access test failed:', projectError.message);
                }
            }
            
            res.json({
                success: true,
                user: {
                    accountId: myself.accountId,
                    displayName: myself.displayName,
                    emailAddress: myself.emailAddress
                },
                projectAccess,
                projectInfo,
                message: 'JIRA connection successful'
            });
            
        } catch (jiraError) {
            console.error('JIRA API error:', jiraError);
            res.status(400).json({
                success: false,
                error: 'JIRA authentication failed',
                details: jiraError.message
            });
        }
        
    } catch (error) {
        console.error('JIRA connection test error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test JIRA connection',
            details: error.message
        });
    }
});

/**
 * POST /api/settings/test-connection/ado
 * Test Azure DevOps connection (delegates to existing route)
 */
router.post('/test-connection/ado', requireAuth, async (req, res) => {
    try {
        // Delegate to existing ADO test connection endpoint
        const AdoClient = require('../lib/ado-client');
        const { organization, project, pat } = req.body;
        
        if (!organization || !project || !pat) {
            return res.status(400).json({
                success: false,
                error: 'Organization, project, and PAT are required'
            });
        }
        
        const testClient = new AdoClient({
            orgUrl: organization,
            projectId: project,
            pat: pat
        });
        
        const result = await testClient.testConnection();
        
        res.json(result);
        
    } catch (error) {
        console.error('ADO connection test error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test Azure DevOps connection',
            details: error.message
        });
    }
});

module.exports = router;
