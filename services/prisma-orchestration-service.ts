import { prismaDb } from '../database/prisma-database';
import { TestRunner, ExecutionQueueItem, TestExecution } from '@prisma/client';

export class PrismaOrchestrationService {
  private initialized: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    console.log('🔧 PrismaOrchestrationService initialized');
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🔄 Initializing Prisma Orchestration Service...');

      // Start queue processing
      this.startQueueProcessing();

      // Start health monitoring
      this.startHealthMonitoring();

      this.initialized = true;
      console.log('✅ Prisma Orchestration Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Prisma Orchestration Service:', error);
      throw error;
    }
  }

  private startQueueProcessing(): void {
    // Process queue every 5 seconds
    this.processingInterval = setInterval(async () => {
      try {
        await this.processExecutionQueue();
      } catch (error) {
        console.error('❌ Error processing execution queue:', error);
      }
    }, 5000);

    console.log('✅ Queue processing started (5-second intervals)');
  }

  private startHealthMonitoring(): void {
    // Health check every 2 minutes
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        console.error('❌ Error performing health checks:', error);
      }
    }, 120000);

    console.log('✅ Health monitoring started (2-minute intervals)');
  }

  public async queueExecution(data: {
    execution_id: string;
    test_suite: string;
    environment: string;
    priority?: number;
    estimated_duration?: number;
    requested_runner_type?: string;
    requested_runner_id?: number;
    metadata?: any;
  }): Promise<ExecutionQueueItem> {
    try {
      console.log(`📝 Queueing execution: ${data.execution_id}`);

      // Create test execution record
      await prismaDb.createTestExecution({
        execution_id: data.execution_id,
        test_suite: data.test_suite,
        environment: data.environment,
        status: 'queued',
        priority: data.priority,
        estimated_duration: data.estimated_duration,
        metadata: data.metadata,
      });

      // Queue the execution
      const queueItem = await prismaDb.queueExecution(data);

      console.log(`✅ Execution queued successfully: ${data.execution_id} (Priority: ${data.priority || 50})`);
      return queueItem;
    } catch (error) {
      console.error(`❌ Failed to queue execution ${data.execution_id}:`, error);
      throw error;
    }
  }

  public async processExecutionQueue(): Promise<void> {
    try {
      // Get available runners
      const availableRunners = await this.getAvailableRunners();
      if (availableRunners.length === 0) {
        return; // No runners available
      }

      // Get queued executions
      const queuedExecutions = await prismaDb.getQueuedExecutions(10);
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
        } catch (error) {
          console.error(`❌ Failed to process execution ${queueItem.execution_id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Error in processExecutionQueue:', error);
    }
  }

  private async getAvailableRunners(): Promise<TestRunner[]> {
    const runners = await prismaDb.getTestRunners({
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

  private async selectRunner(queueItem: ExecutionQueueItem, availableRunners: TestRunner[]): Promise<TestRunner | null> {
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
    } catch (error) {
      console.error('❌ Error selecting runner:', error);
      return null;
    }
  }

  private async assignExecution(executionId: string, runnerId: number): Promise<void> {
    try {
      console.log(`🎯 Assigning execution ${executionId} to runner ${runnerId}`);

      // Update queue item
      await prismaDb.assignExecutionToRunner(executionId, runnerId);

      // Update test execution
      await prismaDb.updateTestExecutionStatus(executionId, 'assigned');

      // Allocate resources
      await prismaDb.allocateResources({
        execution_id: executionId,
        runner_id: runnerId,
        cpu_allocated: 2.0, // Default allocation
        memory_allocated: 4096, // 4GB default
      });

      console.log(`✅ Execution ${executionId} assigned to runner ${runnerId}`);
    } catch (error) {
      console.error(`❌ Failed to assign execution ${executionId}:`, error);
      throw error;
    }
  }

  private async triggerExecution(executionId: string, runner: TestRunner): Promise<void> {
    try {
      console.log(`🚀 Triggering execution ${executionId} on ${runner.type} runner: ${runner.name}`);

      // Update status to running
      await prismaDb.updateTestExecutionStatus(executionId, 'running');

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
    } catch (error) {
      console.error(`❌ Failed to trigger execution ${executionId}:`, error);
      
      // Mark execution as failed
      await prismaDb.updateTestExecutionStatus(executionId, 'failed');
      throw error;
    }
  }

  private async triggerGitHubActions(executionId: string, runner: TestRunner): Promise<void> {
    console.log(`🐙 Triggering GitHub Actions for execution ${executionId}`);
    // Implementation would trigger GitHub Actions workflow
    // For demo, we'll simulate the trigger
    console.log(`📡 GitHub Actions workflow dispatched for ${executionId}`);
  }

  private async triggerAzureDevOps(executionId: string, runner: TestRunner): Promise<void> {
    console.log(`🔷 Triggering Azure DevOps for execution ${executionId}`);
    // Implementation would trigger Azure DevOps pipeline
    console.log(`📡 Azure DevOps pipeline triggered for ${executionId}`);
  }

  private async triggerDockerExecution(executionId: string, runner: TestRunner): Promise<void> {
    console.log(`🐳 Triggering Docker execution for ${executionId}`);
    // Implementation would start Docker container
    console.log(`📡 Docker container started for ${executionId}`);
  }

  private async triggerJenkins(executionId: string, runner: TestRunner): Promise<void> {
    console.log(`🏗️ Triggering Jenkins for execution ${executionId}`);
    // Implementation would trigger Jenkins job
    console.log(`📡 Jenkins job triggered for ${executionId}`);
  }

  public async markExecutionCompleted(executionId: string): Promise<void> {
    try {
      console.log(`✅ Marking execution ${executionId} as completed`);

      await prismaDb.updateTestExecutionStatus(executionId, 'completed', new Date());
      await prismaDb.releaseResources(executionId);

      console.log(`🎉 Execution ${executionId} completed successfully`);
    } catch (error) {
      console.error(`❌ Failed to mark execution ${executionId} as completed:`, error);
      throw error;
    }
  }

  public async markExecutionFailed(executionId: string, errorMessage?: string): Promise<void> {
    try {
      console.log(`❌ Marking execution ${executionId} as failed: ${errorMessage || 'Unknown error'}`);

      await prismaDb.updateTestExecutionStatus(executionId, 'failed', new Date());
      await prismaDb.releaseResources(executionId);

      console.log(`💥 Execution ${executionId} marked as failed`);
    } catch (error) {
      console.error(`❌ Failed to mark execution ${executionId} as failed:`, error);
      throw error;
    }
  }

  public async recordExecutionMetric(executionId: string, runnerId: number, metricName: string, metricValue: number): Promise<void> {
    try {
      await prismaDb.recordExecutionMetric({
        execution_id: executionId,
        runner_id: runnerId,
        metric_name: metricName,
        metric_value: metricValue,
      });

      console.log(`📊 Recorded metric ${metricName}=${metricValue} for execution ${executionId}`);
    } catch (error) {
      console.error(`❌ Failed to record metric for execution ${executionId}:`, error);
    }
  }

  private async performHealthChecks(): Promise<void> {
    try {
      const runners = await prismaDb.getTestRunners({ status: 'active' });
      
      console.log(`🏥 Performing health checks on ${runners.length} runners`);

      for (const runner of runners) {
        try {
          await this.checkRunnerHealth(runner);
        } catch (error) {
          console.error(`❌ Health check failed for runner ${runner.name}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Error performing health checks:', error);
    }
  }

  private async checkRunnerHealth(runner: TestRunner): Promise<void> {
    try {
      const startTime = Date.now();
      let healthStatus = 'healthy';
      let responseTime: number | undefined;
      let errorMessage: string | undefined;

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

      await prismaDb.updateTestRunnerHealth(
        runner.id,
        healthStatus,
        responseTime,
        errorMessage
      );

      if (healthStatus === 'healthy') {
        console.log(`💚 Runner ${runner.name} is healthy (${responseTime?.toFixed(0)}ms)`);
      } else {
        console.log(`💔 Runner ${runner.name} is unhealthy: ${errorMessage}`);
      }
    } catch (error) {
      console.error(`❌ Error checking health for runner ${runner.name}:`, error);
    }
  }

  public async getDashboardMetrics() {
    try {
      return await prismaDb.getDashboardMetrics();
    } catch (error) {
      console.error('❌ Error getting dashboard metrics:', error);
      throw error;
    }
  }

  public async cleanup(): Promise<void> {
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