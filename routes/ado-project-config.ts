import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { Session } from 'express-session';

const AdoBuildDefinitionService = require('../services/ado-build-definition');
const AdoProjectConfigurationService = require('../services/ado-project-configuration');
const AdoClient = require('../lib/ado-client');
const Database = require('../database/database');

const router = express.Router();

// TypeScript interfaces
interface AuthenticatedRequest extends Request {
  session: Session & {
    userId?: string;
    username?: string;
    role?: string;
  };
}

interface AdoConnectionBody {
  organization: string;
  project: string;
  pat: string;
}

interface AdoProjectConfig {
  id?: string;
  name: string;
  organization: string;
  project: string;
  pat: string;
  enabled: boolean;
  description?: string;
}

interface AdoConnectionResult {
  success: boolean;
  projects?: Array<{ id: string; name: string }>;
  buildDefinitions?: Array<{ id: number; name: string; path?: string }>;
  error?: string;
}

// Services will be initialized on-demand
let database: any;

try {
    database = new Database();
} catch (error: any) {
    console.error('⚠️ Database not initialized for ADO config:', error.message);
}

// Authentication middleware for ADO routes
const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.session.userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    next();
};

// Admin role check middleware
const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (req.session.role !== 'admin') {
        res.status(403).json({ error: 'Admin privileges required' });
        return;
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
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ error: 'Validation failed', details: errors.array() });
            return;
        }

        const { organization, project, pat }: AdoConnectionBody = req.body;
        
        console.log(`🧪 Testing ADO connection for admin ${req.session.username}...`);
        
        // Create test client
        const testClient = new AdoClient({
            orgUrl: organization,
            projectId: project,
            pat: pat
        });
        
        const result: AdoConnectionResult = await testClient.testConnection();
        
        if (result.success) {
            console.log(`✅ ADO connection test successful for user ${req.session.username}`);
            console.log(`   Found ${result.projects ? result.projects.length : 0} projects`);
        } else {
            console.warn(`❌ ADO connection test failed for user ${req.session.username}: ${result.error}`);
        }
        
        res.json(result);
    } catch (error: any) {
        console.error('❌ ADO connection test error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Connection test failed',
            message: error.message 
        });
    }
});

/**
 * Get build definitions for a project
 */
router.get('/build-definitions', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { organization, project, pat } = req.query as { organization?: string; project?: string; pat?: string };
        
        if (!organization || !project || !pat) {
            res.status(400).json({ 
                success: false, 
                error: 'Organization, project, and PAT are required' 
            });
            return;
        }

        console.log(`🔍 Fetching build definitions for ${organization}/${project}...`);
        
        const buildDefService = new AdoBuildDefinitionService({
            orgUrl: organization,
            projectId: project,
            pat: pat
        });
        
        const buildDefinitions = await buildDefService.getBuildDefinitions();
        
        console.log(`✅ Found ${buildDefinitions.length} build definitions`);
        
        res.json({
            success: true,
            buildDefinitions
        });
    } catch (error: any) {
        console.error('❌ Error fetching build definitions:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch build definitions',
            message: error.message 
        });
    }
});

/**
 * Configure a new ADO project for monitoring
 */
router.post('/projects', requireAuth, requireAdmin, [
    body('name').notEmpty().withMessage('Project name is required'),
    body('organization').isURL().withMessage('Valid organization URL is required'),
    body('project').notEmpty().withMessage('ADO project name is required'),
    body('pat').isLength({ min: 50 }).withMessage('Valid Personal Access Token is required')
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ 
                success: false, 
                error: 'Validation failed', 
                details: errors.array() 
            });
            return;
        }

        const { name, organization, project, pat, description, enabled = true }: AdoProjectConfig = req.body;
        
        console.log(`🔧 Configuring ADO project: ${name}...`);
        
        // Test connection first
        const testClient = new AdoClient({
            orgUrl: organization,
            projectId: project,
            pat: pat
        });
        
        const connectionResult = await testClient.testConnection();
        
        if (!connectionResult.success) {
            res.status(400).json({
                success: false,
                error: 'Failed to connect to Azure DevOps',
                details: connectionResult.error
            });
            return;
        }
        
        // Save configuration
        const configService = new AdoProjectConfigurationService(database);
        const configId = await configService.createProject({
            name,
            organization,
            project,
            pat,
            description,
            enabled,
            createdBy: req.session.username
        });
        
        console.log(`✅ ADO project ${name} configured successfully with ID: ${configId}`);
        
        res.status(201).json({
            success: true,
            message: 'ADO project configured successfully',
            projectId: configId
        });
    } catch (error: any) {
        console.error('❌ Error configuring ADO project:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to configure ADO project',
            message: error.message 
        });
    }
});

/**
 * Get all configured ADO projects
 */
router.get('/projects', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const configService = new AdoProjectConfigurationService(database);
        const projects = await configService.getAllProjects();
        
        // Remove sensitive PAT information from response
        const sanitizedProjects = projects.map((project: any) => ({
            ...project,
            pat: project.pat ? '***' : null
        }));
        
        res.json({
            success: true,
            projects: sanitizedProjects
        });
    } catch (error: any) {
        console.error('❌ Error fetching ADO projects:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch ADO projects',
            message: error.message 
        });
    }
});

/**
 * Update ADO project configuration
 */
router.put('/projects/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updateData: Partial<AdoProjectConfig> = req.body;
        
        console.log(`🔧 Updating ADO project configuration ${id}...`);
        
        const configService = new AdoProjectConfigurationService(database);
        await configService.updateProject(id, {
            ...updateData,
            updatedBy: req.session.username
        });
        
        console.log(`✅ ADO project ${id} updated successfully`);
        
        res.json({
            success: true,
            message: 'ADO project updated successfully'
        });
    } catch (error: any) {
        console.error('❌ Error updating ADO project:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update ADO project',
            message: error.message 
        });
    }
});

/**
 * Delete ADO project configuration
 */
router.delete('/projects/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        
        console.log(`🗑️ Deleting ADO project configuration ${id}...`);
        
        const configService = new AdoProjectConfigurationService(database);
        await configService.deleteProject(id);
        
        console.log(`✅ ADO project ${id} deleted successfully`);
        
        res.json({
            success: true,
            message: 'ADO project deleted successfully'
        });
    } catch (error: any) {
        console.error('❌ Error deleting ADO project:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete ADO project',
            message: error.message 
        });
    }
});

/**
 * Get specific ADO project configuration
 */
router.get('/projects/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        
        const configService = new AdoProjectConfigurationService(database);
        const project = await configService.getProject(id);
        
        if (!project) {
            res.status(404).json({
                success: false,
                error: 'ADO project not found'
            });
            return;
        }
        
        // Remove sensitive PAT information from response
        const sanitizedProject = {
            ...project,
            pat: project.pat ? '***' : null
        };
        
        res.json({
            success: true,
            project: sanitizedProject
        });
    } catch (error: any) {
        console.error('❌ Error fetching ADO project:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch ADO project',
            message: error.message 
        });
    }
});

export default router;
