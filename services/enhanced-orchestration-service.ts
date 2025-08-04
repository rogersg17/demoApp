/**
 * Enhanced Orchestration Service with Prisma ORM
 * Week 11-12: Database & ORM Evolution
 * 
 * This service provides enterprise-grade test orchestration with:
 * - Type-safe database operations using Prisma
 * - Advanced scheduling and prioritization
 * - Load balancing across multiple test runners
 * - Real-time monitoring and health checks
 * - Resource allocation management
 * - Parallel execution coordination
 */

import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import prisma from '../lib/prisma';

// Define types for our domain models
interface TestExecution {
  id: string;
  execution_id: string;
  test_suite: string;
  environment: string;
  status: string;
  priority: number;
  created_at: Date;
  started_at?: Date | null;
  completed_at?: Date | null;
  assigned_runner_id?: number | null;
  estimated_duration?: number | null;
  metadata?: string | null;
}

interface TestRunner {
  id: number;
  name: string;
  type: string;
  status: string;
  health_status: string;
  endpoint_url?: string | null;
  webhook_url?: string | null;
  capabilities?: string | null;
  max_concurrent_jobs: number;
  priority: number;
  health_check_url?: string | null;
  metadata?: string | null;
  created_at: Date;
  updated_at: Date;
  last_health_check?: Date | null;
}

interface ExecutionQueueItem {
  id: number;
  execution_id: string;
  test_suite: string;
  environment: string;
  status: string;
  priority: number;
  estimated_duration?: number | null;
  requested_runner_type?: string | null;
  requested_runner_id?: number | null;
  assigned_runner_id?: number | null;
  queued_at: Date;
  assigned_at?: Date | null;
  started_at?: Date | null;
  completed_at?: Date | null;
  metadata?: string | null;
}

interface LoadBalancingRule {
  id: number;
  name: string;
  rule_type: string;
  test_suite_pattern?: string | null;
  environment_pattern?: string | null;
  runner_type_filter?: string | null;
  priority: number;
  active: boolean;
  rule_config?: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ResourceAllocation {
  id: number;
  execution_id: string;
  runner_id: number;
  cpu_allocated: number;
  memory_allocated: number;
  status: string;
  allocated_at: Date;
  released_at?: Date | null;
  peak_cpu_usage?: number | null;
  peak_memory_usage?: number | null;
}

export interface ExecutionRequest {
  testSuite: string;
  environment: string;
  priority?: number;
  requestedRunnerType?: string;
  requestedRunnerId?: number;
  estimatedDuration?: number;
  metadata?: Record<string, any>;
  testFiles?: string[];
  branch?: string;
  commit?: string;
  userId?: string;
  webhookUrl?: string;
}

export interface RunnerRegistration {
  name: string;
  type: 'github-actions' | 'azure-devops' | 'jenkins' | 'gitlab' | 'docker' | 'custom';
  endpointUrl?: string;
  webhookUrl?: string;
  capabilities?: Record<string, any>;
  maxConcurrentJobs?: number;
  priority?: number;
  healthCheckUrl?: string;
  metadata?: Record<string, any>;
}

export interface LoadBalancingConfig {
  name: string;
  ruleType: 'round-robin' | 'priority-based' | 'resource-based' | 'custom';
  testSuitePattern?: string;
  environmentPattern?: string;
  runnerTypeFilter?: string;
  priority?: number;
  ruleConfig?: Record<string, any>;
}

export class EnhancedOrchestrationService extends EventEmitter {
  private readonly prisma: PrismaClient;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private queueProcessorInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly QUEUE_PROCESSOR_INTERVAL = 5000; // 5 seconds

  constructor() {
    super();
    this.prisma = prisma;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    console.log('🚀 Initializing Enhanced Orchestration Service...');
    
    // Start background processes
    this.startHealthChecking();
    this.startQueueProcessor();
    
    console.log('✅ Enhanced Orchestration Service initialized');
  }

  /**
   * Queue a new test execution request with advanced orchestration
   */
  async queueExecution(request: ExecutionRequest): Promise<string> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    try {
      // Create test execution record
      const execution = await this.prisma.testExecution.create({
        data: {
          id: executionId,
          execution_id: executionId,
          test_suite: request.testSuite,
          environment: request.environment,
          status: 'queued',
          priority: request.priority || 50,
          estimated_duration: request.estimatedDuration,
          metadata: JSON.stringify({
            testFiles: request.testFiles || [],
            branch: request.branch || 'main',
            commit: request.commit,
            userId: request.userId,
            webhookUrl: request.webhookUrl,
            ...request.metadata
          })
        }
      });

      // Add to execution queue
      await this.prisma.executionQueueItem.create({
        data: {
          execution_id: executionId,
          test_suite: request.testSuite,
          environment: request.environment,
          priority: request.priority || 50,
          estimated_duration: request.estimatedDuration,
          requested_runner_type: request.requestedRunnerType,
          requested_runner_id: request.requestedRunnerId,
          metadata: JSON.stringify(request.metadata || {})
        }
      });

      console.log(`📋 Queued test execution: ${executionId}`);
      console.log(`   Suite: ${request.testSuite}`);
      console.log(`   Environment: ${request.environment}`);
      console.log(`   Priority: ${request.priority || 50}`);

      // Emit event for real-time updates
      this.emit('executionQueued', { executionId, execution });

      // Trigger immediate queue processing
      this.processQueue();

      return executionId;
    } catch (error) {
      console.error('❌ Error queueing execution:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to queue execution: ${errorMessage}`);
    }
  }

  /**
   * Register a new test runner with the orchestration system
   */
  async registerRunner(registration: RunnerRegistration): Promise<number> {
    try {
      const runner = await this.prisma.testRunner.create({
        data: {
          name: registration.name,
          type: registration.type,
          endpoint_url: registration.endpointUrl,
          webhook_url: registration.webhookUrl,
          capabilities: JSON.stringify(registration.capabilities || {}),
          max_concurrent_jobs: registration.maxConcurrentJobs || 1,
          priority: registration.priority || 50,
          health_check_url: registration.healthCheckUrl,
          metadata: JSON.stringify(registration.metadata || {}),
          status: 'active',
          health_status: 'unknown'
        }
      });

      console.log(`🏃 Registered test runner: ${runner.name} (ID: ${runner.id})`);
      console.log(`   Type: ${runner.type}`);
      console.log(`   Max Concurrent: ${runner.max_concurrent_jobs}`);

      this.emit('runnerRegistered', { runnerId: runner.id, runner });

      return runner.id;
    } catch (error) {
      console.error('❌ Error registering runner:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to register runner: ${errorMessage}`);
    }
  }

  /**
   * Configure load balancing rules for test distribution
   */
  async configureLoadBalancing(config: LoadBalancingConfig): Promise<number> {
    try {
      const rule = await this.prisma.loadBalancingRule.create({
        data: {
          name: config.name,
          rule_type: config.ruleType,
          test_suite_pattern: config.testSuitePattern,
          environment_pattern: config.environmentPattern,
          runner_type_filter: config.runnerTypeFilter,
          priority: config.priority || 50,
          rule_config: JSON.stringify(config.ruleConfig || {}),
          active: true
        }
      });

      console.log(`⚖️ Configured load balancing rule: ${rule.name} (ID: ${rule.id})`);
      console.log(`   Type: ${rule.rule_type}`);

      this.emit('loadBalancingConfigured', { ruleId: rule.id, rule });

      return rule.id;
    } catch (error) {
      console.error('❌ Error configuring load balancing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to configure load balancing: ${errorMessage}`);
    }
  }

  /**
   * Advanced queue processing with load balancing and resource management
   */
  private async processQueue(): Promise<void> {
    try {
      // Get queued items ordered by priority and creation time
      const queuedItems = await this.prisma.executionQueueItem.findMany({
        where: { status: 'queued' },
        orderBy: [
          { priority: 'desc' },
          { queued_at: 'asc' }
        ],
        include: {
          execution: true
        }
      });

      if (queuedItems.length === 0) {
        return;
      }

      console.log(`🔄 Processing queue: ${queuedItems.length} items pending`);

      // Process each queued item
      for (const item of queuedItems) {
        await this.assignRunner(item);
      }
    } catch (error) {
      console.error('❌ Error processing queue:', error);
    }
  }

  /**
   * Intelligent runner assignment based on load balancing rules
   */
  private async assignRunner(queueItem: ExecutionQueueItem & { execution: TestExecution }): Promise<void> {
    try {
      // Find available runners
      const availableRunners = await this.findAvailableRunners(queueItem);
      
      if (availableRunners.length === 0) {
        console.log(`⏳ No available runners for execution: ${queueItem.execution_id}`);
        return;
      }

      // Apply load balancing to select optimal runner
      const selectedRunner = await this.selectOptimalRunner(availableRunners, queueItem);

      if (!selectedRunner) {
        console.log(`🚫 No suitable runner found for execution: ${queueItem.execution_id}`);
        return;
      }

      // Assign runner and update status
      await this.prisma.executionQueueItem.update({
        where: { id: queueItem.id },
        data: {
          status: 'assigned',
          assigned_runner_id: selectedRunner.id,
          assigned_at: new Date()
        }
      });

      await this.prisma.testExecution.update({
        where: { execution_id: queueItem.execution_id },
        data: {
          status: 'assigned',
          assigned_runner_id: selectedRunner.id
        }
      });

      // Create resource allocation record
      await this.prisma.resourceAllocation.create({
        data: {
          execution_id: queueItem.execution_id,
          runner_id: selectedRunner.id,
          cpu_allocated: 1.0, // Default allocation
          memory_allocated: 2048, // 2GB default
          status: 'allocated'
        }
      });

      console.log(`✅ Assigned execution ${queueItem.execution_id} to runner ${selectedRunner.name}`);

      // Emit assignment event
      this.emit('executionAssigned', {
        executionId: queueItem.execution_id,
        runnerId: selectedRunner.id,
        runnerName: selectedRunner.name
      });

      // Trigger test execution on the assigned runner
      await this.triggerExecution(queueItem.execution, selectedRunner);

    } catch (error) {
      console.error(`❌ Error assigning runner for execution ${queueItem.execution_id}:`, error);
    }
  }

  /**
   * Find available test runners based on capacity and health
   */
  private async findAvailableRunners(queueItem: ExecutionQueueItem): Promise<TestRunner[]> {
    // Build where clause based on requirements
    const whereClause: any = {
      status: 'active',
      health_status: { in: ['healthy', 'unknown'] }
    };

    // Filter by requested runner type
    if (queueItem.requested_runner_type) {
      whereClause.type = queueItem.requested_runner_type;
    }

    // Filter by specific runner ID
    if (queueItem.requested_runner_id) {
      whereClause.id = queueItem.requested_runner_id;
    }

    const runners = await this.prisma.testRunner.findMany({
      where: whereClause,
      include: {
        executions: {
          where: { status: { in: ['assigned', 'running'] } }
        }
      }
    });

    // Filter by capacity
    return runners.filter((runner: any) => {
      const activeExecutions = runner.executions.length;
      return activeExecutions < runner.max_concurrent_jobs;
    });
  }

  /**
   * Select optimal runner using load balancing rules
   */
  private async selectOptimalRunner(runners: TestRunner[], queueItem: ExecutionQueueItem): Promise<TestRunner | null> {
    if (runners.length === 0) return null;
    if (runners.length === 1) return runners[0];

    // Get applicable load balancing rules
    const rules = await this.prisma.loadBalancingRule.findMany({
      where: { active: true },
      orderBy: { priority: 'desc' }
    });

    // Apply load balancing rules
    for (const rule of rules) {
      if (this.ruleApplies(rule, queueItem)) {
        return this.applyLoadBalancingRule(rule, runners, queueItem);
      }
    }

    // Default: round-robin with priority
    return this.roundRobinSelection(runners);
  }

  /**
   * Check if a load balancing rule applies to the queue item
   */
  private ruleApplies(rule: LoadBalancingRule, queueItem: ExecutionQueueItem): boolean {
    if (rule.test_suite_pattern && !queueItem.test_suite.match(rule.test_suite_pattern)) {
      return false;
    }
    if (rule.environment_pattern && !queueItem.environment.match(rule.environment_pattern)) {
      return false;
    }
    if (rule.runner_type_filter && queueItem.requested_runner_type !== rule.runner_type_filter) {
      return false;
    }
    return true;
  }

  /**
   * Apply specific load balancing rule
   */
  private async applyLoadBalancingRule(rule: LoadBalancingRule, runners: TestRunner[], queueItem: ExecutionQueueItem): Promise<TestRunner> {
    switch (rule.rule_type) {
      case 'priority-based':
        return runners.sort((a, b) => b.priority - a.priority)[0];
      
      case 'resource-based':
        return this.selectByResourceUsage(runners);
      
      case 'round-robin':
      default:
        return this.roundRobinSelection(runners);
    }
  }

  /**
   * Round-robin selection with priority weighting
   */
  private roundRobinSelection(runners: TestRunner[]): TestRunner {
    // Simple round-robin for now - can be enhanced with persistent state
    const sortedRunners = runners.sort((a, b) => b.priority - a.priority);
    return sortedRunners[0];
  }

  /**
   * Select runner based on current resource usage
   */
  private async selectByResourceUsage(runners: TestRunner[]): Promise<TestRunner> {
    const runnerUsage = await Promise.all(
      runners.map(async runner => {
        const allocations = await this.prisma.resourceAllocation.findMany({
          where: {
            runner_id: runner.id,
            status: 'allocated'
          }
        });

        const totalCpuUsage = allocations.reduce((sum: number, alloc: any) => sum + alloc.cpu_allocated, 0);
        const totalMemoryUsage = allocations.reduce((sum: number, alloc: any) => sum + alloc.memory_allocated, 0);

        return {
          runner,
          cpuUsage: totalCpuUsage,
          memoryUsage: totalMemoryUsage,
          load: totalCpuUsage + (totalMemoryUsage / 1024) // Simple load calculation
        };
      })
    );

    // Select runner with lowest load
    return runnerUsage.sort((a, b) => a.load - b.load)[0].runner;
  }

  /**
   * Trigger test execution on assigned runner
   */
  private async triggerExecution(execution: TestExecution, runner: TestRunner): Promise<void> {
    try {
      const metadata = JSON.parse(execution.metadata || '{}');
      
      // Update execution status
      await this.prisma.testExecution.update({
        where: { execution_id: execution.execution_id },
        data: { 
          status: 'running',
          started_at: new Date()
        }
      });

      // Update queue item status
      await this.prisma.executionQueueItem.update({
        where: { execution_id: execution.execution_id },
        data: { 
          status: 'running',
          started_at: new Date()
        }
      });

      console.log(`🚀 Triggered execution ${execution.execution_id} on runner ${runner.name}`);

      // Emit execution started event
      this.emit('executionStarted', {
        executionId: execution.execution_id,
        runnerId: runner.id,
        runnerName: runner.name,
        runnerType: runner.type
      });

      // Here you would integrate with the actual CI/CD system
      // For now, we'll simulate the trigger
      this.simulateExternalTrigger(execution, runner, metadata);

    } catch (error) {
      console.error(`❌ Error triggering execution ${execution.execution_id}:`, error);
      
      // Update status to failed
      await this.prisma.testExecution.update({
        where: { execution_id: execution.execution_id },
        data: { status: 'failed' }
      });
    }
  }

  /**
   * Simulate external CI/CD trigger (replace with actual integration)
   */
  private simulateExternalTrigger(execution: TestExecution, runner: TestRunner, metadata: any): void {
    // This would be replaced with actual CI/CD API calls
    console.log(`🎭 Simulating ${runner.type} trigger for execution ${execution.execution_id}`);
    
    // Simulate completion after a delay
    setTimeout(() => {
      this.simulateExecutionCompletion(execution.execution_id, 'completed');
    }, 10000); // 10 seconds for demo
  }

  /**
   * Simulate execution completion (for demo purposes)
   */
  private async simulateExecutionCompletion(executionId: string, status: 'completed' | 'failed'): Promise<void> {
    try {
      await this.prisma.testExecution.update({
        where: { execution_id: executionId },
        data: {
          status,
          completed_at: new Date()
        }
      });

      await this.prisma.executionQueueItem.update({
        where: { execution_id: executionId },
        data: {
          status,
          completed_at: new Date()
        }
      });

      // Release resources
      await this.prisma.resourceAllocation.updateMany({
        where: { execution_id: executionId },
        data: {
          status: 'released',
          released_at: new Date()
        }
      });

      console.log(`✅ Execution ${executionId} completed with status: ${status}`);

      this.emit('executionCompleted', { executionId, status });
    } catch (error) {
      console.error(`❌ Error completing execution ${executionId}:`, error);
    }
  }

  /**
   * Start health checking for all runners
   */
  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);

    console.log('🏥 Started health checking service');
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    this.queueProcessorInterval = setInterval(async () => {
      await this.processQueue();
    }, this.QUEUE_PROCESSOR_INTERVAL);

    console.log('🔄 Started queue processor');
  }

  /**
   * Perform health checks on all active runners
   */
  private async performHealthChecks(): Promise<void> {
    try {
      const runners = await this.prisma.testRunner.findMany({
        where: { status: 'active' }
      });

      for (const runner of runners) {
        await this.checkRunnerHealth(runner);
      }
    } catch (error) {
      console.error('❌ Error performing health checks:', error);
    }
  }

  /**
   * Check health of a specific runner
   */
  private async checkRunnerHealth(runner: TestRunner): Promise<void> {
    try {
      let healthStatus = 'unknown';
      let responseTime: number | null = null;
      let errorMessage: string | null = null;

      if (runner.health_check_url) {
        const startTime = Date.now();
        
        try {
          // Simulate health check (replace with actual HTTP call)
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
          responseTime = Date.now() - startTime;
          healthStatus = 'healthy';
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errorMessage = errorMsg;
          healthStatus = 'unhealthy';
        }
      }

      // Update runner health status
      await this.prisma.testRunner.update({
        where: { id: runner.id },
        data: {
          health_status: healthStatus,
          last_health_check: new Date()
        }
      });

      // Record health history
      await this.prisma.runnerHealthHistory.create({
        data: {
          runner_id: runner.id,
          health_status: healthStatus,
          response_time: responseTime,
          error_message: errorMessage
        }
      });

      if (healthStatus === 'unhealthy') {
        console.log(`⚠️ Runner ${runner.name} is unhealthy: ${errorMessage}`);
        this.emit('runnerUnhealthy', { runnerId: runner.id, runnerName: runner.name, error: errorMessage });
      }

    } catch (error) {
      console.error(`❌ Error checking health for runner ${runner.name}:`, error);
    }
  }

  /**
   * Get queue status and metrics
   */
  async getQueueStatus(): Promise<any> {
    try {
      const queuedCount = await this.prisma.executionQueueItem.count({
        where: { status: 'queued' }
      });

      const assignedCount = await this.prisma.executionQueueItem.count({
        where: { status: 'assigned' }
      });

      const runningCount = await this.prisma.executionQueueItem.count({
        where: { status: 'running' }
      });

      const activeRunners = await this.prisma.testRunner.count({
        where: { 
          status: 'active',
          health_status: { in: ['healthy', 'unknown'] }
        }
      });

      const totalCapacity = await this.prisma.testRunner.aggregate({
        where: { 
          status: 'active',
          health_status: { in: ['healthy', 'unknown'] }
        },
        _sum: { max_concurrent_jobs: true }
      });

      return {
        queue: {
          queued: queuedCount,
          assigned: assignedCount,
          running: runningCount,
          total: queuedCount + assignedCount + runningCount
        },
        runners: {
          active: activeRunners,
          totalCapacity: totalCapacity._sum.max_concurrent_jobs || 0,
          utilizationRate: totalCapacity._sum.max_concurrent_jobs 
            ? (runningCount / totalCapacity._sum.max_concurrent_jobs) * 100 
            : 0
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting queue status:', error);
      throw error;
    }
  }

  /**
   * Get execution history with filtering and pagination
   */
  async getExecutionHistory(options: {
    limit?: number;
    offset?: number;
    status?: string;
    testSuite?: string;
    environment?: string;
  } = {}): Promise<any> {
    try {
      const whereClause: any = {};
      
      if (options.status) {
        whereClause.status = options.status;
      }
      if (options.testSuite) {
        whereClause.test_suite = options.testSuite;
      }
      if (options.environment) {
        whereClause.environment = options.environment;
      }

      const executions = await this.prisma.testExecution.findMany({
        where: whereClause,
        include: {
          assigned_runner: {
            select: { id: true, name: true, type: true }
          },
          results: true,
          resource_allocations: true
        },
        orderBy: { created_at: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0
      });

      const totalCount = await this.prisma.testExecution.count({
        where: whereClause
      });

      return {
        executions: executions.map((exec: any) => ({
          ...exec,
          metadata: JSON.parse(exec.metadata || '{}')
        })),
        pagination: {
          total: totalCount,
          limit: options.limit || 50,
          offset: options.offset || 0,
          hasMore: totalCount > (options.offset || 0) + executions.length
        }
      };
    } catch (error) {
      console.error('❌ Error getting execution history:', error);
      throw error;
    }
  }

  /**
   * Get runner metrics and performance data
   */
  async getRunnerMetrics(runnerId?: number): Promise<any> {
    try {
      const whereClause = runnerId ? { runner_id: runnerId } : {};

      const metrics = await this.prisma.executionMetric.findMany({
        where: whereClause,
        include: {
          execution: {
            include: {
              assigned_runner: {
                select: { id: true, name: true, type: true }
              }
            }
          }
        },
        orderBy: { recorded_at: 'desc' },
        take: 100
      });

      const healthHistory = await this.prisma.runnerHealthHistory.findMany({
        where: runnerId ? { runner_id: runnerId } : {},
        include: {
          runner: {
            select: { id: true, name: true, type: true }
          }
        },
        orderBy: { checked_at: 'desc' },
        take: 50
      });

      return {
        performanceMetrics: metrics,
        healthHistory,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting runner metrics:', error);
      throw error;
    }
  }

  /**
   * Clean shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Enhanced Orchestration Service...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.queueProcessorInterval) {
      clearInterval(this.queueProcessorInterval);
    }

    await this.prisma.$disconnect();
    console.log('✅ Enhanced Orchestration Service shutdown complete');
  }
}

// Export singleton instance
export const orchestrationService = new EnhancedOrchestrationService();
export default orchestrationService;
