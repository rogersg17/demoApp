const express = require('express');
const router = express.Router();
const AdoClient = require('../lib/ado-client');

/**
 * MVP ADO Configuration Routes
 * Handles Azure DevOps integration configuration management
 */

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ 
            success: false, 
            error: 'Authentication required' 
        });
    }
    next();
};

// Initialize services (will be set by server.js)
let configService = null;
let monitorService = null;

// Function to set services (called from server.js)
const setServices = (adoConfigService, pipelineMonitorService) => {
    configService = adoConfigService;
    monitorService = pipelineMonitorService;
};

/**
 * GET /api/mvp/ado/organizations
 * List ADO organizations accessible to the configured PAT
 */
router.get('/ado/organizations', requireAuth, async (req, res) => {
    try {
        if (!process.env.ADO_PAT) {
            return res.status(400).json({
                success: false,
                error: 'ADO Personal Access Token not configured'
            });
        }

        const organizations = await configService.getAdoOrganizations();
        
        res.json({
            success: true,
            data: organizations
        });
    } catch (error) {
        console.error('Failed to get ADO organizations:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/mvp/ado/projects
 * List projects in an ADO organization
 */
router.get('/ado/projects', requireAuth, async (req, res) => {
    try {
        const { organizationUrl } = req.query;
        
        if (!organizationUrl) {
            return res.status(400).json({
                success: false,
                error: 'Organization URL is required'
            });
        }

        const projects = await configService.getAdoProjects(organizationUrl);
        
        res.json({
            success: true,
            data: projects
        });
    } catch (error) {
        console.error('Failed to get ADO projects:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/mvp/ado/definitions
 * List build definitions in an ADO project
 */
router.get('/ado/definitions', requireAuth, async (req, res) => {
    try {
        const { organizationUrl, projectId } = req.query;
        
        if (!organizationUrl || !projectId) {
            return res.status(400).json({
                success: false,
                error: 'Organization URL and project ID are required'
            });
        }

        const definitions = await configService.getAdoBuildDefinitions(organizationUrl, projectId);
        
        res.json({
            success: true,
            data: definitions
        });
    } catch (error) {
        console.error('Failed to get ADO build definitions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/mvp/ado/test-connection
 * Test ADO connection with provided configuration
 */
router.post('/ado/test-connection', requireAuth, async (req, res) => {
    try {
        const { organizationUrl, projectId, buildDefinitionId } = req.body;
        
        if (!organizationUrl || !projectId) {
            return res.status(400).json({
                success: false,
                error: 'Organization URL and project ID are required'
            });
        }

        const testConfig = {
            ado_organization_url: organizationUrl,
            ado_project_id: projectId,
            build_definition_id: buildDefinitionId
        };

        const result = await configService.testAdoConnection(testConfig);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Failed to test ADO connection:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/mvp/pipeline-configs
 * Get all pipeline configurations
 */
router.get('/pipeline-configs', requireAuth, async (req, res) => {
    try {
        const { includeInactive = false } = req.query;
        const configs = await configService.getPipelineConfigs(includeInactive === 'true');
        
        res.json({
            success: true,
            data: configs
        });
    } catch (error) {
        console.error('Failed to get pipeline configs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/mvp/pipeline-configs/:id
 * Get a specific pipeline configuration
 */
router.get('/pipeline-configs/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const config = await configService.getPipelineConfig(id);
        
        if (!config) {
            return res.status(404).json({
                success: false,
                error: 'Pipeline configuration not found'
            });
        }
        
        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('Failed to get pipeline config:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/mvp/pipeline-configs
 * Create a new pipeline configuration
 */
router.post('/pipeline-configs', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const config = await configService.createPipelineConfig(req.body, userId);
        
        // If monitoring is enabled and the service is running, start monitoring this pipeline
        if (config.monitor_enabled && monitorService && monitorService.isRunning) {
            try {
                await monitorService.startMonitoringPipeline(config);
            } catch (monitorError) {
                console.error('Failed to start monitoring for new pipeline:', monitorError);
                // Don't fail the creation, just log the error
            }
        }
        
        res.status(201).json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('Failed to create pipeline config:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/mvp/pipeline-configs/:id
 * Update a pipeline configuration
 */
router.put('/pipeline-configs/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user.id;
        
        const config = await configService.updatePipelineConfig(id, req.body, userId);
        
        // Refresh monitoring if the service is running
        if (monitorService && monitorService.isRunning) {
            try {
                await monitorService.refreshPipelineMonitoring(id);
            } catch (monitorError) {
                console.error('Failed to refresh monitoring for updated pipeline:', monitorError);
                // Don't fail the update, just log the error
            }
        }
        
        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('Failed to update pipeline config:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/mvp/pipeline-configs/:id
 * Delete a pipeline configuration
 */
router.delete('/pipeline-configs/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Stop monitoring if the service is running
        if (monitorService && monitorService.isRunning) {
            try {
                await monitorService.stopMonitoringPipeline(id);
            } catch (monitorError) {
                console.error('Failed to stop monitoring for deleted pipeline:', monitorError);
                // Continue with deletion
            }
        }
        
        const result = await configService.deletePipelineConfig(id);
        
        if (!result.deleted) {
            return res.status(404).json({
                success: false,
                error: 'Pipeline configuration not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Pipeline configuration deleted successfully'
        });
    } catch (error) {
        console.error('Failed to delete pipeline config:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/mvp/pipeline-configs/:id/toggle-monitoring
 * Toggle monitoring for a specific pipeline
 */
router.post('/pipeline-configs/:id/toggle-monitoring', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { enabled } = req.body;
        
        const config = await configService.togglePipelineMonitoring(id, enabled);
        
        // Update monitoring if the service is running
        if (monitorService && monitorService.isRunning) {
            try {
                await monitorService.refreshPipelineMonitoring(id);
            } catch (monitorError) {
                console.error('Failed to update monitoring status:', monitorError);
                // Don't fail the toggle, just log the error
            }
        }
        
        res.json({
            success: true,
            data: config,
            message: `Monitoring ${enabled ? 'enabled' : 'disabled'} for pipeline`
        });
    } catch (error) {
        console.error('Failed to toggle pipeline monitoring:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/mvp/pipeline-health
 * Get pipeline health summary
 */
router.get('/pipeline-health', requireAuth, async (req, res) => {
    try {
        const healthSummary = await configService.getPipelineHealthSummary();
        
        res.json({
            success: true,
            data: healthSummary
        });
    } catch (error) {
        console.error('Failed to get pipeline health:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/mvp/monitoring-status
 * Get current monitoring status
 */
router.get('/monitoring-status', requireAuth, async (req, res) => {
    try {
        if (!monitorService) {
            return res.json({
                success: true,
                data: {
                    isRunning: false,
                    monitoredPipelines: 0,
                    pipelines: [],
                    message: 'Monitoring service not initialized'
                }
            });
        }
        
        const status = monitorService.getMonitoringStatus();
        
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Failed to get monitoring status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/mvp/monitoring/start
 * Start the monitoring service
 */
router.post('/monitoring/start', requireAuth, async (req, res) => {
    try {
        if (!monitorService) {
            return res.status(500).json({
                success: false,
                error: 'Monitoring service not initialized'
            });
        }
        
        await monitorService.startMonitoring();
        
        res.json({
            success: true,
            message: 'Monitoring service started successfully'
        });
    } catch (error) {
        console.error('Failed to start monitoring service:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/mvp/monitoring/stop
 * Stop the monitoring service
 */
router.post('/monitoring/stop', requireAuth, async (req, res) => {
    try {
        if (!monitorService) {
            return res.status(500).json({
                success: false,
                error: 'Monitoring service not initialized'
            });
        }
        
        await monitorService.stopMonitoring();
        
        res.json({
            success: true,
            message: 'Monitoring service stopped successfully'
        });
    } catch (error) {
        console.error('Failed to stop monitoring service:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/mvp/pipeline-configs/:id/test-now
 * Manually trigger a build check for a specific pipeline
 */
router.post('/pipeline-configs/:id/test-now', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!monitorService) {
            return res.status(500).json({
                success: false,
                error: 'Monitoring service not initialized'
            });
        }
        
        const config = await configService.getPipelineConfig(id);
        if (!config) {
            return res.status(404).json({
                success: false,
                error: 'Pipeline configuration not found'
            });
        }
        
        // Manually trigger a build check
        await monitorService.checkPipelineForNewBuilds(config);
        
        res.json({
            success: true,
            message: 'Manual build check completed'
        });
    } catch (error) {
        console.error('Failed to perform manual build check:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = { router, setServices };
