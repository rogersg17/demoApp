const express = require('express');
const router = express.Router();
const Database = require('../database/database');

// Initialize database connection
const db = new Database();

// ==================== MAIN DASHBOARD ROUTES ====================

// Main orchestration dashboard page
router.get('/', async (req, res) => {
  try {
    const [queueSummary, runnerSummary, recentExecutions, systemMetrics] = await Promise.all([
      getQueueSummary(),
      getRunnerSummary(),
      getRecentExecutions(20),
      getSystemMetrics()
    ]);

    res.render('enhanced-orchestration-dashboard', {
      title: 'Enhanced Orchestration Dashboard',
      queueSummary,
      runnerSummary,
      recentExecutions,
      systemMetrics,
      refreshInterval: 5000 // 5 seconds
    });
  } catch (error) {
    console.error('Error loading orchestration dashboard:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ==================== API ENDPOINTS FOR REAL-TIME DATA ====================

// Get current queue status
router.get('/api/queue-status', async (req, res) => {
  try {
    const queueSummary = await getQueueSummary();
    const queueDetails = await getQueueDetails();
    
    res.json({
      summary: queueSummary,
      details: queueDetails
    });
  } catch (error) {
    console.error('Error fetching queue status:', error);
    res.status(500).json({ error: 'Failed to fetch queue status' });
  }
});

// Get runner status and health
router.get('/api/runner-status', async (req, res) => {
  try {
    const runnerSummary = await getRunnerSummary();
    const runnerDetails = await getRunnerDetails();
    const runnerHealth = await getRunnerHealthStatus();
    
    res.json({
      summary: runnerSummary,
      details: runnerDetails,
      health: runnerHealth
    });
  } catch (error) {
    console.error('Error fetching runner status:', error);
    res.status(500).json({ error: 'Failed to fetch runner status' });
  }
});

// Get active executions
router.get('/api/active-executions', async (req, res) => {
  try {
    const activeExecutions = await getActiveExecutions();
    const parallelExecutions = await getActiveParallelExecutions();
    
    res.json({
      regular: activeExecutions,
      parallel: parallelExecutions
    });
  } catch (error) {
    console.error('Error fetching active executions:', error);
    res.status(500).json({ error: 'Failed to fetch active executions' });
  }
});

// Get execution metrics
router.get('/api/execution-metrics', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const metrics = await getExecutionMetrics(hours);
    
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching execution metrics:', error);
    res.status(500).json({ error: 'Failed to fetch execution metrics' });
  }
});

// Get system performance metrics
router.get('/api/system-metrics', async (req, res) => {
  try {
    const systemMetrics = await getSystemMetrics();
    
    res.json(systemMetrics);
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({ error: 'Failed to fetch system metrics' });
  }
});

// Get resource utilization
router.get('/api/resource-utilization', async (req, res) => {
  try {
    const resourceUtilization = await getResourceUtilization();
    
    res.json(resourceUtilization);
  } catch (error) {
    console.error('Error fetching resource utilization:', error);
    res.status(500).json({ error: 'Failed to fetch resource utilization' });
  }
});

// ==================== DETAILED VIEWS ====================

// Individual execution details
router.get('/execution/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    const [executionDetails, executionMetrics, shardDetails] = await Promise.all([
      getExecutionDetails(executionId),
      getExecutionMetricsDetailed(executionId),
      getExecutionShards(executionId)
    ]);

    if (!executionDetails) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.render('execution-details', {
      title: `Execution Details - ${executionId}`,
      execution: executionDetails,
      metrics: executionMetrics,
      shards: shardDetails
    });
  } catch (error) {
    console.error('Error loading execution details:', error);
    res.status(500).json({ error: 'Failed to load execution details' });
  }
});

// Individual runner details
router.get('/runner/:runnerId', async (req, res) => {
  try {
    const { runnerId } = req.params;
    const [runnerDetails, runnerMetrics, runnerHealth, currentAllocations] = await Promise.all([
      getRunnerDetailsById(runnerId),
      getRunnerMetrics(runnerId),
      getRunnerHealthHistory(runnerId),
      getRunnerCurrentAllocations(runnerId)
    ]);

    if (!runnerDetails) {
      return res.status(404).json({ error: 'Runner not found' });
    }

    res.render('runner-details', {
      title: `Runner Details - ${runnerDetails.name}`,
      runner: runnerDetails,
      metrics: runnerMetrics,
      health: runnerHealth,
      allocations: currentAllocations
    });
  } catch (error) {
    console.error('Error loading runner details:', error);
    res.status(500).json({ error: 'Failed to load runner details' });
  }
});

// ==================== CONTROL ENDPOINTS ====================

// Cancel execution
router.post('/api/execution/:executionId/cancel', async (req, res) => {
  try {
    const { executionId } = req.params;
    await cancelExecution(executionId);
    
    res.json({ success: true, message: 'Execution cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling execution:', error);
    res.status(500).json({ error: 'Failed to cancel execution' });
  }
});

// Retry failed execution
router.post('/api/execution/:executionId/retry', async (req, res) => {
  try {
    const { executionId } = req.params;
    const newExecutionId = await retryExecution(executionId);
    
    res.json({ success: true, newExecutionId });
  } catch (error) {
    console.error('Error retrying execution:', error);
    res.status(500).json({ error: 'Failed to retry execution' });
  }
});

// Pause/Resume runner
router.post('/api/runner/:runnerId/:action', async (req, res) => {
  try {
    const { runnerId, action } = req.params;
    
    if (!['pause', 'resume', 'maintenance'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    await updateRunnerStatus(runnerId, action);
    
    res.json({ success: true, message: `Runner ${action} successful` });
  } catch (error) {
    console.error(`Error ${req.params.action} runner:`, error);
    res.status(500).json({ error: `Failed to ${req.params.action} runner` });
  }
});

// ==================== DATABASE HELPER FUNCTIONS ====================

async function getQueueSummary() {
  return new Promise((resolve, reject) => {
    db.db.get(`
      SELECT 
        COUNT(*) as total_queued,
        COUNT(CASE WHEN status = 'queued' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
        AVG(CASE WHEN status = 'queued' THEN 
          CAST((julianday('now') - julianday(created_at)) * 24 * 60 AS INTEGER)
        END) as avg_queue_time_minutes,
        MAX(CASE WHEN status = 'queued' THEN 
          CAST((julianday('now') - julianday(created_at)) * 24 * 60 AS INTEGER)
        END) as max_queue_time_minutes
      FROM execution_queue 
      WHERE status IN ('queued', 'assigned', 'running')
    `, (err, row) => {
      if (err) reject(err);
      else resolve(row || {});
    });
  });
}

async function getQueueDetails() {
  return new Promise((resolve, reject) => {
    db.db.all(`
      SELECT 
        execution_id,
        test_suite,
        environment,
        priority,
        status,
        created_at,
        assigned_at,
        started_at,
        CAST((julianday('now') - julianday(created_at)) * 24 * 60 AS INTEGER) as queue_time_minutes,
        requested_runner_type,
        retry_count
      FROM execution_queue 
      WHERE status IN ('queued', 'assigned', 'running')
      ORDER BY priority DESC, created_at ASC
      LIMIT 50
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function getRunnerSummary() {
  return new Promise((resolve, reject) => {
    db.db.get(`
      SELECT 
        COUNT(*) as total_runners,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as error,
        COUNT(CASE WHEN health_status = 'healthy' THEN 1 END) as healthy,
        COUNT(CASE WHEN health_status = 'unhealthy' THEN 1 END) as unhealthy,
        SUM(CASE WHEN status = 'active' THEN current_jobs ELSE 0 END) as total_active_jobs,
        SUM(CASE WHEN status = 'active' THEN max_concurrent_jobs ELSE 0 END) as total_capacity
      FROM test_runners
    `, (err, row) => {
      if (err) reject(err);
      else resolve(row || {});
    });
  });
}

async function getRunnerDetails() {
  return new Promise((resolve, reject) => {
    db.db.all(`
      SELECT 
        id,
        name,
        type,
        status,
        health_status,
        current_jobs,
        max_concurrent_jobs,
        priority,
        last_health_check,
        ROUND((CAST(current_jobs AS REAL) / max_concurrent_jobs) * 100, 1) as utilization_percent
      FROM test_runners
      ORDER BY status, priority DESC, name
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function getRunnerHealthStatus() {
  return new Promise((resolve, reject) => {
    db.db.all(`
      SELECT 
        tr.id,
        tr.name,
        tr.type,
        tr.health_status,
        rhh.response_time,
        rhh.cpu_usage,
        rhh.memory_usage,
        rhh.timestamp as last_check
      FROM test_runners tr
      LEFT JOIN runner_health_history rhh ON tr.id = rhh.runner_id
      WHERE rhh.timestamp = (
        SELECT MAX(timestamp) FROM runner_health_history WHERE runner_id = tr.id
      )
      OR rhh.id IS NULL
      ORDER BY tr.name
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function getRecentExecutions(limit = 20) {
  return new Promise((resolve, reject) => {
    db.db.all(`
      SELECT 
        execution_id,
        test_suite,
        environment,
        status,
        priority,
        created_at,
        started_at,
        completed_at,
        retry_count,
        CASE 
          WHEN completed_at IS NOT NULL THEN 
            CAST((julianday(completed_at) - julianday(started_at)) * 24 * 60 AS INTEGER)
          WHEN started_at IS NOT NULL THEN
            CAST((julianday('now') - julianday(started_at)) * 24 * 60 AS INTEGER)
          ELSE NULL
        END as duration_minutes
      FROM execution_queue 
      ORDER BY created_at DESC
      LIMIT ?
    `, [limit], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function getActiveExecutions() {
  return new Promise((resolve, reject) => {
    db.db.all(`
      SELECT 
        eq.execution_id,
        eq.test_suite,
        eq.environment,
        eq.status,
        eq.started_at,
        tr.name as runner_name,
        tr.type as runner_type,
        CAST((julianday('now') - julianday(eq.started_at)) * 24 * 60 AS INTEGER) as runtime_minutes
      FROM execution_queue eq
      LEFT JOIN test_runners tr ON eq.assigned_runner_id = tr.id
      WHERE eq.status IN ('assigned', 'running')
      ORDER BY eq.started_at DESC
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function getActiveParallelExecutions() {
  return new Promise((resolve, reject) => {
    db.db.all(`
      SELECT 
        parent_execution_id,
        COUNT(*) as total_shards,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_shards,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_shards,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running_shards,
        MIN(started_at) as earliest_start,
        MAX(completed_at) as latest_completion
      FROM parallel_executions
      WHERE parent_execution_id IN (
        SELECT DISTINCT parent_execution_id 
        FROM parallel_executions 
        WHERE status IN ('pending', 'running')
      )
      GROUP BY parent_execution_id
      ORDER BY earliest_start DESC
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function getExecutionMetrics(hours = 24) {
  return new Promise((resolve, reject) => {
    db.db.all(`
      SELECT 
        DATE(timestamp) as date,
        metric_type,
        AVG(metric_value) as avg_value,
        MIN(metric_value) as min_value,
        MAX(metric_value) as max_value,
        COUNT(*) as count
      FROM execution_metrics 
      WHERE timestamp > datetime('now', '-${hours} hours')
      GROUP BY DATE(timestamp), metric_type
      ORDER BY date, metric_type
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function getSystemMetrics() {
  return new Promise((resolve, reject) => {
    db.db.get(`
      SELECT 
        (SELECT COUNT(*) FROM execution_queue WHERE created_at > datetime('now', '-24 hours')) as executions_24h,
        (SELECT COUNT(*) FROM execution_queue WHERE created_at > datetime('now', '-7 days')) as executions_7d,
        (SELECT AVG(metric_value) FROM execution_metrics WHERE metric_type = 'execution_time' AND timestamp > datetime('now', '-24 hours')) as avg_execution_time,
        (SELECT COUNT(*) FROM resource_allocations WHERE status = 'allocated') as active_allocations,
        (SELECT COUNT(*) FROM parallel_executions WHERE status IN ('pending', 'running')) as active_parallel_shards
    `, (err, row) => {
      if (err) reject(err);
      else resolve(row || {});
    });
  });
}

async function getResourceUtilization() {
  return new Promise((resolve, reject) => {
    db.db.all(`
      SELECT 
        tr.name as runner_name,
        tr.type as runner_type,
        tr.max_concurrent_jobs,
        tr.current_jobs,
        COALESCE(SUM(ra.cpu_allocation), 0) as total_cpu_allocated,
        COALESCE(SUM(ra.memory_allocation), 0) as total_memory_allocated,
        COUNT(ra.id) as active_allocations
      FROM test_runners tr
      LEFT JOIN resource_allocations ra ON tr.id = ra.runner_id AND ra.status = 'allocated'
      WHERE tr.status = 'active'
      GROUP BY tr.id, tr.name, tr.type, tr.max_concurrent_jobs, tr.current_jobs
      ORDER BY tr.name
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

// ==================== DETAILED QUERY FUNCTIONS ====================

async function getExecutionDetails(executionId) {
  return new Promise((resolve, reject) => {
    db.db.get(`
      SELECT 
        eq.*,
        tr.name as runner_name,
        tr.type as runner_type
      FROM execution_queue eq
      LEFT JOIN test_runners tr ON eq.assigned_runner_id = tr.id
      WHERE eq.execution_id = ?
    `, [executionId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function getExecutionMetricsDetailed(executionId) {
  return new Promise((resolve, reject) => {
    db.db.all(`
      SELECT * FROM execution_metrics 
      WHERE execution_id = ?
      ORDER BY timestamp
    `, [executionId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function getExecutionShards(executionId) {
  return new Promise((resolve, reject) => {
    // Check if this is a parent execution ID
    db.db.all(`
      SELECT 
        pe.*,
        tr.name as runner_name,
        tr.type as runner_type
      FROM parallel_executions pe
      LEFT JOIN test_runners tr ON pe.runner_id = tr.id
      WHERE pe.parent_execution_id = ?
      ORDER BY pe.shard_index
    `, [executionId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

// ==================== CONTROL FUNCTIONS ====================

async function cancelExecution(executionId) {
  const now = new Date().toISOString();
  
  return new Promise((resolve, reject) => {
    db.db.run(`
      UPDATE execution_queue 
      SET status = 'cancelled', completed_at = ?
      WHERE execution_id = ? AND status IN ('queued', 'assigned', 'running')
    `, [now, executionId], function(err) {
      if (err) reject(err);
      else if (this.changes === 0) reject(new Error('Execution not found or cannot be cancelled'));
      else resolve();
    });
  });
}

async function retryExecution(executionId) {
  // Get original execution details
  const originalExecution = await getExecutionDetails(executionId);
  if (!originalExecution) {
    throw new Error('Original execution not found');
  }

  const newExecutionId = `${executionId}-retry-${Date.now()}`;
  
  return new Promise((resolve, reject) => {
    db.db.run(`
      INSERT INTO execution_queue (
        execution_id, test_suite, environment, priority, 
        estimated_duration, requested_runner_type, requested_runner_id, 
        timeout_at, metadata
      ) SELECT 
        ?, test_suite, environment, priority,
        estimated_duration, requested_runner_type, requested_runner_id,
        datetime('now', '+2 hours'), metadata
      FROM execution_queue 
      WHERE execution_id = ?
    `, [newExecutionId, executionId], function(err) {
      if (err) reject(err);
      else resolve(newExecutionId);
    });
  });
}

async function updateRunnerStatus(runnerId, action) {
  const statusMap = {
    pause: 'inactive',
    resume: 'active',
    maintenance: 'maintenance'
  };
  
  const newStatus = statusMap[action];
  if (!newStatus) {
    throw new Error('Invalid action');
  }
  
  const now = new Date().toISOString();
  
  return new Promise((resolve, reject) => {
    db.db.run(`
      UPDATE test_runners 
      SET status = ?, updated_at = ?
      WHERE id = ?
    `, [newStatus, now, runnerId], function(err) {
      if (err) reject(err);
      else if (this.changes === 0) reject(new Error('Runner not found'));
      else resolve();
    });
  });
}

// Additional helper functions for detailed views
async function getRunnerDetailsById(runnerId) {
  return new Promise((resolve, reject) => {
    db.db.get(`SELECT * FROM test_runners WHERE id = ?`, [runnerId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function getRunnerMetrics(runnerId, hours = 24) {
  return new Promise((resolve, reject) => {
    db.db.all(`
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

async function getRunnerHealthHistory(runnerId, hours = 24) {
  return new Promise((resolve, reject) => {
    db.db.all(`
      SELECT * FROM runner_health_history 
      WHERE runner_id = ? 
      AND timestamp > datetime('now', '-${hours} hours')
      ORDER BY timestamp DESC
      LIMIT 100
    `, [runnerId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function getRunnerCurrentAllocations(runnerId) {
  return new Promise((resolve, reject) => {
    db.db.all(`
      SELECT * FROM resource_allocations 
      WHERE runner_id = ? AND status = 'allocated'
      ORDER BY allocated_at DESC
    `, [runnerId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

module.exports = router;