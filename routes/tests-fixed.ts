import express, { Request, Response, Router } from 'express';
import { requireAuth } from './auth';
import db from '../database';

const router: Router = express.Router();

// Types
interface TestExecution {
  id: number;
  name: string;
  description?: string;
  command: string;
  environment: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  created_by: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  exit_code?: number;
  output?: string;
  error_output?: string;
  logs?: string;
  metadata?: string;
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
  name: string;
  description?: string;
  command: string;
  environment?: string;
  tags?: string[];
  timeout?: number;
  metadata?: Record<string, any>;
}

// Get all test executions
router.get('/executions', requireAuth, async (req: any, res: Response) => {
  try {
    const { page = '1', limit = '20', status }: PaginationQuery = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT 
        te.*,
        u.username as created_by_username
      FROM test_executions te
      LEFT JOIN users u ON te.created_by = u.id
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

    const executions: TestExecution[] = await db.all(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM test_executions';
    const countParams: string[] = [];
    
    if (status) {
      countQuery += ' WHERE status = ?';
      countParams.push(status);
    }

    const countResult: { total: number } = await db.get(countQuery, countParams);

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

  } catch (error) {
    console.error('Error fetching test executions:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Get specific test execution
router.get('/executions/:id', requireAuth, async (req: any, res: Response) => {
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

    if (!db) {
      res.status(500).json({
        error: 'Database not initialized',
        code: 'DATABASE_ERROR'
      });
      return;
    }

    const execution: TestExecution = await db.get(query, [id]);

    if (!execution) {
      res.status(404).json({
        error: 'Test execution not found',
        code: 'EXECUTION_NOT_FOUND'
      });
      return;
    }

    res.json({ execution });

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
      name,
      description,
      command,
      environment = 'default',
      tags = [],
      timeout = 300000, // 5 minutes default
      metadata = {}
    }: RunTestRequest = req.body;

    // Validation
    if (!name || !command) {
      res.status(400).json({
        error: 'Name and command are required',
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    // Create test execution record
    const insertQuery = `
      INSERT INTO test_executions (
        name, description, command, environment, status, 
        created_by, created_at, metadata
      ) VALUES (?, ?, ?, ?, 'pending', ?, datetime('now'), ?)
    `;

    const values = [
      name,
      description || null,
      command,
      environment,
      userId,
      JSON.stringify({
        tags,
        timeout,
        ...metadata
      })
    ];

    if (!db) {
      res.status(500).json({
        error: 'Database not initialized',
        code: 'DATABASE_ERROR'
      });
      return;
    }

    const result = await db.run(insertQuery, values);
    const executionId = result.lastID;

    // In a real implementation, you would start the test execution here
    // For now, we'll just return the created execution
    res.status(201).json({
      message: 'Test execution created successfully',
      execution: {
        id: executionId,
        name,
        description,
        command,
        environment,
        status: 'pending',
        created_by: userId,
        created_at: new Date().toISOString(),
        metadata: JSON.stringify({
          tags,
          timeout,
          ...metadata
        })
      }
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
router.post('/executions/:id/cancel', requireAuth, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const checkQuery = `
      SELECT id, status, created_by FROM test_executions WHERE id = ?
    `;

    if (!db) {
      res.status(500).json({
        error: 'Database not initialized',
        code: 'DATABASE_ERROR'
      });
      return;
    }

    const execution: TestExecution = await db.get(checkQuery, [id]);

    if (!execution) {
      res.status(404).json({
        error: 'Test execution not found',
        code: 'EXECUTION_NOT_FOUND'
      });
      return;
    }

    // Check if user can cancel this execution
    if (execution.created_by !== userId) {
      res.status(403).json({
        error: 'Not authorized to cancel this execution',
        code: 'AUTHORIZATION_ERROR'
      });
      return;
    }

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
      SET status = 'cancelled', completed_at = datetime('now')
      WHERE id = ?
    `;

    if (!db) {
      res.status(500).json({
        error: 'Database not initialized',
        code: 'DATABASE_ERROR'
      });
      return;
    }

    await db.run(updateQuery, [id]);

    res.json({
      message: 'Test execution cancelled successfully'
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
router.get('/executions/:id/results', requireAuth, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        id, name, status, exit_code, output, error_output,
        started_at, completed_at, created_at, metadata
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

    const execution: TestExecution = await db.get(query, [id]);

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

  } catch (error) {
    console.error('Error fetching test results:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Get test execution logs
router.get('/executions/:id/logs', requireAuth, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const query = `SELECT logs FROM test_executions WHERE id = ?`;

    if (!db) {
      res.status(500).json({
        error: 'Database not initialized',
        code: 'DATABASE_ERROR'
      });
      return;
    }

    const result: { logs?: string } = await db.get(query, [id]);

    res.json({
      logs: result?.logs || 'No logs available'
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

export default router;
