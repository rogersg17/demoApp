const express = require('express');
const AdoProjectConfigurationService = require('../services/ado-project-configuration');
const AdoClient = require('../lib/ado-client');
const Database = require('../database/database');

const router = express.Router();

// Initialize services
let adoClient, database, configService;

try {
    adoClient = new AdoClient();
    database = new Database();
    configService = new AdoProjectConfigurationService(adoClient, database);
} catch (error) {
    console.error('⚠️ Azure DevOps dashboard services not initialized:', error.message);
}

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

/**
 * Get overall dashboard data
 */
router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        if (!configService || !database) {
            return res.status(503).json({ error: 'Azure DevOps service not available' });
        }

        // Get all configured projects
        const projects = await configService.getConfiguredProjects();
        
        // Calculate overall summary
        const summary = await calculateOverallSummary(projects);
        
        // Get recent activity
        const recentActivity = await getRecentActivity();
        
        // Get alerts
        const alerts = await getActiveAlerts(projects);

        const dashboardData = {
            summary,
            projects: projects.map(project => ({
                id: project.id,
                name: project.name,
                buildDefinitionId: project.build_definition_id,
                status: project.status || {
                    overall_health: 'unknown',
                    success_rate: 0,
                    total_tests: 0,
                    last_updated: null
                },
                recentBuilds: project.recentBuilds || [],
                lastUpdated: project.lastUpdated || project.updated_at,
                enabled: project.enabled
            })),
            recentActivity,
            alerts,
            timestamp: new Date().toISOString()
        };

        res.json(dashboardData);
    } catch (error) {
        console.error('❌ Dashboard API error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch dashboard data',
            message: error.message 
        });
    }
});

/**
 * Get specific project details
 */
router.get('/project/:projectId', requireAuth, async (req, res) => {
    try {
        if (!configService || !database) {
            return res.status(503).json({ error: 'Azure DevOps service not available' });
        }

        const { projectId } = req.params;
        const projectData = await configService.getProjectConfiguration(projectId);
        
        if (!projectData) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get additional metrics
        const detailedMetrics = await getDetailedProjectMetrics(projectId);
        const testBreakdown = await getTestBreakdown(projectId);
        const buildTrends = await getBuildTrends(projectId);

        res.json({
            ...projectData,
            detailedMetrics,
            testBreakdown,
            buildTrends,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`❌ Project API error for ${req.params.projectId}:`, error);
        res.status(500).json({ 
            error: 'Failed to fetch project details',
            message: error.message 
        });
    }
});

/**
 * Get project trends and historical data
 */
router.get('/project/:projectId/trends', requireAuth, async (req, res) => {
    try {
        if (!database) {
            return res.status(503).json({ error: 'Database service not available' });
        }

        const { projectId } = req.params;
        const { period = '30d', granularity = 'daily' } = req.query;
        
        const trends = await getHistoricalTrends(projectId, period, granularity);
        
        res.json({
            projectId,
            period,
            granularity,
            trends,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`❌ Trends API error for ${req.params.projectId}:`, error);
        res.status(500).json({ 
            error: 'Failed to fetch project trends',
            message: error.message 
        });
    }
});

/**
 * Get build history for a project
 */
router.get('/project/:projectId/builds', requireAuth, async (req, res) => {
    try {
        if (!database) {
            return res.status(503).json({ error: 'Database service not available' });
        }

        const { projectId } = req.params;
        const { limit = 20, status, result } = req.query;
        
        // Get project configuration to find build definition ID
        const project = await configService.getProjectConfiguration(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        let builds = await database.getBuildsByDefinition(project.build_definition_id, parseInt(limit));
        
        // Filter by status or result if specified
        if (status) {
            builds = builds.filter(build => build.status === status);
        }
        if (result) {
            builds = builds.filter(build => build.result === result);
        }

        // Enrich builds with test results
        const enrichedBuilds = await Promise.all(builds.map(async (build) => {
            try {
                const testResults = await database.getTestResultsByBuild(build.ado_build_id);
                return {
                    ...build,
                    testResults: testResults.map(test => ({
                        runId: test.test_run_id,
                        runName: test.run_name,
                        totalTests: test.total_tests,
                        passedTests: test.passed_tests,
                        failedTests: test.failed_tests,
                        skippedTests: test.skipped_tests,
                        duration: test.duration_ms
                    }))
                };
            } catch (error) {
                console.warn(`Failed to get test results for build ${build.ado_build_id}:`, error.message);
                return { ...build, testResults: [] };
            }
        }));

        res.json({
            projectId,
            builds: enrichedBuilds,
            totalCount: builds.length,
            filters: { status, result, limit },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`❌ Builds API error for ${req.params.projectId}:`, error);
        res.status(500).json({ 
            error: 'Failed to fetch project builds',
            message: error.message 
        });
    }
});

/**
 * Get test results for a project
 */
router.get('/project/:projectId/tests', requireAuth, async (req, res) => {
    try {
        if (!database) {
            return res.status(503).json({ error: 'Database service not available' });
        }

        const { projectId } = req.params;
        const { days = 7, outcome } = req.query;
        
        // Get project configuration
        const project = await configService.getProjectConfiguration(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get recent builds for this project
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
        
        const builds = await database.getBuildsByDefinition(project.build_definition_id, 50);
        const recentBuilds = builds.filter(build => 
            new Date(build.start_time) >= cutoffDate
        );

        // Get test results for recent builds
        const allTestResults = [];
        for (const build of recentBuilds) {
            const testResults = await database.getTestResultsByBuild(build.ado_build_id);
            testResults.forEach(result => {
                allTestResults.push({
                    ...result,
                    buildId: build.ado_build_id,
                    buildNumber: build.build_number,
                    buildDate: build.start_time
                });
            });
        }

        // Calculate test summary
        const summary = {
            totalRuns: allTestResults.length,
            totalTests: allTestResults.reduce((sum, run) => sum + (run.total_tests || 0), 0),
            passedTests: allTestResults.reduce((sum, run) => sum + (run.passed_tests || 0), 0),
            failedTests: allTestResults.reduce((sum, run) => sum + (run.failed_tests || 0), 0),
            skippedTests: allTestResults.reduce((sum, run) => sum + (run.skipped_tests || 0), 0)
        };

        summary.passRate = summary.totalTests > 0 ? 
            Math.round((summary.passedTests / summary.totalTests) * 100) : 0;

        res.json({
            projectId,
            period: `${days} days`,
            summary,
            testResults: allTestResults,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`❌ Tests API error for ${req.params.projectId}:`, error);
        res.status(500).json({ 
            error: 'Failed to fetch project test results',
            message: error.message 
        });
    }
});

// Helper functions

async function calculateOverallSummary(projects) {
    try {
        let totalProjects = projects.length;
        let activeProjects = projects.filter(p => p.enabled).length;
        let healthyProjects = 0;
        let warningProjects = 0;
        let criticalProjects = 0;
        let totalTests = 0;
        let totalSuccessRate = 0;
        let projectsWithData = 0;

        for (const project of projects) {
            if (project.status) {
                projectsWithData++;
                totalSuccessRate += project.status.success_rate || 0;
                totalTests += project.status.total_tests || 0;

                switch (project.status.overall_health) {
                    case 'healthy':
                        healthyProjects++;
                        break;
                    case 'warning':
                        warningProjects++;
                        break;
                    case 'critical':
                        criticalProjects++;
                        break;
                }
            }
        }

        return {
            totalProjects,
            activeProjects,
            healthyProjects,
            warningProjects,
            criticalProjects,
            overallSuccessRate: projectsWithData > 0 ? Math.round(totalSuccessRate / projectsWithData) : 0,
            totalTests,
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        console.error('❌ Failed to calculate overall summary:', error);
        return {
            totalProjects: 0,
            activeProjects: 0,
            healthyProjects: 0,
            warningProjects: 0,
            criticalProjects: 0,
            overallSuccessRate: 0,
            totalTests: 0,
            lastUpdated: new Date().toISOString()
        };
    }
}

async function getRecentActivity() {
    try {
        if (!database) return [];

        const recentBuilds = await database.getRecentBuilds(null, 10);
        return recentBuilds.map(build => ({
            type: 'build',
            id: build.ado_build_id,
            title: `Build ${build.build_number}`,
            description: `${build.definition_name} - ${build.result}`,
            timestamp: build.finish_time || build.start_time,
            status: build.result,
            project: build.definition_name
        }));
    } catch (error) {
        console.error('❌ Failed to get recent activity:', error);
        return [];
    }
}

async function getActiveAlerts(projects) {
    try {
        const alerts = [];
        
        for (const project of projects) {
            if (!project.enabled || !project.status) continue;

            // Check for critical health
            if (project.status.overall_health === 'critical') {
                alerts.push({
                    id: `health_${project.id}`,
                    type: 'health',
                    severity: 'critical',
                    project: project.name,
                    message: `Project ${project.name} is in critical health state`,
                    timestamp: project.status.last_updated
                });
            }

            // Check for low success rate
            if (project.status.success_rate < 50) {
                alerts.push({
                    id: `success_rate_${project.id}`,
                    type: 'success_rate',
                    severity: 'warning',
                    project: project.name,
                    message: `Project ${project.name} has low success rate: ${project.status.success_rate}%`,
                    timestamp: project.status.last_updated
                });
            }

            // Check for recent failures
            if (project.recentBuilds && project.recentBuilds.length > 0) {
                const lastBuild = project.recentBuilds[0];
                if (lastBuild.result === 'failed') {
                    alerts.push({
                        id: `failed_build_${project.id}`,
                        type: 'build_failure',
                        severity: 'error',
                        project: project.name,
                        message: `Latest build failed: ${lastBuild.build_number}`,
                        timestamp: lastBuild.finish_time
                    });
                }
            }
        }

        return alerts.slice(0, 10); // Limit to 10 most recent alerts
    } catch (error) {
        console.error('❌ Failed to get active alerts:', error);
        return [];
    }
}

async function getDetailedProjectMetrics(projectId) {
    try {
        // Get project configuration
        const project = await configService.getProjectConfiguration(projectId);
        if (!project) return null;

        // Calculate detailed metrics
        const stats30d = await database.getBuildStatistics(project.ado_project_id, 30);
        const stats7d = await database.getBuildStatistics(project.ado_project_id, 7);

        return {
            last30Days: stats30d,
            last7Days: stats7d,
            trends: {
                buildsPerDay: stats30d.total_builds / 30,
                averageDuration: stats30d.avg_duration,
                successRateTrend: calculateTrend(stats7d.successful_builds, stats7d.total_builds, 
                                               stats30d.successful_builds, stats30d.total_builds)
            }
        };
    } catch (error) {
        console.error(`❌ Failed to get detailed metrics for project ${projectId}:`, error);
        return null;
    }
}

async function getTestBreakdown(projectId) {
    // This would provide detailed test breakdown analysis
    // Implementation can be expanded based on requirements
    return {
        byOutcome: { passed: 0, failed: 0, skipped: 0 },
        byDuration: { fast: 0, medium: 0, slow: 0 },
        flakyTests: [],
        longestTests: []
    };
}

async function getBuildTrends(projectId) {
    // This would provide build trend analysis
    // Implementation can be expanded based on requirements
    return {
        daily: [],
        weekly: [],
        monthly: []
    };
}

async function getHistoricalTrends(projectId, period, granularity) {
    // This would provide historical trend data
    // Implementation can be expanded based on requirements
    return {
        successRate: [],
        buildCount: [],
        testCount: [],
        duration: []
    };
}

function calculateTrend(current, currentTotal, previous, previousTotal) {
    if (!previousTotal || previousTotal === 0) return 0;
    
    const currentRate = currentTotal > 0 ? (current / currentTotal) * 100 : 0;
    const previousRate = (previous / previousTotal) * 100;
    
    return Math.round((currentRate - previousRate) * 10) / 10;
}

module.exports = router;