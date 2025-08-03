const express = require('express');
const router = express.Router();
const GitIntegrationService = require('../services/git-integration');
const TestDiscoveryService = require('../services/test-discovery');

/**
 * Git Webhooks Router
 * Handles incoming webhooks from Git providers (GitHub, GitLab, Bitbucket)
 * Part of ADR-001 implementation for test code and metadata separation
 */

// Initialize services
let gitIntegration;
let testDiscovery;

// Middleware to initialize services with database
router.use((req, res, next) => {
  if (!gitIntegration) {
    gitIntegration = new GitIntegrationService(req.app.locals.db);
    testDiscovery = new TestDiscoveryService(req.app.locals.db);
    
    // Set up event listeners for test discovery
    setupEventListeners();
  }
  next();
});

/**
 * Set up event listeners between Git integration and test discovery
 */
function setupEventListeners() {
  // Listen for test file changes from Git integration
  gitIntegration.on('test-file-added', async (data) => {
    console.log(`🔍 Test file added: ${data.filePath}`);
    // TODO: Trigger test discovery for the specific file
    // For now, we'll emit an event that can be handled by other services
  });

  gitIntegration.on('test-file-modified', async (data) => {
    console.log(`🔍 Test file modified: ${data.filePath}`);
    // TODO: Trigger test discovery for the specific file
  });

  gitIntegration.on('test-file-removed', async (data) => {
    console.log(`🔍 Test file removed: ${data.filePath}`);
    // File removal is already handled in Git integration service
  });

  gitIntegration.on('webhook-processed', (data) => {
    console.log(`✅ Webhook processed for repository ${data.repositoryId}`);
  });
}

/**
 * GET /api/git/repositories
 * List all registered Git repositories
 */
router.get('/repositories', async (req, res) => {
  try {
    const repositories = await gitIntegration.listRepositories();
    res.json({
      success: true,
      repositories,
      count: repositories.length
    });
  } catch (error) {
    console.error('Error listing repositories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list repositories',
      message: error.message
    });
  }
});

/**
 * POST /api/git/repositories
 * Register a new Git repository for monitoring
 */
router.post('/repositories', async (req, res) => {
  try {
    const { name, url, defaultBranch, webhookSecret } = req.body;

    if (!name || !url) {
      return res.status(400).json({
        success: false,
        error: 'Name and URL are required'
      });
    }

    const repositoryId = await gitIntegration.registerRepository({
      name,
      url,
      defaultBranch: defaultBranch || 'main',
      webhookSecret
    });

    res.status(201).json({
      success: true,
      message: 'Repository registered successfully',
      repositoryId,
      webhookUrl: `/api/git/webhooks/${repositoryId}`
    });
  } catch (error) {
    console.error('Error registering repository:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register repository',
      message: error.message
    });
  }
});

/**
 * GET /api/git/repositories/:id
 * Get repository details
 */
router.get('/repositories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const repository = await gitIntegration.getRepository(parseInt(id));

    if (!repository) {
      return res.status(404).json({
        success: false,
        error: 'Repository not found'
      });
    }

    res.json({
      success: true,
      repository
    });
  } catch (error) {
    console.error('Error getting repository:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get repository',
      message: error.message
    });
  }
});

/**
 * PUT /api/git/repositories/:id
 * Update repository configuration
 */
router.put('/repositories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const changes = await gitIntegration.updateRepository(parseInt(id), updates);

    if (changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Repository not found'
      });
    }

    res.json({
      success: true,
      message: 'Repository updated successfully'
    });
  } catch (error) {
    console.error('Error updating repository:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update repository',
      message: error.message
    });
  }
});

/**
 * DELETE /api/git/repositories/:id
 * Remove repository registration
 */
router.delete('/repositories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const changes = await gitIntegration.removeRepository(parseInt(id));

    if (changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Repository not found'
      });
    }

    res.json({
      success: true,
      message: 'Repository removed successfully'
    });
  } catch (error) {
    console.error('Error removing repository:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove repository',
      message: error.message
    });
  }
});

/**
 * POST /api/git/webhooks/:repositoryId
 * Handle incoming Git webhooks
 */
router.post('/webhooks/:repositoryId', async (req, res) => {
  try {
    const { repositoryId } = req.params;
    const headers = req.headers;
    const payload = req.body;

    console.log(`📨 Received webhook for repository ${repositoryId}`);

    // Process the webhook
    const result = await gitIntegration.processWebhook(
      headers, 
      payload, 
      parseInt(repositoryId)
    );

    res.json({
      success: true,
      message: 'Webhook processed successfully',
      processed: result.processed
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Return success even on error to avoid webhook retries
    // Log the error for investigation
    res.status(200).json({
      success: false,
      error: 'Webhook processing failed',
      message: error.message
    });
  }
});

/**
 * POST /api/git/repositories/:id/scan
 * Manually trigger repository scan for test discovery
 */
router.post('/repositories/:id/scan', async (req, res) => {
  try {
    const { id } = req.params;
    const { repositoryPath } = req.body;

    if (!repositoryPath) {
      return res.status(400).json({
        success: false,
        error: 'Repository path is required'
      });
    }

    console.log(`🔍 Manual scan triggered for repository ${id} at ${repositoryPath}`);

    const result = await testDiscovery.scanRepository(repositoryPath, parseInt(id));

    res.json({
      success: true,
      message: 'Repository scan completed',
      result
    });

  } catch (error) {
    console.error('Repository scan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan repository',
      message: error.message
    });
  }
});

/**
 * GET /api/git/repositories/:id/tests
 * Get discovered tests for a repository
 */
router.get('/repositories/:id/tests', async (req, res) => {
  try {
    const { id } = req.params;
    const tests = await testDiscovery.getRepositoryTests(parseInt(id));

    res.json({
      success: true,
      tests,
      count: tests.length
    });
  } catch (error) {
    console.error('Error getting repository tests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get repository tests',
      message: error.message
    });
  }
});

/**
 * POST /api/git/test-file-rescan
 * Manually rescan a specific test file
 */
router.post('/test-file-rescan', async (req, res) => {
  try {
    const { filePath, repositoryPath, repositoryId } = req.body;

    if (!filePath || !repositoryPath || !repositoryId) {
      return res.status(400).json({
        success: false,
        error: 'filePath, repositoryPath, and repositoryId are required'
      });
    }

    const tests = await testDiscovery.rescanTestFile(
      filePath, 
      repositoryPath, 
      parseInt(repositoryId)
    );

    res.json({
      success: true,
      message: 'Test file rescanned successfully',
      tests,
      count: tests.length
    });

  } catch (error) {
    console.error('Test file rescan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rescan test file',
      message: error.message
    });
  }
});

/**
 * GET /api/git/webhook-info/:repositoryId
 * Get webhook configuration information for a repository
 */
router.get('/webhook-info/:repositoryId', async (req, res) => {
  try {
    const { repositoryId } = req.params;
    const repository = await gitIntegration.getRepository(parseInt(repositoryId));

    if (!repository) {
      return res.status(404).json({
        success: false,
        error: 'Repository not found'
      });
    }

    const webhookUrl = `${req.protocol}://${req.get('host')}/api/git/webhooks/${repositoryId}`;

    res.json({
      success: true,
      webhookInfo: {
        url: webhookUrl,
        method: 'POST',
        contentType: 'application/json',
        secret: repository.webhook_secret ? 'Configured' : 'Not configured',
        supportedEvents: [
          'push',
          'pull_request',
          'merge_request'
        ],
        headers: {
          github: 'X-GitHub-Event',
          gitlab: 'X-GitLab-Event',
          bitbucket: 'X-Event-Key'
        }
      }
    });

  } catch (error) {
    console.error('Error getting webhook info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get webhook info',
      message: error.message
    });
  }
});

/**
 * GET /api/git/status
 * Get Git integration service status
 */
router.get('/status', (req, res) => {
  try {
    res.json({
      success: true,
      status: 'active',
      services: {
        gitIntegration: gitIntegration ? 'initialized' : 'not initialized',
        testDiscovery: testDiscovery ? 'initialized' : 'not initialized'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get status',
      message: error.message
    });
  }
});

module.exports = router;
