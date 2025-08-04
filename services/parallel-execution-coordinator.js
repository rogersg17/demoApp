const Database = require('../database/database');
const EventEmitter = require('events');

class ParallelExecutionCoordinator extends EventEmitter {
  constructor() {
    super();
    this.db = new Database();
    this.activeParallelExecutions = new Map(); // Track ongoing parallel executions
    this.coordinationInterval = null;
    this.timeoutCheckInterval = null;
    
    // Start coordination monitoring
    this.startCoordination();
    this.startTimeoutMonitoring();
    
    console.log('✅ Parallel Execution Coordinator initialized');
  }

  // ==================== PARALLEL EXECUTION ORCHESTRATION ====================

  async orchestrateParallelExecution(parentExecutionId, shardConfig) {
    try {
      const {
        total_shards = 4,
        test_suite,
        environment,
        runner_preferences = {},
        metadata = {}
      } = shardConfig;

      console.log(`🚀 Starting parallel execution ${parentExecutionId} with ${total_shards} shards`);

      // Create shard execution records
      const shards = [];
      for (let i = 1; i <= total_shards; i++) {
        const shard = await this.createShardExecution({
          parent_execution_id: parentExecutionId,
          shard_index: i,
          total_shards,
          test_suite,
          environment,
          runner_preferences,
          metadata
        });
        shards.push(shard);
      }

      // Store parallel execution info
      this.activeParallelExecutions.set(parentExecutionId, {
        shards,
        startTime: Date.now(),
        status: 'initializing',
        completedShards: 0,
        failedShards: 0
      });

      // Begin shard assignment and execution
      await this.assignAndExecuteShards(parentExecutionId, shards);
      
      this.emit('parallelExecutionStarted', { parentExecutionId, totalShards: total_shards });
      
      return {
        parentExecutionId,
        shards: shards.map(s => ({
          shard_id: s.shard_id,
          shard_index: s.shard_index,
          status: s.status
        })),
        totalShards: total_shards
      };
      
    } catch (error) {
      console.error(`❌ Failed to orchestrate parallel execution ${parentExecutionId}:`, error);
      await this.markParallelExecutionFailed(parentExecutionId, error.message);
      throw error;
    }
  }

  async createShardExecution(shardConfig) {
    const shardId = `${shardConfig.parent_execution_id}-shard-${shardConfig.shard_index}`;
    
    return new Promise((resolve, reject) => {
      this.db.db.run(`
        INSERT INTO parallel_executions (
          parent_execution_id, shard_id, shard_index, total_shards, status
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        shardConfig.parent_execution_id,
        shardId,
        shardConfig.shard_index,
        shardConfig.total_shards,
        'pending'
      ], function(err) {
        if (err) reject(err);
        else {
          resolve({
            id: this.lastID,
            parent_execution_id: shardConfig.parent_execution_id,
            shard_id: shardId,
            shard_index: shardConfig.shard_index,
            total_shards: shardConfig.total_shards,
            status: 'pending',
            ...shardConfig
          });
        }
      });
    });
  }

  async assignAndExecuteShards(parentExecutionId, shards) {
    // Get available runners for shard distribution
    const availableRunners = await this.getAvailableRunnersForParallel(shards[0]);
    
    if (availableRunners.length === 0) {
      throw new Error('No available runners for parallel execution');
    }

    // Distribute shards across available runners
    const shardAssignments = this.distributeShards(shards, availableRunners);
    
    // Execute each shard assignment
    const executionPromises = shardAssignments.map(assignment => 
      this.executeShard(assignment.shard, assignment.runner)
    );

    // Don't await all - let them execute independently
    // The coordination loop will monitor progress
    Promise.allSettled(executionPromises).then(results => {
      this.handleShardExecutionResults(parentExecutionId, results);
    });

    // Update parallel execution status
    await this.updateParallelExecutionStatus(parentExecutionId, 'running');
  }

  distributeShards(shards, runners) {
    const assignments = [];
    
    // Sort runners by capacity (prefer runners with more available slots)
    const sortedRunners = runners.sort((a, b) => {
      const aCapacity = (a.max_concurrent_jobs - a.current_jobs) / a.max_concurrent_jobs;
      const bCapacity = (b.max_concurrent_jobs - b.current_jobs) / b.max_concurrent_jobs;
      return bCapacity - aCapacity;
    });

    // Distribute shards using round-robin with capacity consideration
    let runnerIndex = 0;
    for (const shard of shards) {
      const selectedRunner = sortedRunners[runnerIndex % sortedRunners.length];
      
      // Skip runners that are at capacity
      let attempts = 0;
      while (selectedRunner.current_jobs >= selectedRunner.max_concurrent_jobs && attempts < sortedRunners.length) {
        runnerIndex = (runnerIndex + 1) % sortedRunners.length;
        attempts++;
      }
      
      assignments.push({
        shard,
        runner: sortedRunners[runnerIndex % sortedRunners.length]
      });
      
      // Update runner job count for next iteration
      sortedRunners[runnerIndex % sortedRunners.length].current_jobs++;
      runnerIndex++;
    }

    return assignments;
  }

  async executeShard(shard, runner) {
    try {
      console.log(`🧩 Executing shard ${shard.shard_index} on runner ${runner.name}`);
      
      // Assign runner to shard
      await this.assignRunnerToShard(shard.id, runner.id);
      
      // Mark shard as running
      await this.updateShardStatus(shard.id, 'running');
      
      // Prepare shard-specific execution parameters
      const shardMetadata = {
        shard_index: shard.shard_index,
        total_shards: shard.total_shards,
        parent_execution_id: shard.parent_execution_id,
        ...shard.metadata
      };

      // Trigger shard execution (similar to regular execution but with shard params)
      await this.triggerShardExecution(shard, runner, shardMetadata);
      
      this.emit('shardStarted', { 
        parentExecutionId: shard.parent_execution_id, 
        shardId: shard.shard_id,
        runnerId: runner.id 
      });
      
    } catch (error) {
      console.error(`❌ Failed to execute shard ${shard.shard_id}:`, error);
      await this.updateShardStatus(shard.id, 'failed', error.message);
      this.handleShardFailure(shard.parent_execution_id, shard.shard_id, error);
      throw error;
    }
  }

  async triggerShardExecution(shard, runner, metadata) {
    // This integrates with the EnhancedOrchestrationService to trigger actual execution
    const executionPayload = {
      execution_id: shard.shard_id,
      test_suite: shard.test_suite,
      environment: shard.environment,
      shard_index: shard.shard_index,
      total_shards: shard.total_shards,
      parent_execution_id: shard.parent_execution_id,
      webhook_url: this.buildShardWebhookUrl(shard),
      webhook_token: process.env.TMS_WEBHOOK_TOKEN,
      ...metadata
    };

    // Use the appropriate trigger method based on runner type
    return this.triggerRunnerExecution(runner, executionPayload);
  }

  buildShardWebhookUrl(shard) {
    const baseUrl = process.env.TMS_WEBHOOK_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/api/webhooks/parallel-execution/${shard.parent_execution_id}`;
  }

  async triggerRunnerExecution(runner, payload) {
    // Delegate to appropriate runner trigger based on type
    switch (runner.type) {
      case 'github-actions':
        return this.triggerGitHubActionsShard(runner, payload);
      case 'azure-devops':
        return this.triggerAzureDevOpsShard(runner, payload);
      case 'jenkins':
        return this.triggerJenkinsShard(runner, payload);
      case 'gitlab':
        return this.triggerGitLabShard(runner, payload);
      case 'docker':
        return this.triggerDockerShard(runner, payload);
      default:
        throw new Error(`Unsupported runner type for parallel execution: ${runner.type}`);
    }
  }

  // ==================== RUNNER-SPECIFIC SHARD TRIGGERS ====================

  async triggerGitHubActionsShard(runner, payload) {
    const fetch = require('node-fetch');
    const runnerConfig = runner.metadata ? JSON.parse(runner.metadata) : {};
    
    const response = await fetch(`https://api.github.com/repos/${runnerConfig.owner}/${runnerConfig.repo}/actions/workflows/${runnerConfig.workflow_id}/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${runnerConfig.github_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: runnerConfig.ref || 'main',
        inputs: {
          execution_id: payload.execution_id,
          test_suite: payload.test_suite,
          environment: payload.environment,
          shard_index: payload.shard_index.toString(),
          total_shards: payload.total_shards.toString(),
          parent_execution_id: payload.parent_execution_id,
          webhook_url: payload.webhook_url
        }
      })
    });

    if (!response.ok) {
      throw new Error(`GitHub Actions shard trigger failed: ${await response.text()}`);
    }
  }

  async triggerAzureDevOpsShard(runner, payload) {
    const fetch = require('node-fetch');
    const runnerConfig = runner.metadata ? JSON.parse(runner.metadata) : {};
    const auth = Buffer.from(`:${runnerConfig.pat_token}`).toString('base64');
    
    const response = await fetch(
      `https://dev.azure.com/${runnerConfig.organization}/${runnerConfig.project}/_apis/pipelines/${runnerConfig.pipeline_id}/runs?api-version=7.0`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateParameters: {
            executionId: payload.execution_id,
            testSuite: payload.test_suite,
            environment: payload.environment,
            shardIndex: payload.shard_index.toString(),
            totalShards: payload.total_shards.toString(),
            parentExecutionId: payload.parent_execution_id,
            webhookUrl: payload.webhook_url
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Azure DevOps shard trigger failed: ${await response.text()}`);
    }
  }

  async triggerJenkinsShard(runner, payload) {
    const fetch = require('node-fetch');
    const runnerConfig = runner.metadata ? JSON.parse(runner.metadata) : {};
    const auth = Buffer.from(`${runnerConfig.username}:${runnerConfig.api_token}`).toString('base64');
    
    const params = new URLSearchParams({
      EXECUTION_ID: payload.execution_id,
      TEST_SUITE: payload.test_suite,
      TEST_ENVIRONMENT: payload.environment,
      SHARD_INDEX: payload.shard_index.toString(),
      TOTAL_SHARDS: payload.total_shards.toString(),
      PARENT_EXECUTION_ID: payload.parent_execution_id,
      WEBHOOK_URL: payload.webhook_url,
      TMS_WEBHOOK_TOKEN: payload.webhook_token
    });

    const response = await fetch(`${runnerConfig.jenkins_url}/job/${runnerConfig.job_name}/buildWithParameters?${params}`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}` }
    });

    if (!response.ok) {
      throw new Error(`Jenkins shard trigger failed: ${response.status}`);
    }
  }

  async triggerGitLabShard(runner, payload) {
    const fetch = require('node-fetch');
    const runnerConfig = runner.metadata ? JSON.parse(runner.metadata) : {};
    
    const formData = new URLSearchParams({
      token: runnerConfig.trigger_token,
      ref: runnerConfig.ref || 'main',
      'variables[EXECUTION_ID]': payload.execution_id,
      'variables[TEST_SUITE]': payload.test_suite,
      'variables[TEST_ENVIRONMENT]': payload.environment,
      'variables[SHARD_INDEX]': payload.shard_index.toString(),
      'variables[TOTAL_SHARDS]': payload.total_shards.toString(),
      'variables[PARENT_EXECUTION_ID]': payload.parent_execution_id,
      'variables[WEBHOOK_URL]': payload.webhook_url,
      'variables[TMS_WEBHOOK_TOKEN]': payload.webhook_token
    });

    const response = await fetch(`${runnerConfig.gitlab_url || 'https://gitlab.com'}/api/v4/projects/${runnerConfig.project_id}/trigger/pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`GitLab shard trigger failed: ${await response.text()}`);
    }
  }

  async triggerDockerShard(runner, payload) {
    const { spawn } = require('child_process');
    const runnerConfig = runner.metadata ? JSON.parse(runner.metadata) : {};
    
    const env = {
      ...process.env,
      EXECUTION_ID: payload.execution_id,
      TEST_SUITE: payload.test_suite,
      TEST_ENVIRONMENT: payload.environment,
      SHARD_INDEX: payload.shard_index.toString(),
      TOTAL_SHARDS: payload.total_shards.toString(),
      PARENT_EXECUTION_ID: payload.parent_execution_id,
      WEBHOOK_URL: payload.webhook_url,
      TMS_WEBHOOK_TOKEN: payload.webhook_token
    };

    const containerName = `tms-shard-${payload.parent_execution_id}-${payload.shard_index}`;
    
    const dockerProcess = spawn('docker', [
      'run', '--rm', '--name', containerName,
      '--network', runnerConfig.network_name || 'tms-network',
      '-e', `EXECUTION_ID=${payload.execution_id}`,
      '-e', `TEST_SUITE=${payload.test_suite}`,
      '-e', `TEST_ENVIRONMENT=${payload.environment}`,
      '-e', `SHARD_INDEX=${payload.shard_index}`,
      '-e', `TOTAL_SHARDS=${payload.total_shards}`,
      '-e', `PARENT_EXECUTION_ID=${payload.parent_execution_id}`,
      '-e', `WEBHOOK_URL=${payload.webhook_url}`,
      '-e', `TMS_WEBHOOK_TOKEN=${payload.webhook_token}`,
      runnerConfig.docker_image || 'tms-test-runner:latest'
    ]);

    return new Promise((resolve, reject) => {
      dockerProcess.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Docker shard container exited with code ${code}`));
      });
      dockerProcess.on('error', reject);
    });
  }

  // ==================== COORDINATION AND MONITORING ====================

  startCoordination() {
    // Monitor parallel execution progress every 10 seconds
    this.coordinationInterval = setInterval(() => {
      this.monitorParallelExecutions();
    }, 10000);
    
    console.log('✅ Parallel execution coordination started');
  }

  stopCoordination() {
    if (this.coordinationInterval) {
      clearInterval(this.coordinationInterval);
      this.coordinationInterval = null;
      console.log('📴 Parallel execution coordination stopped');
    }
  }

  startTimeoutMonitoring() {
    // Check for timeout executions every 30 seconds
    this.timeoutCheckInterval = setInterval(() => {
      this.checkForTimeouts();
    }, 30000);
    
    console.log('✅ Parallel execution timeout monitoring started');
  }

  stopTimeoutMonitoring() {
    if (this.timeoutCheckInterval) {
      clearInterval(this.timeoutCheckInterval);
      this.timeoutCheckInterval = null;
      console.log('📴 Parallel execution timeout monitoring stopped');
    }
  }

  async monitorParallelExecutions() {
    try {
      for (const [parentExecutionId, execution] of this.activeParallelExecutions) {
        await this.checkParallelExecutionProgress(parentExecutionId, execution);
      }
    } catch (error) {
      console.error('❌ Error monitoring parallel executions:', error);
    }
  }

  async checkParallelExecutionProgress(parentExecutionId, execution) {
    // Get current shard statuses
    const shardStatuses = await this.getShardStatuses(parentExecutionId);
    
    const completedShards = shardStatuses.filter(s => s.status === 'completed').length;
    const failedShards = shardStatuses.filter(s => s.status === 'failed').length;
    const runningShards = shardStatuses.filter(s => s.status === 'running').length;
    const totalShards = shardStatuses.length;

    // Update execution tracking
    execution.completedShards = completedShards;
    execution.failedShards = failedShards;

    // Check if parallel execution is complete
    if (completedShards + failedShards === totalShards) {
      await this.finalizeParallelExecution(parentExecutionId, execution, shardStatuses);
    } else if (runningShards === 0 && completedShards + failedShards < totalShards) {
      // Some shards are stuck - might need intervention
      console.warn(`⚠️ Parallel execution ${parentExecutionId} has stuck shards`);
      await this.handleStuckShards(parentExecutionId, shardStatuses);
    }
  }

  async finalizeParallelExecution(parentExecutionId, execution, shardStatuses) {
    try {
      // Aggregate results from all shards
      const aggregatedResults = await this.aggregateShardResults(shardStatuses);
      
      // Determine overall status
      const overallStatus = execution.failedShards > 0 ? 'failed' : 'completed';
      
      // Update parent execution status
      await this.updateParallelExecutionStatus(parentExecutionId, overallStatus);
      
      // Remove from active tracking
      this.activeParallelExecutions.delete(parentExecutionId);
      
      console.log(`✅ Parallel execution ${parentExecutionId} completed: ${execution.completedShards} passed, ${execution.failedShards} failed`);
      
      this.emit('parallelExecutionCompleted', {
        parentExecutionId,
        status: overallStatus,
        completedShards: execution.completedShards,
        failedShards: execution.failedShards,
        totalShards: shardStatuses.length,
        aggregatedResults
      });
      
    } catch (error) {
      console.error(`❌ Failed to finalize parallel execution ${parentExecutionId}:`, error);
      await this.markParallelExecutionFailed(parentExecutionId, error.message);
    }
  }

  async aggregateShardResults(shardStatuses) {
    const aggregated = {
      total_tests: 0,
      passed_tests: 0,
      failed_tests: 0,
      skipped_tests: 0,
      duration: 0,
      failed_test_details: []
    };

    for (const shard of shardStatuses) {
      if (shard.test_results) {
        try {
          const results = JSON.parse(shard.test_results);
          aggregated.total_tests += results.total || 0;
          aggregated.passed_tests += results.passed || 0;
          aggregated.failed_tests += results.failed || 0;
          aggregated.skipped_tests += results.skipped || 0;
          
          if (results.failed_tests) {
            aggregated.failed_test_details.push(...results.failed_tests);
          }
        } catch (error) {
          console.error(`Error parsing shard results for ${shard.shard_id}:`, error);
        }
      }
    }

    return aggregated;
  }

  // ==================== WEBHOOK HANDLERS ====================

  async handleShardWebhook(parentExecutionId, shardWebhookData) {
    try {
      const { shard_id, status, results, artifacts_url, error_message } = shardWebhookData;
      
      // Update shard status
      await this.updateShardFromWebhook(shard_id, {
        status,
        test_results: results ? JSON.stringify(results) : null,
        artifacts_url,
        error_message,
        completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null
      });
      
      console.log(`📨 Received webhook for shard ${shard_id}: ${status}`);
      
      // Emit shard event
      this.emit('shardWebhookReceived', {
        parentExecutionId,
        shardId: shard_id,
        status,
        results
      });
      
      // Trigger progress check
      const execution = this.activeParallelExecutions.get(parentExecutionId);
      if (execution) {
        await this.checkParallelExecutionProgress(parentExecutionId, execution);
      }
      
    } catch (error) {
      console.error(`❌ Error handling shard webhook for ${parentExecutionId}:`, error);
    }
  }

  // ==================== DATABASE OPERATIONS ====================

  async getAvailableRunnersForParallel(sampleShard) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT * FROM test_runners 
        WHERE status = 'active' 
        AND health_status = 'healthy'
        AND current_jobs < max_concurrent_jobs
      `;
      const params = [];

      // Filter by runner type if specified in shard preferences
      if (sampleShard.runner_preferences && sampleShard.runner_preferences.runner_type) {
        query += ' AND type = ?';
        params.push(sampleShard.runner_preferences.runner_type);
      }

      query += ' ORDER BY (max_concurrent_jobs - current_jobs) DESC, priority DESC';

      this.db.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async assignRunnerToShard(shardId, runnerId) {
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      this.db.db.run(`
        UPDATE parallel_executions 
        SET runner_id = ?, started_at = ?
        WHERE id = ?
      `, [runnerId, now, shardId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async updateShardStatus(shardId, status, errorMessage = null) {
    const updates = { status };
    if (errorMessage) updates.error_message = errorMessage;
    if (status === 'completed' || status === 'failed') {
      updates.completed_at = new Date().toISOString();
    }

    const fields = Object.keys(updates).map(key => `${key} = ?`);
    const values = Object.values(updates);
    values.push(shardId);

    return new Promise((resolve, reject) => {
      this.db.db.run(`
        UPDATE parallel_executions 
        SET ${fields.join(', ')}
        WHERE id = ?
      `, values, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async updateShardFromWebhook(shardId, updates) {
    const fields = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== null && updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });
    
    if (fields.length === 0) return;
    
    values.push(shardId);

    return new Promise((resolve, reject) => {
      this.db.db.run(`
        UPDATE parallel_executions 
        SET ${fields.join(', ')}
        WHERE shard_id = ?
      `, values, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getShardStatuses(parentExecutionId) {
    return new Promise((resolve, reject) => {
      this.db.db.all(`
        SELECT * FROM parallel_executions 
        WHERE parent_execution_id = ?
        ORDER BY shard_index
      `, [parentExecutionId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async updateParallelExecutionStatus(parentExecutionId, status) {
    // This would update a parent execution record if we had one
    // For now, we'll track this in memory and emit events
    const execution = this.activeParallelExecutions.get(parentExecutionId);
    if (execution) {
      execution.status = status;
      if (status === 'completed' || status === 'failed') {
        execution.endTime = Date.now();
      }
    }
  }

  async markParallelExecutionFailed(parentExecutionId, errorMessage) {
    console.error(`❌ Marking parallel execution ${parentExecutionId} as failed: ${errorMessage}`);
    
    // Mark all pending/running shards as failed
    await this.failAllShards(parentExecutionId, errorMessage);
    
    // Remove from active tracking
    this.activeParallelExecutions.delete(parentExecutionId);
    
    this.emit('parallelExecutionFailed', { parentExecutionId, error: errorMessage });
  }

  async failAllShards(parentExecutionId, errorMessage) {
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      this.db.db.run(`
        UPDATE parallel_executions 
        SET status = 'failed', error_message = ?, completed_at = ?
        WHERE parent_execution_id = ? 
        AND status IN ('pending', 'running')
      `, [errorMessage, now, parentExecutionId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async handleStuckShards(parentExecutionId, shardStatuses) {
    const stuckShards = shardStatuses.filter(s => 
      s.status === 'pending' || (s.status === 'running' && 
      new Date() - new Date(s.started_at) > 30 * 60 * 1000) // 30 minutes
    );

    if (stuckShards.length > 0) {
      console.warn(`⚠️ Found ${stuckShards.length} stuck shards for execution ${parentExecutionId}`);
      
      // Could implement retry logic here
      for (const shard of stuckShards) {
        await this.updateShardStatus(shard.id, 'failed', 'Shard execution timeout or stuck');
      }
    }
  }

  async checkForTimeouts() {
    try {
      // Find shards that have been running too long (2 hours default)
      const timeoutMinutes = process.env.SHARD_TIMEOUT_MINUTES || 120;
      const timeoutTime = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();
      
      await new Promise((resolve, reject) => {
        this.db.db.run(`
          UPDATE parallel_executions 
          SET status = 'failed', error_message = 'Execution timeout', completed_at = ?
          WHERE status = 'running' 
          AND started_at < ?
        `, [new Date().toISOString(), timeoutTime], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
    } catch (error) {
      console.error('❌ Error checking for shard timeouts:', error);
    }
  }

  // ==================== CLEANUP ====================

  async cleanup() {
    console.log('🧹 Cleaning up Parallel Execution Coordinator...');
    
    this.stopCoordination();
    this.stopTimeoutMonitoring();
    
    // Clear active executions
    this.activeParallelExecutions.clear();
    
    console.log('✅ Parallel Execution Coordinator cleanup complete');
  }

  handleShardExecutionResults(parentExecutionId, results) {
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      console.error(`❌ ${failures.length} shard executions failed for ${parentExecutionId}`);
      failures.forEach(failure => {
        console.error('Shard failure:', failure.reason);
      });
    }
  }

  handleShardFailure(parentExecutionId, shardId, error) {
    console.error(`❌ Shard ${shardId} failed in parallel execution ${parentExecutionId}:`, error);
    this.emit('shardFailed', { parentExecutionId, shardId, error: error.message });
  }
}

module.exports = ParallelExecutionCoordinator;