"use strict";
/**
 * Enhanced Orchestration API Routes
 * Week 11-12: Database & ORM Evolution
 *
 * Provides REST API endpoints for the Enhanced Orchestration Service
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupOrchestrationWebSocket = setupOrchestrationWebSocket;
const express_1 = __importDefault(require("express"));
const enhanced_orchestration_service_1 = require("../services/enhanced-orchestration-service");
const router = express_1.default.Router();
/**
 * Queue a new test execution
 * POST /api/orchestration/executions
 */
router.post('/executions', async (req, res) => {
    try {
        const request = {
            testSuite: req.body.testSuite || req.body.suite || 'default',
            environment: req.body.environment || 'default',
            priority: req.body.priority || 50,
            requestedRunnerType: req.body.requestedRunnerType,
            requestedRunnerId: req.body.requestedRunnerId,
            estimatedDuration: req.body.estimatedDuration,
            metadata: req.body.metadata || {},
            testFiles: req.body.testFiles || [],
            branch: req.body.branch || 'main',
            commit: req.body.commit,
            userId: req.body.userId,
            webhookUrl: req.body.webhookUrl
        };
        const executionId = await enhanced_orchestration_service_1.orchestrationService.queueExecution(request);
        res.status(201).json({
            success: true,
            data: {
                executionId,
                status: 'queued',
                message: 'Test execution queued successfully'
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Error queueing execution:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            error: 'Failed to queue execution',
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * Register a new test runner
 * POST /api/orchestration/runners
 */
router.post('/runners', async (req, res) => {
    try {
        const registration = {
            name: req.body.name,
            type: req.body.type,
            endpointUrl: req.body.endpointUrl,
            webhookUrl: req.body.webhookUrl,
            capabilities: req.body.capabilities || {},
            maxConcurrentJobs: req.body.maxConcurrentJobs || 1,
            priority: req.body.priority || 50,
            healthCheckUrl: req.body.healthCheckUrl,
            metadata: req.body.metadata || {}
        };
        const runnerId = await enhanced_orchestration_service_1.orchestrationService.registerRunner(registration);
        res.status(201).json({
            success: true,
            data: {
                runnerId,
                message: 'Test runner registered successfully'
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Error registering runner:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            error: 'Failed to register runner',
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * Configure load balancing rules
 * POST /api/orchestration/load-balancing
 */
router.post('/load-balancing', async (req, res) => {
    try {
        const config = {
            name: req.body.name,
            ruleType: req.body.ruleType || 'round-robin',
            testSuitePattern: req.body.testSuitePattern,
            environmentPattern: req.body.environmentPattern,
            runnerTypeFilter: req.body.runnerTypeFilter,
            priority: req.body.priority || 50,
            ruleConfig: req.body.ruleConfig || {}
        };
        const ruleId = await enhanced_orchestration_service_1.orchestrationService.configureLoadBalancing(config);
        res.status(201).json({
            success: true,
            data: {
                ruleId,
                message: 'Load balancing rule configured successfully'
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Error configuring load balancing:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            error: 'Failed to configure load balancing',
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * Get queue status and metrics
 * GET /api/orchestration/queue/status
 */
router.get('/queue/status', async (req, res) => {
    try {
        const status = await enhanced_orchestration_service_1.orchestrationService.getQueueStatus();
        res.json({
            success: true,
            data: status,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Error getting queue status:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            error: 'Failed to get queue status',
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * Get execution history
 * GET /api/orchestration/executions/history
 */
router.get('/executions/history', async (req, res) => {
    try {
        const options = {
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0,
            status: req.query.status,
            testSuite: req.query.testSuite,
            environment: req.query.environment
        };
        const history = await enhanced_orchestration_service_1.orchestrationService.getExecutionHistory(options);
        res.json({
            success: true,
            data: history,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Error getting execution history:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            error: 'Failed to get execution history',
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * Get runner metrics
 * GET /api/orchestration/runners/metrics
 */
router.get('/runners/metrics', async (req, res) => {
    try {
        const runnerId = req.query.runnerId ? parseInt(req.query.runnerId) : undefined;
        const metrics = await enhanced_orchestration_service_1.orchestrationService.getRunnerMetrics(runnerId);
        res.json({
            success: true,
            data: metrics,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Error getting runner metrics:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            error: 'Failed to get runner metrics',
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * Get specific execution status
 * GET /api/orchestration/executions/:executionId
 */
router.get('/executions/:executionId', async (req, res) => {
    try {
        const { executionId } = req.params;
        // Get execution details from history with specific ID
        const history = await enhanced_orchestration_service_1.orchestrationService.getExecutionHistory({
            limit: 1,
            offset: 0
        });
        const execution = history.executions.find((exec) => exec.execution_id === executionId);
        if (!execution) {
            res.status(404).json({
                success: false,
                error: 'Execution not found',
                message: `No execution found with ID: ${executionId}`,
                timestamp: new Date().toISOString()
            });
            return;
        }
        res.json({
            success: true,
            data: execution,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Error getting execution:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            error: 'Failed to get execution',
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * Health check endpoint
 * GET /api/orchestration/health
 */
router.get('/health', async (req, res) => {
    try {
        const status = await enhanced_orchestration_service_1.orchestrationService.getQueueStatus();
        res.json({
            success: true,
            data: {
                service: 'Enhanced Orchestration Service',
                status: 'healthy',
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                queue: status.queue,
                runners: status.runners
            }
        });
    }
    catch (error) {
        console.error('❌ Health check failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(503).json({
            success: false,
            data: {
                service: 'Enhanced Orchestration Service',
                status: 'unhealthy',
                error: errorMessage,
                timestamp: new Date().toISOString()
            }
        });
    }
});
/**
 * WebSocket event handlers for real-time updates
 */
function setupOrchestrationWebSocket(io) {
    // Listen for orchestration events and broadcast to connected clients
    enhanced_orchestration_service_1.orchestrationService.on('executionQueued', (data) => {
        io.emit('orchestration:executionQueued', data);
    });
    enhanced_orchestration_service_1.orchestrationService.on('executionAssigned', (data) => {
        io.emit('orchestration:executionAssigned', data);
    });
    enhanced_orchestration_service_1.orchestrationService.on('executionStarted', (data) => {
        io.emit('orchestration:executionStarted', data);
    });
    enhanced_orchestration_service_1.orchestrationService.on('executionCompleted', (data) => {
        io.emit('orchestration:executionCompleted', data);
    });
    enhanced_orchestration_service_1.orchestrationService.on('runnerRegistered', (data) => {
        io.emit('orchestration:runnerRegistered', data);
    });
    enhanced_orchestration_service_1.orchestrationService.on('runnerUnhealthy', (data) => {
        io.emit('orchestration:runnerUnhealthy', data);
    });
    enhanced_orchestration_service_1.orchestrationService.on('loadBalancingConfigured', (data) => {
        io.emit('orchestration:loadBalancingConfigured', data);
    });
    console.log('✅ Enhanced Orchestration WebSocket events configured');
}
exports.default = router;
//# sourceMappingURL=enhanced-orchestration-api.js.map