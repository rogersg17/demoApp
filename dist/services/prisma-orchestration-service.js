"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaOrchestrationService = void 0;
const prisma_database_1 = require("../database/prisma-database");
class PrismaOrchestrationService {
    initialized = false;
    processingInterval = null;
    healthCheckInterval = null;
    constructor() {
        console.log('🔧 PrismaOrchestrationService initialized');
    }
    async initialize() {
        if (this.initialized)
            return;
        try {
            console.log('🔄 Initializing Prisma Orchestration Service...');
            // Start queue processing
            this.startQueueProcessing();
            // Start health monitoring
            this.startHealthMonitoring();
            this.initialized = true;
            console.log('✅ Prisma Orchestration Service initialized successfully');
        }
        catch (error) {
            console.error('❌ Failed to initialize Prisma Orchestration Service:', error);
            throw error;
        }
    }
    startQueueProcessing() {
        // Process queue every 5 seconds
        this.processingInterval = setInterval(async () => {
            try {
                await this.processExecutionQueue();
            }
            catch (error) {
                console.error('❌ Error processing execution queue:', error);
            }
        }, 5000);
        console.log('✅ Queue processing started (5-second intervals)');
    }
    startHealthMonitoring() {
        // Health check every 2 minutes
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.performHealthChecks();
            }
            catch (error) {
                console.error('❌ Error performing health checks:', error);
            }
        }, 120000);
        console.log('✅ Health monitoring started (2-minute intervals)');
    }
    async queueExecution(data) {
        try {
            console.log(`📝 Queueing execution: ${data.execution_id}`);
            // Create test execution record
            await prisma_database_1.prismaDb.createTestExecution({
                execution_id: data.execution_id,
                test_suite: data.test_suite,
                environment: data.environment,
                status: 'queued',
                priority: data.priority,
                estimated_duration: data.estimated_duration,
                metadata: data.metadata,
            });
            // Queue the execution
            const queueItem = await prisma_database_1.prismaDb.queueExecution(data);
            console.log(`✅ Execution queued successfully: ${data.execution_id} (Priority: ${data.priority || 50})`);
            return queueItem;
        }
        catch (error) {
            console.error(`❌ Failed to queue execution ${data.execution_id}:`, error);
            throw error;
        }
    }
    async processExecutionQueue() {
        try {
            // Get available runners
            const availableRunners = await this.getAvailableRunners();
            if (availableRunners.length === 0) {
                return; // No runners available
            }
            // Get queued executions
            const queuedExecutions = await prisma_database_1.prismaDb.getQueuedExecutions(10);
            if (queuedExecutions.length === 0) {
                return; // No executions in queue
            }
            console.log(`🔄 Processing ${queuedExecutions.length} queued executions with ${availableRunners.length} available runners`);
            for (const queueItem of queuedExecutions) {
                try {
                    const selectedRunner = await this.selectRunner(queueItem, availableRunners);
                    if (selectedRunner) {
                        await this.assignExecution(queueItem.execution_id, selectedRunner.id);
                        await this.triggerExecution(queueItem.execution_id, selectedRunner);
                    }
                }
                catch (error) {
                    console.error(`❌ Failed to process execution ${queueItem.execution_id}:`, error);
                }
            }
        }
        catch (error) {
            console.error('❌ Error in processExecutionQueue:', error);
        }
    }
    async getAvailableRunners() {
        const runners = await prisma_database_1.prismaDb.getTestRunners({
            status: 'active',
            orderBy: 'priority',
            orderDirection: 'desc',
        });
        // Filter runners that have capacity
        const availableRunners = runners.filter(runner => {
            // This would normally check current job count vs max_concurrent_jobs
            // For now, we'll assume all active runners are available
            return runner.health_status === 'healthy';
        });
        return availableRunners;
    }
    async selectRunner(queueItem, availableRunners) {
        try {
            // If specific runner requested
            if (queueItem.requested_runner_id) {
                const requestedRunner = availableRunners.find(r => r.id === queueItem.requested_runner_id);
                if (requestedRunner) {
                    return requestedRunner;
                }
            }
            // If specific runner type requested
            if (queueItem.requested_runner_type) {
                const typeRunners = availableRunners.filter(r => r.type === queueItem.requested_runner_type);
                if (typeRunners.length > 0) {
                    // Return highest priority runner of requested type
                    return typeRunners[0];
                }
            }
            // Default: return highest priority available runner
            return availableRunners.length > 0 ? availableRunners[0] : null;
        }
        catch (error) {
            console.error('❌ Error selecting runner:', error);
            return null;
        }
    }
    async assignExecution(executionId, runnerId) {
        try {
            console.log(`🎯 Assigning execution ${executionId} to runner ${runnerId}`);
            // Update queue item
            await prisma_database_1.prismaDb.assignExecutionToRunner(executionId, runnerId);
            // Update test execution
            await prisma_database_1.prismaDb.updateTestExecutionStatus(executionId, 'assigned');
            // Allocate resources
            await prisma_database_1.prismaDb.allocateResources({
                execution_id: executionId,
                runner_id: runnerId,
                cpu_allocated: 2.0, // Default allocation
                memory_allocated: 4096, // 4GB default
            });
            console.log(`✅ Execution ${executionId} assigned to runner ${runnerId}`);
        }
        catch (error) {
            console.error(`❌ Failed to assign execution ${executionId}:`, error);
            throw error;
        }
    }
    async triggerExecution(executionId, runner) {
        try {
            console.log(`🚀 Triggering execution ${executionId} on ${runner.type} runner: ${runner.name}`);
            // Update status to running
            await prisma_database_1.prismaDb.updateTestExecutionStatus(executionId, 'running');
            // Trigger based on runner type
            switch (runner.type) {
                case 'github-actions':
                    await this.triggerGitHubActions(executionId, runner);
                    break;
                case 'azure-devops':
                    await this.triggerAzureDevOps(executionId, runner);
                    break;
                case 'docker':
                    await this.triggerDockerExecution(executionId, runner);
                    break;
                case 'jenkins':
                    await this.triggerJenkins(executionId, runner);
                    break;
                default:
                    throw new Error(`Unsupported runner type: ${runner.type}`);
            }
            console.log(`✅ Execution ${executionId} triggered successfully`);
        }
        catch (error) {
            console.error(`❌ Failed to trigger execution ${executionId}:`, error);
            // Mark execution as failed
            await prisma_database_1.prismaDb.updateTestExecutionStatus(executionId, 'failed');
            throw error;
        }
    }
    async triggerGitHubActions(executionId, runner) {
        console.log(`🐙 Triggering GitHub Actions for execution ${executionId}`);
        // Implementation would trigger GitHub Actions workflow
        // For demo, we'll simulate the trigger
        console.log(`📡 GitHub Actions workflow dispatched for ${executionId}`);
    }
    async triggerAzureDevOps(executionId, runner) {
        console.log(`🔷 Triggering Azure DevOps for execution ${executionId}`);
        // Implementation would trigger Azure DevOps pipeline
        console.log(`📡 Azure DevOps pipeline triggered for ${executionId}`);
    }
    async triggerDockerExecution(executionId, runner) {
        console.log(`🐳 Triggering Docker execution for ${executionId}`);
        // Implementation would start Docker container
        console.log(`📡 Docker container started for ${executionId}`);
    }
    async triggerJenkins(executionId, runner) {
        console.log(`🏗️ Triggering Jenkins for execution ${executionId}`);
        // Implementation would trigger Jenkins job
        console.log(`📡 Jenkins job triggered for ${executionId}`);
    }
    async markExecutionCompleted(executionId) {
        try {
            console.log(`✅ Marking execution ${executionId} as completed`);
            await prisma_database_1.prismaDb.updateTestExecutionStatus(executionId, 'completed', new Date());
            await prisma_database_1.prismaDb.releaseResources(executionId);
            console.log(`🎉 Execution ${executionId} completed successfully`);
        }
        catch (error) {
            console.error(`❌ Failed to mark execution ${executionId} as completed:`, error);
            throw error;
        }
    }
    async markExecutionFailed(executionId, errorMessage) {
        try {
            console.log(`❌ Marking execution ${executionId} as failed: ${errorMessage || 'Unknown error'}`);
            await prisma_database_1.prismaDb.updateTestExecutionStatus(executionId, 'failed', new Date());
            await prisma_database_1.prismaDb.releaseResources(executionId);
            console.log(`💥 Execution ${executionId} marked as failed`);
        }
        catch (error) {
            console.error(`❌ Failed to mark execution ${executionId} as failed:`, error);
            throw error;
        }
    }
    async recordExecutionMetric(executionId, runnerId, metricName, metricValue) {
        try {
            await prisma_database_1.prismaDb.recordExecutionMetric({
                execution_id: executionId,
                runner_id: runnerId,
                metric_name: metricName,
                metric_value: metricValue,
            });
            console.log(`📊 Recorded metric ${metricName}=${metricValue} for execution ${executionId}`);
        }
        catch (error) {
            console.error(`❌ Failed to record metric for execution ${executionId}:`, error);
        }
    }
    async performHealthChecks() {
        try {
            const runners = await prisma_database_1.prismaDb.getTestRunners({ status: 'active' });
            console.log(`🏥 Performing health checks on ${runners.length} runners`);
            for (const runner of runners) {
                try {
                    await this.checkRunnerHealth(runner);
                }
                catch (error) {
                    console.error(`❌ Health check failed for runner ${runner.name}:`, error);
                }
            }
        }
        catch (error) {
            console.error('❌ Error performing health checks:', error);
        }
    }
    async checkRunnerHealth(runner) {
        try {
            const startTime = Date.now();
            let healthStatus = 'healthy';
            let responseTime;
            let errorMessage;
            // Simulate health check (in real implementation, this would make HTTP request)
            if (runner.health_check_url) {
                // Simulate network call
                responseTime = Math.random() * 1000 + 100; // 100-1100ms
                // Simulate occasional failures
                if (Math.random() < 0.1) { // 10% failure rate
                    healthStatus = 'unhealthy';
                    errorMessage = 'Simulated health check failure';
                }
            }
            await prisma_database_1.prismaDb.updateTestRunnerHealth(runner.id, healthStatus, responseTime, errorMessage);
            if (healthStatus === 'healthy') {
                console.log(`💚 Runner ${runner.name} is healthy (${responseTime?.toFixed(0)}ms)`);
            }
            else {
                console.log(`💔 Runner ${runner.name} is unhealthy: ${errorMessage}`);
            }
        }
        catch (error) {
            console.error(`❌ Error checking health for runner ${runner.name}:`, error);
        }
    }
    async getDashboardMetrics() {
        try {
            return await prisma_database_1.prismaDb.getDashboardMetrics();
        }
        catch (error) {
            console.error('❌ Error getting dashboard metrics:', error);
            throw error;
        }
    }
    async cleanup() {
        console.log('🧹 Cleaning up Prisma Orchestration Service...');
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        this.initialized = false;
        console.log('✅ Prisma Orchestration Service cleanup complete');
    }
}
exports.PrismaOrchestrationService = PrismaOrchestrationService;
//# sourceMappingURL=prisma-orchestration-service.js.map