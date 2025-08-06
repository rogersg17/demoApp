/**
 * GitHub Actions Integration Routes
 * Handles GitHub workflow monitoring, triggering, and analytics
 */

import express from 'express';
import type { Request, Response } from 'express';
import GitHubApiService from '../services/github-api-service';

const router = express.Router();

// Define the allowed status types for GitHub workflow runs
type WorkflowRunStatus = "queued" | "completed" | "cancelled" | "skipped" | "pending" | "success" | "in_progress" | "failure" | "neutral" | "timed_out" | "action_required" | "stale" | "requested" | "waiting";

// Helper function to safely parse query string values
function parseStringParam(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
}

// Helper function to safely parse number parameters
function parseNumberParam(value: unknown, defaultValue?: number): number {
  const strValue = parseStringParam(value);
  if (strValue) {
    const parsed = parseInt(strValue, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return defaultValue || 0;
}

/**
 * GET /api/github/workflows/runs
 * Get workflow runs for a repository
 */
router.get('/workflows/runs', async (req: Request, res: Response) => {
  try {
    const owner = parseStringParam(req.query.owner);
    const repo = parseStringParam(req.query.repo);
    const token = parseStringParam(req.query.token);
    const branch = parseStringParam(req.query.branch);
    const event = parseStringParam(req.query.event);
    const status = parseStringParam(req.query.status) as WorkflowRunStatus | undefined;
    const perPage = parseNumberParam(req.query.per_page, 20);
    const page = parseNumberParam(req.query.page, 1);

    if (!owner || !repo || !token) {
      return res.status(400).json({
        error: 'Missing required parameters: owner, repo, token'
      });
    }

    const github = new GitHubApiService({ owner, repo, token });
    
    const runs = await github.getWorkflowRuns({
      branch,
      event,
      status,
      per_page: perPage,
      page,
    });

    return res.json({
      success: true,
      data: {
        runs,
        totalCount: runs.length,
        page,
        perPage,
      },
    });
  } catch (error) {
    console.error('Error fetching workflow runs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Failed to fetch workflow runs',
      message: errorMessage,
    });
  }
});

/**
 * GET /api/github/workflows/runs/:runId
 * Get specific workflow run details
 */
router.get('/workflows/runs/:runId', async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const owner = parseStringParam(req.query.owner);
    const repo = parseStringParam(req.query.repo);
    const token = parseStringParam(req.query.token);

    if (!owner || !repo || !token) {
      return res.status(400).json({
        error: 'Missing required parameters: owner, repo, token'
      });
    }

    const github = new GitHubApiService({ owner, repo, token });
    
    const run = await github.getWorkflowRun(parseInt(runId));
    
    if (!run) {
      return res.status(404).json({
        error: 'Workflow run not found',
      });
    }

    return res.json({
      success: true,
      data: run,
    });
  } catch (error) {
    console.error('Error fetching workflow run:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Failed to fetch workflow run',
      message: errorMessage,
    });
  }
});

/**
 * GET /api/github/workflows/runs/:runId/jobs
 * Get jobs for a specific workflow run
 */
router.get('/workflows/runs/:runId/jobs', async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const owner = parseStringParam(req.query.owner);
    const repo = parseStringParam(req.query.repo);
    const token = parseStringParam(req.query.token);

    if (!owner || !repo || !token) {
      return res.status(400).json({
        error: 'Missing required parameters: owner, repo, token'
      });
    }

    const github = new GitHubApiService({ owner, repo, token });
    
    const jobs = await github.getWorkflowJobs(parseInt(runId));

    return res.json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    console.error('Error fetching workflow jobs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Failed to fetch workflow jobs',
      message: errorMessage,
    });
  }
});

/**
 * GET /api/github/workflows/runs/:runId/artifacts
 * Get artifacts for a specific workflow run
 */
router.get('/workflows/runs/:runId/artifacts', async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const owner = parseStringParam(req.query.owner);
    const repo = parseStringParam(req.query.repo);
    const token = parseStringParam(req.query.token);

    if (!owner || !repo || !token) {
      return res.status(400).json({
        error: 'Missing required parameters: owner, repo, token'
      });
    }

    const github = new GitHubApiService({ owner, repo, token });
    
    const artifacts = await github.getWorkflowArtifacts(parseInt(runId));

    return res.json({
      success: true,
      data: artifacts,
    });
  } catch (error) {
    console.error('Error fetching workflow artifacts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Failed to fetch workflow artifacts',
      message: errorMessage,
    });
  }
});

/**
 * GET /api/github/workflows/runs/:runId/monitor
 * Get comprehensive monitoring data for a workflow run
 */
router.get('/workflows/runs/:runId/monitor', async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const owner = parseStringParam(req.query.owner);
    const repo = parseStringParam(req.query.repo);
    const token = parseStringParam(req.query.token);
    const executionId = parseStringParam(req.query.executionId);

    if (!owner || !repo || !token) {
      return res.status(400).json({
        error: 'Missing required parameters: owner, repo, token'
      });
    }

    const github = new GitHubApiService({ owner, repo, token });
    
    const monitor = await github.monitorWorkflowRun(
      executionId || `github-${runId}`,
      parseInt(runId)
    );

    return res.json({
      success: true,
      data: monitor,
    });
  } catch (error) {
    console.error('Error monitoring workflow run:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Failed to monitor workflow run',
      message: errorMessage,
    });
  }
});

/**
 * POST /api/github/workflows/trigger
 * Trigger a workflow using repository dispatch
 */
router.post('/workflows/trigger', async (req: Request, res: Response) => {
  try {
    const { owner, repo, token, eventType, clientPayload } = req.body;

    if (!owner || !repo || !token || !eventType) {
      return res.status(400).json({
        error: 'Missing required fields: owner, repo, token, eventType'
      });
    }

    const github = new GitHubApiService({ owner, repo, token });
    
    await github.triggerWorkflow(eventType, clientPayload || {});

    return res.json({
      success: true,
      message: 'Workflow triggered successfully',
      data: {
        eventType,
        clientPayload,
      },
    });
  } catch (error) {
    console.error('Error triggering workflow:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Failed to trigger workflow',
      message: errorMessage,
    });
  }
});

/**
 * POST /api/github/workflows/runs/:runId/cancel
 * Cancel a workflow run
 */
router.post('/workflows/runs/:runId/cancel', async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const { owner, repo, token } = req.body;

    if (!owner || !repo || !token) {
      return res.status(400).json({
        error: 'Missing required fields: owner, repo, token'
      });
    }

    const github = new GitHubApiService({ owner, repo, token });
    
    await github.cancelWorkflowRun(parseInt(runId));

    return res.json({
      success: true,
      message: 'Workflow run cancelled successfully',
      data: {
        runId: parseInt(runId),
      },
    });
  } catch (error) {
    console.error('Error cancelling workflow run:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Failed to cancel workflow run',
      message: errorMessage,
    });
  }
});

/**
 * GET /api/github/analytics/statistics
 * Get workflow analytics and statistics
 */
router.get('/analytics/statistics', async (req: Request, res: Response) => {
  try {
    const owner = parseStringParam(req.query.owner);
    const repo = parseStringParam(req.query.repo);
    const token = parseStringParam(req.query.token);
    const timeframe = parseStringParam(req.query.timeframe) || 'week';

    if (!owner || !repo || !token) {
      return res.status(400).json({
        error: 'Missing required parameters: owner, repo, token'
      });
    }

    if (!['day', 'week', 'month'].includes(timeframe)) {
      return res.status(400).json({
        error: 'Invalid timeframe. Must be one of: day, week, month'
      });
    }

    const github = new GitHubApiService({ owner, repo, token });
    
    const statistics = await github.getWorkflowStatistics(timeframe as 'day' | 'week' | 'month');

    return res.json({
      success: true,
      data: {
        timeframe,
        statistics,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching workflow statistics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Failed to fetch workflow statistics',
      message: errorMessage,
    });
  }
});

/**
 * GET /api/github/health
 * Health check for GitHub API connectivity
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const owner = parseStringParam(req.query.owner);
    const repo = parseStringParam(req.query.repo);
    const token = parseStringParam(req.query.token);

    if (!owner || !repo || !token) {
      return res.status(400).json({
        error: 'Missing required parameters: owner, repo, token'
      });
    }

    const github = new GitHubApiService({ owner, repo, token });
    
    const health = await github.healthCheck();

    const statusCode = health.status === 'healthy' ? 200 : 503;

    return res.status(statusCode).json({
      success: health.status === 'healthy',
      data: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking GitHub health:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(503).json({
      success: false,
      error: 'GitHub health check failed',
      message: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/github/webhooks/github-actions
 * Webhook endpoint for GitHub Actions-specific events
 */
router.post('/webhooks/github-actions', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    
    // Validate webhook payload
    if (!payload.executionId || !payload.runId) {
      return res.status(400).json({
        error: 'Invalid webhook payload: missing executionId or runId'
      });
    }

    console.log('📡 Received GitHub Actions webhook:', {
      executionId: payload.executionId,
      runId: payload.runId,
      status: payload.status,
      provider: payload.provider,
    });

    // Process the webhook payload
    // This would typically update the database and trigger WebSocket updates
    // For now, we'll just log it and respond

    // TODO: Integrate with test execution queue service
    // TODO: Update database with workflow status
    // TODO: Trigger WebSocket updates to dashboard

    return res.json({
      success: true,
      message: 'GitHub Actions webhook processed successfully',
      data: {
        executionId: payload.executionId,
        runId: payload.runId,
        status: payload.status,
        processedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error processing GitHub Actions webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Failed to process GitHub Actions webhook',
      message: errorMessage,
    });
  }
});

// Database reference for the route
let db: any = null;

const setDatabase = (database: any): void => {
  db = database;
};

export default router;
export { setDatabase };
