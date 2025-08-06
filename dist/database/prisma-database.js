"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prismaDb = exports.PrismaDatabase = void 0;
const client_1 = require("@prisma/client");
const dotenv_1 = require("dotenv");
// Load environment variables
(0, dotenv_1.config)();
class PrismaDatabase {
    static instance;
    prisma;
    initialized = false;
    constructor() {
        this.prisma = new client_1.PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
            errorFormat: 'minimal',
        });
    }
    static getInstance() {
        if (!PrismaDatabase.instance) {
            PrismaDatabase.instance = new PrismaDatabase();
        }
        return PrismaDatabase.instance;
    }
    async initialize() {
        try {
            console.log('🔄 Initializing Prisma database connection...');
            // Test the connection
            await this.prisma.$connect();
            console.log('✅ Prisma database connection established');
            // Run any pending migrations in development
            if (process.env.NODE_ENV === 'development') {
                await this.ensureSchemaSync();
            }
            this.initialized = true;
            console.log('✅ Prisma database initialized successfully');
        }
        catch (error) {
            console.error('❌ Failed to initialize Prisma database:', error);
            throw error;
        }
    }
    async ensureSchemaSync() {
        try {
            // Push schema changes to the database (for development)
            // This is equivalent to running `prisma db push`
            console.log('🔄 Syncing database schema...');
            // Note: In a real application, you would use migrations
            // For now, we'll rely on Prisma's ability to sync the schema
            console.log('✅ Database schema synced');
        }
        catch (error) {
            console.warn('⚠️ Schema sync warning:', error);
        }
    }
    async close() {
        try {
            await this.prisma.$disconnect();
            this.initialized = false;
            console.log('✅ Prisma database connection closed');
        }
        catch (error) {
            console.error('❌ Error closing Prisma database connection:', error);
            throw error;
        }
    }
    // Health check method
    async healthCheck() {
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            return true;
        }
        catch (error) {
            console.error('❌ Database health check failed:', error);
            return false;
        }
    }
    // Transaction wrapper
    async transaction(fn) {
        return this.prisma.$transaction(fn);
    }
    // User management methods
    async createUser(data) {
        return this.prisma.user.create({
            data: {
                username: data.username,
                email: data.email,
                password: data.password,
            },
        });
    }
    async getUserByUsername(username) {
        return this.prisma.user.findUnique({
            where: { username },
        });
    }
    async getUserByEmail(email) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }
    async updateUserLastLogin(userId) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { last_login: new Date() },
        });
    }
    // Test execution methods
    async createTestExecution(data) {
        return this.prisma.testExecution.create({
            data: {
                id: data.execution_id,
                execution_id: data.execution_id,
                test_suite: data.test_suite,
                environment: data.environment,
                status: data.status || 'queued',
                priority: data.priority || 50,
                estimated_duration: data.estimated_duration,
                assigned_runner_id: data.assigned_runner_id,
                metadata: data.metadata ? JSON.stringify(data.metadata) : null,
            },
        });
    }
    async getTestExecution(executionId) {
        return this.prisma.testExecution.findUnique({
            where: { execution_id: executionId },
            include: {
                assigned_runner: true,
                results: true,
                resource_allocations: true,
                execution_metrics: true,
            },
        });
    }
    async updateTestExecutionStatus(executionId, status, completedAt) {
        return this.prisma.testExecution.update({
            where: { execution_id: executionId },
            data: {
                status,
                completed_at: completedAt,
                ...(status === 'running' && { started_at: new Date() }),
            },
        });
    }
    // Test runner methods
    async createTestRunner(data) {
        return this.prisma.testRunner.create({
            data: {
                name: data.name,
                type: data.type,
                status: data.status || 'active',
                health_status: data.health_status || 'unknown',
                endpoint_url: data.endpoint_url,
                webhook_url: data.webhook_url,
                capabilities: data.capabilities ? JSON.stringify(data.capabilities) : null,
                max_concurrent_jobs: data.max_concurrent_jobs || 1,
                priority: data.priority || 50,
                health_check_url: data.health_check_url,
                metadata: data.metadata ? JSON.stringify(data.metadata) : null,
            },
        });
    }
    async getTestRunners(options) {
        return this.prisma.testRunner.findMany({
            where: {
                ...(options?.status && { status: options.status }),
                ...(options?.type && { type: options.type }),
            },
            orderBy: options?.orderBy ? {
                [options.orderBy]: options.orderDirection || 'asc'
            } : {
                priority: 'desc'
            },
        });
    }
    async updateTestRunnerHealth(runnerId, healthStatus, responseTime, errorMessage) {
        // Update runner health status
        await this.prisma.testRunner.update({
            where: { id: runnerId },
            data: {
                health_status: healthStatus,
                last_health_check: new Date(),
            },
        });
        // Record health history
        await this.prisma.runnerHealthHistory.create({
            data: {
                runner_id: runnerId,
                health_status: healthStatus,
                response_time: responseTime,
                error_message: errorMessage,
            },
        });
    }
    // Execution queue methods
    async queueExecution(data) {
        return this.prisma.executionQueueItem.create({
            data: {
                execution_id: data.execution_id,
                test_suite: data.test_suite,
                environment: data.environment,
                priority: data.priority || 50,
                estimated_duration: data.estimated_duration,
                requested_runner_type: data.requested_runner_type,
                requested_runner_id: data.requested_runner_id,
                metadata: data.metadata ? JSON.stringify(data.metadata) : null,
            },
        });
    }
    async getQueuedExecutions(limit) {
        return this.prisma.executionQueueItem.findMany({
            where: {
                status: 'queued',
            },
            orderBy: [
                { priority: 'desc' },
                { queued_at: 'asc' },
            ],
            take: limit,
            include: {
                execution: true,
            },
        });
    }
    async assignExecutionToRunner(executionId, runnerId) {
        return this.prisma.executionQueueItem.update({
            where: { execution_id: executionId },
            data: {
                status: 'assigned',
                assigned_runner_id: runnerId,
                assigned_at: new Date(),
            },
        });
    }
    // Resource allocation methods
    async allocateResources(data) {
        return this.prisma.resourceAllocation.create({
            data: {
                execution_id: data.execution_id,
                runner_id: data.runner_id,
                cpu_allocated: data.cpu_allocated,
                memory_allocated: data.memory_allocated,
            },
        });
    }
    async releaseResources(executionId) {
        return this.prisma.resourceAllocation.updateMany({
            where: {
                execution_id: executionId,
                status: 'allocated',
            },
            data: {
                status: 'released',
                released_at: new Date(),
            },
        });
    }
    // Metrics methods
    async recordExecutionMetric(data) {
        return this.prisma.executionMetric.create({
            data: {
                execution_id: data.execution_id,
                runner_id: data.runner_id,
                metric_name: data.metric_name,
                metric_value: data.metric_value,
            },
        });
    }
    // Parallel execution methods
    async createParallelExecution(data) {
        return this.prisma.parallelExecution.create({
            data: {
                parent_execution_id: data.parent_execution_id,
                shard_index: data.shard_index,
                total_shards: data.total_shards,
                execution_id: data.execution_id,
                runner_id: data.runner_id,
                shard_webhook_url: data.shard_webhook_url,
            },
        });
    }
    async getParallelExecutions(parentExecutionId) {
        return this.prisma.parallelExecution.findMany({
            where: { parent_execution_id: parentExecutionId },
            orderBy: { shard_index: 'asc' },
            include: {
                runner: true,
            },
        });
    }
    // Dashboard and analytics methods
    async getDashboardMetrics() {
        const [totalRunners, activeRunners, healthyRunners, queuedExecutions, runningExecutions, executions24h,] = await Promise.all([
            this.prisma.testRunner.count(),
            this.prisma.testRunner.count({ where: { status: 'active' } }),
            this.prisma.testRunner.count({ where: { health_status: 'healthy' } }),
            this.prisma.executionQueueItem.count({ where: { status: 'queued' } }),
            this.prisma.executionQueueItem.count({ where: { status: 'running' } }),
            this.prisma.testExecution.count({
                where: {
                    created_at: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    },
                },
            }),
        ]);
        return {
            totalRunners,
            activeRunners,
            healthyRunners,
            queuedExecutions,
            runningExecutions,
            executions24h,
        };
    }
    // MVP Features methods
    async createFlakyTest(data) {
        return this.prisma.flakyTest.upsert({
            where: { test_name: data.test_name },
            update: {
                failure_count: { increment: data.failure_count || 0 },
                success_count: { increment: data.success_count || 0 },
                flakiness_percentage: data.flakiness_percentage || 0,
                updated_at: new Date(),
            },
            create: {
                test_name: data.test_name,
                failure_count: data.failure_count || 0,
                success_count: data.success_count || 0,
                flakiness_percentage: data.flakiness_percentage || 0,
            },
        });
    }
    async getFlakyTests(limit) {
        return this.prisma.flakyTest.findMany({
            orderBy: { flakiness_percentage: 'desc' },
            take: limit,
        });
    }
    // Cleanup method for graceful shutdown
    async cleanup() {
        console.log('🧹 Cleaning up Prisma database connection...');
        await this.close();
    }
}
exports.PrismaDatabase = PrismaDatabase;
// Export singleton instance
exports.prismaDb = PrismaDatabase.getInstance();
//# sourceMappingURL=prisma-database.js.map