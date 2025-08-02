const AdoClient = require('../lib/ado-client');
const Database = require('../database/database');

class AdoBuildConsumer {
    constructor(client = null, database = null) {
        this.client = client || new AdoClient();
        this.db = database || new Database();
        this.debug = process.env.ADO_DEBUG === 'true';
    }

    /**
     * Consume build results from Azure DevOps and store in local database
     */
    async consumeBuildResults(buildId, projectId = null) {
        try {
            const project = projectId || this.client.projectId;
            
            // Get build details from ADO
            const build = await this.getBuildDetails(buildId, project);
            
            // Get test results for this build
            const testRuns = await this.getTestRunsForBuild(buildId, project);
            const testResults = await this.aggregateTestResults(testRuns, project);
            
            // Get build timeline for task details
            const timeline = await this.getBuildTimeline(buildId, project);
            const tasks = this.extractTaskResults(timeline);
            
            // Store build results in local database
            await this.storeBuildResults(build, testResults, tasks);
            
            // Update project metrics if this build belongs to a configured project
            await this.updateProjectMetrics(build, testResults);
            
            const result = {
                build: this.formatBuildData(build),
                testResults,
                tasks,
                processed: new Date().toISOString()
            };

            this.log('Build results consumed:', buildId);
            return result;
            
        } catch (error) {
            this.error('Failed to consume build results:', error.message);
            throw error;
        }
    }

    /**
     * Get build details from Azure DevOps
     */
    async getBuildDetails(buildId, projectId) {
        try {
            const buildApi = await this.client.getBuildApi();
            const build = await buildApi.getBuild(projectId, buildId);
            
            this.log(`Retrieved build details for build ${buildId}`);
            return build;
        } catch (error) {
            this.error(`Failed to get build details for ${buildId}:`, error.message);
            throw error;
        }
    }

    /**
     * Get test runs for a build
     */
    async getTestRunsForBuild(buildId, projectId) {
        try {
            const testApi = await this.client.getTestApi();
            const testRuns = await testApi.getTestRuns(projectId, buildId.toString());
            
            this.log(`Found ${testRuns.length} test runs for build ${buildId}`);
            return testRuns;
        } catch (error) {
            this.error(`Failed to get test runs for build ${buildId}:`, error.message);
            return []; // Don't fail the whole process if test data is unavailable
        }
    }

    /**
     * Get build timeline for task details
     */
    async getBuildTimeline(buildId, projectId) {
        try {
            const buildApi = await this.client.getBuildApi();
            const timeline = await buildApi.getBuildTimeline(projectId, buildId);
            
            this.log(`Retrieved timeline for build ${buildId}`);
            return timeline;
        } catch (error) {
            this.error(`Failed to get timeline for build ${buildId}:`, error.message);
            return null; // Timeline is optional
        }
    }

    /**
     * Aggregate test results from multiple test runs
     */
    async aggregateTestResults(testRuns, projectId) {
        if (!testRuns || testRuns.length === 0) {
            return [];
        }

        const testApi = await this.client.getTestApi();
        const aggregatedResults = [];

        for (const run of testRuns) {
            try {
                // Get detailed test results for this run
                const testResults = await testApi.getTestResults(projectId, run.id);
                
                const runResult = {
                    runId: run.id,
                    runName: run.name,
                    state: run.state,
                    totalTests: run.totalTests || 0,
                    passedTests: run.passedTests || 0,
                    failedTests: run.unanalyzedTests || 0,
                    skippedTests: run.notApplicableTests || 0,
                    startedDate: run.startedDate,
                    completedDate: run.completedDate,
                    durationInMs: this.calculateTestRunDuration(run),
                    results: testResults ? testResults.map(test => ({
                        id: test.id,
                        testCaseTitle: test.testCaseTitle,
                        outcome: test.outcome,
                        durationInMs: test.durationInMs,
                        errorMessage: test.errorMessage,
                        stackTrace: test.stackTrace,
                        automatedTestName: test.automatedTestName,
                        automatedTestStorage: test.automatedTestStorage
                    })) : []
                };

                aggregatedResults.push(runResult);
                this.log(`Processed test run ${run.id} with ${runResult.totalTests} tests`);
            } catch (error) {
                this.error(`Failed to get test results for run ${run.id}:`, error.message);
                // Continue with other test runs
            }
        }

        return aggregatedResults;
    }

    /**
     * Extract task results from build timeline
     */
    extractTaskResults(timeline) {
        if (!timeline || !timeline.records) {
            return [];
        }

        return timeline.records
            .filter(record => record.type === 'Task')
            .map(task => ({
                id: task.id,
                name: task.name,
                status: task.state,
                result: task.result,
                startTime: task.startTime,
                finishTime: task.finishTime,
                duration: this.calculateDuration(task.startTime, task.finishTime),
                errorCount: task.errorCount || 0,
                warningCount: task.warningCount || 0,
                log: task.log ? {
                    id: task.log.id,
                    type: task.log.type,
                    url: task.log.url
                } : null
            }));
    }

    /**
     * Store build results in local database
     */
    async storeBuildResults(build, testResults, tasks) {
        try {
            // Store build data
            const buildData = {
                buildId: build.id,
                projectId: build.project.id,
                buildDefinitionId: build.definition.id,
                buildNumber: build.buildNumber,
                status: build.status,
                result: build.result,
                startTime: build.startTime,
                finishTime: build.finishTime,
                duration: this.calculateDuration(build.startTime, build.finishTime),
                sourceBranch: build.sourceBranch,
                sourceVersion: build.sourceVersion,
                repository: build.repository?.name,
                definitionName: build.definition?.name,
                requestedBy: build.requestedBy?.displayName
            };

            await this.db.createAdoBuild(buildData);
            this.log(`Stored build ${build.id} in database`);

            // Store test results
            for (const testRun of testResults) {
                const testResultData = {
                    adoBuildId: build.id,
                    testRunId: testRun.runId,
                    runName: testRun.runName,
                    state: testRun.state,
                    totalTests: testRun.totalTests,
                    passedTests: testRun.passedTests,
                    failedTests: testRun.failedTests,
                    skippedTests: testRun.skippedTests,
                    durationMs: testRun.durationInMs,
                    startedDate: testRun.startedDate,
                    completedDate: testRun.completedDate
                };

                await this.db.createAdoTestResult(testResultData);
                this.log(`Stored test run ${testRun.runId} in database`);

                // Store individual test details if needed
                // This can be implemented later for more detailed test analytics
            }

            // Store task results
            for (const task of tasks) {
                // Task storage can be implemented if needed
                // For now, we'll focus on build and test data
            }

        } catch (error) {
            this.error('Failed to store build results in database:', error.message);
            throw error;
        }
    }

    /**
     * Update project metrics based on new build results
     */
    async updateProjectMetrics(build, testResults) {
        try {
            // Check if this build belongs to a configured project
            const projectConfigs = await this.db.getProjectConfigurations();
            const matchingProject = projectConfigs.find(config => 
                config.build_definition_id === build.definition.id
            );

            if (!matchingProject) {
                this.log(`Build ${build.id} doesn't belong to any configured project`);
                return;
            }

            // Calculate project metrics
            const recentBuilds = await this.db.getBuildsByDefinition(build.definition.id, 30);
            const successfulBuilds = recentBuilds.filter(b => b.result === 'succeeded').length;
            const successRate = recentBuilds.length > 0 ? 
                Math.round((successfulBuilds / recentBuilds.length) * 100) : 0;

            // Calculate total tests from recent test results
            const totalTests = testResults.reduce((sum, run) => sum + run.totalTests, 0);

            // Determine overall health
            let overallHealth = 'healthy';
            if (successRate < 50) {
                overallHealth = 'critical';
            } else if (successRate < 75) {
                overallHealth = 'warning';
            }

            const statusData = {
                projectName: matchingProject.name,
                buildDefinitionId: build.definition.id,
                lastBuildId: build.id,
                overallHealth,
                successRate,
                totalTests
            };

            await this.db.updateProjectStatus(matchingProject.id, statusData);
            this.log(`Updated project metrics for ${matchingProject.name}`);

        } catch (error) {
            this.error('Failed to update project metrics:', error.message);
            // Don't throw here as this is not critical to the main flow
        }
    }

    /**
     * Consume multiple builds in batch
     */
    async consumeMultipleBuilds(buildIds, projectId = null) {
        const results = [];
        const errors = [];

        for (const buildId of buildIds) {
            try {
                const result = await this.consumeBuildResults(buildId, projectId);
                results.push(result);
            } catch (error) {
                errors.push({ buildId, error: error.message });
                this.error(`Failed to process build ${buildId}:`, error.message);
            }
        }

        this.log(`Batch processing completed: ${results.length} successful, ${errors.length} failed`);
        return { results, errors };
    }

    /**
     * Sync historical build data for a build definition
     */
    async syncHistoricalBuilds(buildDefinitionId, projectId = null, days = 30) {
        try {
            const project = projectId || this.client.projectId;
            const buildApi = await this.client.getBuildApi();
            
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - days);

            // Get builds from the specified time range
            const builds = await buildApi.getBuilds(
                project,
                [buildDefinitionId],
                undefined, // queues
                undefined, // buildNumber
                startDate,
                endDate,
                undefined, // requestedFor
                undefined, // reasonFilter
                undefined, // statusFilter
                undefined, // resultFilter
                undefined, // tagFilters
                undefined, // properties
                100 // top - limit to avoid too many API calls
            );

            this.log(`Found ${builds.length} historical builds for definition ${buildDefinitionId}`);

            // Process each build
            const buildIds = builds.map(build => build.id);
            return await this.consumeMultipleBuilds(buildIds, project);

        } catch (error) {
            this.error('Failed to sync historical builds:', error.message);
            throw error;
        }
    }

    // Helper methods
    formatBuildData(build) {
        return {
            id: build.id,
            buildNumber: build.buildNumber,
            status: build.status,
            result: build.result,
            startTime: build.startTime,
            finishTime: build.finishTime,
            duration: this.calculateDuration(build.startTime, build.finishTime),
            repository: build.repository?.name,
            branch: build.sourceBranch,
            commit: build.sourceVersion?.substring(0, 8),
            requestedBy: build.requestedBy?.displayName,
            definition: {
                id: build.definition.id,
                name: build.definition.name
            },
            project: {
                id: build.project.id,
                name: build.project.name
            }
        };
    }

    calculateDuration(startTime, finishTime) {
        if (!startTime || !finishTime) return 0;
        return Math.round((new Date(finishTime) - new Date(startTime)) / 1000);
    }

    calculateTestRunDuration(testRun) {
        if (!testRun.startedDate || !testRun.completedDate) return 0;
        return Math.round((new Date(testRun.completedDate) - new Date(testRun.startedDate)));
    }

    log(...args) {
        if (this.debug) {
            console.log('[ADO-BUILD-CONSUMER]', ...args);
        }
    }

    error(...args) {
        console.error('[ADO-BUILD-CONSUMER ERROR]', ...args);
    }
}

module.exports = AdoBuildConsumer;