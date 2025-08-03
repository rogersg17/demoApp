/**
 * Test Execution Queue Service
 * Manages test execution requests and coordinates with external CI/CD systems
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class TestExecutionQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = new Map(); // executionId -> execution details
    this.activeExecutions = new Map(); // executionId -> execution status
    this.executionHistory = []; // Array of completed executions
    this.maxHistorySize = 100;
  }

  /**
   * Queue a new test execution request
   */
  queueExecution(requestData) {
    const executionId = `exec_${Date.now()}_${uuidv4().slice(0, 8)}`;
    
    const execution = {
      id: executionId,
      status: 'queued',
      priority: requestData.priority || 'normal',
      requestedBy: requestData.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      testFiles: requestData.testFiles || [],
      suite: requestData.suite || 'default',
      grep: requestData.grep,
      environment: requestData.environment || 'default',
      targetRunner: requestData.targetRunner || 'auto', // 'github-actions', 'azure-devops', 'jenkins', etc.
      webhookUrl: requestData.webhookUrl, // Where to send results back
      metadata: {
        estimatedDuration: this.estimateExecutionTime(requestData.testFiles),
        tags: requestData.tags || [],
        branch: requestData.branch || 'main',
        commit: requestData.commit
      }
    };

    this.queue.set(executionId, execution);
    this.activeExecutions.set(executionId, execution);

    console.log(`📋 Queued test execution: ${executionId}`);
    console.log(`   Tests: ${execution.testFiles.length} files`);
    console.log(`   Priority: ${execution.priority}`);
    console.log(`   Target: ${execution.targetRunner}`);

    // Emit queued event
    this.emit('execution-queued', execution);

    return execution;
  }

  /**
   * Trigger execution via external CI/CD system
   */
  async triggerExecution(executionId) {
    const execution = this.queue.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    execution.status = 'triggering';
    execution.updatedAt = new Date().toISOString();
    execution.triggeredAt = new Date().toISOString();

    console.log(`🚀 Triggering test execution: ${executionId}`);

    try {
      // Determine which CI/CD system to use
      const triggerResult = await this.dispatchToRunner(execution);
      
      execution.status = 'running';
      execution.externalRunId = triggerResult.runId;
      execution.externalRunUrl = triggerResult.runUrl;
      execution.updatedAt = new Date().toISOString();

      console.log(`✅ Successfully triggered ${executionId} on ${execution.targetRunner}`);
      console.log(`   External Run ID: ${execution.externalRunId}`);
      console.log(`   Run URL: ${execution.externalRunUrl}`);

      // Emit running event
      this.emit('execution-running', execution);

      return triggerResult;
    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.updatedAt = new Date().toISOString();

      console.error(`❌ Failed to trigger ${executionId}:`, error.message);

      // Emit error event
      this.emit('execution-error', execution);

      throw error;
    }
  }

  /**
   * Dispatch execution to appropriate CI/CD runner
   */
  async dispatchToRunner(execution) {
    switch (execution.targetRunner) {
      case 'github-actions':
        return await this.triggerGitHubActions(execution);
      case 'azure-devops':
        return await this.triggerAzureDevOps(execution);
      case 'jenkins':
        return await this.triggerJenkins(execution);
      case 'auto':
        return await this.selectBestRunner(execution);
      default:
        throw new Error(`Unsupported runner: ${execution.targetRunner}`);
    }
  }

  /**
   * Trigger GitHub Actions workflow
   */
  async triggerGitHubActions(execution) {
    // Implementation would integrate with GitHub API to trigger workflow
    // For now, return mock data
    return {
      runId: `gh_${Date.now()}`,
      runUrl: `https://github.com/owner/repo/actions/runs/${Date.now()}`,
      provider: 'github-actions'
    };
  }

  /**
   * Trigger Azure DevOps pipeline
   */
  async triggerAzureDevOps(execution) {
    // Implementation would integrate with Azure DevOps API
    return {
      runId: `ado_${Date.now()}`,
      runUrl: `https://dev.azure.com/org/project/_build/results?buildId=${Date.now()}`,
      provider: 'azure-devops'
    };
  }

  /**
   * Trigger Jenkins job
   */
  async triggerJenkins(execution) {
    // Implementation would integrate with Jenkins API
    return {
      runId: `jenkins_${Date.now()}`,
      runUrl: `https://jenkins.example.com/job/test-job/${Date.now()}`,
      provider: 'jenkins'
    };
  }

  /**
   * Select best available runner based on load and capabilities
   */
  async selectBestRunner(execution) {
    // Simple logic - prefer GitHub Actions for small test suites, Azure DevOps for larger ones
    const testCount = execution.testFiles.length;
    
    if (testCount <= 10) {
      execution.targetRunner = 'github-actions';
      return await this.triggerGitHubActions(execution);
    } else {
      execution.targetRunner = 'azure-devops';
      return await this.triggerAzureDevOps(execution);
    }
  }

  /**
   * Process results received from external runner
   */
  processResults(executionId, results) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      console.warn(`⚠️ Received results for unknown execution: ${executionId}`);
      return false;
    }

    execution.status = 'completed';
    execution.completedAt = new Date().toISOString();
    execution.updatedAt = new Date().toISOString();
    execution.results = results;

    // Calculate actual duration
    if (execution.triggeredAt) {
      const duration = new Date(execution.completedAt) - new Date(execution.triggeredAt);
      execution.actualDuration = Math.round(duration / 1000); // seconds
    }

    console.log(`✅ Test execution completed: ${executionId}`);
    console.log(`   Total: ${results.total}, Passed: ${results.passed}, Failed: ${results.failed}`);
    console.log(`   Duration: ${execution.actualDuration}s`);

    // Move to history
    this.moveToHistory(execution);

    // Emit completion event
    this.emit('execution-completed', execution);

    return true;
  }

  /**
   * Handle execution failure
   */
  processFailure(executionId, error) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      console.warn(`⚠️ Received failure for unknown execution: ${executionId}`);
      return false;
    }

    execution.status = 'failed';
    execution.completedAt = new Date().toISOString();
    execution.updatedAt = new Date().toISOString();
    execution.error = error.message || error;

    console.error(`❌ Test execution failed: ${executionId}`);
    console.error(`   Error: ${execution.error}`);

    // Move to history
    this.moveToHistory(execution);

    // Emit failure event
    this.emit('execution-failed', execution);

    return true;
  }

  /**
   * Move execution to history and clean up active tracking
   */
  moveToHistory(execution) {
    // Add to history
    this.executionHistory.unshift(execution);
    
    // Limit history size
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(0, this.maxHistorySize);
    }

    // Remove from active tracking
    this.activeExecutions.delete(execution.id);
    this.queue.delete(execution.id);
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId) {
    return this.activeExecutions.get(executionId) || 
           this.executionHistory.find(exec => exec.id === executionId);
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    const queued = Array.from(this.queue.values()).filter(exec => exec.status === 'queued');
    const running = Array.from(this.activeExecutions.values()).filter(exec => exec.status === 'running');
    
    return {
      queued: queued.length,
      running: running.length,
      total: this.queue.size,
      queuedExecutions: queued,
      runningExecutions: running
    };
  }

  /**
   * Estimate execution time based on test files
   */
  estimateExecutionTime(testFiles) {
    const baseTime = 30; // Base 30 seconds
    const timePerTest = 5; // 5 seconds per test file
    const estimatedSeconds = baseTime + (testFiles.length * timePerTest);
    return `${Math.round(estimatedSeconds / 60)}m ${estimatedSeconds % 60}s`;
  }

  /**
   * Cancel execution
   */
  async cancelExecution(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status === 'completed' || execution.status === 'failed') {
      throw new Error(`Cannot cancel ${execution.status} execution`);
    }

    execution.status = 'cancelled';
    execution.cancelledAt = new Date().toISOString();
    execution.updatedAt = new Date().toISOString();

    console.log(`🚫 Cancelled test execution: ${executionId}`);

    // Move to history
    this.moveToHistory(execution);

    // Emit cancellation event
    this.emit('execution-cancelled', execution);

    return execution;
  }
}

module.exports = TestExecutionQueue;
