const Database = require('../database/database');
const EventEmitter = require('events');

class EnhancedOrchestrationService extends EventEmitter {
  constructor() {
    super();
    this.db = new Database();
    this.activeExecutions = new Map(); // Track active executions
    this.runners = new Map(); // Cache of registered runners
    this.schedulerInterval = null;
    this.healthCheckInterval = null;
    
    // Start the scheduler and health monitoring
    this.startScheduler();
    this.startHealthMonitoring();
    
    console.log('✅ Enhanced Orchestration Service initialized');
  }

  // ==================== SCHEDULER SYSTEM ====================

  startScheduler() {
    // Run scheduler every 5 seconds
    this.schedulerInterval = setInterval(() => {
      this.processExecutionQueue();
    }, 5000);
    
    console.log('✅ Execution scheduler started');
  }

  stopScheduler() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      console.log('📴 Execution scheduler stopped');
    }
  }

  async processExecutionQueue() {
    try {
      // Get queued executions ordered by priority and creation time
      const queuedExecutions = await this.getQueuedExecutions();
      
      if (queuedExecutions.length === 0) {
        return; // No work to do
      }

      console.log(`📋 Processing ${queuedExecutions.length} queued executions`);

      for (const execution of queuedExecutions) {
        try {
          await this.assignExecution(execution);
        } catch (error) {
          console.error(`❌ Failed to assign execution ${execution.execution_id}:`, error);
          await this.markExecutionFailed(execution.execution_id, error.message);
        }
      }
    } catch (error) {
      console.error('❌ Error processing execution queue:', error);
    }
  }

  async getQueuedExecutions() {
    return new Promise((resolve, reject) => {
      this.db.db.all(`
        SELECT * FROM execution_queue 
        WHERE status = 'queued' 
        ORDER BY priority DESC, created_at ASC
        LIMIT 50
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async assignExecution(execution) {
    // Find suitable runner using load balancing strategy
    const suitableRunner = await this.findSuitableRunner(execution);
    
    if (!suitableRunner) {
      console.log(`⏳ No suitable runner available for execution ${execution.execution_id}`);
      return;
    }

    // Check if runner has capacity
    if (suitableRunner.current_jobs >= suitableRunner.max_concurrent_jobs) {
      console.log(`🚫 Runner ${suitableRunner.name} at capacity`);
      return;
    }

    // Assign execution to runner
    await this.assignExecutionToRunner(execution.execution_id, suitableRunner.id);
    
    // Trigger execution on the assigned runner
    await this.triggerExecution(execution, suitableRunner);
    
    console.log(`✅ Assigned execution ${execution.execution_id} to runner ${suitableRunner.name}`);
  }

  async findSuitableRunner(execution) {
    // Get active runners that match the execution requirements
    const availableRunners = await this.getAvailableRunners(execution);
    
    if (availableRunners.length === 0) {
      return null;
    }

    // Apply load balancing strategy
    const loadBalancingRules = await this.getLoadBalancingRules(execution);
    
    if (loadBalancingRules.length > 0) {
      return this.applyLoadBalancingRules(availableRunners, execution, loadBalancingRules);
    }

    // Default: round-robin with priority consideration
    return this.selectRunnerRoundRobin(availableRunners);
  }

  async getAvailableRunners(execution) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT * FROM test_runners 
        WHERE status = 'active' 
        AND health_status = 'healthy'
      `;
      const params = [];

      // Filter by requested runner type if specified
      if (execution.requested_runner_type) {
        query += ' AND type = ?';
        params.push(execution.requested_runner_type);
      }

      // Filter by specific runner if requested
      if (execution.requested_runner_id) {
        query += ' AND id = ?';
        params.push(execution.requested_runner_id);
      }

      query += ' ORDER BY priority DESC, current_jobs ASC';

      this.db.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async getLoadBalancingRules(execution) {
    return new Promise((resolve, reject) => {
      this.db.db.all(`
        SELECT * FROM load_balancing_rules 
        WHERE active = 1
        AND (test_suite_pattern IS NULL OR ? LIKE test_suite_pattern)
        AND (environment_pattern IS NULL OR ? LIKE environment_pattern)
        ORDER BY priority DESC
      `, [execution.test_suite, execution.environment], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  applyLoadBalancingRules(runners, execution, rules) {
    const primaryRule = rules[0]; // Use highest priority rule
    
    switch (primaryRule.rule_type) {
      case 'priority_based':
        return runners.reduce((best, current) => 
          current.priority > best.priority ? current : best
        );
      
      case 'resource_based':
        // Select runner with most available capacity
        return runners.reduce((best, current) => {
          const currentCapacity = (current.max_concurrent_jobs - current.current_jobs) / current.max_concurrent_jobs;
          const bestCapacity = (best.max_concurrent_jobs - best.current_jobs) / best.max_concurrent_jobs;
          return currentCapacity > bestCapacity ? current : best;
        });
      
      case 'round_robin':
      default:
        return this.selectRunnerRoundRobin(runners);
    }
  }

  selectRunnerRoundRobin(runners) {
    // Simple round-robin: select runner with least current jobs, considering priority
    return runners.reduce((best, current) => {
      if (current.priority > best.priority) return current;
      if (current.priority === best.priority && current.current_jobs < best.current_jobs) return current;
      return best;
    });
  }

  async assignExecutionToRunner(executionId, runnerId) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      
      this.db.db.run(`
        UPDATE execution_queue 
        SET assigned_runner_id = ?, assigned_at = ?, status = 'assigned'
        WHERE execution_id = ?
      `, [runnerId, now, executionId], (err) => {
        if (err) reject(err);
        else {
          // Update runner's current job count
          this.db.db.run(`
            UPDATE test_runners 
            SET current_jobs = current_jobs + 1, updated_at = ?
            WHERE id = ?
          `, [now, runnerId], (updateErr) => {
            if (updateErr) reject(updateErr);
            else resolve();
          });
        }
      });
    });
  }

  // ==================== EXECUTION MANAGEMENT ====================

  async queueExecution(executionData) {
    const {
      execution_id,
      test_suite,
      environment,
      priority = 50,
      estimated_duration,
      requested_runner_type,
      requested_runner_id,
      metadata = {}
    } = executionData;

    // Calculate timeout (estimated duration + 30% buffer, min 30 minutes)
    const timeoutBuffer = estimated_duration ? Math.max(estimated_duration * 1.3, 1800) : 3600;
    const timeout_at = new Date(Date.now() + (timeoutBuffer * 1000)).toISOString();

    return new Promise((resolve, reject) => {
      this.db.db.run(`
        INSERT INTO execution_queue (
          execution_id, test_suite, environment, priority, 
          estimated_duration, requested_runner_type, requested_runner_id, 
          timeout_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        execution_id, test_suite, environment, priority,
        estimated_duration, requested_runner_type, requested_runner_id,
        timeout_at, JSON.stringify(metadata)
      ], function(err) {
        if (err) reject(err);
        else {
          console.log(`📥 Queued execution ${execution_id} with priority ${priority}`);
          resolve({ id: this.lastID, execution_id });
        }
      });
    });
  }

  async triggerExecution(execution, runner) {
    try {
      // Mark execution as running
      await this.markExecutionRunning(execution.execution_id);
      
      // Parse metadata for execution parameters
      const metadata = execution.metadata ? JSON.parse(execution.metadata) : {};
      
      // Prepare webhook URL for result reporting
      const webhookUrl = process.env.TMS_WEBHOOK_BASE_URL || 'http://localhost:3000';
      const resultWebhookUrl = `${webhookUrl}/api/webhooks/test-results`;
      
      // Build execution payload based on runner type
      const executionPayload = {
        execution_id: execution.execution_id,
        test_suite: execution.test_suite,
        environment: execution.environment,
        webhook_url: resultWebhookUrl,
        webhook_token: process.env.TMS_WEBHOOK_TOKEN,
        ...metadata
      };

      // Trigger execution based on runner type
      switch (runner.type) {
        case 'github-actions':
          await this.triggerGitHubActions(runner, executionPayload);
          break;
        
        case 'azure-devops':
          await this.triggerAzureDevOps(runner, executionPayload);
          break;
        
        case 'jenkins':
          await this.triggerJenkins(runner, executionPayload);
          break;
        
        case 'gitlab':
          await this.triggerGitLab(runner, executionPayload);
          break;
        
        case 'docker':
          await this.triggerDocker(runner, executionPayload);
          break;
        
        case 'custom':
          await this.triggerCustomRunner(runner, executionPayload);
          break;
          
        default:
          throw new Error(`Unsupported runner type: ${runner.type}`);
      }

      // Record execution start metrics
      await this.recordExecutionMetric(execution.execution_id, runner.id, 'queue_time', 
        (Date.now() - new Date(execution.created_at).getTime()) / 1000);
      
      this.emit('executionStarted', { executionId: execution.execution_id, runnerId: runner.id });
      
    } catch (error) {
      console.error(`❌ Failed to trigger execution ${execution.execution_id}:`, error);
      await this.markExecutionFailed(execution.execution_id, error.message);
      throw error;
    }
  }

  // ==================== RUNNER-SPECIFIC TRIGGERS ====================

  async triggerGitHubActions(runner, payload) {
    const fetch = require('node-fetch');
    
    const runnerConfig = runner.metadata ? JSON.parse(runner.metadata) : {};
    const { owner, repo, workflow_id, github_token } = runnerConfig;
    
    if (!owner || !repo || !workflow_id || !github_token) {
      throw new Error('GitHub Actions runner missing required configuration');
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow_id}/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${github_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: runnerConfig.ref || 'main',
        inputs: {
          execution_id: payload.execution_id,
          test_suite: payload.test_suite,
          environment: payload.environment,
          webhook_url: payload.webhook_url
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub Actions trigger failed: ${error}`);
    }
  }

  async triggerAzureDevOps(runner, payload) {
    const fetch = require('node-fetch');
    
    const runnerConfig = runner.metadata ? JSON.parse(runner.metadata) : {};
    const { organization, project, pipeline_id, pat_token } = runnerConfig;
    
    if (!organization || !project || !pipeline_id || !pat_token) {
      throw new Error('Azure DevOps runner missing required configuration');
    }

    const auth = Buffer.from(`:${pat_token}`).toString('base64');
    
    const response = await fetch(
      `https://dev.azure.com/${organization}/${project}/_apis/pipelines/${pipeline_id}/runs?api-version=7.0`,
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
            webhookUrl: payload.webhook_url
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Azure DevOps trigger failed: ${error}`);
    }
  }

  async triggerJenkins(runner, payload) {
    const fetch = require('node-fetch');
    
    const runnerConfig = runner.metadata ? JSON.parse(runner.metadata) : {};
    const { jenkins_url, job_name, username, api_token } = runnerConfig;
    
    if (!jenkins_url || !job_name || !username || !api_token) {
      throw new Error('Jenkins runner missing required configuration');
    }

    const auth = Buffer.from(`${username}:${api_token}`).toString('base64');
    const buildUrl = `${jenkins_url}/job/${job_name}/buildWithParameters`;
    
    const params = new URLSearchParams({
      EXECUTION_ID: payload.execution_id,
      TEST_SUITE: payload.test_suite,
      TEST_ENVIRONMENT: payload.environment,
      WEBHOOK_URL: payload.webhook_url,
      TMS_WEBHOOK_TOKEN: payload.webhook_token
    });

    const response = await fetch(`${buildUrl}?${params}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jenkins trigger failed: ${response.status} ${error}`);
    }
  }

  async triggerGitLab(runner, payload) {
    const fetch = require('node-fetch');
    
    const runnerConfig = runner.metadata ? JSON.parse(runner.metadata) : {};
    const { gitlab_url = 'https://gitlab.com', project_id, trigger_token } = runnerConfig;
    
    if (!project_id || !trigger_token) {
      throw new Error('GitLab runner missing required configuration');
    }

    const response = await fetch(`${gitlab_url}/api/v4/projects/${project_id}/trigger/pipeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        token: trigger_token,
        ref: runnerConfig.ref || 'main',
        'variables[EXECUTION_ID]': payload.execution_id,
        'variables[TEST_SUITE]': payload.test_suite,
        'variables[TEST_ENVIRONMENT]': payload.environment,
        'variables[WEBHOOK_URL]': payload.webhook_url,
        'variables[TMS_WEBHOOK_TOKEN]': payload.webhook_token
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitLab trigger failed: ${error}`);
    }
  }

  async triggerDocker(runner, payload) {
    const { spawn } = require('child_process');
    
    const runnerConfig = runner.metadata ? JSON.parse(runner.metadata) : {};
    const { 
      docker_image = 'tms-test-runner:latest',
      docker_compose_file,
      network_name = 'tms-network'
    } = runnerConfig;

    // Prepare environment variables
    const env = {
      ...process.env,
      EXECUTION_ID: payload.execution_id,
      TEST_SUITE: payload.test_suite,
      TEST_ENVIRONMENT: payload.environment,
      WEBHOOK_URL: payload.webhook_url,
      TMS_WEBHOOK_TOKEN: payload.webhook_token
    };

    if (docker_compose_file) {
      // Use Docker Compose for orchestrated execution
      const composeProcess = spawn('docker-compose', [
        '-f', docker_compose_file,
        '--profile', 'sharded',
        'up', '--abort-on-container-exit'
      ], { env });

      return new Promise((resolve, reject) => {
        composeProcess.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Docker Compose exited with code ${code}`));
        });
        
        composeProcess.on('error', reject);
      });
    } else {
      // Use single Docker container
      const dockerProcess = spawn('docker', [
        'run', '--rm',
        '--network', network_name,
        '-e', `EXECUTION_ID=${payload.execution_id}`,
        '-e', `TEST_SUITE=${payload.test_suite}`,
        '-e', `TEST_ENVIRONMENT=${payload.environment}`,
        '-e', `WEBHOOK_URL=${payload.webhook_url}`,
        '-e', `TMS_WEBHOOK_TOKEN=${payload.webhook_token}`,
        docker_image
      ]);

      return new Promise((resolve, reject) => {
        dockerProcess.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Docker container exited with code ${code}`));
        });
        
        dockerProcess.on('error', reject);
      });
    }
  }

  async triggerCustomRunner(runner, payload) {
    const fetch = require('node-fetch');
    
    if (!runner.endpoint_url) {
      throw new Error('Custom runner missing endpoint URL');
    }

    const response = await fetch(runner.endpoint_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TMS_RUNNER_API_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Custom runner trigger failed: ${error}`);
    }
  }

  // ==================== EXECUTION STATUS MANAGEMENT ====================

  async markExecutionRunning(executionId) {
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      this.db.db.run(`
        UPDATE execution_queue 
        SET status = 'running', started_at = ?
        WHERE execution_id = ?
      `, [now, executionId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async markExecutionCompleted(executionId) {
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      this.db.db.run(`
        UPDATE execution_queue 
        SET status = 'completed', completed_at = ?
        WHERE execution_id = ?
      `, [now, executionId], (err) => {
        if (err) reject(err);
        else {
          // Decrease runner's current job count
          this.db.db.run(`
            UPDATE test_runners 
            SET current_jobs = current_jobs - 1, updated_at = ?
            WHERE id = (SELECT assigned_runner_id FROM execution_queue WHERE execution_id = ?)
          `, [now, executionId], (updateErr) => {
            if (updateErr) console.error('Error updating runner job count:', updateErr);
            resolve();
          });
        }
      });
    });
  }

  async markExecutionFailed(executionId, errorMessage) {
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      this.db.db.run(`
        UPDATE execution_queue 
        SET status = 'failed', completed_at = ?
        WHERE execution_id = ?
      `, [now, executionId], (err) => {
        if (err) reject(err);
        else {
          // Decrease runner's current job count
          this.db.db.run(`
            UPDATE test_runners 
            SET current_jobs = current_jobs - 1, updated_at = ?
            WHERE id = (SELECT assigned_runner_id FROM execution_queue WHERE execution_id = ?)
          `, [now, executionId], (updateErr) => {
            if (updateErr) console.error('Error updating runner job count:', updateErr);
            resolve();
          });
        }
      });
    });
  }

  // ==================== HEALTH MONITORING ====================

  startHealthMonitoring() {
    // Check runner health every 2 minutes
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 120000);
    
    console.log('✅ Runner health monitoring started');
  }

  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('📴 Runner health monitoring stopped');
    }
  }

  async performHealthChecks() {
    try {
      const activeRunners = await this.getActiveRunners();
      
      for (const runner of activeRunners) {
        try {
          await this.checkRunnerHealth(runner);
        } catch (error) {
          console.error(`❌ Health check failed for runner ${runner.name}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Error performing health checks:', error);
    }
  }

  async getActiveRunners() {
    return new Promise((resolve, reject) => {
      this.db.db.all(`
        SELECT * FROM test_runners 
        WHERE status IN ('active', 'error')
        AND health_check_url IS NOT NULL
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async checkRunnerHealth(runner) {
    const fetch = require('node-fetch');
    const startTime = Date.now();
    
    try {
      const response = await fetch(runner.health_check_url, {
        method: 'GET',
        timeout: 10000 // 10 second timeout
      });
      
      const responseTime = Date.now() - startTime;
      const isHealthy = response.ok;
      const healthStatus = isHealthy ? 'healthy' : 'unhealthy';
      
      // Update runner health status
      await this.updateRunnerHealth(runner.id, healthStatus, responseTime);
      
      // Record health history
      await this.recordHealthHistory(runner.id, healthStatus, responseTime);
      
      if (!isHealthy) {
        console.warn(`⚠️ Runner ${runner.name} health check failed: ${response.status}`);
      }
      
    } catch (error) {
      // Mark runner as unhealthy
      await this.updateRunnerHealth(runner.id, 'unhealthy', null, error.message);
      await this.recordHealthHistory(runner.id, 'offline', null, error.message);
      
      console.error(`❌ Runner ${runner.name} health check error:`, error.message);
    }
  }

  async updateRunnerHealth(runnerId, healthStatus, responseTime, errorMessage = null) {
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      this.db.db.run(`
        UPDATE test_runners 
        SET health_status = ?, last_health_check = ?, updated_at = ?
        WHERE id = ?
      `, [healthStatus, now, now, runnerId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async recordHealthHistory(runnerId, healthStatus, responseTime, errorMessage = null) {
    return new Promise((resolve, reject) => {
      this.db.db.run(`
        INSERT INTO runner_health_history (
          runner_id, health_status, response_time, error_message
        ) VALUES (?, ?, ?, ?)
      `, [runnerId, healthStatus, responseTime, errorMessage], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // ==================== METRICS AND MONITORING ====================

  async recordExecutionMetric(executionId, runnerId, metricType, metricValue, metricUnit = 'seconds', metadata = {}) {
    return new Promise((resolve, reject) => {
      this.db.db.run(`
        INSERT INTO execution_metrics (
          execution_id, runner_id, metric_type, metric_value, metric_unit, metadata
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        executionId, runnerId, metricType, metricValue, metricUnit, JSON.stringify(metadata)
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getExecutionMetrics(executionId) {
    return new Promise((resolve, reject) => {
      this.db.db.all(`
        SELECT * FROM execution_metrics 
        WHERE execution_id = ?
        ORDER BY timestamp ASC
      `, [executionId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async getRunnerPerformanceMetrics(runnerId, hours = 24) {
    return new Promise((resolve, reject) => {
      this.db.db.all(`
        SELECT 
          metric_type,
          AVG(metric_value) as avg_value,
          MIN(metric_value) as min_value,
          MAX(metric_value) as max_value,
          COUNT(*) as count
        FROM execution_metrics 
        WHERE runner_id = ? 
        AND timestamp > datetime('now', '-${hours} hours')
        GROUP BY metric_type
      `, [runnerId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  // ==================== CLEANUP AND SHUTDOWN ====================

  async cleanup() {
    console.log('🧹 Cleaning up Enhanced Orchestration Service...');
    
    this.stopScheduler();
    this.stopHealthMonitoring();
    
    // Cancel any timeout executions
    await this.cancelTimeoutExecutions();
    
    // Close database connection
    if (this.db) {
      this.db.close();
    }
    
    console.log('✅ Enhanced Orchestration Service cleanup complete');
  }

  async cancelTimeoutExecutions() {
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      this.db.db.run(`
        UPDATE execution_queue 
        SET status = 'timeout', completed_at = ?
        WHERE status IN ('queued', 'assigned', 'running') 
        AND timeout_at < ?
      `, [now, now], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = EnhancedOrchestrationService;