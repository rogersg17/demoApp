import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { Session } from 'express-session';

const AdoClient = require('../lib/ado-client');

const router = express.Router();

// TypeScript interfaces
interface AuthenticatedRequest extends Request {
    session: Session & {
        userId?: string;
        username?: string;
    };
}

interface AdoTestConnectionBody {
    organization: string;
    project: string;
    pat: string;
}

interface AdoConnectionResult {
    success: boolean;
    projects?: Array<{ id: string; name: string }>;
    error?: string;
}

// Authentication middleware
const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.session.userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    next();
};

/**
 * Test Azure DevOps connection - simplified version
 */
router.post('/test-connection', [
    body('organization').isURL().withMessage('Valid organization URL is required'),
    body('project').notEmpty().withMessage('Project name is required'),
    body('pat').isLength({ min: 10 }).withMessage('Personal Access Token is required')
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

        const { organization, project, pat }: AdoTestConnectionBody = req.body;
        
        const username: string = req.session?.username || 'test-user';
        console.log(`🧪 Testing ADO connection for user ${username}...`);
        console.log(`   Organization: ${organization}`);
        console.log(`   Project: ${project}`);
        console.log(`   PAT: ${pat.substring(0, 10)}...`);
        
        // Create temporary client for testing
        try {
            const testClient = new AdoClient({
                orgUrl: organization,
                projectId: project,
                pat: pat
            });
            
            const result: AdoConnectionResult = await testClient.testConnection();
            
            if (result.success) {
                console.log(`✅ ADO connection test successful for user ${username}`);
                console.log(`   Found ${result.projects ? result.projects.length : 0} projects`);
            } else {
                console.warn(`❌ ADO connection test failed for user ${username}: ${result.error}`);
            }
            
            res.json(result);
        } catch (clientError: any) {
            console.error('❌ ADO client creation failed:', clientError.message);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to create Azure DevOps client',
                message: clientError.message 
            });
        }
    } catch (error: any) {
        console.error('❌ ADO connection test error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Connection test failed',
            message: error.message 
        });
    }
});

export default router;
