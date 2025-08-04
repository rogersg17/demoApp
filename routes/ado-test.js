const express = require('express');
const AdoClient = require('../lib/ado-client');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

/**
 * Test Azure DevOps connection - simplified version
 */
router.post('/test-connection', requireAuth, [
    body('organization').isURL().withMessage('Valid organization URL is required'),
    body('project').notEmpty().withMessage('Project name is required'),
    body('pat').isLength({ min: 10 }).withMessage('Personal Access Token is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { organization, project, pat } = req.body;
        
        console.log(`🧪 Testing ADO connection for user ${req.session.username}...`);
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
            
            const result = await testClient.testConnection();
            
            if (result.success) {
                console.log(`✅ ADO connection test successful for user ${req.session.username}`);
                console.log(`   Found ${result.projects ? result.projects.length : 0} projects`);
            } else {
                console.warn(`❌ ADO connection test failed for user ${req.session.username}: ${result.error}`);
            }
            
            res.json(result);
        } catch (clientError) {
            console.error('❌ ADO client creation failed:', clientError.message);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to create Azure DevOps client',
                message: clientError.message 
            });
        }
    } catch (error) {
        console.error('❌ ADO connection test error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Connection test failed',
            message: error.message 
        });
    }
});

module.exports = router;