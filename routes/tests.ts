import express, { Request, Response, Router } from 'express';
import { requireAuth } from './auth';
import { Database } from 'sqlite3';
import AdoClient from '../lib/ado-client';

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
router.get('/', requireAuth, async (req: any, res: Response) => {
  try {
  // Do not include local DB tests in the Test Management page
  const localTests: any[] = [];

    // Optionally augment with Azure DevOps test results when enabled
    let adoTests: any[] = [];
    const adoEnabled = (process.env.ADO_ENABLED || 'false').toLowerCase() === 'true';
    if (adoEnabled) {
      try {
        const client = new AdoClient();
        const projectId = client.getProjectId();

  // Fetch a broader set of build definitions and their recent builds
  const definitions = await client.getBuildDefinitions(projectId);
  const topDefs = (definitions || []).slice(0, 10);
  const days = parseInt(process.env.ADO_HISTORICAL_DATA_DAYS || '30', 10);
  const minTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  for (const def of topDefs) {
          try {
            const builds = await client.getBuildsForDefinition(def.id, { projectId, top: 5, minTime });
            for (const build of builds) {
              try {
    const results = await client.getTestResultsForBuild(build.id, projectId);
                const mapped = results.map(r => ({
                  id: `ado-${build.id}-${r.id}`,
                  title: r.testCaseTitle || r.automatedTestName || 'ADO Test',
                  status: (r.outcome || '').toLowerCase() === 'passed' ? 'passed' :
                          (r.outcome || '').toLowerCase() === 'failed' ? 'failed' :
                          (r.outcome || '').toLowerCase() === 'notexecuted' ? 'skipped' : 'not-run',
                  duration: r.durationInMs || undefined,
                  lastRun: r.completedDate ? new Date(r.completedDate).toISOString() : undefined,
      suite: def.name || 'ADO',
      pipeline: def.name || 'ADO',
                  file: r.automatedTestName || undefined,
                  environment: 'azure-devops'
                }));
                adoTests.push(...mapped);
              } catch (innerErr: any) {
                console.warn('⚠️ Failed to fetch ADO test results for build', build.id, innerErr?.message || innerErr);
              }
            }
          } catch (defErr: any) {
            console.warn('⚠️ Failed to fetch builds for definition', def.id, defErr?.message || defErr);
          }
        }

  // Absolute fallback: if still empty, try recent project results directly
  if (adoTests.length === 0) {
          try {
            const buildNameCache = new Map<number, string>();
      const recent = await client.getRecentTestResults(projectId, 20);
            const mapped = [] as any[];
            for (const r of recent) {
              let pipelineName = r.pipelineName || r.testRun?.name || '';
              const buildId = (r.buildId) || (r as any)?.build?.id || (r as any)?.testRun?.buildConfiguration?.buildId || 0;
              if (buildId && !buildNameCache.has(buildId)) {
                try {
                  const b = await client.getBuild(buildId, projectId);
                  if (b?.definition?.name) buildNameCache.set(buildId, b.definition.name);
                } catch (e:any) {
                  // ignore, fall back to run name
                }
              }
              if (buildId && buildNameCache.has(buildId)) {
                pipelineName = buildNameCache.get(buildId) as string;
              }
              if (!pipelineName) {
                // Fallback to first known definition name if available
                pipelineName = (definitions && definitions[0] && (definitions[0] as any).name) || 'ADO';
              }
              mapped.push({
                id: `ado-recent-${r.testRun?.id}-${r.id}`,
                title: r.testCaseTitle || r.automatedTestName || 'ADO Test',
                status: (r.outcome || '').toLowerCase() === 'passed' ? 'passed' :
                        (r.outcome || '').toLowerCase() === 'failed' ? 'failed' :
                        (r.outcome || '').toLowerCase() === 'notexecuted' ? 'skipped' : 'not-run',
                duration: r.durationInMs || undefined,
                lastRun: r.completedDate ? new Date(r.completedDate).toISOString() : undefined,
                suite: pipelineName || r.testRun?.name || 'ADO',
                pipeline: pipelineName,
                file: r.automatedTestName || undefined,
                environment: 'azure-devops'
              });
            }
            adoTests.push(...mapped);
          } catch (recentErr) {
            console.warn('⚠️ Failed to fetch recent ADO test results:', (recentErr as any)?.message || recentErr);
          }
        }

        // If still empty, enumerate recent builds across all definitions and pull test results
        if (adoTests.length === 0) {
          try {
            const recentBuilds = await client.getRecentBuilds(projectId, { top: 10, minTime });
            for (const build of recentBuilds) {
              try {
                const results = await client.getTestResultsForBuild(build.id, projectId);
                const pipelineName = build.definition?.name || 'ADO';
                const mapped = results.map(r => ({
                  id: `ado-buildscan-${build.id}-${r.id}`,
                  title: r.testCaseTitle || r.automatedTestName || 'ADO Test',
                  status: (r.outcome || '').toLowerCase() === 'passed' ? 'passed' :
                          (r.outcome || '').toLowerCase() === 'failed' ? 'failed' :
                          (r.outcome || '').toLowerCase() === 'notexecuted' ? 'skipped' : 'not-run',
                  duration: r.durationInMs || undefined,
                  lastRun: r.completedDate ? new Date(r.completedDate).toISOString() : undefined,
                  suite: pipelineName,
                  pipeline: pipelineName,
                  file: r.automatedTestName || undefined,
                  environment: 'azure-devops'
                }));
                adoTests.push(...mapped);
              } catch (innerErr:any) {
                console.warn('⚠️ Failed to fetch results for recent build', build.id, innerErr?.message || innerErr);
              }
            }
          } catch (buildScanErr) {
            console.warn('⚠️ Failed to enumerate recent builds for ADO tests:', (buildScanErr as any)?.message || buildScanErr);
          }
        }

        // Final fallback: if still empty, synthesize pseudo-tests from build status so UI isn't blank
        if (adoTests.length === 0) {
          try {
            const recentBuilds = await client.getRecentBuilds(projectId, { top: 10, minTime });
            const synth = recentBuilds.map(b => {
              const pipelineName = b.definition?.name || 'ADO';
              const status = (b.result || '').toString().toLowerCase();
              const mappedStatus = status.includes('succeeded') ? 'passed'
                                   : status.includes('failed') ? 'failed'
                                   : 'not-run';
              const start = b.startTime ? new Date(b.startTime).getTime() : 0;
              const finish = b.finishTime ? new Date(b.finishTime).getTime() : 0;
              const duration = start && finish && finish > start ? (finish - start) : undefined;
              return {
                id: `ado-build-${b.id}`,
                title: `${pipelineName} • Build ${b.buildNumber}`,
                status: mappedStatus as 'passed' | 'failed' | 'not-run',
                duration,
                lastRun: b.finishTime ? new Date(b.finishTime).toISOString() : undefined,
                suite: pipelineName,
                pipeline: pipelineName,
                environment: 'azure-devops',
                source: 'ado-build'
              } as any;
            });
            adoTests.push(...synth);
          } catch (synthErr) {
            console.warn('⚠️ Failed to synthesize tests from builds:', (synthErr as any)?.message || synthErr);
          }
        }
      } catch (adoErr: any) {
        console.warn('⚠️ Azure DevOps not configured or unreachable:', adoErr?.message || adoErr);
      }
    }

  // Only return ADO tests for the Test Management page
  const combined = [...adoTests];
    res.json({
      success: true,
      tests: combined,
      total: combined.length,
      page: 1,
      limit: 50
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
