const EventEmitter = require('events');

class MVPJiraAdoBridge extends EventEmitter {
    constructor(database, testFailureProcessor, enhancedJiraIntegration, duplicateDetector = null) {
        super();
        this.db = database;
        this.testFailureProcessor = testFailureProcessor;
        this.jiraIntegration = enhancedJiraIntegration;
        this.duplicateDetector = duplicateDetector;
        this.debug = process.env.JIRA_ADO_BRIDGE_DEBUG === 'true';
        
        // Default workflow configuration
        this.defaultWorkflowConfig = {
            autoCreateIssues: true,
            duplicateDetectionEnabled: true,
            duplicateSimilarityThreshold: 0.8,
            autoUpdateExistingIssues: true,
            enrichmentLevel: 'full', // 'minimal', 'standard', 'full'
            priorityMapping: {
                low: 'Low',
                medium: 'Medium', 
                high: 'High',
                critical: 'Highest'
            },
            issueTypeMapping: {
                testFailure: 'Bug',
                buildFailure: 'Task',
                environmentIssue: 'Story'
            }
        };
        
        this.workflowRules = [];
        this.correlationCache = new Map();
        
        this.log('MVP JIRA-ADO Bridge initialized');
    }

    /**
     * Process ADO build completion and create/update JIRA issues automatically
     */
    async processBuildCompletion(buildData) {
        try {
            this.log(`Processing build completion for build ${buildData.buildId}`);
            
            // Get pipeline configuration
            const pipelineConfig = await this.getPipelineConfig(buildData.pipelineId);
            if (!pipelineConfig || !pipelineConfig.auto_create_jira_issues) {
                this.log(`Auto-creation disabled for pipeline ${buildData.pipelineId}`);
                return { processed: false, reason: 'Auto-creation disabled' };
            }

            // Process test results and detect failures
            const processingResult = await this.testFailureProcessor.processBuildResults(
                buildData.buildId, 
                buildData.pipelineId
            );

            if (!processingResult.failures || processingResult.failures.length === 0) {
                this.log(`No failures detected in build ${buildData.buildId}`);
                return { processed: true, failures: 0, issuesCreated: 0 };
            }

            // Get workflow rules for this pipeline
            const workflowRules = await this.getWorkflowRules(buildData.pipelineId);
            const effectiveConfig = this.mergeWorkflowConfig(this.defaultWorkflowConfig, workflowRules);

            const results = {
                processed: true,
                buildId: buildData.buildId,
                pipelineId: buildData.pipelineId,
                failures: processingResult.failures.length,
                issuesCreated: 0,
                issuesUpdated: 0,
                duplicatesDetected: 0,
                errors: []
            };

            // Process each failure
            for (const failure of processingResult.failures) {
                try {
                    const issueResult = await this.processFailureForJira(failure, effectiveConfig, buildData);
                    
                    if (issueResult.created) {
                        results.issuesCreated++;
                    } else if (issueResult.updated) {
                        results.issuesUpdated++;
                    } else if (issueResult.duplicate) {
                        results.duplicatesDetected++;
                    }

                } catch (error) {
                    this.error(`Failed to process failure ${failure.id}:`, error);
                    results.errors.push({
                        failureId: failure.id,
                        error: error.message
                    });
                }
            }

            // Emit completion event
            this.emit('build_processed', {
                buildId: buildData.buildId,
                pipelineId: buildData.pipelineId,
                results
            });

            this.log(`Build processing complete for ${buildData.buildId}: ${results.issuesCreated} created, ${results.issuesUpdated} updated`);
            return results;

        } catch (error) {
            this.error('Failed to process build completion:', error);
            throw error;
        }
    }

    /**
     * Process individual failure for JIRA issue creation/update
     */
    async processFailureForJira(failure, config, buildData) {
        try {
            // Check for existing JIRA issue
            const existingIssue = await this.jiraIntegration.getIssueForFailure(failure.id);
            
            if (existingIssue) {
                // Update existing issue if configured
                if (config.autoUpdateExistingIssues) {
                    const updateResult = await this.updateExistingIssue(existingIssue, failure, buildData, config);
                    return { updated: true, issueKey: existingIssue.issueKey, updateResult };
                } else {
                    return { existing: true, issueKey: existingIssue.issueKey };
                }
            }

            // Check for duplicates if enabled
            if (config.duplicateDetectionEnabled && this.duplicateDetector) {
                const duplicateCheck = await this.duplicateDetector.findSimilarIssues(
                    failure, 
                    config.duplicateSimilarityThreshold
                );
                
                if (duplicateCheck.hasDuplicates) {
                    await this.handleDuplicateDetection(failure, duplicateCheck, config);
                    return { 
                        duplicate: true, 
                        similarIssues: duplicateCheck.similarIssues,
                        action: duplicateCheck.action
                    };
                }
            }

            // Create new JIRA issue with enriched context
            const enrichedContext = await this.enrichFailureContext(failure, buildData, config);
            const createResult = await this.jiraIntegration.createIssueForFailure(failure.id, {
                ...enrichedContext,
                issueType: this.mapIssueType(failure, config),
                priority: this.mapPriority(failure, config),
                enrichmentLevel: config.enrichmentLevel
            });

            // Store correlation data
            await this.storeCorrelationData(failure, buildData, createResult);

            return { 
                created: true, 
                issueKey: createResult.issueKey,
                issueId: createResult.issueId
            };

        } catch (error) {
            this.error('Failed to process failure for JIRA:', error);
            throw error;
        }
    }

    /**
     * Enrich failure context with ADO metadata
     */
    async enrichFailureContext(failure, buildData, config) {
        const context = {
            additionalLabels: ['automated', 'ado-bridge'],
            customFields: {}
        };

        if (config.enrichmentLevel === 'minimal') {
            return context;
        }

        // Standard enrichment
        context.buildUrl = buildData.buildUrl;
        context.pipelineUrl = buildData.pipelineUrl;
        context.branch = buildData.sourceBranch;
        context.commit = buildData.sourceCommit;

        if (config.enrichmentLevel === 'standard') {
            return context;
        }

        // Full enrichment
        try {
            // Add build artifacts information
            if (buildData.artifacts && buildData.artifacts.length > 0) {
                context.artifacts = buildData.artifacts.map(artifact => ({
                    name: artifact.name,
                    url: artifact.downloadUrl,
                    type: artifact.resource?.type
                }));
            }

            // Add test run details
            if (buildData.testRuns) {
                context.testRunDetails = buildData.testRuns.map(run => ({
                    id: run.id,
                    name: run.name,
                    state: run.state,
                    url: run.webAccessUrl,
                    totalTests: run.totalTests,
                    passedTests: run.passedTests,
                    failedTests: run.failedTests
                }));
            }

            // Add environment information
            if (buildData.queue) {
                context.buildEnvironment = {
                    queueName: buildData.queue.name,
                    poolName: buildData.queue.pool?.name,
                    agentName: buildData.agentSpecification?.identifier
                };
            }

            // Add timing information
            context.buildTiming = {
                queueTime: buildData.queueTime,
                startTime: buildData.startTime,
                finishTime: buildData.finishTime,
                duration: buildData.finishTime && buildData.startTime ? 
                    new Date(buildData.finishTime) - new Date(buildData.startTime) : null
            };

        } catch (error) {
            this.error('Failed to enrich context:', error);
        }

        return context;
    }

    /**
     * Update existing JIRA issue with new failure occurrence
     */
    async updateExistingIssue(existingIssue, failure, buildData, config) {
        const updateData = {
            addComment: true,
            comment: `Test failure occurred again in build ${buildData.buildId}. ` +
                    `Branch: ${buildData.sourceBranch || 'unknown'}. ` +
                    `Total occurrences: ${failure.occurrence_count || 1}`,
            updatePriority: config.autoUpdatePriority !== false,
            additionalContext: {
                buildUrl: buildData.buildUrl,
                pipelineUrl: buildData.pipelineUrl,
                latestBuild: buildData.buildId,
                latestFailureTime: failure.last_seen
            }
        };

        return await this.jiraIntegration.updateIssueFromFailure(failure.id, updateData);
    }

    /**
     * Handle duplicate detection results
     */
    async handleDuplicateDetection(failure, duplicateCheck, config) {
        try {
            const strategy = config.duplicateStrategy || 'link_to_existing';

            switch (strategy) {
                case 'link_to_existing':
                    // Link this failure to the most similar existing issue
                    const bestMatch = duplicateCheck.similarIssues[0];
                    await this.linkFailureToExistingIssue(failure, bestMatch);
                    break;

                case 'create_with_reference':
                    // Create new issue but reference the similar ones
                    const references = duplicateCheck.similarIssues.map(issue => issue.issueKey);
                    await this.createIssueWithReferences(failure, references, config);
                    break;

                case 'skip_creation':
                    // Skip creating issue, just log the duplicate
                    await this.logDuplicateSkipped(failure, duplicateCheck);
                    break;
            }

            // Store duplicate detection result
            await this.storeDuplicateDetectionResult(failure, duplicateCheck);

        } catch (error) {
            this.error('Failed to handle duplicate detection:', error);
            throw error;
        }
    }

    /**
     * Map failure classification to JIRA issue type
     */
    mapIssueType(failure, config) {
        const classification = failure.classification || 'testFailure';
        return config.issueTypeMapping[classification] || config.issueTypeMapping.testFailure || 'Bug';
    }

    /**
     * Map failure characteristics to JIRA priority
     */
    mapPriority(failure, config) {
        // Use JIRA integration's priority determination but map to config
        const determinedPriority = this.jiraIntegration.determinePriority(failure);
        const priorityMap = {
            'Low': config.priorityMapping.low,
            'Medium': config.priorityMapping.medium,
            'High': config.priorityMapping.high,
            'Highest': config.priorityMapping.critical
        };
        
        return priorityMap[determinedPriority] || determinedPriority;
    }

    /**
     * Store correlation data between ADO and JIRA
     */
    async storeCorrelationData(failure, buildData, jiraResult) {
        try {
            await this.db.run(`
                INSERT INTO mvp_ado_jira_correlations 
                (failure_id, build_id, pipeline_id, jira_issue_key, jira_issue_id, 
                 correlation_timestamp, build_url, pipeline_url, correlation_metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                failure.id,
                buildData.buildId,
                buildData.pipelineId,
                jiraResult.issueKey,
                jiraResult.issueId,
                new Date().toISOString(),
                buildData.buildUrl,
                buildData.pipelineUrl,
                JSON.stringify({
                    branch: buildData.sourceBranch,
                    commit: buildData.sourceCommit,
                    buildNumber: buildData.buildNumber
                })
            ]);

            this.log(`Stored correlation data for failure ${failure.id} -> JIRA ${jiraResult.issueKey}`);

        } catch (error) {
            // Create table if it doesn't exist
            if (error.message.includes('no such table')) {
                await this.createCorrelationTable();
                // Retry the insert
                return await this.storeCorrelationData(failure, buildData, jiraResult);
            }
            throw error;
        }
    }

    /**
     * Create correlation table if it doesn't exist
     */
    async createCorrelationTable() {
        await this.db.run(`
            CREATE TABLE IF NOT EXISTS mvp_ado_jira_correlations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                failure_id INTEGER NOT NULL,
                build_id TEXT NOT NULL,
                pipeline_id INTEGER NOT NULL,
                jira_issue_key TEXT NOT NULL,
                jira_issue_id TEXT NOT NULL,
                correlation_timestamp TEXT NOT NULL,
                build_url TEXT,
                pipeline_url TEXT,
                correlation_metadata TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (failure_id) REFERENCES mvp_test_failures(id),
                FOREIGN KEY (pipeline_id) REFERENCES mvp_pipeline_configs(id)
            )
        `);

        await this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_correlations_failure_id 
            ON mvp_ado_jira_correlations(failure_id)
        `);

        await this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_correlations_build_id 
            ON mvp_ado_jira_correlations(build_id)
        `);
    }

    /**
     * Get pipeline configuration
     */
    async getPipelineConfig(pipelineId) {
        return await this.db.get(`
            SELECT * FROM mvp_pipeline_configs WHERE id = ?
        `, [pipelineId]);
    }

    /**
     * Get workflow rules for pipeline
     */
    async getWorkflowRules(pipelineId) {
        try {
            const rules = await this.db.all(`
                SELECT * FROM mvp_workflow_rules 
                WHERE pipeline_id = ? OR pipeline_id IS NULL
                ORDER BY priority DESC
            `, [pipelineId]);

            return rules;
        } catch (error) {
            if (error.message.includes('no such table')) {
                await this.createWorkflowRulesTable();
                return [];
            }
            throw error;
        }
    }

    /**
     * Create workflow rules table
     */
    async createWorkflowRulesTable() {
        await this.db.run(`
            CREATE TABLE IF NOT EXISTS mvp_workflow_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pipeline_id INTEGER,
                rule_name TEXT NOT NULL,
                rule_type TEXT NOT NULL,
                conditions TEXT,
                actions TEXT,
                priority INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (pipeline_id) REFERENCES mvp_pipeline_configs(id)
            )
        `);
    }

    /**
     * Merge workflow configurations
     */
    mergeWorkflowConfig(defaultConfig, rules) {
        let config = { ...defaultConfig };
        
        for (const rule of rules) {
            if (!rule.is_active) continue;
            
            try {
                const ruleActions = JSON.parse(rule.actions || '{}');
                config = { ...config, ...ruleActions };
            } catch (error) {
                this.error(`Failed to parse workflow rule ${rule.id}:`, error);
            }
        }
        
        return config;
    }

    /**
     * Get correlations for a build
     */
    async getCorrelationsForBuild(buildId) {
        try {
            return await this.db.all(`
                SELECT 
                    c.*,
                    f.test_name,
                    f.failure_message,
                    f.classification,
                    pc.pipeline_name
                FROM mvp_ado_jira_correlations c
                JOIN mvp_test_failures f ON c.failure_id = f.id
                JOIN mvp_pipeline_configs pc ON c.pipeline_id = pc.id
                WHERE c.build_id = ?
                ORDER BY c.correlation_timestamp DESC
            `, [buildId]);
        } catch (error) {
            if (error.message.includes('no such table')) {
                return [];
            }
            throw error;
        }
    }

    /**
     * Link failure to existing JIRA issue
     */
    async linkFailureToExistingIssue(failure, existingIssue) {
        await this.jiraIntegration.storeLinkage(failure.id, existingIssue.issueKey, existingIssue.issueId);
        
        // Add comment to existing issue
        await this.jiraIntegration.addCommentToIssue(
            existingIssue.issueKey,
            `Similar test failure detected: ${failure.test_name}. ` +
            `Build: ${failure.build_id}. Auto-linked due to similarity.`
        );
    }

    /**
     * Store duplicate detection result
     */
    async storeDuplicateDetectionResult(failure, duplicateCheck) {
        try {
            await this.db.run(`
                INSERT INTO mvp_duplicate_detections 
                (failure_id, detection_timestamp, similar_issues_count, 
                 similarity_scores, detection_metadata, action_taken)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                failure.id,
                new Date().toISOString(),
                duplicateCheck.similarIssues.length,
                JSON.stringify(duplicateCheck.similarIssues.map(i => i.similarityScore)),
                JSON.stringify(duplicateCheck),
                duplicateCheck.action || 'none'
            ]);
        } catch (error) {
            if (error.message.includes('no such table')) {
                await this.createDuplicateDetectionTable();
                return await this.storeDuplicateDetectionResult(failure, duplicateCheck);
            }
            throw error;
        }
    }

    /**
     * Create duplicate detection table
     */
    async createDuplicateDetectionTable() {
        await this.db.run(`
            CREATE TABLE IF NOT EXISTS mvp_duplicate_detections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                failure_id INTEGER NOT NULL,
                detection_timestamp TEXT NOT NULL,
                similar_issues_count INTEGER,
                similarity_scores TEXT,
                detection_metadata TEXT,
                action_taken TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (failure_id) REFERENCES mvp_test_failures(id)
            )
        `);
    }

    /**
     * Set duplicate detector service
     */
    setDuplicateDetector(duplicateDetector) {
        this.duplicateDetector = duplicateDetector;
        this.log('Duplicate detector service connected');
    }

    /**
     * Log debug information
     */
    log(...args) {
        if (this.debug) {
            console.log('[MVP-JIRA-ADO-BRIDGE]', ...args);
        }
    }

    /**
     * Log error information
     */
    error(...args) {
        console.error('[MVP-JIRA-ADO-BRIDGE ERROR]', ...args);
    }
}

module.exports = MVPJiraAdoBridge;
