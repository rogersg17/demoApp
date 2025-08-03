/**
 * Test Webhooks Routes
 * Handles webhooks from external CI/CD systems for test execution orchestration
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Webhook endpoints for different CI/CD systems
module.exports = (testQueue, emitTestUpdate) => {

  /**
   * Generic webhook endpoint for test results
   * POST /api/webhooks/test-results
   */
  router.post('/test-results', async (req, res) => {
    try {
      const { executionId, status, results, error, metadata } = req.body;

      console.log(`📨 Received test results webhook for execution: ${executionId}`);
      console.log(`   Status: ${status}`);

      if (!executionId) {
        return res.status(400).json({ error: 'executionId is required' });
      }

      const execution = testQueue.getExecutionStatus(executionId);
      if (!execution) {
        console.warn(`⚠️ Webhook received for unknown execution: ${executionId}`);
        return res.status(404).json({ error: 'Execution not found' });
      }

      if (status === 'completed' && results) {
        // Process successful completion
        const success = testQueue.processResults(executionId, {
          total: results.total || 0,
          passed: results.passed || 0,
          failed: results.failed || 0,
          skipped: results.skipped || 0,
          duration: results.duration || '0s',
          suites: results.suites || [],
          artifacts: results.artifacts || [],
          coverage: results.coverage
        });

        if (success) {
          // Emit real-time update
          emitTestUpdate(executionId, {
            type: 'execution-completed',
            status: 'completed',
            results: results,
            metadata: metadata
          });
        }

      } else if (status === 'failed') {
        // Process failure
        const success = testQueue.processFailure(executionId, error || 'Unknown error');

        if (success) {
          // Emit real-time update
          emitTestUpdate(executionId, {
            type: 'execution-failed',
            status: 'failed',
            error: error,
            metadata: metadata
          });
        }

      } else if (status === 'running') {
        // Process progress update
        emitTestUpdate(executionId, {
          type: 'execution-progress',
          status: 'running',
          progress: results,
          metadata: metadata
        });
      }

      res.json({ success: true, message: 'Webhook processed successfully' });

    } catch (error) {
      console.error('❌ Error processing test results webhook:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  });

  /**
   * GitHub Actions webhook endpoint
   * POST /api/webhooks/github-actions
   */
  router.post('/github-actions', async (req, res) => {
    try {
      // Verify GitHub webhook signature if configured
      const signature = req.headers['x-hub-signature-256'];
      if (process.env.GITHUB_WEBHOOK_SECRET && signature) {
        const expectedSignature = 'sha256=' + crypto
          .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
          .update(JSON.stringify(req.body))
          .digest('hex');

        if (signature !== expectedSignature) {
          console.warn('⚠️ Invalid GitHub webhook signature');
          return res.status(401).json({ error: 'Invalid signature' });
        }
      }

      const { action, workflow_run, repository } = req.body;

      console.log(`📨 GitHub Actions webhook: ${action} for workflow ${workflow_run?.id}`);

      // Extract execution ID from workflow run name or environment
      const executionId = workflow_run?.name?.match(/exec_\d+_[a-f0-9]+/)?.[0] ||
                         workflow_run?.head_commit?.message?.match(/exec_\d+_[a-f0-9]+/)?.[0];

      if (!executionId) {
        console.log('📝 GitHub webhook without execution ID, skipping');
        return res.json({ success: true, message: 'No execution ID found' });
      }

      if (action === 'completed') {
        const status = workflow_run.conclusion; // 'success', 'failure', 'cancelled', etc.
        
        if (status === 'success') {
          // For now, we'll need the actual test results via a separate mechanism
          // In a real implementation, the workflow would post results to /test-results
          console.log(`✅ GitHub workflow ${workflow_run.id} completed successfully`);
        } else {
          testQueue.processFailure(executionId, `GitHub workflow failed: ${status}`);
          emitTestUpdate(executionId, {
            type: 'execution-failed',
            status: 'failed',
            error: `GitHub workflow failed: ${status}`,
            workflowUrl: workflow_run.html_url
          });
        }
      }

      res.json({ success: true, message: 'GitHub webhook processed' });

    } catch (error) {
      console.error('❌ Error processing GitHub webhook:', error);
      res.status(500).json({ error: 'Failed to process GitHub webhook' });
    }
  });

  /**
   * Azure DevOps webhook endpoint
   * POST /api/webhooks/azure-devops
   */
  router.post('/azure-devops', async (req, res) => {
    try {
      const { eventType, resource } = req.body;

      console.log(`📨 Azure DevOps webhook: ${eventType} for build ${resource?.id}`);

      // Extract execution ID from build definition name or variables
      const executionId = resource?.definition?.name?.match(/exec_\d+_[a-f0-9]+/)?.[0] ||
                         resource?.parameters?.match(/exec_\d+_[a-f0-9]+/)?.[0];

      if (!executionId) {
        console.log('📝 Azure DevOps webhook without execution ID, skipping');
        return res.json({ success: true, message: 'No execution ID found' });
      }

      if (eventType === 'build.complete') {
        const status = resource.status; // 'completed'
        const result = resource.result; // 'succeeded', 'failed', 'partiallySucceeded'

        if (result === 'succeeded') {
          console.log(`✅ Azure DevOps build ${resource.id} completed successfully`);
          // Actual results would be posted to /test-results endpoint
        } else {
          testQueue.processFailure(executionId, `Azure DevOps build failed: ${result}`);
          emitTestUpdate(executionId, {
            type: 'execution-failed',
            status: 'failed',
            error: `Azure DevOps build failed: ${result}`,
            buildUrl: resource._links?.web?.href
          });
        }
      }

      res.json({ success: true, message: 'Azure DevOps webhook processed' });

    } catch (error) {
      console.error('❌ Error processing Azure DevOps webhook:', error);
      res.status(500).json({ error: 'Failed to process Azure DevOps webhook' });
    }
  });

  /**
   * Jenkins webhook endpoint
   * POST /api/webhooks/jenkins
   */
  router.post('/jenkins', async (req, res) => {
    try {
      const { name, build, phase, status } = req.body;

      console.log(`📨 Jenkins webhook: ${name} #${build?.number} - ${phase} (${status})`);

      // Extract execution ID from job parameters or description
      const executionId = build?.parameters?.EXECUTION_ID || 
                         name?.match(/exec_\d+_[a-f0-9]+/)?.[0];

      if (!executionId) {
        console.log('📝 Jenkins webhook without execution ID, skipping');
        return res.json({ success: true, message: 'No execution ID found' });
      }

      if (phase === 'COMPLETED' || phase === 'FINISHED') {
        if (status === 'SUCCESS') {
          console.log(`✅ Jenkins job ${name} #${build.number} completed successfully`);
          // Actual results would be posted to /test-results endpoint
        } else {
          testQueue.processFailure(executionId, `Jenkins job failed: ${status}`);
          emitTestUpdate(executionId, {
            type: 'execution-failed',
            status: 'failed',
            error: `Jenkins job failed: ${status}`,
            buildUrl: build?.full_url
          });
        }
      }

      res.json({ success: true, message: 'Jenkins webhook processed' });

    } catch (error) {
      console.error('❌ Error processing Jenkins webhook:', error);
      res.status(500).json({ error: 'Failed to process Jenkins webhook' });
    }
  });

  /**
   * Generic CI/CD webhook endpoint
   * POST /api/webhooks/ci-cd
   */
  router.post('/ci-cd', async (req, res) => {
    try {
      const { provider, executionId, status, results, error, metadata } = req.body;

      console.log(`📨 Generic CI/CD webhook from ${provider} for execution: ${executionId}`);

      if (!executionId || !provider) {
        return res.status(400).json({ error: 'executionId and provider are required' });
      }

      // Process the webhook similar to the generic test-results endpoint
      if (status === 'completed' && results) {
        testQueue.processResults(executionId, results);
        emitTestUpdate(executionId, {
          type: 'execution-completed',
          status: 'completed',
          results: results,
          provider: provider,
          metadata: metadata
        });
      } else if (status === 'failed') {
        testQueue.processFailure(executionId, error);
        emitTestUpdate(executionId, {
          type: 'execution-failed',
          status: 'failed',
          error: error,
          provider: provider,
          metadata: metadata
        });
      }

      res.json({ success: true, message: 'CI/CD webhook processed' });

    } catch (error) {
      console.error('❌ Error processing CI/CD webhook:', error);
      res.status(500).json({ error: 'Failed to process CI/CD webhook' });
    }
  });

  /**
   * Health check endpoint for webhooks
   * GET /api/webhooks/health
   */
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      supportedProviders: ['github-actions', 'azure-devops', 'jenkins', 'generic'],
      endpoints: {
        'test-results': '/api/webhooks/test-results',
        'github-actions': '/api/webhooks/github-actions',
        'azure-devops': '/api/webhooks/azure-devops',
        'jenkins': '/api/webhooks/jenkins',
        'ci-cd': '/api/webhooks/ci-cd'
      }
    });
  });

  return router;
};
