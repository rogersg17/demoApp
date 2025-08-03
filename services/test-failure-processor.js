const AdoClient = require('../lib/ado-client');

class TestFailureProcessor {
    constructor(database, configService) {
        this.db = database;
        this.configService = configService;
        this.debug = process.env.ADO_DEBUG === 'true';
    }

    /**
     * Process test results from an ADO build
     */
    async processBuildResults(buildId, pipelineConfigId) {
        try {
            this.log(`Processing build results for build ${buildId}, pipeline config ${pipelineConfigId}`);

            // Get pipeline configuration
            const config = await this.configService.getPipelineConfig(pipelineConfigId);
            if (!config) {
                throw new Error(`Pipeline configuration ${pipelineConfigId} not found`);
            }

            // Create ADO client
            const adoClient = new AdoClient({
                orgUrl: config.ado_organization_url,
                pat: process.env.ADO_PAT,
                projectId: config.ado_project_id
            });

            // Get build details
            const build = await adoClient.getBuild(buildId, config.ado_project_id);
            this.log(`Retrieved build details: ${build.buildNumber} - ${build.result}`);

            // Get test results for the build
            const testResults = await adoClient.getTestResultsForBuild(buildId, config.ado_project_id);
            this.log(`Found ${testResults.length} test results for build ${buildId}`);

            // Process test results
            const processedResults = await this.analyzeTestResults(testResults, build, config);

            // Store failures in database
            const storedFailures = [];
            for (const failure of processedResults.failures) {
                const storedFailure = await this.storeTestFailure(failure, config);
                storedFailures.push(storedFailure);
            }

            this.log(`Processed ${storedFailures.length} failures for build ${buildId}`);

            return {
                buildId: buildId,
                buildNumber: build.buildNumber,
                totalTests: processedResults.summary.total,
                passed: processedResults.summary.passed,
                failed: processedResults.summary.failed,
                skipped: processedResults.summary.skipped,
                failures: storedFailures,
                processedAt: new Date().toISOString()
            };
        } catch (error) {
            this.error('Failed to process build results:', error);
            throw error;
        }
    }

    /**
     * Analyze test results and classify failures
     */
    async analyzeTestResults(testResults, build, config) {
        const summary = {
            total: testResults.length,
            passed: 0,
            failed: 0,
            skipped: 0,
            aborted: 0
        };

        const failures = [];

        for (const result of testResults) {
            // Update summary counts
            switch (result.outcome?.toLowerCase()) {
                case 'passed':
                    summary.passed++;
                    break;
                case 'failed':
                    summary.failed++;
                    break;
                case 'skipped':
                case 'notExecuted':
                    summary.skipped++;
                    break;
                case 'aborted':
                    summary.aborted++;
                    break;
                default:
                    // Handle unknown outcomes
                    if (result.outcome) {
                        this.log(`Unknown test outcome: ${result.outcome}`);
                    }
            }

            // Process failures
            if (result.outcome === 'Failed' || result.outcome === 'Aborted') {
                const failure = await this.classifyFailure(result, build, config);
                failures.push(failure);
            }
        }

        return {
            summary,
            failures
        };
    }

    /**
     * Classify a test failure and enrich with context
     */
    async classifyFailure(testResult, build, config) {
        // Parse test name components
        const testNameParts = this.parseTestName(testResult.testCaseTitle || testResult.automatedTestName);

        // Classify failure type
        const failureType = this.classifyFailureType(testResult);

        // Extract stack trace info
        const stackTraceInfo = this.parseStackTrace(testResult.stackTrace);

        // Enrich with build context
        const buildContext = this.extractBuildContext(build);

        // Attempt to correlate with existing test metadata
        const correlation = await this.correlateWithExistingTests(testNameParts, config);

        return {
            // Test identification
            testRunId: testResult.testRun.id,
            testCaseId: testResult.testCaseReferenceId,
            testName: testResult.testCaseTitle || testResult.automatedTestName,
            testClassName: testNameParts.className,
            testMethodName: testNameParts.methodName,
            testFilePath: testNameParts.filePath,

            // Failure details
            failureType: failureType.type,
            failureCategory: failureType.category,
            failureMessage: testResult.errorMessage,
            failureStackTrace: testResult.stackTrace,
            
            // Enriched context
            stackTraceInfo: stackTraceInfo,
            buildContext: buildContext,
            
            // Correlation
            testMetadataId: correlation.testMetadataId,
            correlationConfidence: correlation.confidence,
            
            // Timing
            startedDate: testResult.startedDate,
            completedDate: testResult.completedDate,
            durationMs: testResult.durationInMs,

            // Build information
            adoBuildId: build.id,
            adoBuildNumber: build.buildNumber,
            adoBuildStatus: build.status,
            adoBuildResult: build.result,
            adoBuildUrl: build.url,
            adoBuildStartedAt: build.startTime,
            adoBuildFinishedAt: build.finishTime,
            branchName: build.sourceBranch,
            commitSha: build.sourceVersion,
            
            // Environment context
            environment: this.extractEnvironment(build),
            
            // Processing metadata
            processed: false,
            jiraIssueCreated: false
        };
    }

    /**
     * Parse test name to extract components
     */
    parseTestName(testName) {
        if (!testName) {
            return { className: null, methodName: null, filePath: null };
        }

        // Try to parse different test name formats
        
        // Format 1: "ClassName.MethodName" (e.g., "LoginTest.testValidLogin")
        let match = testName.match(/^([^.]+)\.([^.]+)$/);
        if (match) {
            return {
                className: match[1],
                methodName: match[2],
                filePath: null
            };
        }

        // Format 2: "FilePath > TestName" (e.g., "tests/login.spec.ts > Login should work")
        match = testName.match(/^([^>]+)\s*>\s*(.+)$/);
        if (match) {
            return {
                className: null,
                methodName: match[2].trim(),
                filePath: match[1].trim()
            };
        }

        // Format 3: "describe block › test name" (Jest/Mocha style)
        match = testName.match(/^([^›]+)\s*›\s*(.+)$/);
        if (match) {
            return {
                className: match[1].trim(),
                methodName: match[2].trim(),
                filePath: null
            };
        }

        // Format 4: File path in the name
        match = testName.match(/([^/\\]+\.(spec|test|e2e)\.(js|ts|jsx|tsx)).*$/);
        if (match) {
            return {
                className: null,
                methodName: testName,
                filePath: match[1]
            };
        }

        // Default: treat entire name as method name
        return {
            className: null,
            methodName: testName,
            filePath: null
        };
    }

    /**
     * Classify the type and category of failure
     */
    classifyFailureType(testResult) {
        const errorMessage = (testResult.errorMessage || '').toLowerCase();
        const failureType = testResult.failureType || testResult.outcome;

        // Determine category based on error message patterns
        let category = 'unknown';

        if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
            category = 'timeout';
        } else if (errorMessage.includes('assertion') || errorMessage.includes('expect')) {
            category = 'assertion';
        } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
            category = 'network';
        } else if (errorMessage.includes('element') || errorMessage.includes('selector')) {
            category = 'ui_element';
        } else if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
            category = 'permission';
        } else if (errorMessage.includes('data') || errorMessage.includes('database')) {
            category = 'data';
        } else if (errorMessage.includes('environment') || errorMessage.includes('configuration')) {
            category = 'environment';
        } else if (failureType === 'Aborted') {
            category = 'aborted';
        }

        return {
            type: failureType,
            category: category
        };
    }

    /**
     * Parse stack trace for additional context
     */
    parseStackTrace(stackTrace) {
        if (!stackTrace) {
            return null;
        }

        const lines = stackTrace.split('\n').filter(line => line.trim());
        const relevantLines = [];
        let errorLocation = null;

        for (const line of lines) {
            // Look for file references
            const fileMatch = line.match(/at .+?\((.+?):(\d+):(\d+)\)/);
            if (fileMatch) {
                const location = {
                    file: fileMatch[1],
                    line: parseInt(fileMatch[2]),
                    column: parseInt(fileMatch[3])
                };

                if (!errorLocation && location.file.includes('.spec.') || location.file.includes('.test.')) {
                    errorLocation = location;
                }

                relevantLines.push({
                    text: line.trim(),
                    location: location
                });
            } else {
                relevantLines.push({
                    text: line.trim(),
                    location: null
                });
            }
        }

        return {
            errorLocation: errorLocation,
            relevantLines: relevantLines.slice(0, 10), // Keep first 10 lines
            hasFileReferences: relevantLines.some(line => line.location !== null)
        };
    }

    /**
     * Extract build context information
     */
    extractBuildContext(build) {
        return {
            reason: build.reason,
            requestedBy: build.requestedBy?.displayName || build.requestedBy?.uniqueName,
            requestedFor: build.requestedFor?.displayName || build.requestedFor?.uniqueName,
            sourceBranch: build.sourceBranch,
            sourceVersion: build.sourceVersion,
            tags: build.tags || [],
            queueTime: build.queueTime,
            priority: build.priority
        };
    }

    /**
     * Extract environment information from build
     */
    extractEnvironment(build) {
        // Try to extract environment from build configuration or variables
        // This would depend on how your ADO builds are configured
        
        let environment = 'unknown';
        
        // Check build definition name for environment hints
        if (build.definition?.name) {
            const defName = build.definition.name.toLowerCase();
            if (defName.includes('prod')) environment = 'production';
            else if (defName.includes('staging') || defName.includes('stage')) environment = 'staging';
            else if (defName.includes('test') || defName.includes('qa')) environment = 'test';
            else if (defName.includes('dev')) environment = 'development';
        }

        // Check branch name for environment hints
        if (build.sourceBranch) {
            const branch = build.sourceBranch.toLowerCase();
            if (branch.includes('main') || branch.includes('master')) environment = 'production';
            else if (branch.includes('staging')) environment = 'staging';
            else if (branch.includes('develop')) environment = 'development';
        }

        return environment;
    }

    /**
     * Attempt to correlate with existing test metadata
     */
    async correlateWithExistingTests(testNameParts, config) {
        try {
            // This is a simplified correlation - in a real implementation,
            // you'd want more sophisticated matching algorithms
            
            if (!testNameParts.testName && !testNameParts.filePath) {
                return { testMetadataId: null, confidence: 0.0 };
            }

            return new Promise((resolve, reject) => {
                let query = 'SELECT id, test_name, file_path FROM test_metadata WHERE ';
                const params = [];
                const conditions = [];

                if (testNameParts.filePath) {
                    conditions.push('file_path LIKE ?');
                    params.push(`%${testNameParts.filePath}%`);
                }

                if (testNameParts.methodName) {
                    conditions.push('test_name LIKE ?');
                    params.push(`%${testNameParts.methodName}%`);
                }

                if (conditions.length === 0) {
                    resolve({ testMetadataId: null, confidence: 0.0 });
                    return;
                }

                query += conditions.join(' OR ') + ' LIMIT 5';

                this.db.db.all(query, params, (err, rows) => {
                    if (err) {
                        this.error('Error correlating with existing tests:', err);
                        resolve({ testMetadataId: null, confidence: 0.0 });
                    } else if (rows.length === 0) {
                        resolve({ testMetadataId: null, confidence: 0.0 });
                    } else {
                        // Simple scoring - exact match gets 1.0, partial matches get lower scores
                        let bestMatch = { testMetadataId: null, confidence: 0.0 };

                        for (const row of rows) {
                            let confidence = 0.0;
                            
                            if (testNameParts.filePath && row.file_path.includes(testNameParts.filePath)) {
                                confidence += 0.5;
                            }
                            
                            if (testNameParts.methodName && row.test_name.includes(testNameParts.methodName)) {
                                confidence += 0.4;
                            }

                            if (confidence > bestMatch.confidence) {
                                bestMatch = {
                                    testMetadataId: row.id,
                                    confidence: confidence
                                };
                            }
                        }

                        resolve(bestMatch);
                    }
                });
            });
        } catch (error) {
            this.error('Error in test correlation:', error);
            return { testMetadataId: null, confidence: 0.0 };
        }
    }

    /**
     * Store test failure in database
     */
    async storeTestFailure(failure, config) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO mvp_test_failures (
                    pipeline_config_id, ado_build_id, ado_build_number, ado_build_status,
                    ado_build_result, ado_build_url, ado_build_started_at, ado_build_finished_at,
                    test_run_id, test_case_id, test_name, test_class_name, test_method_name, test_file_path,
                    failure_type, failure_message, failure_stack_trace, failure_category,
                    branch_name, commit_sha, environment,
                    test_metadata_id, correlation_confidence,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                config.id,
                failure.adoBuildId,
                failure.adoBuildNumber,
                failure.adoBuildStatus,
                failure.adoBuildResult,
                failure.adoBuildUrl,
                failure.adoBuildStartedAt,
                failure.adoBuildFinishedAt,
                failure.testRunId,
                failure.testCaseId,
                failure.testName,
                failure.testClassName,
                failure.testMethodName,
                failure.testFilePath,
                failure.failureType,
                failure.failureMessage,
                failure.failureStackTrace,
                failure.failureCategory,
                failure.branchName,
                failure.commitSha,
                failure.environment,
                failure.testMetadataId,
                failure.correlationConfidence,
                new Date().toISOString(),
                new Date().toISOString()
            ];

            this.db.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        ...failure,
                        created_at: new Date().toISOString()
                    });
                }
            });
        });
    }

    /**
     * Get failures for a specific pipeline
     */
    async getFailuresForPipeline(pipelineConfigId, options = {}) {
        const {
            limit = 50,
            offset = 0,
            since = null,
            includeProcessed = true
        } = options;

        return new Promise((resolve, reject) => {
            let sql = `
                SELECT tf.*, pc.name as pipeline_name, pc.ado_project_name
                FROM mvp_test_failures tf
                JOIN mvp_pipeline_configs pc ON tf.pipeline_config_id = pc.id
                WHERE tf.pipeline_config_id = ?
            `;
            const params = [pipelineConfigId];

            if (since) {
                sql += ' AND tf.created_at > ?';
                params.push(since);
            }

            if (!includeProcessed) {
                sql += ' AND tf.processed = 0';
            }

            sql += ' ORDER BY tf.created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            this.db.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Get detailed failure information
     */
    async getFailureDetails(failureId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT tf.*, pc.name as pipeline_name, pc.ado_project_name,
                       jal.jira_issue_key, jal.jira_issue_status, jal.jira_issue_url
                FROM mvp_test_failures tf
                JOIN mvp_pipeline_configs pc ON tf.pipeline_config_id = pc.id
                LEFT JOIN mvp_jira_ado_links jal ON tf.id = jal.test_failure_id
                WHERE tf.id = ?
            `;

            this.db.db.get(sql, [failureId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    /**
     * Mark failure as processed
     */
    async markFailureAsProcessed(failureId, jiraIssueCreated = false) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE mvp_test_failures 
                SET processed = 1, jira_issue_created = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            this.db.db.run(sql, [jiraIssueCreated ? 1 : 0, failureId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ updated: this.changes > 0 });
                }
            });
        });
    }

    /**
     * Store build results in the database
     */
    async storeBuildResults(buildId, results) {
        try {
            // Store build-level information
            await this.db.run(`
                INSERT OR REPLACE INTO mvp_build_monitoring_log 
                (pipeline_id, build_id, timestamp, status, message, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                results.pipelineId,
                buildId,
                new Date().toISOString(),
                results.status || 'completed',
                `Processed ${results.totalTests || 0} tests, ${results.failures?.length || 0} failures`,
                JSON.stringify({
                    totalTests: results.totalTests || 0,
                    passedTests: results.passedTests || 0,
                    failedTests: results.failures?.length || 0,
                    processingTime: results.processingTime
                })
            ]);

            // Store individual test failures
            if (results.failures && results.failures.length > 0) {
                for (const failure of results.failures) {
                    await this.db.run(`
                        INSERT INTO mvp_test_failures 
                        (pipeline_id, build_id, test_name, test_class, test_method, failure_message, 
                         failure_type, stack_trace, test_outcome, duration_ms, ado_context, 
                         first_seen, last_seen, occurrence_count, classification, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        results.pipelineId,
                        buildId,
                        failure.testName,
                        failure.className,
                        failure.methodName,
                        failure.failureMessage,
                        failure.failureType,
                        failure.stackTrace,
                        failure.outcome || 'Failed',
                        failure.durationMs || 0,
                        JSON.stringify(failure.adoContext || {}),
                        new Date().toISOString(),
                        new Date().toISOString(),
                        1,
                        failure.classification || 'unknown',
                        'open'
                    ]);
                }
            }

            this.log(`Stored build results for build ${buildId}: ${results.failures?.length || 0} failures`);
            return { success: true, failuresStored: results.failures?.length || 0 };

        } catch (error) {
            this.error('Failed to store build results:', error);
            throw error;
        }
    }

    /**
     * Get failures by pipeline ID
     */
    async getFailuresByPipeline(pipelineId, options = {}) {
        try {
            const {
                limit = 50,
                offset = 0,
                status = null,
                classification = null,
                since = null,
                includeResolved = false
            } = options;

            let query = `
                SELECT 
                    f.*,
                    p.pipeline_name,
                    p.organization_name,
                    p.project_name
                FROM mvp_test_failures f
                LEFT JOIN mvp_pipeline_configs p ON f.pipeline_id = p.id
                WHERE f.pipeline_id = ?
            `;
            
            const params = [pipelineId];

            // Add filters
            if (status) {
                query += ' AND f.status = ?';
                params.push(status);
            }

            if (classification) {
                query += ' AND f.classification = ?';
                params.push(classification);
            }

            if (since) {
                query += ' AND f.last_seen >= ?';
                params.push(since);
            }

            if (!includeResolved) {
                query += ' AND f.status != ?';
                params.push('resolved');
            }

            query += ' ORDER BY f.last_seen DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const failures = await this.db.all(query, params);

            // Get total count
            let countQuery = `
                SELECT COUNT(*) as total
                FROM mvp_test_failures f
                WHERE f.pipeline_id = ?
            `;
            const countParams = [pipelineId];

            if (status) {
                countQuery += ' AND f.status = ?';
                countParams.push(status);
            }

            if (classification) {
                countQuery += ' AND f.classification = ?';
                countParams.push(classification);
            }

            if (since) {
                countQuery += ' AND f.last_seen >= ?';
                countParams.push(since);
            }

            if (!includeResolved) {
                countQuery += ' AND f.status != ?';
                countParams.push('resolved');
            }

            const countResult = await this.db.get(countQuery, countParams);

            return {
                failures: failures.map(failure => ({
                    ...failure,
                    adoContext: failure.ado_context ? JSON.parse(failure.ado_context) : null
                })),
                total: countResult.total,
                limit,
                offset
            };

        } catch (error) {
            this.error('Failed to get failures by pipeline:', error);
            throw error;
        }
    }

    /**
     * Log debug information
     */
    log(...args) {
        if (this.debug) {
            console.log('[TEST-FAILURE-PROCESSOR]', ...args);
        }
    }

    /**
     * Log error information
     */
    error(...args) {
        console.error('[TEST-FAILURE-PROCESSOR ERROR]', ...args);
    }
}

module.exports = TestFailureProcessor;
