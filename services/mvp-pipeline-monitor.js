const AdoClient = require('../lib/ado-client');
const EventEmitter = require('events');

class MVPPipelineMonitorService extends EventEmitter {
    constructor(database, configService) {
        super();
        this.db = database;
        this.configService = configService;
        this.monitoringIntervals = new Map(); // Store interval timers
        this.isRunning = false;
        this.debug = process.env.ADO_DEBUG === 'true';
        
        // Track last processed builds to avoid duplicates
        this.lastProcessedBuilds = new Map(); // configId -> buildId
        
        // Setup event handlers
        this.setupEventHandlers();
    }

    /**
     * Start monitoring all active pipeline configurations
     */
    async startMonitoring() {
        if (this.isRunning) {
            this.log('Monitoring is already running');
            return;
        }

        this.log('Starting pipeline monitoring service...');
        this.isRunning = true;

        try {
            const configs = await this.configService.getPipelineConfigs();
            const activeConfigs = configs.filter(config => config.active && config.monitor_enabled);

            this.log(`Found ${activeConfigs.length} active pipeline configurations to monitor`);

            for (const config of activeConfigs) {
                await this.startMonitoringPipeline(config);
            }

            this.emit('monitoring_started', { configCount: activeConfigs.length });
        } catch (error) {
            this.error('Failed to start monitoring:', error);
            this.emit('monitoring_error', { error: error.message });
            throw error;
        }
    }

    /**
     * Stop monitoring all pipelines
     */
    async stopMonitoring() {
        if (!this.isRunning) {
            this.log('Monitoring is not running');
            return;
        }

        this.log('Stopping pipeline monitoring service...');
        
        // Clear all monitoring intervals
        for (const [configId, intervalId] of this.monitoringIntervals) {
            clearInterval(intervalId);
            this.log(`Stopped monitoring for pipeline config ${configId}`);
        }
        
        this.monitoringIntervals.clear();
        this.lastProcessedBuilds.clear();
        this.isRunning = false;

        this.emit('monitoring_stopped');
    }

    /**
     * Start monitoring a specific pipeline configuration
     */
    async startMonitoringPipeline(config) {
        const configId = config.id;
        
        // Stop existing monitoring for this config if any
        if (this.monitoringIntervals.has(configId)) {
            clearInterval(this.monitoringIntervals.get(configId));
        }

        const intervalMs = config.polling_interval_minutes * 60 * 1000;
        
        this.log(`Starting monitoring for pipeline "${config.name}" (interval: ${config.polling_interval_minutes} minutes)`);

        // Initial check
        await this.checkPipelineForNewBuilds(config);

        // Set up recurring checks
        const intervalId = setInterval(async () => {
            try {
                await this.checkPipelineForNewBuilds(config);
            } catch (error) {
                this.error(`Error checking pipeline ${config.name}:`, error);
                await this.logMonitoringEvent(configId, 'error', 'error', `Pipeline check failed: ${error.message}`);
            }
        }, intervalMs);

        this.monitoringIntervals.set(configId, intervalId);
        
        await this.logMonitoringEvent(configId, 'monitoring_started', 'success', 
            `Started monitoring with ${config.polling_interval_minutes} minute interval`);
    }

    /**
     * Stop monitoring a specific pipeline configuration
     */
    async stopMonitoringPipeline(configId) {
        if (this.monitoringIntervals.has(configId)) {
            clearInterval(this.monitoringIntervals.get(configId));
            this.monitoringIntervals.delete(configId);
            this.lastProcessedBuilds.delete(configId);
            
            this.log(`Stopped monitoring for pipeline config ${configId}`);
            await this.logMonitoringEvent(configId, 'monitoring_stopped', 'success', 'Monitoring stopped');
        }
    }

    /**
     * Check a pipeline for new builds
     */
    async checkPipelineForNewBuilds(config) {
        const startTime = Date.now();
        let apiCallsCount = 0;

        try {
            await this.logMonitoringEvent(config.id, 'poll_started', 'success', 'Starting build check');
            
            // Update last monitored time
            await this.configService.updateLastMonitoredTime(config.id);

            // Create ADO client for this pipeline
            const adoClient = new AdoClient({
                orgUrl: config.ado_organization_url,
                pat: process.env.ADO_PAT,
                projectId: config.ado_project_id
            });

            // Get recent builds (last 10)
            const builds = await adoClient.getBuildsForDefinition(config.build_definition_id, {
                projectId: config.ado_project_id,
                top: 10,
                statusFilter: null // Get all builds regardless of status
            });
            apiCallsCount++;

            this.log(`Found ${builds.length} recent builds for pipeline "${config.name}"`);

            // Get the last processed build ID for this config
            const lastProcessedBuildId = this.lastProcessedBuilds.get(config.id);

            // Process new builds (newer than last processed)
            const newBuilds = lastProcessedBuildId 
                ? builds.filter(build => build.id > lastProcessedBuildId)
                : builds.slice(0, 1); // If no last processed, just take the most recent

            if (newBuilds.length > 0) {
                this.log(`Processing ${newBuilds.length} new builds for pipeline "${config.name}"`);
                
                for (const build of newBuilds.reverse()) { // Process oldest first
                    await this.processBuild(config, build, adoClient);
                    apiCallsCount += 2; // Typically 1 for build details, 1 for test results
                    
                    // Update last processed build ID
                    this.lastProcessedBuilds.set(config.id, Math.max(
                        this.lastProcessedBuilds.get(config.id) || 0,
                        build.id
                    ));
                }
            } else {
                this.log(`No new builds found for pipeline "${config.name}"`);
            }

            const duration = Date.now() - startTime;
            await this.logMonitoringEvent(
                config.id, 
                'poll_completed', 
                'success', 
                `Build check completed. Found ${newBuilds.length} new builds`,
                JSON.stringify({ buildsFound: builds.length, newBuilds: newBuilds.length }),
                null,
                null,
                duration,
                apiCallsCount
            );

        } catch (error) {
            const duration = Date.now() - startTime;
            this.error(`Failed to check pipeline "${config.name}":`, error);
            
            await this.logMonitoringEvent(
                config.id,
                'poll_failed',
                'error',
                `Build check failed: ${error.message}`,
                JSON.stringify({ error: error.message }),
                null,
                null,
                duration,
                apiCallsCount
            );
            
            throw error;
        }
    }

    /**
     * Process a single build
     */
    async processBuild(config, build, adoClient) {
        try {
            this.log(`Processing build ${build.buildNumber} (ID: ${build.id}) for pipeline "${config.name}"`);

            // Only process completed builds
            if (build.status !== 'completed') {
                this.log(`Skipping build ${build.buildNumber} - not completed (status: ${build.status})`);
                return;
            }

            await this.logMonitoringEvent(
                config.id,
                'build_detected',
                'success',
                `Processing build ${build.buildNumber}`,
                JSON.stringify({ buildId: build.id, buildNumber: build.buildNumber, result: build.result }),
                build.id,
                build.buildNumber
            );

            // Get detailed build information
            const detailedBuild = await adoClient.getBuild(build.id, config.ado_project_id);

            // Get test results for the build
            const testResults = await adoClient.getTestResultsForBuild(build.id, config.ado_project_id);
            
            this.log(`Found ${testResults.length} test results for build ${build.buildNumber}`);

            // Process test failures
            const failures = testResults.filter(result => 
                result.outcome === 'Failed' || result.outcome === 'Aborted'
            );

            if (failures.length > 0) {
                this.log(`Processing ${failures.length} test failures for build ${build.buildNumber}`);
                
                for (const failure of failures) {
                    await this.processTestFailure(config, detailedBuild, failure);
                }

                // Emit event for UI updates
                this.emit('test_failures_detected', {
                    configId: config.id,
                    pipelineName: config.name,
                    buildId: build.id,
                    buildNumber: build.buildNumber,
                    failureCount: failures.length
                });
            } else {
                this.log(`No test failures found for build ${build.buildNumber}`);
            }

            await this.logMonitoringEvent(
                config.id,
                'build_processed',
                'success',
                `Build processed successfully. ${failures.length} failures found`,
                JSON.stringify({ 
                    buildId: build.id, 
                    buildNumber: build.buildNumber, 
                    testCount: testResults.length,
                    failureCount: failures.length 
                }),
                build.id,
                build.buildNumber
            );

        } catch (error) {
            this.error(`Failed to process build ${build.buildNumber}:`, error);
            
            await this.logMonitoringEvent(
                config.id,
                'build_processing_failed',
                'error',
                `Build processing failed: ${error.message}`,
                JSON.stringify({ buildId: build.id, buildNumber: build.buildNumber, error: error.message }),
                build.id,
                build.buildNumber
            );
            
            throw error;
        }
    }

    /**
     * Process a test failure and store it in the database
     */
    async processTestFailure(config, build, testResult) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO mvp_test_failures (
                    pipeline_config_id, ado_build_id, ado_build_number, ado_build_status,
                    ado_build_result, ado_build_url, ado_build_started_at, ado_build_finished_at,
                    test_run_id, test_case_id, test_name, test_class_name, test_method_name,
                    failure_type, failure_message, failure_stack_trace,
                    branch_name, commit_sha, commit_message, environment
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                config.id,
                build.id,
                build.buildNumber,
                build.status,
                build.result,
                build.url,
                build.startTime,
                build.finishTime,
                testResult.testRun.id,
                testResult.testCaseReferenceId,
                testResult.testCaseTitle || testResult.automatedTestName,
                null, // test_class_name - extract from testCaseTitle if needed
                null, // test_method_name - extract from testCaseTitle if needed
                testResult.failureType || testResult.outcome,
                testResult.errorMessage,
                testResult.stackTrace,
                build.sourceBranch,
                build.sourceVersion,
                null, // commit_message - would need additional API call
                null  // environment - could be extracted from build configuration
            ];

            this.db.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        testFailure: {
                            id: this.lastID,
                            testName: testResult.testCaseTitle || testResult.automatedTestName,
                            buildNumber: build.buildNumber,
                            failureType: testResult.failureType || testResult.outcome
                        }
                    });
                }
            });
        });
    }

    /**
     * Log monitoring events
     */
    async logMonitoringEvent(pipelineConfigId, eventType, eventStatus, message, details = null, 
                           adoBuildId = null, adoBuildNumber = null, duration = null, apiCalls = null) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO mvp_build_monitoring_log (
                    pipeline_config_id, event_type, event_status, event_message, event_details,
                    ado_build_id, ado_build_number, processing_duration_ms, api_calls_made
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                pipelineConfigId, eventType, eventStatus, message, details,
                adoBuildId, adoBuildNumber, duration, apiCalls
            ];

            this.db.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ logId: this.lastID });
                }
            });
        });
    }

    /**
     * Get monitoring status for all pipelines
     */
    getMonitoringStatus() {
        const status = {
            isRunning: this.isRunning,
            monitoredPipelines: this.monitoringIntervals.size,
            pipelines: []
        };

        for (const [configId, intervalId] of this.monitoringIntervals) {
            status.pipelines.push({
                configId,
                isMonitoring: true,
                lastProcessedBuild: this.lastProcessedBuilds.get(configId) || null
            });
        }

        return status;
    }

    /**
     * Refresh monitoring for a specific pipeline (restart with new config)
     */
    async refreshPipelineMonitoring(configId) {
        const config = await this.configService.getPipelineConfig(configId);
        if (!config) {
            throw new Error('Pipeline configuration not found');
        }

        if (!config.active || !config.monitor_enabled) {
            await this.stopMonitoringPipeline(configId);
            return { action: 'stopped', reason: 'Pipeline monitoring disabled' };
        }

        await this.stopMonitoringPipeline(configId);
        await this.startMonitoringPipeline(config);
        
        return { action: 'restarted', config: config.name };
    }

    /**
     * Setup event handlers for WebSocket updates
     */
    setupEventHandlers() {
        this.on('test_failures_detected', (data) => {
            // This event can be listened to by WebSocket service for real-time updates
            this.log(`Test failures detected event emitted:`, data);
        });

        this.on('monitoring_started', (data) => {
            this.log(`Monitoring started for ${data.configCount} pipelines`);
        });

        this.on('monitoring_stopped', () => {
            this.log('Monitoring stopped for all pipelines');
        });

        this.on('monitoring_error', (data) => {
            this.error('Monitoring error:', data.error);
        });
    }

    /**
     * Log debug information
     */
    log(...args) {
        if (this.debug) {
            console.log('[MVP-PIPELINE-MONITOR]', ...args);
        }
    }

    /**
     * Log error information
     */
    error(...args) {
        console.error('[MVP-PIPELINE-MONITOR ERROR]', ...args);
    }
}

module.exports = MVPPipelineMonitorService;
