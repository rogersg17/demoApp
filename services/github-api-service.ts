/**
 * GitHub API Service for TMS Integration
 * Handles GitHub Actions workflow monitoring and AP  async getWorkflowRuns(options: {
    branch?: string;
    event?: string;
    status?: 'completed' | 'queued' | 'in_progress' | 'cancelled' | 'success' | 'failure' | 'neutral' | 'skipped' | 'timed_out' | 'action_required' | 'stale' | 'requested' | 'waiting' | 'pending';
    per_page?: number;
    page?: number;
  } = {}): Promise<any[]> {
    try {
      const response = await this.octokit.rest.actions.listWorkflowRunsForRepo({
        owner: this.config.owner,
        repo: this.config.repo,
        ...options,
      });s
 */

import { Octokit } from '@octokit/rest';

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  head_branch: string;
  head_sha: string;
  run_number: number;
  event: string;
  display_title: string;
  path: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at: string | null;
  jobs_url: string;
  logs_url: string;
  check_suite_url: string;
  artifacts_url: string;
  cancel_url: string;
  rerun_url: string;
  workflow_url: string;
  pull_requests: any[];
  repository: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
  };
  head_commit: {
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
  };
}

interface JobStep {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
  started_at: string | null;
  completed_at: string | null;
}

interface WorkflowJob {
  id: number;
  run_id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string;
  completed_at: string | null;
  html_url: string;
  steps: JobStep[];
}

interface GitHubWorkflowMonitor {
  executionId: string;
  runId: number;
  status: 'queued' | 'in_progress' | 'completed' | 'cancelled';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  startTime: string | null;
  endTime: string | null;
  duration: number | null;
  jobs: WorkflowJob[];
  artifacts: any[];
  logs: string[];
}

export class GitHubApiService {
  private octokit: Octokit;
  private config: GitHubConfig;

  constructor(config: GitHubConfig) {
    this.config = config;
    this.octokit = new Octokit({
      auth: config.token,
    });
  }

  /**
   * Get workflow runs for a repository
   */
  async getWorkflowRuns(options: {
    branch?: string;
    event?: string;
    status?: string;
    per_page?: number;
    page?: number;
  } = {}): Promise<WorkflowRun[]> {
    try {
      const response = await this.octokit.rest.actions.listWorkflowRunsForRepo({
        owner: this.config.owner,
        repo: this.config.repo,
        ...options,
      });

      return response.data.workflow_runs as WorkflowRun[];
    } catch (error: unknown) {
      console.error('Error fetching workflow runs:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch workflow runs: ${errorMessage}`);
    }
  }

  /**
   * Get specific workflow run by ID
   */
  async getWorkflowRun(runId: number): Promise<WorkflowRun | null> {
    try {
      const response = await this.octokit.rest.actions.getWorkflowRun({
        owner: this.config.owner,
        repo: this.config.repo,
        run_id: runId,
      });

      return response.data as WorkflowRun;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return null;
      }
      console.error('Error fetching workflow run:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch workflow run: ${errorMessage}`);
    }
  }

  /**
   * Get jobs for a workflow run
   */
  async getWorkflowJobs(runId: number): Promise<WorkflowJob[]> {
    try {
      const response = await this.octokit.rest.actions.listJobsForWorkflowRun({
        owner: this.config.owner,
        repo: this.config.repo,
        run_id: runId,
      });

      return response.data.jobs as WorkflowJob[];
    } catch (error) {
      console.error('Error fetching workflow jobs:', error);
      throw new Error(`Failed to fetch workflow jobs: ${error.message}`);
    }
  }

  /**
   * Get logs for a workflow run
   */
  async getWorkflowLogs(runId: number): Promise<string> {
    try {
      const response = await this.octokit.rest.actions.downloadWorkflowRunLogs({
        owner: this.config.owner,
        repo: this.config.repo,
        run_id: runId,
      });

      // The response is a redirect URL to download logs
      return response.url;
    } catch (error) {
      console.error('Error fetching workflow logs:', error);
      throw new Error(`Failed to fetch workflow logs: ${error.message}`);
    }
  }

  /**
   * Get artifacts for a workflow run
   */
  async getWorkflowArtifacts(runId: number): Promise<any[]> {
    try {
      const response = await this.octokit.rest.actions.listWorkflowRunArtifacts({
        owner: this.config.owner,
        repo: this.config.repo,
        run_id: runId,
      });

      return response.data.artifacts;
    } catch (error) {
      console.error('Error fetching workflow artifacts:', error);
      throw new Error(`Failed to fetch workflow artifacts: ${error.message}`);
    }
  }

  /**
   * Monitor a workflow run and return comprehensive status
   */
  async monitorWorkflowRun(executionId: string, runId: number): Promise<GitHubWorkflowMonitor> {
    try {
      // Get workflow run details
      const workflowRun = await this.getWorkflowRun(runId);
      if (!workflowRun) {
        throw new Error(`Workflow run ${runId} not found`);
      }

      // Get jobs for the workflow run
      const jobs = await this.getWorkflowJobs(runId);

      // Get artifacts
      const artifacts = await this.getWorkflowArtifacts(runId);

      // Calculate duration if completed
      let duration: number | null = null;
      if (workflowRun.status === 'completed' && workflowRun.run_started_at) {
        const startTime = new Date(workflowRun.run_started_at).getTime();
        const endTime = new Date(workflowRun.updated_at).getTime();
        duration = endTime - startTime;
      }

      return {
        executionId,
        runId,
        status: workflowRun.status as any,
        conclusion: workflowRun.conclusion as any,
        startTime: workflowRun.run_started_at,
        endTime: workflowRun.status === 'completed' ? workflowRun.updated_at : null,
        duration,
        jobs,
        artifacts,
        logs: [], // Logs would need to be fetched and processed separately
      };
    } catch (error) {
      console.error('Error monitoring workflow run:', error);
      throw new Error(`Failed to monitor workflow run: ${error.message}`);
    }
  }

  /**
   * Trigger a workflow using repository dispatch
   */
  async triggerWorkflow(eventType: string, clientPayload: any): Promise<void> {
    try {
      await this.octokit.rest.repos.createDispatchEvent({
        owner: this.config.owner,
        repo: this.config.repo,
        event_type: eventType,
        client_payload: clientPayload,
      });
    } catch (error) {
      console.error('Error triggering workflow:', error);
      throw new Error(`Failed to trigger workflow: ${error.message}`);
    }
  }

  /**
   * Cancel a workflow run
   */
  async cancelWorkflowRun(runId: number): Promise<void> {
    try {
      await this.octokit.rest.actions.cancelWorkflowRun({
        owner: this.config.owner,
        repo: this.config.repo,
        run_id: runId,
      });
    } catch (error) {
      console.error('Error cancelling workflow run:', error);
      throw new Error(`Failed to cancel workflow run: ${error.message}`);
    }
  }

  /**
   * Get workflow run statistics for analytics
   */
  async getWorkflowStatistics(timeframe: 'day' | 'week' | 'month' = 'week'): Promise<{
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    averageDuration: number;
    successRate: number;
  }> {
    try {
      const now = new Date();
      const daysBack = timeframe === 'day' ? 1 : timeframe === 'week' ? 7 : 30;
      const since = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

      const runs = await this.getWorkflowRuns({
        per_page: 100,
      });

      // Filter runs within timeframe
      const filteredRuns = runs.filter(run => 
        new Date(run.created_at) >= since
      );

      const totalRuns = filteredRuns.length;
      const successfulRuns = filteredRuns.filter(run => run.conclusion === 'success').length;
      const failedRuns = filteredRuns.filter(run => run.conclusion === 'failure').length;

      // Calculate average duration for completed runs
      const completedRuns = filteredRuns.filter(run => 
        run.status === 'completed' && run.run_started_at
      );

      let totalDuration = 0;
      completedRuns.forEach(run => {
        if (run.run_started_at) {
          const startTime = new Date(run.run_started_at).getTime();
          const endTime = new Date(run.updated_at).getTime();
          totalDuration += (endTime - startTime);
        }
      });

      const averageDuration = completedRuns.length > 0 ? totalDuration / completedRuns.length : 0;
      const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

      return {
        totalRuns,
        successfulRuns,
        failedRuns,
        averageDuration,
        successRate: Math.round(successRate * 100) / 100,
      };
    } catch (error) {
      console.error('Error getting workflow statistics:', error);
      throw new Error(`Failed to get workflow statistics: ${error.message}`);
    }
  }

  /**
   * Health check for GitHub API connectivity
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    message: string;
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
  }> {
    try {
      const response = await this.octokit.rest.repos.get({
        owner: this.config.owner,
        repo: this.config.repo,
      });

      // Check rate limit
      const rateLimitResponse = await this.octokit.rest.rateLimit.get();
      const rateLimit = rateLimitResponse.data.rate;

      return {
        status: 'healthy',
        message: 'GitHub API is accessible',
        rateLimitRemaining: rateLimit.remaining,
        rateLimitReset: new Date(rateLimit.reset * 1000),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `GitHub API error: ${error.message}`,
      };
    }
  }
}

export default GitHubApiService;
