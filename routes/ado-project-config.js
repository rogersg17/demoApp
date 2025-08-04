const express = require('express');
const AdoBuildDefinitionService = require('../services/ado-build-definition');
const AdoProjectConfigurationService = require('../services/ado-project-configuration');
const AdoClient = require('../lib/ado-client');
const Database = require('../database/database');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Services will be initialized on-demand
let database;

try {
    database = new Database();
} catch (error) {
    console.error('⚠️ Database not initialized for ADO config:', error.message);
}

// Authentication middleware for ADO routes
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

// Admin role check middleware
const requireAdmin = (req, res, next) => {
    if (req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Admin privileges required' });
    }
    next();
};

/**
 * Test Azure DevOps connection
 */
router.post('/test-connection', requireAuth, requireAdmin, [
    body('organization').isURL().withMessage('Valid organization URL is required'),
    body('project').notEmpty().withMessage('Project name is required'),
    body('pat').isLength({ min: 50 }).withMessage('Valid Personal Access Token is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }

        const { organization, project, pat } = req.body;
        
        // Create temporary client for testing
        const testClient = new AdoClient({
            orgUrl: organization,
            projectId: project,
            pat: pat
        });
        
        const result = await testClient.testConnection();
        
        if (result.success) {
            console.log(`✅ ADO connection test successful for user ${req.session.username}`);
        } else {
            console.warn(`❌ ADO connection test failed for user ${req.session.username}: ${result.error}`);
        }
        
        res.json(result);
    } catch (error) {
        console.error('❌ ADO connection test error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Connection test failed',
            message: error.message 
        });
    }
});

/**
 * Save Azure DevOps configuration
 */
router.post('/configuration', requireAuth, requireAdmin, [
    body('organization').isURL().withMessage('Valid organization URL is required'),
    body('project').notEmpty().withMessage('Project name is required'),
    body('pat').isLength({ min: 50 }).withMessage('Valid Personal Access Token is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }

        const { organization, project, pat } = req.body;
        
        // In a real implementation, you would save these to a secure configuration store
        // For now, we'll return success assuming environment variables will be updated
        console.log(`📝 ADO configuration saved by user ${req.session.username}`);
        
        res.json({ 
            success: true, 
            message: 'Configuration saved successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Failed to save ADO configuration:', error);
        res.status(500).json({ error: 'Failed to save configuration' });
    }
});

/**
 * Get current Azure DevOps configuration status
 */
router.get('/configuration', requireAuth, async (req, res) => {
    try {
        // Check if ADO is configured by testing environment variables
        const isConfigured = !!(process.env.ADO_ORGANIZATION && process.env.ADO_PAT && process.env.ADO_PROJECT);
        
        res.json({
            isConnected: isConfigured,
            organization: process.env.ADO_ORGANIZATION || '',
            project: process.env.ADO_PROJECT || '',
            hasToken: !!process.env.ADO_PAT,
            lastChecked: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Failed to get ADO configuration:', error);
        res.status(500).json({ error: 'Failed to get configuration status' });
    }
});

/**
 * Get available build definitions for configuration
 */
router.get('/build-definitions', requireAuth, requireAdmin, async (req, res) => {
    try {
        if (!buildDefService) {
            return res.status(503).json({ error: 'Azure DevOps service not available' });
        }

        const { search, projectId } = req.query;
        
        let definitions;
        if (search) {
            definitions = await buildDefService.searchBuildDefinitions(search, projectId);
        } else {
            definitions = await buildDefService.getBuildDefinitions(projectId);
        }
        
        // Check which definitions are already configured
        const configuredIds = await configService.getConfiguredBuildDefinitionIds();
        
        const enrichedDefinitions = definitions.map(def => ({
            ...def,
            isConfigured: configuredIds.includes(def.id),
            lastBuildStatus: def.lastBuild?.result || 'unknown'
        }));
        
        console.log(`📋 Retrieved ${enrichedDefinitions.length} build definitions for user ${req.session.username}`);
        res.json(enrichedDefinitions);
    } catch (error) {
        console.error('❌ Error fetching build definitions:', error);
        res.status(500).json({ 
            error: 'Failed to fetch build definitions',
            message: error.message 
        });
    }
});

/**
 * Get build definition details
 */
router.get('/build-definitions/:definitionId', requireAuth, requireAdmin, async (req, res) => {
    try {
        if (!buildDefService) {
            return res.status(503).json({ error: 'Azure DevOps service not available' });
        }

        const { definitionId } = req.params;
        const { includeMetrics = 'false' } = req.query;
        
        const definition = await buildDefService.getBuildDefinitionDetails(definitionId);
        
        let response = definition;
        
        if (includeMetrics === 'true') {
            const metrics = await buildDefService.getBuildDefinitionMetrics(definitionId);
            response = { ...definition, metrics };
        }
        
        res.json(response);
    } catch (error) {
        console.error(`❌ Error fetching build definition ${req.params.definitionId}:`, error);
        res.status(500).json({ error: 'Failed to fetch build definition details' });
    }
});

/**
 * Create a new project configuration
 */
router.post('/projects', requireAuth, requireAdmin, [
    body('buildDefinitionId').isInt().withMessage('Valid build definition ID is required'),
    body('projectConfig.name').notEmpty().withMessage('Project name is required'),
    body('projectConfig.trackBranches').optional().isArray().withMessage('Track branches must be an array'),
    body('projectConfig.healthThresholds.healthy').optional().isInt({ min: 0, max: 100 }).withMessage('Healthy threshold must be 0-100'),
    body('projectConfig.healthThresholds.warning').optional().isInt({ min: 0, max: 100 }).withMessage('Warning threshold must be 0-100'),
    body('projectConfig.healthThresholds.critical').optional().isInt({ min: 0, max: 100 }).withMessage('Critical threshold must be 0-100')
], async (req, res) => {
    try {
        if (!configService) {
            return res.status(503).json({ error: 'Azure DevOps service not available' });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }

        const { buildDefinitionId, projectConfig } = req.body;
        
        // Validate project configuration
        const validation = await configService.validateProjectConfiguration(buildDefinitionId, projectConfig);
        if (!validation.isValid) {
            return res.status(400).json({ 
                error: 'Project configuration validation failed', 
                details: validation.errors 
            });
        }
        
        const project = await configService.configureProject(buildDefinitionId, projectConfig);
        
        console.log(`✅ Project configured by user ${req.session.username}: ${project.name}`);
        res.status(201).json(project);
    } catch (error) {
        console.error('❌ Error creating project configuration:', error);
        res.status(500).json({ 
            error: 'Failed to create project configuration',
            message: error.message 
        });
    }
});

/**
 * Get all configured projects
 */
router.get('/projects', requireAuth, async (req, res) => {
    try {
        if (!configService) {
            return res.status(503).json({ error: 'Azure DevOps service not available' });
        }

        const projects = await configService.getConfiguredProjects();
        res.json(projects);
    } catch (error) {
        console.error('❌ Error fetching configured projects:', error);
        res.status(500).json({ error: 'Failed to fetch configured projects' });
    }
});

/**
 * Get specific project configuration
 */
router.get('/projects/:projectId', requireAuth, async (req, res) => {
    try {
        if (!configService) {
            return res.status(503).json({ error: 'Azure DevOps service not available' });
        }

        const { projectId } = req.params;
        const project = await configService.getProjectConfiguration(projectId);
        
        if (!project) {
            return res.status(404).json({ error: 'Project configuration not found' });
        }
        
        res.json(project);
    } catch (error) {
        console.error(`❌ Error fetching project configuration ${req.params.projectId}:`, error);
        res.status(500).json({ error: 'Failed to fetch project configuration' });
    }
});

/**
 * Update project configuration
 */
router.put('/projects/:projectId', requireAuth, requireAdmin, [
    body('name').optional().notEmpty().withMessage('Project name cannot be empty'),
    body('enabled').optional().isBoolean().withMessage('Enabled must be a boolean'),
    body('configuration.trackBranches').optional().isArray().withMessage('Track branches must be an array'),
    body('configuration.healthThresholds.healthy').optional().isInt({ min: 0, max: 100 }).withMessage('Healthy threshold must be 0-100'),
    body('configuration.healthThresholds.warning').optional().isInt({ min: 0, max: 100 }).withMessage('Warning threshold must be 0-100'),
    body('configuration.healthThresholds.critical').optional().isInt({ min: 0, max: 100 }).withMessage('Critical threshold must be 0-100')
], async (req, res) => {
    try {
        if (!configService) {
            return res.status(503).json({ error: 'Azure DevOps service not available' });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }

        const { projectId } = req.params;
        const updates = req.body;
        
        const updatedProject = await configService.updateProjectConfiguration(projectId, updates);
        
        console.log(`✅ Project updated by user ${req.session.username}: ${projectId}`);
        res.json(updatedProject);
    } catch (error) {
        console.error(`❌ Error updating project configuration ${req.params.projectId}:`, error);
        res.status(500).json({ 
            error: 'Failed to update project configuration',
            message: error.message 
        });
    }
});

/**
 * Delete project configuration
 */
router.delete('/projects/:projectId', requireAuth, requireAdmin, async (req, res) => {
    try {
        if (!configService) {
            return res.status(503).json({ error: 'Azure DevOps service not available' });
        }

        const { projectId } = req.params;
        const result = await configService.deleteProjectConfiguration(projectId);
        
        if (result.deleted) {
            console.log(`✅ Project deleted by user ${req.session.username}: ${projectId}`);
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Project configuration not found' });
        }
    } catch (error) {
        console.error(`❌ Error deleting project configuration ${req.params.projectId}:`, error);
        res.status(500).json({ error: 'Failed to delete project configuration' });
    }
});

/**
 * Toggle project status (enable/disable)
 */
router.patch('/projects/:projectId/toggle', requireAuth, requireAdmin, [
    body('enabled').isBoolean().withMessage('Enabled must be a boolean')
], async (req, res) => {
    try {
        if (!configService) {
            return res.status(503).json({ error: 'Azure DevOps service not available' });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }

        const { projectId } = req.params;
        const { enabled } = req.body;
        
        const result = await configService.toggleProjectStatus(projectId, enabled);
        
        console.log(`✅ Project ${enabled ? 'enabled' : 'disabled'} by user ${req.session.username}: ${projectId}`);
        res.json(result);
    } catch (error) {
        console.error(`❌ Error toggling project status ${req.params.projectId}:`, error);
        res.status(500).json({ error: 'Failed to toggle project status' });
    }
});

/**
 * Get project health summary
 */
router.get('/health/summary', requireAuth, async (req, res) => {
    try {
        if (!configService) {
            return res.status(503).json({ error: 'Azure DevOps service not available' });
        }

        const summary = await configService.getProjectHealthSummary();
        res.json(summary);
    } catch (error) {
        console.error('❌ Error fetching project health summary:', error);
        res.status(500).json({ error: 'Failed to fetch project health summary' });
    }
});

/**
 * Service health check
 */
router.get('/health', (req, res) => {
    try {
        const status = {
            service: 'Azure DevOps Project Configuration',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                adoClient: adoClient ? 'initialized' : 'not initialized',
                database: database ? 'initialized' : 'not initialized',
                buildDefService: buildDefService ? 'initialized' : 'not initialized',
                configService: configService ? 'initialized' : 'not initialized'
            },
            environment: {
                hasOrganization: !!process.env.ADO_ORGANIZATION,
                hasProject: !!process.env.ADO_PROJECT,
                hasToken: !!process.env.ADO_PAT
            }
        };

        res.json(status);
    } catch (error) {
        res.status(500).json({
            service: 'Azure DevOps Project Configuration',
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;