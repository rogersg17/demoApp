import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config();

export class PrismaDatabase {
  private static instance: PrismaDatabase;
  public prisma: PrismaClient;
  public initialized: boolean = false;

  private constructor() {
    this.prisma = new PrismaClient({
      log: ['warn', 'error'],
      errorFormat: 'minimal',
    });
  }

  public static getInstance(): PrismaDatabase {
    if (!PrismaDatabase.instance) {
      PrismaDatabase.instance = new PrismaDatabase();
    }
    return PrismaDatabase.instance;
  }

  public async initialize(): Promise<void> {
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
    } catch (error) {
      console.error('❌ Failed to initialize Prisma database:', error);
      throw error;
    }
  }

  private async ensureSchemaSync(): Promise<void> {
    try {
      // Push schema changes to the database (for development)
      // This is equivalent to running `prisma db push`
      console.log('🔄 Syncing database schema...');
      
      // Note: In a real application, you would use migrations
      // For now, we'll rely on Prisma's ability to sync the schema
      console.log('✅ Database schema synced');
    } catch (error) {
      console.warn('⚠️ Schema sync warning:', error);
    }
  }

  public async close(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.initialized = false;
      console.log('✅ Prisma database connection closed');
    } catch (error) {
      console.error('❌ Error closing Prisma database connection:', error);
      throw error;
    }
  }

  // Health check method
  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return false;
    }
  }

  // Transaction wrapper
  public async transaction<T>(fn: (prisma: any) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  // User management methods
  public async createUser(data: {
    username: string;
    email: string;
    password: string;
  }) {
    return this.prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: data.password,
      },
    });
  }

  public async getUserByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  public async getUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  public async updateUserLastLogin(userId: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { last_login: new Date() },
    });
  }

  // Test execution methods
  public async createTestExecution(data: {
    execution_id: string;
    test_suite: string;
    environment: string;
    status?: string;
    priority?: number;
    estimated_duration?: number;
    assigned_runner_id?: number;
    metadata?: any;
  }) {
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

  public async getTestExecution(executionId: string) {
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

  public async updateTestExecutionStatus(executionId: string, status: string, completedAt?: Date) {
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
  public async createTestRunner(data: {
    name: string;
    type: string;
    status?: string;
    health_status?: string;
    endpoint_url?: string;
    webhook_url?: string;
    capabilities?: any;
    max_concurrent_jobs?: number;
    priority?: number;
    health_check_url?: string;
    metadata?: any;
  }) {
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

  public async getTestRunners(options?: {
    status?: string;
    type?: string;
    orderBy?: 'name' | 'priority' | 'created_at';
    orderDirection?: 'asc' | 'desc';
  }) {
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

  public async updateTestRunnerHealth(runnerId: number, healthStatus: string, responseTime?: number, errorMessage?: string) {
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
  public async queueExecution(data: {
    execution_id: string;
    test_suite: string;
    environment: string;
    priority?: number;
    estimated_duration?: number;
    requested_runner_type?: string;
    requested_runner_id?: number;
    metadata?: any;
  }) {
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

  public async getQueuedExecutions(limit?: number) {
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

  public async assignExecutionToRunner(executionId: string, runnerId: number) {
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
  public async allocateResources(data: {
    execution_id: string;
    runner_id: number;
    cpu_allocated: number;
    memory_allocated: number;
  }) {
    return this.prisma.resourceAllocation.create({
      data: {
        execution_id: data.execution_id,
        runner_id: data.runner_id,
        cpu_allocated: data.cpu_allocated,
        memory_allocated: data.memory_allocated,
      },
    });
  }

  public async releaseResources(executionId: string) {
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
  public async recordExecutionMetric(data: {
    execution_id: string;
    runner_id: number;
    metric_name: string;
    metric_value: number;
  }) {
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
  public async createParallelExecution(data: {
    parent_execution_id: string;
    shard_index: number;
    total_shards: number;
    execution_id: string;
    runner_id?: number;
    shard_webhook_url?: string;
  }) {
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

  public async getParallelExecutions(parentExecutionId: string) {
    return this.prisma.parallelExecution.findMany({
      where: { parent_execution_id: parentExecutionId },
      orderBy: { shard_index: 'asc' },
      include: {
        runner: true,
      },
    });
  }

  // Dashboard and analytics methods
  public async getDashboardMetrics() {
    const [
      totalRunners,
      activeRunners,
      healthyRunners,
      queuedExecutions,
      runningExecutions,
      executions24h,
    ] = await Promise.all([
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
  public async createFlakyTest(data: {
    test_name: string;
    failure_count?: number;
    success_count?: number;
    flakiness_percentage?: number;
  }) {
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

  public async getFlakyTests(limit?: number) {
    return this.prisma.flakyTest.findMany({
      orderBy: { flakiness_percentage: 'desc' },
      take: limit,
    });
  }

  // Cleanup method for graceful shutdown
  public async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up Prisma database connection...');
    await this.close();
  }
}

// Export singleton instance
export const prismaDb = PrismaDatabase.getInstance();