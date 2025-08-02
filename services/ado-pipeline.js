const AdoClient = require('../lib/ado-client');

class AdoPipelineService {
    constructor() {
        this.client = new AdoClient();
        this.debug = process.env.ADO_DEBUG === 'true';
    }

    /**
     * Consume build results from Azure DevOps
     */
    async consumeBuildResults(buildId, projectId = null) {
        try {
            const project = projectId || this.client.projectId;
            const buildApi = await this.client.getBuildApi();
            
            // Get build details
            const build = await buildApi.getBuild(project, buildId);
            
            // Get build timeline for detailed task information
            const timeline = await buildApi.getBuildTimeline(project, buildId);
            
            // Get test results if available
            const testApi = await this.client.getTestApi();
            const testRuns = await testApi.getTestRuns(project, buildId.toString());
            
            const buildResults = {
                buildId: build.id,
                buildNumber: build.buildNumber,
                status: build.status,
                result: build.result,
                startTime: build.startTime,
                finishTime: build.finishTime,
                duration: this.calculateDuration(build.startTime, build.finishTime),
                repository: build.repository?.name,
                branch: build.sourceBranch,
                commit: build.sourceVersion,
                requestedBy: build.requestedBy?.displayName,
                definition: {
                    id: build.definition.id,
                    name: build.definition.name
                },
                tasks: this.extractTaskResults(timeline),
                testResults: await this.extractTestResults(testRuns, project)
            };

            this.log('Build results consumed:', buildResults.buildId);
            return buildResults;
            
        } catch (error) {
            this.error('Failed to consume build results:', error.message);
            throw error;
        }
    }

    /**
     * Consume release results from Azure DevOps
     */
    async consumeReleaseResults(releaseId, projectId = null) {
        try {
            const project = projectId || this.client.projectId;
            const releaseApi = await this.client.getReleaseApi();
            
            // Get release details
            const release = await releaseApi.getRelease(project, releaseId);
            
            // Get deployment details for each environment
            const deployments = await releaseApi.getDeployments(project, releaseId);
            
            const releaseResults = {
                releaseId: release.id,
                releaseName: release.name,
                status: release.status,
                createdOn: release.createdOn,
                modifiedOn: release.modifiedOn,
                createdBy: release.createdBy?.displayName,
                definition: {
                    id: release.releaseDefinition.id,
                    name: release.releaseDefinition.name
                },
                environments: release.environments.map(env => ({
                    id: env.id,
                    name: env.name,
                    status: env.status,
                    deploymentStatus: env.deploymentStatus,
                    preDeployApprovals: env.preDeployApprovals?.map(a => ({
                        status: a.status,
                        approver: a.approver?.displayName,
                        approvedBy: a.approvedBy?.displayName
                    })),
                    postDeployApprovals: env.postDeployApprovals?.map(a => ({
                        status: a.status,
                        approver: a.approver?.displayName,
                        approvedBy: a.approvedBy?.displayName
                    }))
                })),
                deployments: deployments.map(dep => ({
                    id: dep.id,
                    environmentId: dep.releaseEnvironment?.id,
                    environmentName: dep.releaseEnvironment?.name,
                    status: dep.deploymentStatus,
                    startedOn: dep.startedOn,
                    completedOn: dep.completedOn,
                    requestedBy: dep.requestedBy?.displayName
                }))
            };

            this.log('Release results consumed:', releaseResults.releaseId);
            return releaseResults;
            
        } catch (error) {
            this.error('Failed to consume release results:', error.message);
            throw error;
        }
    }

    /**
     * Get project-based test status summary
     */
    async getProjectTestStatus(projectId = null, timeRange = '30d') {
        try {
            const project = projectId || this.client.projectId;
            const testApi = await this.client.getTestApi();
            const buildApi = await this.client.getBuildApi();
            
            const endDate = new Date();
            const startDate = this.getDateRange(timeRange);
            
            // Get recent builds
            const builds = await buildApi.getBuilds(
                project,
                undefined, // definitions
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
                100 // top
            );

            // Get test runs for the period
            const testRuns = await testApi.getTestRuns(project);
            const filteredTestRuns = testRuns.filter(run => 
                new Date(run.startedDate) >= startDate && 
                new Date(run.startedDate) <= endDate
            );

            // Calculate project metrics
            const projectStatus = {
                project: {
                    id: project,
                    name: (await this.client.getProject()).name
                },
                timeRange: {
                    start: startDate,
                    end: endDate,
                    days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
                },
                builds: {
                    total: builds.length,
                    succeeded: builds.filter(b => b.result === 'succeeded').length,
                    failed: builds.filter(b => b.result === 'failed').length,
                    partiallySucceeded: builds.filter(b => b.result === 'partiallySucceeded').length,
                    canceled: builds.filter(b => b.result === 'canceled').length,
                    successRate: this.calculateSuccessRate(builds)
                },
                testRuns: {
                    total: filteredTestRuns.length,
                    totalTests: filteredTestRuns.reduce((sum, run) => sum + (run.totalTests || 0), 0),
                    passedTests: filteredTestRuns.reduce((sum, run) => sum + (run.passedTests || 0), 0),
                    failedTests: filteredTestRuns.reduce((sum, run) => sum + (run.unanalyzedTests || 0), 0),
                    passRate: this.calculateTestPassRate(filteredTestRuns)
                },
                trends: await this.calculateTrends(project, builds, filteredTestRuns),
                recentBuilds: builds.slice(0, 10).map(build => ({
                    id: build.id,
                    buildNumber: build.buildNumber,
                    status: build.status,
                    result: build.result,
                    startTime: build.startTime,
                    finishTime: build.finishTime,
                    branch: build.sourceBranch,
                    commit: build.sourceVersion?.substring(0, 8),
                    requestedBy: build.requestedBy?.displayName
                }))
            };

            this.log('Project test status calculated for:', project);
            return projectStatus;
            
        } catch (error) {
            this.error('Failed to get project test status:', error.message);
            throw error;
        }
    }

    /**
     * Generate comprehensive test report for a project
     */
    async generateProjectTestReport(projectId = null, options = {}) {
        try {
            const project = projectId || this.client.projectId;
            const timeRange = options.timeRange || '30d';
            const includeDetails = options.includeDetails !== false;
            const includeCharts = options.includeCharts !== false;

            // Get project status
            const projectStatus = await this.getProjectTestStatus(project, timeRange);
            
            // Get detailed build results if requested
            let detailedBuilds = [];
            if (includeDetails) {
                const recentBuilds = projectStatus.recentBuilds.slice(0, 5);
                detailedBuilds = await Promise.all(
                    recentBuilds.map(build => this.consumeBuildResults(build.id, project))
                );
            }

            // Get test failure patterns
            const failurePatterns = await this.analyzeFailurePatterns(project, timeRange);
            
            // Get performance metrics
            const performanceMetrics = await this.calculatePerformanceMetrics(project, timeRange);

            const report = {
                metadata: {
                    reportId: `report_${Date.now()}`,
                    generatedAt: new Date().toISOString(),
                    generatedBy: 'Azure DevOps Integration',
                    project: projectStatus.project,
                    timeRange: projectStatus.timeRange,
                    options
                },
                summary: {
                    builds: projectStatus.builds,
                    testRuns: projectStatus.testRuns,
                    trends: projectStatus.trends,
                    healthScore: this.calculateHealthScore(projectStatus)
                },
                details: includeDetails ? {
                    recentBuilds: detailedBuilds,
                    failurePatterns,
                    performanceMetrics
                } : null,
                charts: includeCharts ? {
                    buildTrend: this.generateBuildTrendData(projectStatus.trends),
                    testPassRate: this.generateTestPassRateData(projectStatus.trends),
                    performanceChart: this.generatePerformanceChartData(performanceMetrics)
                } : null,
                recommendations: this.generateRecommendations(projectStatus, failurePatterns, performanceMetrics)
            };

            this.log('Project test report generated:', report.metadata.reportId);
            return report;
            
        } catch (error) {
            this.error('Failed to generate project test report:', error.message);
            throw error;
        }
    }

    /**
     * Extract task results from build timeline
     */
    extractTaskResults(timeline) {
        if (!timeline || !timeline.records) return [];

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
                warningCount: task.warningCount || 0
            }));
    }

    /**
     * Extract test results from test runs
     */
    async extractTestResults(testRuns, project) {
        if (!testRuns || testRuns.length === 0) return [];

        const testApi = await this.client.getTestApi();
        const results = [];

        for (const run of testRuns) {
            try {
                const testResults = await testApi.getTestResults(project, run.id);
                results.push({
                    runId: run.id,
                    runName: run.name,
                    state: run.state,
                    totalTests: run.totalTests,
                    passedTests: run.passedTests,
                    failedTests: run.unanalyzedTests,
                    startedDate: run.startedDate,
                    completedDate: run.completedDate,
                    results: testResults.map(test => ({
                        id: test.id,
                        testCaseTitle: test.testCaseTitle,
                        outcome: test.outcome,
                        durationInMs: test.durationInMs,
                        errorMessage: test.errorMessage,
                        stackTrace: test.stackTrace
                    }))
                });
            } catch (error) {
                this.error(`Failed to get test results for run ${run.id}:`, error.message);
            }
        }

        return results;
    }

    /**
     * Calculate various metrics and trends
     */
    calculateSuccessRate(builds) {
        if (!builds || builds.length === 0) return 0;
        const successful = builds.filter(b => b.result === 'succeeded').length;
        return Math.round((successful / builds.length) * 100);
    }

    calculateTestPassRate(testRuns) {
        if (!testRuns || testRuns.length === 0) return 0;
        const totalTests = testRuns.reduce((sum, run) => sum + (run.totalTests || 0), 0);
        const passedTests = testRuns.reduce((sum, run) => sum + (run.passedTests || 0), 0);
        return totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    }

    calculateHealthScore(projectStatus) {
        const buildScore = projectStatus.builds.successRate;
        const testScore = projectStatus.testRuns.passRate;
        const activityScore = Math.min(100, (projectStatus.builds.total / 30) * 100); // Normalize to 30 builds
        
        return Math.round((buildScore * 0.4 + testScore * 0.4 + activityScore * 0.2));
    }

    async calculateTrends(project, builds, testRuns) {
        // Calculate weekly trends
        const weeks = 4;
        const trends = [];

        for (let i = 0; i < weeks; i++) {
            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() - (i * 7));
            const weekStart = new Date(weekEnd);
            weekStart.setDate(weekStart.getDate() - 7);

            const weekBuilds = builds.filter(b => 
                new Date(b.startTime) >= weekStart && new Date(b.startTime) < weekEnd
            );
            const weekTestRuns = testRuns.filter(r => 
                new Date(r.startedDate) >= weekStart && new Date(r.startedDate) < weekEnd
            );

            trends.unshift({
                week: `Week ${weeks - i}`,
                startDate: weekStart,
                endDate: weekEnd,
                builds: {
                    total: weekBuilds.length,
                    successRate: this.calculateSuccessRate(weekBuilds)
                },
                tests: {
                    total: weekTestRuns.reduce((sum, run) => sum + (run.totalTests || 0), 0),
                    passRate: this.calculateTestPassRate(weekTestRuns)
                }
            });
        }

        return trends;
    }

    async analyzeFailurePatterns(project, timeRange) {
        // This would analyze common failure patterns
        // For now, return a placeholder structure
        return {
            commonErrors: [],
            flakyTests: [],
            frequentFailures: [],
            recommendations: []
        };
    }

    async calculatePerformanceMetrics(project, timeRange) {
        // This would calculate performance trends
        // For now, return a placeholder structure
        return {
            averageBuildTime: 0,
            averageTestTime: 0,
            performanceTrends: [],
            slowestTests: []
        };
    }

    generateRecommendations(projectStatus, failurePatterns, performanceMetrics) {
        const recommendations = [];

        if (projectStatus.builds.successRate < 80) {
            recommendations.push({
                type: 'build-stability',
                priority: 'high',
                message: 'Build success rate is below 80%. Consider reviewing failing builds and addressing common issues.'
            });
        }

        if (projectStatus.testRuns.passRate < 85) {
            recommendations.push({
                type: 'test-reliability',
                priority: 'high',
                message: 'Test pass rate is below 85%. Review failing tests and improve test stability.'
            });
        }

        if (projectStatus.builds.total < 10) {
            recommendations.push({
                type: 'build-frequency',
                priority: 'medium',
                message: 'Low build frequency detected. Consider more frequent builds for better CI/CD practices.'
            });
        }

        return recommendations;
    }

    generateBuildTrendData(trends) {
        return trends.map(trend => ({
            period: trend.week,
            total: trend.builds.total,
            successRate: trend.builds.successRate
        }));
    }

    generateTestPassRateData(trends) {
        return trends.map(trend => ({
            period: trend.week,
            total: trend.tests.total,
            passRate: trend.tests.passRate
        }));
    }

    generatePerformanceChartData(performanceMetrics) {
        return {
            averageBuildTime: performanceMetrics.averageBuildTime,
            averageTestTime: performanceMetrics.averageTestTime,
            trends: performanceMetrics.performanceTrends
        };
    }

    calculateDuration(startTime, finishTime) {
        if (!startTime || !finishTime) return 0;
        return Math.round((new Date(finishTime) - new Date(startTime)) / 1000);
    }

    getDateRange(timeRange) {
        const date = new Date();
        switch (timeRange) {
            case '7d':
                date.setDate(date.getDate() - 7);
                break;
            case '30d':
                date.setDate(date.getDate() - 30);
                break;
            case '90d':
                date.setDate(date.getDate() - 90);
                break;
            default:
                date.setDate(date.getDate() - 30);
        }
        return date;
    }

    log(...args) {
        if (this.debug) {
            console.log('[ADO-PIPELINE-SERVICE]', ...args);
        }
    }

    error(...args) {
        console.error('[ADO-PIPELINE-SERVICE ERROR]', ...args);
    }
}

module.exports = AdoPipelineService;
