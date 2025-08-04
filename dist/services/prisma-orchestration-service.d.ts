import { ExecutionQueueItem } from '@prisma/client';
export declare class PrismaOrchestrationService {
    private initialized;
    private processingInterval;
    private healthCheckInterval;
    constructor();
    initialize(): Promise<void>;
    private startQueueProcessing;
    private startHealthMonitoring;
    queueExecution(data: {
        execution_id: string;
        test_suite: string;
        environment: string;
        priority?: number;
        estimated_duration?: number;
        requested_runner_type?: string;
        requested_runner_id?: number;
        metadata?: any;
    }): Promise<ExecutionQueueItem>;
    processExecutionQueue(): Promise<void>;
    private getAvailableRunners;
    private selectRunner;
    private assignExecution;
    private triggerExecution;
    private triggerGitHubActions;
    private triggerAzureDevOps;
    private triggerDockerExecution;
    private triggerJenkins;
    markExecutionCompleted(executionId: string): Promise<void>;
    markExecutionFailed(executionId: string, errorMessage?: string): Promise<void>;
    recordExecutionMetric(executionId: string, runnerId: number, metricName: string, metricValue: number): Promise<void>;
    private performHealthChecks;
    private checkRunnerHealth;
    getDashboardMetrics(): Promise<{
        totalRunners: number;
        activeRunners: number;
        healthyRunners: number;
        queuedExecutions: number;
        runningExecutions: number;
        executions24h: number;
    }>;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=prisma-orchestration-service.d.ts.map