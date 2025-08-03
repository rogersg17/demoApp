const express = require('express');
const router = express.Router();

/**
 * Test Result Processing API Routes
 * Handles manual build processing and failure information retrieval
 */

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ 
            success: false, 
            error: 'Authentication required' 
        });
    }
    next();
};

// Services (will be set by server.js)
let testFailureProcessor = null;
let enhancedJiraIntegration = null;
let configService = null;

// Function to set services (called from server.js)
const setServices = (tfProcessor, jiraIntegration, adoConfigService) => {
    testFailureProcessor = tfProcessor;
    enhancedJiraIntegration = jiraIntegration;
    configService = adoConfigService;
};

/**
 * POST /api/mvp/process-build/:buildId
 * Manual build processing - force processing of a specific build
 */
router.post('/process-build/:buildId', requireAuth, async (req, res) => {
    try {
        const { buildId } = req.params;
        const { pipelineConfigId, createJiraIssues = false } = req.body;

        if (!buildId || !pipelineConfigId) {
            return res.status(400).json({
                success: false,
                error: 'Build ID and pipeline configuration ID are required'
            });
        }

        if (!testFailureProcessor) {
            return res.status(500).json({
                success: false,
                error: 'Test failure processor service not available'
            });
        }

        // Process the build
        const result = await testFailureProcessor.processBuildResults(
            parseInt(buildId), 
            parseInt(pipelineConfigId)
        );

        // Create JIRA issues if requested and service is available
        const jiraResults = [];
        if (createJiraIssues && enhancedJiraIntegration && result.failures.length > 0) {
            for (const failure of result.failures) {
                try {
                    const jiraResult = await enhancedJiraIntegration.createIssueForFailure(failure.id);
                    jiraResults.push({
                        failureId: failure.id,
                        jiraIssue: jiraResult.jiraIssue,
                        success: true
                    });
                } catch (jiraError) {
                    console.error(`Failed to create JIRA issue for failure ${failure.id}:`, jiraError);
                    jiraResults.push({
                        failureId: failure.id,
                        error: jiraError.message,
                        success: false
                    });
                }
            }
        }

        res.json({
            success: true,
            data: {
                ...result,
                jiraResults: jiraResults
            }
        });

    } catch (error) {
        console.error('Failed to process build:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/mvp/failures/:pipelineId
 * Get recent failures for a specific pipeline
 */
router.get('/failures/:pipelineId', requireAuth, async (req, res) => {
    try {
        const { pipelineId } = req.params;
        const { 
            limit = 50, 
            offset = 0, 
            since = null, 
            includeProcessed = true 
        } = req.query;

        if (!testFailureProcessor) {
            return res.status(500).json({
                success: false,
                error: 'Test failure processor service not available'
            });
        }

        const failures = await testFailureProcessor.getFailuresForPipeline(
            parseInt(pipelineId), 
            {
                limit: parseInt(limit),
                offset: parseInt(offset),
                since: since,
                includeProcessed: includeProcessed === 'true'
            }
        );

        res.json({
            success: true,
            data: {
                failures: failures,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: failures.length
                }
            }
        });

    } catch (error) {
        console.error('Failed to get pipeline failures:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/mvp/failure/:id
 * Get detailed information about a specific failure
 */
router.get('/failure/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        if (!testFailureProcessor) {
            return res.status(500).json({
                success: false,
                error: 'Test failure processor service not available'
            });
        }

        const failure = await testFailureProcessor.getFailureDetails(parseInt(id));

        if (!failure) {
            return res.status(404).json({
                success: false,
                error: 'Failure not found'
            });
        }

        // Enrich with additional context if available
        let enrichedFailure = { ...failure };

        // Parse stack trace info if available
        if (failure.failure_stack_trace) {
            try {
                // Try to parse additional context from stack trace
                const stackLines = failure.failure_stack_trace.split('\n');
                enrichedFailure.stackTraceLines = stackLines.slice(0, 20); // First 20 lines
            } catch (parseError) {
                // Ignore parsing errors
            }
        }

        res.json({
            success: true,
            data: enrichedFailure
        });

    } catch (error) {
        console.error('Failed to get failure details:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/mvp/failure/:id/create-jira-issue
 * Create a JIRA issue for a specific failure
 */
router.post('/failure/:id/create-jira-issue', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { assignee, priority, labels, customFields } = req.body;

        if (!enhancedJiraIntegration) {
            return res.status(500).json({
                success: false,
                error: 'Enhanced JIRA integration service not available'
            });
        }

        const result = await enhancedJiraIntegration.createIssueForFailure(
            parseInt(id),
            {
                assignee,
                priority,
                labels,
                customFields
            }
        );

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Failed to create JIRA issue:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/mvp/failures/summary/:pipelineId
 * Get failure summary statistics for a pipeline
 */
router.get('/failures/summary/:pipelineId', requireAuth, async (req, res) => {
    try {
        const { pipelineId } = req.params;
        const { period = '7d' } = req.query;

        if (!testFailureProcessor) {
            return res.status(500).json({
                success: false,
                error: 'Test failure processor service not available'
            });
        }

        // Calculate since date based on period
        let since = null;
        switch (period) {
            case '1d':
                since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                break;
            case '7d':
                since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                break;
            case '30d':
                since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
                break;
        }

        const failures = await testFailureProcessor.getFailuresForPipeline(
            parseInt(pipelineId),
            { since: since, limit: 1000 } // Get all failures in period
        );

        // Calculate summary statistics
        const summary = {
            totalFailures: failures.length,
            byCategory: {},
            byType: {},
            byEnvironment: {},
            withJiraIssues: 0,
            processed: 0,
            recentBuilds: new Set(),
            period: period
        };

        failures.forEach(failure => {
            // Count by category
            const category = failure.failure_category || 'unknown';
            summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;

            // Count by type
            const type = failure.failure_type || 'unknown';
            summary.byType[type] = (summary.byType[type] || 0) + 1;

            // Count by environment
            const env = failure.environment || 'unknown';
            summary.byEnvironment[env] = (summary.byEnvironment[env] || 0) + 1;

            // Count processed and with JIRA issues
            if (failure.processed) summary.processed++;
            if (failure.jira_issue_created) summary.withJiraIssues++;

            // Track unique builds
            summary.recentBuilds.add(failure.ado_build_number);
        });

        summary.uniqueBuilds = summary.recentBuilds.size;
        delete summary.recentBuilds; // Remove the Set object

        res.json({
            success: true,
            data: summary
        });

    } catch (error) {
        console.error('Failed to get failure summary:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/mvp/failures/bulk-process
 * Bulk process multiple failures (e.g., create JIRA issues for all unprocessed failures)
 */
router.post('/failures/bulk-process', requireAuth, async (req, res) => {
    try {
        const { 
            pipelineConfigId, 
            action = 'create-jira-issues',
            filters = {} 
        } = req.body;

        if (!pipelineConfigId) {
            return res.status(400).json({
                success: false,
                error: 'Pipeline configuration ID is required'
            });
        }

        if (!testFailureProcessor || !enhancedJiraIntegration) {
            return res.status(500).json({
                success: false,
                error: 'Required services not available'
            });
        }

        // Get failures based on filters
        const failures = await testFailureProcessor.getFailuresForPipeline(
            pipelineConfigId,
            {
                includeProcessed: false, // Only unprocessed by default
                limit: 100, // Reasonable limit for bulk processing
                ...filters
            }
        );

        const results = [];

        if (action === 'create-jira-issues') {
            for (const failure of failures) {
                try {
                    const jiraResult = await enhancedJiraIntegration.createIssueForFailure(failure.id);
                    results.push({
                        failureId: failure.id,
                        testName: failure.test_name,
                        jiraIssue: jiraResult.jiraIssue,
                        success: true
                    });
                } catch (error) {
                    console.error(`Failed to create JIRA issue for failure ${failure.id}:`, error);
                    results.push({
                        failureId: failure.id,
                        testName: failure.test_name,
                        error: error.message,
                        success: false
                    });
                }
            }
        }

        res.json({
            success: true,
            data: {
                action: action,
                processed: results.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                results: results
            }
        });

    } catch (error) {
        console.error('Failed to bulk process failures:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/mvp/test-jira-connection
 * Test JIRA connection
 */
router.get('/test-jira-connection', requireAuth, async (req, res) => {
    try {
        if (!enhancedJiraIntegration) {
            return res.status(500).json({
                success: false,
                error: 'Enhanced JIRA integration service not available'
            });
        }

        const result = await enhancedJiraIntegration.testConnection();
        
        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Failed to test JIRA connection:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/mvp/recent-failures
 * Get recent failures across all pipelines (for dashboard)
 */
router.get('/recent-failures', requireAuth, async (req, res) => {
    try {
        const { limit = 20, includeJiraStatus = true } = req.query;

        if (!testFailureProcessor) {
            return res.status(500).json({
                success: false,
                error: 'Test failure processor service not available'
            });
        }

        // Use the view that includes JIRA status
        const query = includeJiraStatus === 'true' 
            ? 'SELECT * FROM mvp_recent_failures_with_jira ORDER BY failure_time DESC LIMIT ?'
            : `SELECT tf.*, pc.name as pipeline_name, pc.ado_project_name
               FROM mvp_test_failures tf
               JOIN mvp_pipeline_configs pc ON tf.pipeline_config_id = pc.id
               ORDER BY tf.created_at DESC LIMIT ?`;

        const failures = await new Promise((resolve, reject) => {
            testFailureProcessor.db.db.all(query, [parseInt(limit)], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        res.json({
            success: true,
            data: failures
        });

    } catch (error) {
        console.error('Failed to get recent failures:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Bulk process multiple builds
router.post('/process-builds/bulk', requireAuth, async (req, res) => {
    try {
        const { buildIds, pipelineId } = req.body;

        if (!buildIds || !Array.isArray(buildIds) || buildIds.length === 0) {
            return res.status(400).json({
                error: 'Build IDs array is required',
                received: buildIds
            });
        }

        if (!pipelineId) {
            return res.status(400).json({
                error: 'Pipeline ID is required',
                received: pipelineId
            });
        }

        const results = [];
        const errors = [];

        // Process each build
        for (const buildId of buildIds) {
            try {
                webSocketService?.emitBuildProcessingStarted({
                    buildId,
                    pipelineId,
                    timestamp: new Date().toISOString()
                });

                const result = await testFailureProcessor.processBuildResults(buildId, pipelineId);
                results.push({
                    buildId,
                    success: true,
                    failuresDetected: result.failuresDetected || 0,
                    processingTime: result.processingTime
                });

                webSocketService?.emitBuildProcessingCompleted({
                    buildId,
                    pipelineId,
                    failuresDetected: result.failuresDetected || 0,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error(`Failed to process build ${buildId}:`, error);
                errors.push({
                    buildId,
                    error: error.message
                });

                webSocketService?.emitBuildProcessingFailed({
                    buildId,
                    pipelineId,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }

        res.json({
            success: true,
            processed: results.length,
            failed: errors.length,
            results,
            errors
        });

    } catch (error) {
        console.error('Bulk build processing failed:', error);
        res.status(500).json({
            error: 'Failed to process builds',
            details: error.message
        });
    }
});

// Get dashboard summary
router.get('/dashboard/summary', requireAuth, async (req, res) => {
    try {
        const { timeframe = '24h' } = req.query;

        // Calculate date range
        let since = new Date();
        switch (timeframe) {
            case '1h':
                since.setHours(since.getHours() - 1);
                break;
            case '24h':
                since.setDate(since.getDate() - 1);
                break;
            case '7d':
                since.setDate(since.getDate() - 7);
                break;
            case '30d':
                since.setDate(since.getDate() - 30);
                break;
            default:
                since.setDate(since.getDate() - 1);
        }

        const sinceIso = since.toISOString();

        // Get total failures in timeframe
        const totalFailures = await db.get(`
            SELECT COUNT(*) as count
            FROM mvp_test_failures
            WHERE last_seen >= ?
        `, [sinceIso]);

        // Get new failures (first seen in timeframe)
        const newFailures = await db.get(`
            SELECT COUNT(*) as count
            FROM mvp_test_failures
            WHERE first_seen >= ?
        `, [sinceIso]);

        // Get failures by status
        const failuresByStatus = await db.all(`
            SELECT status, COUNT(*) as count
            FROM mvp_test_failures
            WHERE last_seen >= ?
            GROUP BY status
        `, [sinceIso]);

        // Get failures by classification
        const failuresByClassification = await db.all(`
            SELECT classification, COUNT(*) as count
            FROM mvp_test_failures
            WHERE last_seen >= ?
            GROUP BY classification
        `, [sinceIso]);

        // Get top failing tests
        const topFailingTests = await db.all(`
            SELECT 
                test_name,
                COUNT(*) as failure_count,
                MAX(last_seen) as latest_failure,
                classification
            FROM mvp_test_failures
            WHERE last_seen >= ?
            GROUP BY test_name
            ORDER BY failure_count DESC
            LIMIT 10
        `, [sinceIso]);

        // Get recent JIRA issues created
        const recentJiraIssues = await db.get(`
            SELECT COUNT(*) as count
            FROM mvp_jira_ado_links
            WHERE created_at >= ?
        `, [sinceIso]);

        // Get active pipelines
        const activePipelines = await db.all(`
            SELECT 
                pc.id,
                pc.pipeline_name,
                pc.organization_name,
                pc.project_name,
                COUNT(tf.id) as failure_count
            FROM mvp_pipeline_configs pc
            LEFT JOIN mvp_test_failures tf ON pc.id = tf.pipeline_id AND tf.last_seen >= ?
            WHERE pc.is_active = 1
            GROUP BY pc.id
            ORDER BY failure_count DESC
        `, [sinceIso]);

        res.json({
            summary: {
                timeframe,
                totalFailures: totalFailures.count,
                newFailures: newFailures.count,
                jiraIssuesCreated: recentJiraIssues.count,
                activePipelines: activePipelines.length
            },
            breakdowns: {
                byStatus: failuresByStatus,
                byClassification: failuresByClassification
            },
            topFailingTests,
            activePipelines
        });

    } catch (error) {
        console.error('Failed to get dashboard summary:', error);
        res.status(500).json({
            error: 'Failed to get dashboard summary',
            details: error.message
        });
    }
});

// Update failure details
router.put('/failure/:id/update', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, classification, notes } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Failure ID is required' });
        }

        // Check if failure exists
        const failure = await db.get(`
            SELECT * FROM mvp_test_failures WHERE id = ?
        `, [id]);

        if (!failure) {
            return res.status(404).json({ error: 'Test failure not found' });
        }

        // Build update query
        const updates = [];
        const params = [];

        if (status) {
            updates.push('status = ?');
            params.push(status);
        }

        if (classification) {
            updates.push('classification = ?');
            params.push(classification);
        }

        if (notes) {
            updates.push('notes = ?');
            params.push(notes);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No update fields provided' });
        }

        // Add updated timestamp
        updates.push('updated_at = ?');
        params.push(new Date().toISOString());
        params.push(id);

        // Update the failure
        await db.run(`
            UPDATE mvp_test_failures 
            SET ${updates.join(', ')}
            WHERE id = ?
        `, params);

        // Get updated failure
        const updatedFailure = await db.get(`
            SELECT * FROM mvp_test_failures WHERE id = ?
        `, [id]);

        // Update JIRA issue if it exists and status changed to resolved
        if (status === 'resolved') {
            try {
                const jiraResult = await jiraIntegration.updateIssueFromFailure(id, {
                    addComment: true,
                    comment: `Test failure has been marked as resolved. ${notes ? `Notes: ${notes}` : ''}`
                });

                if (jiraResult.success) {
                    updatedFailure.jiraIssueUpdated = true;
                }
            } catch (jiraError) {
                console.warn('Failed to update JIRA issue:', jiraError.message);
                updatedFailure.jiraIssueUpdated = false;
            }
        }

        res.json({
            success: true,
            failure: updatedFailure
        });

    } catch (error) {
        console.error('Failed to update failure:', error);
        res.status(500).json({
            error: 'Failed to update failure',
            details: error.message
        });
    }
});

// Delete failure record
router.delete('/failure/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Failure ID is required' });
        }

        // Check if failure exists
        const failure = await db.get(`
            SELECT * FROM mvp_test_failures WHERE id = ?
        `, [id]);

        if (!failure) {
            return res.status(404).json({ error: 'Test failure not found' });
        }

        // Check if there's a linked JIRA issue
        const jiraLink = await db.get(`
            SELECT * FROM mvp_jira_ado_links WHERE failure_id = ?
        `, [id]);

        // Delete the failure record
        await db.run(`
            DELETE FROM mvp_test_failures WHERE id = ?
        `, [id]);

        // Also delete the JIRA link if it exists
        if (jiraLink) {
            await db.run(`
                DELETE FROM mvp_jira_ado_links WHERE failure_id = ?
            `, [id]);
        }

        res.json({
            success: true,
            deletedFailureId: id,
            hadJiraLink: !!jiraLink,
            deletedJiraLinkId: jiraLink?.id
        });

    } catch (error) {
        console.error('Failed to delete failure:', error);
        res.status(500).json({
            error: 'Failed to delete failure',
            details: error.message
        });
    }
});

module.exports = { router, setServices };
