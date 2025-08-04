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
import { EventEmitter } from 'events';
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
export declare class EnhancedOrchestrationService extends EventEmitter {
    private readonly prisma;
    private healthCheckInterval;
    private queueProcessorInterval;
    private readonly HEALTH_CHECK_INTERVAL;
    private readonly QUEUE_PROCESSOR_INTERVAL;
    constructor();
    private initialize;
    /**
     * Queue a new test execution request with advanced orchestration
     */
    queueExecution(request: ExecutionRequest): Promise<string>;
    /**
     * Register a new test runner with the orchestration system
     */
    registerRunner(registration: RunnerRegistration): Promise<number>;
    /**
     * Configure load balancing rules for test distribution
     */
    configureLoadBalancing(config: LoadBalancingConfig): Promise<number>;
    /**
     * Advanced queue processing with load balancing and resource management
     */
    private processQueue;
    /**
     * Intelligent runner assignment based on load balancing rules
     */
    private assignRunner;
    /**
     * Find available test runners based on capacity and health
     */
    private findAvailableRunners;
    /**
     * Select optimal runner using load balancing rules
     */
    private selectOptimalRunner;
    /**
     * Check if a load balancing rule applies to the queue item
     */
    private ruleApplies;
    /**
     * Apply specific load balancing rule
     */
    private applyLoadBalancingRule;
    /**
     * Round-robin selection with priority weighting
     */
    private roundRobinSelection;
    /**
     * Select runner based on current resource usage
     */
    private selectByResourceUsage;
    /**
     * Trigger test execution on assigned runner
     */
    private triggerExecution;
    /**
     * Simulate external CI/CD trigger (replace with actual integration)
     */
    private simulateExternalTrigger;
    /**
     * Simulate execution completion (for demo purposes)
     */
    private simulateExecutionCompletion;
    /**
     * Start health checking for all runners
     */
    private startHealthChecking;
    /**
     * Start queue processor
     */
    private startQueueProcessor;
    /**
     * Perform health checks on all active runners
     */
    private performHealthChecks;
    /**
     * Check health of a specific runner
     */
    private checkRunnerHealth;
    /**
     * Get queue status and metrics
     */
    getQueueStatus(): Promise<any>;
    /**
     * Get execution history with filtering and pagination
     */
    getExecutionHistory(options?: {
        limit?: number;
        offset?: number;
        status?: string;
        testSuite?: string;
        environment?: string;
    }): Promise<any>;
    /**
     * Get runner metrics and performance data
     */
    getRunnerMetrics(runnerId?: number): Promise<any>;
    /**
     * Clean shutdown
     */
    shutdown(): Promise<void>;
}
export declare const orchestrationService: EnhancedOrchestrationService;
export default orchestrationService;
//# sourceMappingURL=enhanced-orchestration-service.d.ts.map