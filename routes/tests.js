const express = require('express');
const router = express.Router();

// Database instance (will be set by server)
let db = null;

// Set database instance
function setDatabase(database) {
  db = database;
}

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  next();
};

// Get all test executions
router.get('/executions', requireAuth, (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT 
        te.*,
        u.username as created_by_username
      FROM test_executions te
      LEFT JOIN users u ON te.created_by = u.id
    `;
    
    const params = [];
    
    if (status) {
      query += ' WHERE te.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY te.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    db.all(query, params, (err, executions) => {
      if (err) {
        console.error('Database error fetching test executions:', err);
        return res.status(500).json({
          error: 'Database error',
          code: 'DATABASE_ERROR'
        });
      }

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM test_executions';
      const countParams = [];
      
      if (status) {
        countQuery += ' WHERE status = ?';
        countParams.push(status);
      }

      db.get(countQuery, countParams, (countErr, countResult) => {
        if (countErr) {
          console.error('Database error getting execution count:', countErr);
          return res.status(500).json({
            error: 'Database error',
            code: 'DATABASE_ERROR'
          });
        }

        res.json({
          executions: executions || [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countResult ? countResult.total : 0,
            totalPages: Math.ceil((countResult ? countResult.total : 0) / parseInt(limit))
          }
        });
      });
    });

  } catch (error) {
    console.error('Error fetching test executions:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Get specific test execution
router.get('/executions/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        te.*,
        u.username as created_by_username
      FROM test_executions te
      LEFT JOIN users u ON te.created_by = u.id
      WHERE te.id = ?
    `;

    db.get(query, [id], (err, execution) => {
      if (err) {
        console.error('Database error fetching test execution:', err);
        return res.status(500).json({
          error: 'Database error',
          code: 'DATABASE_ERROR'
        });
      }

      if (!execution) {
        return res.status(404).json({
          error: 'Test execution not found',
          code: 'EXECUTION_NOT_FOUND'
        });
      }

      res.json({ execution });
    });

  } catch (error) {
    console.error('Error fetching test execution:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Create new test execution (orchestration endpoint)
router.post('/run', requireAuth, async (req, res) => {
  try {
    const {
      projectName,
      testSuite,
      environment = 'staging',
      browserType = 'chromium',
      tags,
      priority = 'medium',
      parallelism = 1
    } = req.body;

    if (!projectName || !testSuite) {
      return res.status(400).json({
        error: 'projectName and testSuite are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Generate execution ID
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insert execution record
    const insertQuery = `
      INSERT INTO test_executions (
        execution_id, project_name, test_suite, environment, 
        browser_type, tags, priority, parallelism, status, 
        created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, CURRENT_TIMESTAMP)
    `;

    const values = [
      executionId,
      projectName,
      testSuite,
      environment,
      browserType,
      tags ? JSON.stringify(tags) : null,
      priority,
      parallelism,
      req.session.userId
    ];

    db.run(insertQuery, values, function(err) {
      if (err) {
        console.error('Database error creating test execution:', err);
        return res.status(500).json({
          error: 'Failed to create test execution',
          code: 'DATABASE_ERROR'
        });
      }

      console.log(`✅ Test execution created: ${executionId}`);
      
      // TODO: Here you would integrate with your test orchestration service
      // For now, we'll just return the execution details
      
      res.status(201).json({
        success: true,
        executionId: executionId,
        message: 'Test execution queued successfully',
        execution: {
          id: this.lastID,
          executionId: executionId,
          projectName,
          testSuite,
          environment,
          browserType,
          tags,
          priority,
          parallelism,
          status: 'queued',
          createdAt: new Date().toISOString()
        }
      });
    });

  } catch (error) {
    console.error('Error creating test execution:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Cancel test execution
router.post('/executions/:id/cancel', requireAuth, (req, res) => {
  try {
    const { id } = req.params;

    // Check if execution exists and is cancellable
    const checkQuery = 'SELECT * FROM test_executions WHERE id = ?';
    
    db.get(checkQuery, [id], (err, execution) => {
      if (err) {
        console.error('Database error checking execution:', err);
        return res.status(500).json({
          error: 'Database error',
          code: 'DATABASE_ERROR'
        });
      }

      if (!execution) {
        return res.status(404).json({
          error: 'Test execution not found',
          code: 'EXECUTION_NOT_FOUND'
        });
      }

      if (!['queued', 'running'].includes(execution.status)) {
        return res.status(400).json({
          error: 'Execution cannot be cancelled in current status',
          code: 'INVALID_STATUS_FOR_CANCELLATION'
        });
      }

      // Update execution status to cancelled
      const updateQuery = `
        UPDATE test_executions 
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;

      db.run(updateQuery, [id], (updateErr) => {
        if (updateErr) {
          console.error('Database error cancelling execution:', updateErr);
          return res.status(500).json({
            error: 'Failed to cancel execution',
            code: 'DATABASE_ERROR'
          });
        }

        console.log(`❌ Test execution cancelled: ${execution.execution_id}`);
        
        res.json({
          success: true,
          message: 'Test execution cancelled successfully',
          executionId: execution.execution_id
        });
      });
    });

  } catch (error) {
    console.error('Error cancelling test execution:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Get test execution results
router.get('/executions/:id/results', requireAuth, (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        te.*,
        u.username as created_by_username
      FROM test_executions te
      LEFT JOIN users u ON te.created_by = u.id
      WHERE te.id = ?
    `;

    db.get(query, [id], (err, execution) => {
      if (err) {
        console.error('Database error fetching execution results:', err);
        return res.status(500).json({
          error: 'Database error',
          code: 'DATABASE_ERROR'
        });
      }

      if (!execution) {
        return res.status(404).json({
          error: 'Test execution not found',
          code: 'EXECUTION_NOT_FOUND'
        });
      }

      // Parse results if available
      let parsedResults = null;
      if (execution.results) {
        try {
          parsedResults = JSON.parse(execution.results);
        } catch (parseErr) {
          console.error('Error parsing execution results:', parseErr);
        }
      }

      res.json({
        execution: {
          ...execution,
          results: parsedResults
        }
      });
    });

  } catch (error) {
    console.error('Error fetching execution results:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Get test execution logs
router.get('/executions/:id/logs', requireAuth, (req, res) => {
  try {
    const { id } = req.params;

    const query = 'SELECT logs FROM test_executions WHERE id = ?';

    db.get(query, [id], (err, result) => {
      if (err) {
        console.error('Database error fetching execution logs:', err);
        return res.status(500).json({
          error: 'Database error',
          code: 'DATABASE_ERROR'
        });
      }

      if (!result) {
        return res.status(404).json({
          error: 'Test execution not found',
          code: 'EXECUTION_NOT_FOUND'
        });
      }

      // Parse logs if available
      let parsedLogs = [];
      if (result.logs) {
        try {
          parsedLogs = JSON.parse(result.logs);
        } catch (parseErr) {
          console.error('Error parsing execution logs:', parseErr);
          parsedLogs = [{ 
            timestamp: new Date().toISOString(), 
            level: 'error', 
            message: 'Error parsing logs' 
          }];
        }
      }

      res.json({
        logs: parsedLogs
      });
    });

  } catch (error) {
    console.error('Error fetching execution logs:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'test-api',
    timestamp: new Date().toISOString()
  });
});

// Export the router and helper functions
module.exports = router;
module.exports.setDatabase = setDatabase;
