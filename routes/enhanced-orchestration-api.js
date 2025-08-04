const express = require('express');
const router = express.Router();
const EnhancedOrchestrationService = require('../services/enhanced-orchestration-service');
const ResourceAllocationService = require('../services/resource-allocation-service');
const ParallelExecutionCoordinator = require('../services/parallel-execution-coordinator');

// Initialize services
const orchestrationService = new EnhancedOrchestrationService();
const resourceService = new ResourceAllocationService();
const parallelCoordinator = new ParallelExecutionCoordinator();

// ==================== TEST RUNNER MANAGEMENT ====================

// Register a new test runner
router.post('/runners/register', async (req, res) => {
  try {
    const {
      name,
      type,
      endpoint_url,
      webhook_url,
      capabilities = {},
      max_concurrent_jobs = 1,
      priority = 50,
      health_check_url,
      metadata = {}
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    const result = await orchestrationService.db.db.run(`
      INSERT INTO test_runners (
        name, type, endpoint_url, webhook_url, capabilities, 
        max_concurrent_jobs, priority, health_check_url, status, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `, [
      name, type, endpoint_url, webhook_url, JSON.stringify(capabilities),
      max_concurrent_jobs, priority, health_check_url, JSON.stringify(metadata)
    ]);

    res.json({
      success: true,
      runnerId: result.lastID,
      message: 'Test runner registered successfully'
    });

  } catch (error) {
    console.error('Error registering test runner:', error);
    res.status(500).json({ error: 'Failed to register test runner' });
  }
});

// Get all test runners
router.get('/runners', async (req, res) => {
  try {
    const runners = await new Promise((resolve, reject) => {
      orchestrationService.db.db.all(`
        SELECT * FROM test_runners
        ORDER BY status, priority DESC, name
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    res.json(runners);
  } catch (error) {
    console.error('Error fetching test runners:', error);
    res.status(500).json({ error: 'Failed to fetch test runners' });
  }
});

// Update test runner
router.put('/runners/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const allowedFields = [
      'status', 'max_concurrent_jobs', 'priority', 'capabilities', 
      'endpoint_url', 'webhook_url', 'health_check_url', 'metadata'
    ];
    
    const fields = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        if (key === 'capabilities' || key === 'metadata') {
          values.push(JSON.stringify(updates[key]));
        } else {
          values.push(updates[key]);
        }
      }
    });
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    await new Promise((resolve, reject) => {
      orchestrationService.db.db.run(`
        UPDATE test_runners 
        SET ${fields.join(', ')}
        WHERE id = ?
      `, values, function(err) {
        if (err) reject(err);
        else if (this.changes === 0) reject(new Error('Runner not found'));
        else resolve();
      });
    });

    res.json({ success: true, message: 'Test runner updated successfully' });

  } catch (error) {
    console.error('Error updating test runner:', error);
    res.status(500).json({ error: 'Failed to update test runner' });
  }
});

// Delete test runner
router.delete('/runners/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await new Promise((resolve, reject) => {
      orchestrationService.db.db.run(`
        DELETE FROM test_runners WHERE id = ?
      `, [id], function(err) {
        if (err) reject(err);
        else if (this.changes === 0) reject(new Error('Runner not found'));
        else resolve();
      });
    });

    res.json({ success: true, message: 'Test runner deleted successfully' });

  } catch (error) {
    console.error('Error deleting test runner:', error);
    res.status(500).json({ error: 'Failed to delete test runner' });
  }
});

// ==================== EXECUTION MANAGEMENT ====================

// Queue a new test execution
router.post('/executions/queue', async (req, res) => {
  try {
    const {
      test_suite = 'all',
      environment = 'staging',
      priority = 50,
      estimated_duration,
      requested_runner_type,
      requested_runner_id,
      parallel_shards,
      metadata = {}
    } = req.body;

    const execution_id = `exec-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    if (parallel_shards && parallel_shards > 1) {
      // Queue parallel execution
      const result = await parallelCoordinator.orchestrateParallelExecution(execution_id, {
        total_shards: parallel_shards,
        test_suite,
        environment,
        runner_preferences: {
          runner_type: requested_runner_type,
          runner_id: requested_runner_id
        },
        metadata
      });

      res.json({
        success: true,
        execution_id,
        type: 'parallel',
        shards: result.totalShards,
        message: 'Parallel execution queued successfully'
      });

    } else {
      // Queue regular execution
      const result = await orchestrationService.queueExecution({
        execution_id,
        test_suite,
        environment,
        priority,
        estimated_duration,
        requested_runner_type,
        requested_runner_id,
        metadata
      });

      res.json({
        success: true,
        execution_id,
        type: 'regular',
        message: 'Execution queued successfully'
      });
    }

  } catch (error) {
    console.error('Error queueing execution:', error);
    res.status(500).json({ error: 'Failed to queue execution' });
  }
});

// Get execution status
router.get('/executions/:executionId/status', async (req, res) => {
  try {
    const { executionId } = req.params;

    // Check if it's a regular execution
    const regularExecution = await new Promise((resolve, reject) => {
      orchestrationService.db.db.get(`
        SELECT eq.*, tr.name as runner_name, tr.type as runner_type
        FROM execution_queue eq
        LEFT JOIN test_runners tr ON eq.assigned_runner_id = tr.id
        WHERE eq.execution_id = ?
      `, [executionId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (regularExecution) {
      return res.json({
        type: 'regular',
        execution: regularExecution
      });
    }

    // Check if it's a parallel execution
    const parallelShards = await new Promise((resolve, reject) => {
      orchestrationService.db.db.all(`
        SELECT pe.*, tr.name as runner_name, tr.type as runner_type
        FROM parallel_executions pe
        LEFT JOIN test_runners tr ON pe.runner_id = tr.id
        WHERE pe.parent_execution_id = ?
        ORDER BY pe.shard_index
      `, [executionId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    if (parallelShards.length > 0) {
      const completedShards = parallelShards.filter(s => s.status === 'completed').length;
      const failedShards = parallelShards.filter(s => s.status === 'failed').length;
      const runningShards = parallelShards.filter(s => s.status === 'running').length;
      
      return res.json({
        type: 'parallel',
        parent_execution_id: executionId,
        total_shards: parallelShards.length,
        completed_shards: completedShards,
        failed_shards: failedShards,
        running_shards: runningShards,
        shards: parallelShards
      });
    }

    res.status(404).json({ error: 'Execution not found' });

  } catch (error) {
    console.error('Error getting execution status:', error);
    res.status(500).json({ error: 'Failed to get execution status' });
  }
});

// Cancel execution
router.post('/executions/:executionId/cancel', async (req, res) => {
  try {
    const { executionId } = req.params;

    // Try to cancel regular execution
    const regularResult = await new Promise((resolve, reject) => {
      orchestrationService.db.db.run(`
        UPDATE execution_queue 
        SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP
        WHERE execution_id = ? AND status IN ('queued', 'assigned', 'running')
      `, [executionId], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });

    if (regularResult > 0) {
      return res.json({ success: true, message: 'Regular execution cancelled' });
    }

    // Try to cancel parallel execution
    const parallelResult = await new Promise((resolve, reject) => {
      orchestrationService.db.db.run(`
        UPDATE parallel_executions 
        SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP
        WHERE parent_execution_id = ? AND status IN ('pending', 'running')
      `, [executionId], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });

    if (parallelResult > 0) {
      return res.json({ success: true, message: 'Parallel execution cancelled' });
    }

    res.status(404).json({ error: 'Execution not found or cannot be cancelled' });

  } catch (error) {
    console.error('Error cancelling execution:', error);
    res.status(500).json({ error: 'Failed to cancel execution' });
  }
});

// ==================== LOAD BALANCING RULES ====================

// Create load balancing rule
router.post('/load-balancing-rules', async (req, res) => {
  try {
    const {
      name,
      rule_type,
      test_suite_pattern,
      environment_pattern,
      runner_type_filter,
      priority = 50,
      active = true,
      rule_config = {}
    } = req.body;

    if (!name || !rule_type) {
      return res.status(400).json({ error: 'Name and rule type are required' });
    }

    const result = await new Promise((resolve, reject) => {
      orchestrationService.db.db.run(`
        INSERT INTO load_balancing_rules (
          name, rule_type, test_suite_pattern, environment_pattern,
          runner_type_filter, priority, active, rule_config
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name, rule_type, test_suite_pattern, environment_pattern,
        runner_type_filter, priority, active, JSON.stringify(rule_config)
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    });

    res.json({
      success: true,
      ruleId: result.id,
      message: 'Load balancing rule created successfully'
    });

  } catch (error) {
    console.error('Error creating load balancing rule:', error);
    res.status(500).json({ error: 'Failed to create load balancing rule' });
  }
});

// Get load balancing rules
router.get('/load-balancing-rules', async (req, res) => {
  try {
    const rules = await new Promise((resolve, reject) => {
      orchestrationService.db.db.all(`
        SELECT * FROM load_balancing_rules
        ORDER BY priority DESC, created_at DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    res.json(rules);
  } catch (error) {
    console.error('Error fetching load balancing rules:', error);
    res.status(500).json({ error: 'Failed to fetch load balancing rules' });
  }
});

// ==================== WEBHOOK ENDPOINTS ====================

// Enhanced webhook for parallel execution results
router.post('/webhooks/parallel-execution/:parentExecutionId', async (req, res) => {
  try {
    const { parentExecutionId } = req.params;
    const webhookData = req.body;

    // Verify webhook token
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.TMS_WEBHOOK_TOKEN;
    
    if (expectedToken && (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== expectedToken)) {
      return res.status(401).json({ error: 'Invalid webhook token' });
    }

    // Handle the shard webhook
    await parallelCoordinator.handleShardWebhook(parentExecutionId, webhookData);

    res.json({ success: true, message: 'Webhook processed successfully' });

  } catch (error) {
    console.error('Error processing parallel execution webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Enhanced webhook for regular execution results
router.post('/webhooks/execution-results', async (req, res) => {
  try {
    const webhookData = req.body;
    const { executionId, status, results } = webhookData;

    // Verify webhook token
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.TMS_WEBHOOK_TOKEN;
    
    if (expectedToken && (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== expectedToken)) {
      return res.status(401).json({ error: 'Invalid webhook token' });
    }

    if (!executionId || !status) {
      return res.status(400).json({ error: 'executionId and status are required' });
    }

    // Update execution status based on webhook
    if (status === 'completed') {
      await orchestrationService.markExecutionCompleted(executionId);
      
      // Record execution time metric if available
      if (results && results.duration) {
        const execution = await new Promise((resolve, reject) => {
          orchestrationService.db.db.get(`
            SELECT assigned_runner_id FROM execution_queue WHERE execution_id = ?
          `, [executionId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        
        if (execution && execution.assigned_runner_id) {
          await orchestrationService.recordExecutionMetric(
            executionId, 
            execution.assigned_runner_id, 
            'execution_time', 
            results.duration
          );
        }
      }
      
    } else if (status === 'failed') {
      await orchestrationService.markExecutionFailed(executionId, webhookData.error_message || 'Execution failed');
    }

    res.json({ success: true, message: 'Execution webhook processed successfully' });

  } catch (error) {
    console.error('Error processing execution webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// ==================== RESOURCE MANAGEMENT ====================

// Get resource utilization summary
router.get('/resources/utilization', async (req, res) => {
  try {
    const utilization = await resourceService.getSystemResourceSummary();
    res.json(utilization);
  } catch (error) {
    console.error('Error getting resource utilization:', error);
    res.status(500).json({ error: 'Failed to get resource utilization' });
  }
});

// Optimize resource allocation for a runner
router.post('/resources/optimize/:runnerId', async (req, res) => {
  try {
    const { runnerId } = req.params;
    const optimization = await resourceService.optimizeResourceAllocation(runnerId);
    
    res.json({
      success: true,
      optimization,
      message: 'Resource optimization completed'
    });
  } catch (error) {
    console.error('Error optimizing resources:', error);
    res.status(500).json({ error: 'Failed to optimize resources' });
  }
});

// ==================== SYSTEM STATUS ====================

// Get system health and status
router.get('/system/health', async (req, res) => {
  try {
    const [
      queueStatus,
      runnerStatus,
      resourceStatus,
      systemMetrics
    ] = await Promise.all([
      getQueueHealthStatus(),
      getRunnerHealthStatus(),
      getResourceHealthStatus(),
      getSystemHealthMetrics()
    ]);

    const overallHealth = determineOverallHealth([queueStatus, runnerStatus, resourceStatus]);

    res.json({
      status: overallHealth,
      timestamp: new Date().toISOString(),
      queue: queueStatus,
      runners: runnerStatus,
      resources: resourceStatus,
      metrics: systemMetrics
    });

  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({ error: 'Failed to get system health' });
  }
});

// Helper functions for system health
async function getQueueHealthStatus() {
  const queueStats = await new Promise((resolve, reject) => {
    orchestrationService.db.db.get(`
      SELECT 
        COUNT(*) as total_queued,
        COUNT(CASE WHEN status = 'queued' THEN 1 END) as pending,
        AVG(CASE WHEN status = 'queued' THEN 
          CAST((julianday('now') - julianday(created_at)) * 24 * 60 AS INTEGER)
        END) as avg_queue_time_minutes
      FROM execution_queue 
      WHERE status IN ('queued', 'assigned', 'running')
    `, (err, row) => {
      if (err) reject(err);
      else resolve(row || {});
    });
  });

  return {
    status: queueStats.avg_queue_time_minutes > 30 ? 'degraded' : 'healthy',
    pending_executions: queueStats.pending || 0,
    avg_queue_time: queueStats.avg_queue_time_minutes || 0
  };
}

async function getRunnerHealthStatus() {
  const runnerStats = await new Promise((resolve, reject) => {
    orchestrationService.db.db.get(`
      SELECT 
        COUNT(*) as total_runners,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN health_status = 'healthy' THEN 1 END) as healthy
      FROM test_runners
    `, (err, row) => {
      if (err) reject(err);
      else resolve(row || {});
    });
  });

  const healthRatio = runnerStats.total_runners > 0 ? runnerStats.healthy / runnerStats.total_runners : 0;
  
  return {
    status: healthRatio < 0.5 ? 'unhealthy' : healthRatio < 0.8 ? 'degraded' : 'healthy',
    total_runners: runnerStats.total_runners || 0,
    active_runners: runnerStats.active || 0,
    healthy_runners: runnerStats.healthy || 0
  };
}

async function getResourceHealthStatus() {
  const resourceStats = await new Promise((resolve, reject) => {
    orchestrationService.db.db.get(`
      SELECT 
        COUNT(*) as active_allocations,
        COUNT(CASE WHEN status = 'exceeded' THEN 1 END) as exceeded_allocations
      FROM resource_allocations 
      WHERE status IN ('allocated', 'exceeded')
    `, (err, row) => {
      if (err) reject(err);
      else resolve(row || {});
    });
  });

  const exceedRatio = resourceStats.active_allocations > 0 ? 
    resourceStats.exceeded_allocations / resourceStats.active_allocations : 0;

  return {
    status: exceedRatio > 0.1 ? 'degraded' : 'healthy',
    active_allocations: resourceStats.active_allocations || 0,
    exceeded_allocations: resourceStats.exceeded_allocations || 0
  };
}

async function getSystemHealthMetrics() {
  return {
    uptime: process.uptime(),
    memory_usage: process.memoryUsage(),
    cpu_usage: process.cpuUsage()
  };
}

function determineOverallHealth(componentStatuses) {
  const statuses = componentStatuses.map(comp => comp.status);
  
  if (statuses.includes('unhealthy')) return 'unhealthy';
  if (statuses.includes('degraded')) return 'degraded';
  return 'healthy';
}

// ==================== CLEANUP ON SHUTDOWN ====================

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down Enhanced Orchestration API...');
  
  try {
    await Promise.all([
      orchestrationService.cleanup(),
      resourceService.cleanup(),
      parallelCoordinator.cleanup()
    ]);
    console.log('✅ Enhanced Orchestration API shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

module.exports = router;