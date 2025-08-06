import express, { Request, Response, Router } from 'express';
import { requireAuth } from './auth';
import { Database } from 'sqlite3';

const router: Router = express.Router();

// Database instance (will be set by server)
let db: Database | null = null;

// Set database instance
const setDatabase = (database: Database): void => {
  db = database;
};

// Types
interface TestExecution {
  id: number;
  test_id: string;
  execution_id: string;
  platform_type: string;
  platform_execution_id?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  start_time?: string;
  end_time?: string;
  duration_ms?: number;
  error_message?: string;
  metadata?: string;
  created_at: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
  status?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface RunTestRequest {
  test_id: string;
  execution_id?: string;
  platform_type?: string;
  status?: string;
  metadata?: Record<string, any>;
}

// Get tests summary for test management page
router.get('/', requireAuth, (req: any, res: Response) => {
  try {
    if (!db) {
      res.status(500).json({
        error: 'Database not initialized',
        code: 'DATABASE_ERROR'
      });
      return;
    }

    // Get recent test executions for the tests summary
    const query = `
      SELECT 
        te.*
      FROM test_executions te
      ORDER BY te.created_at DESC 
      LIMIT 50
    `;

    db.all(query, [], (err: any, rows: any[]) => {
      if (err) {
        console.error('Database error:', err);
        res.status(500).json({
          error: 'Failed to fetch tests',
          code: 'DATABASE_ERROR'
        });
        return;
      }

      // Transform executions into test format expected by frontend
      const tests = rows.map((row: any) => ({
        id: row.id.toString(),
        title: row.test_id || 'Test Execution',
        status: row.status === 'completed' ? 'passed' : 
                row.status === 'failed' ? 'failed' : 
                row.status === 'running' ? 'running' : 'pending',
        duration: row.end_time && row.start_time ? 
          new Date(row.end_time).getTime() - new Date(row.start_time).getTime() : 
          row.duration_ms || null,
        lastRun: row.created_at,
        suite: 'Test Execution',
        environment: row.platform_type || 'default'
      }));

      res.json({
        success: true,
        tests: tests,
        total: tests.length,
        page: 1,
        limit: 50
      });
    });

  } catch (error) {
    console.error('Error in GET /api/tests:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Get all test executions
router.get('/executions', requireAuth, (req: any, res: Response) => {
  try {
    const { page = '1', limit = '20', status }: PaginationQuery = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT 
        te.*
      FROM test_executions te
    `;
    
    const params: (string | number)[] = [];
    
    if (status) {
      query += ' WHERE te.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY te.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    if (!db) {
      res.status(500).json({
        error: 'Database not initialized',
        code: 'DATABASE_ERROR'
      });
      return;
    }

    db.all(query, params, (err: any, executions: TestExecution[]) => {
      if (err) {
        console.error('Database error fetching test executions:', err);
        res.status(500).json({
          error: 'Database error',
          code: 'DATABASE_ERROR'
        });
        return;
      }

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM test_executions';
      const countParams: string[] = [];
      
      if (status) {
        countQuery += ' WHERE status = ?';
        countParams.push(status);
      }

      if (!db) {
        res.status(500).json({
          error: 'Database not initialized',
          code: 'DATABASE_ERROR'
        });
        return;
      }

      db.get(countQuery, countParams, (countErr: any, countResult: { total: number }) => {
        if (countErr) {
          console.error('Database error getting execution count:', countErr);
          res.status(500).json({
            error: 'Database error',
            code: 'DATABASE_ERROR'
          });
          return;
        }

        const paginationInfo: PaginationInfo = {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult ? countResult.total : 0,
          totalPages: Math.ceil((countResult ? countResult.total : 0) / parseInt(limit))
        };

        res.json({
          executions: executions || [],
          pagination: paginationInfo
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
router.get('/executions/:id', requireAuth, (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        te.*
      FROM test_executions te
      WHERE te.id = ?
    `;

    if (!db) {
      res.status(500).json({
        error: 'Database not initialized',
        code: 'DATABASE_ERROR'
      });
      return;
    }

    db.get(query, [id], (err, execution: TestExecution) => {
      if (err) {
        console.error('Database error fetching test execution:', err);
        res.status(500).json({
          error: 'Database error',
          code: 'DATABASE_ERROR'
        });
        return;
      }

      if (!execution) {
        res.status(404).json({
          error: 'Test execution not found',
          code: 'EXECUTION_NOT_FOUND'
        });
        return;
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

// Run a new test
router.post('/run', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        error: 'User not authenticated',
        code: 'AUTHENTICATION_ERROR'
      });
      return;
    }

    const {
      test_id,
      execution_id = `exec_${Date.now()}`,
      platform_type = 'manual',
      status = 'pending',
      metadata = {}
    }: RunTestRequest = req.body;

    // Validation
    if (!test_id) {
      res.status(400).json({
        error: 'test_id is required',
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    // Create test execution record
    const insertQuery = `
      INSERT INTO test_executions (
        test_id, execution_id, platform_type, status, metadata
      ) VALUES (?, ?, ?, ?, ?)
    `;

    const values = [
      test_id,
      execution_id,
      platform_type,
      status,
      JSON.stringify(metadata)
    ];

    if (!db) {
      res.status(500).json({
        error: 'Database not initialized',
        code: 'DATABASE_ERROR'
      });
      return;
    }

    db.run(insertQuery, values, function(this: any, err: any) {
      if (err) {
        console.error('Database error creating test execution:', err);
        res.status(500).json({
          error: 'Failed to create test execution',
          code: 'DATABASE_ERROR'
        });
        return;
      }

      const executionDbId = this.lastID;

      res.status(201).json({
        message: 'Test execution created successfully',
        execution: {
          id: executionDbId,
          test_id,
          execution_id,
          platform_type,
          status,
          created_at: new Date().toISOString(),
          metadata: JSON.stringify(metadata)
        }
      });
    });

  } catch (error) {
    console.error('Error running test:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Cancel test execution
router.post('/executions/:id/cancel', requireAuth, (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const checkQuery = `
      SELECT id, status FROM test_executions WHERE id = ?
    `;

    if (!db) {
      res.status(500).json({
        error: 'Database not initialized',
        code: 'DATABASE_ERROR'
      });
      return;
    }

    db.get(checkQuery, [id], (err, execution: TestExecution) => {
      if (err) {
        console.error('Database error checking test execution:', err);
        res.status(500).json({
          error: 'Database error',
          code: 'DATABASE_ERROR'
        });
        return;
      }

      if (!execution) {
        res.status(404).json({
          error: 'Test execution not found',
          code: 'EXECUTION_NOT_FOUND'
        });
        return;
      }

      // Since the table doesn't have created_by, we'll allow any authenticated user to cancel
      // In a real application, you might want to implement proper authorization

      // Check if execution can be cancelled
      if (['completed', 'failed', 'cancelled'].includes(execution.status)) {
        res.status(400).json({
          error: 'Cannot cancel execution in current status',
          code: 'INVALID_STATUS'
        });
        return;
      }

      // Update execution status to cancelled
      const updateQuery = `
        UPDATE test_executions 
        SET status = 'cancelled', end_time = datetime('now')
        WHERE id = ?
      `;

      if (!db) {
        res.status(500).json({
          error: 'Database not initialized',
          code: 'DATABASE_ERROR'
        });
        return;
      }

      db.run(updateQuery, [id], (updateErr) => {
        if (updateErr) {
          console.error('Database error cancelling test execution:', updateErr);
          res.status(500).json({
            error: 'Failed to cancel execution',
            code: 'DATABASE_ERROR'
          });
          return;
        }

        res.json({
          message: 'Test execution cancelled successfully'
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
router.get('/executions/:id/results', requireAuth, (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        id, test_id, execution_id, platform_type, status, error_message,
        start_time, end_time, duration_ms, created_at, metadata
      FROM test_executions 
      WHERE id = ?
    `;

    if (!db) {
      res.status(500).json({
        error: 'Database not initialized',
        code: 'DATABASE_ERROR'
      });
      return;
    }

    db.get(query, [id], (err, execution: TestExecution) => {
      if (err) {
        console.error('Database error fetching test results:', err);
        res.status(500).json({
          error: 'Database error',
          code: 'DATABASE_ERROR'
        });
        return;
      }

      if (!execution) {
        res.status(404).json({
          error: 'Test execution not found',
          code: 'EXECUTION_NOT_FOUND'
        });
        return;
      }

      // Parse metadata if it exists
      let parsedMetadata = {};
      if (execution.metadata) {
        try {
          parsedMetadata = JSON.parse(execution.metadata);
        } catch (parseError) {
          console.warn('Failed to parse execution metadata:', parseError);
        }
      }

      res.json({
        execution: {
          ...execution,
          metadata: parsedMetadata
        }
      });
    });

  } catch (error) {
    console.error('Error fetching test results:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Get test execution logs
router.get('/executions/:id/logs', requireAuth, (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const query = `SELECT error_message FROM test_executions WHERE id = ?`;

    if (!db) {
      res.status(500).json({
        error: 'Database not initialized',
        code: 'DATABASE_ERROR'
      });
      return;
    }

    db.get(query, [id], (err, result: { error_message?: string }) => {
      if (err) {
        console.error('Database error fetching test logs:', err);
        res.status(500).json({
          error: 'Database error',
          code: 'DATABASE_ERROR'
        });
        return;
      }

      res.json({
        logs: result?.error_message || 'No logs available'
      });
    });

  } catch (error) {
    console.error('Error fetching test logs:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: db ? 'connected' : 'disconnected'
  });
});

export { setDatabase };
export default router;
