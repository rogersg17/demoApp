import { PrismaClient } from '@prisma/client';
export declare class PrismaDatabase {
    private static instance;
    prisma: PrismaClient;
    initialized: boolean;
    private constructor();
    static getInstance(): PrismaDatabase;
    initialize(): Promise<void>;
    private ensureSchemaSync;
    close(): Promise<void>;
    healthCheck(): Promise<boolean>;
    transaction<T>(fn: (prisma: any) => Promise<T>): Promise<T>;
    createUser(data: {
        username: string;
        email: string;
        password: string;
    }): Promise<{
        id: number;
        username: string;
        email: string;
        password: string;
        created_at: Date;
        last_login: Date | null;
        is_active: boolean;
    }>;
    getUserByUsername(username: string): Promise<{
        id: number;
        username: string;
        email: string;
        password: string;
        created_at: Date;
        last_login: Date | null;
        is_active: boolean;
    } | null>;
    getUserByEmail(email: string): Promise<{
        id: number;
        username: string;
        email: string;
        password: string;
        created_at: Date;
        last_login: Date | null;
        is_active: boolean;
    } | null>;
    updateUserLastLogin(userId: number): Promise<{
        id: number;
        username: string;
        email: string;
        password: string;
        created_at: Date;
        last_login: Date | null;
        is_active: boolean;
    }>;
    createTestExecution(data: {
        execution_id: string;
        test_suite: string;
        environment: string;
        status?: string;
        priority?: number;
        estimated_duration?: number;
        assigned_runner_id?: number;
        metadata?: any;
    }): Promise<{
        id: string;
        status: string;
        created_at: Date;
        priority: number;
        execution_id: string;
        metadata: string | null;
        test_suite: string;
        environment: string;
        started_at: Date | null;
        completed_at: Date | null;
        assigned_runner_id: number | null;
        estimated_duration: number | null;
    }>;
    getTestExecution(executionId: string): Promise<({
        results: {
            id: number;
            status: string;
            created_at: Date;
            test_name: string;
            execution_id: string;
            error_message: string | null;
            duration: number;
            stack_trace: string | null;
        }[];
        resource_allocations: {
            id: number;
            status: string;
            execution_id: string;
            runner_id: number;
            cpu_allocated: number;
            memory_allocated: number;
            allocated_at: Date;
            released_at: Date | null;
            peak_cpu_usage: number | null;
            peak_memory_usage: number | null;
        }[];
        assigned_runner: {
            id: number;
            status: string;
            created_at: Date;
            updated_at: Date;
            name: string;
            priority: number;
            metadata: string | null;
            type: string;
            health_status: string;
            endpoint_url: string | null;
            webhook_url: string | null;
            capabilities: string | null;
            max_concurrent_jobs: number;
            health_check_url: string | null;
            last_health_check: Date | null;
        } | null;
        execution_metrics: {
            id: number;
            execution_id: string;
            runner_id: number;
            metric_name: string;
            metric_value: number;
            recorded_at: Date;
        }[];
    } & {
        id: string;
        status: string;
        created_at: Date;
        priority: number;
        execution_id: string;
        metadata: string | null;
        test_suite: string;
        environment: string;
        started_at: Date | null;
        completed_at: Date | null;
        assigned_runner_id: number | null;
        estimated_duration: number | null;
    }) | null>;
    updateTestExecutionStatus(executionId: string, status: string, completedAt?: Date): Promise<{
        id: string;
        status: string;
        created_at: Date;
        priority: number;
        execution_id: string;
        metadata: string | null;
        test_suite: string;
        environment: string;
        started_at: Date | null;
        completed_at: Date | null;
        assigned_runner_id: number | null;
        estimated_duration: number | null;
    }>;
    createTestRunner(data: {
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
    }): Promise<{
        id: number;
        status: string;
        created_at: Date;
        updated_at: Date;
        name: string;
        priority: number;
        metadata: string | null;
        type: string;
        health_status: string;
        endpoint_url: string | null;
        webhook_url: string | null;
        capabilities: string | null;
        max_concurrent_jobs: number;
        health_check_url: string | null;
        last_health_check: Date | null;
    }>;
    getTestRunners(options?: {
        status?: string;
        type?: string;
        orderBy?: 'name' | 'priority' | 'created_at';
        orderDirection?: 'asc' | 'desc';
    }): Promise<{
        id: number;
        status: string;
        created_at: Date;
        updated_at: Date;
        name: string;
        priority: number;
        metadata: string | null;
        type: string;
        health_status: string;
        endpoint_url: string | null;
        webhook_url: string | null;
        capabilities: string | null;
        max_concurrent_jobs: number;
        health_check_url: string | null;
        last_health_check: Date | null;
    }[]>;
    updateTestRunnerHealth(runnerId: number, healthStatus: string, responseTime?: number, errorMessage?: string): Promise<void>;
    queueExecution(data: {
        execution_id: string;
        test_suite: string;
        environment: string;
        priority?: number;
        estimated_duration?: number;
        requested_runner_type?: string;
        requested_runner_id?: number;
        metadata?: any;
    }): Promise<{
        id: number;
        status: string;
        priority: number;
        execution_id: string;
        metadata: string | null;
        test_suite: string;
        environment: string;
        started_at: Date | null;
        completed_at: Date | null;
        assigned_runner_id: number | null;
        estimated_duration: number | null;
        requested_runner_type: string | null;
        requested_runner_id: number | null;
        queued_at: Date;
        assigned_at: Date | null;
    }>;
    getQueuedExecutions(limit?: number): Promise<({
        execution: {
            id: string;
            status: string;
            created_at: Date;
            priority: number;
            execution_id: string;
            metadata: string | null;
            test_suite: string;
            environment: string;
            started_at: Date | null;
            completed_at: Date | null;
            assigned_runner_id: number | null;
            estimated_duration: number | null;
        };
    } & {
        id: number;
        status: string;
        priority: number;
        execution_id: string;
        metadata: string | null;
        test_suite: string;
        environment: string;
        started_at: Date | null;
        completed_at: Date | null;
        assigned_runner_id: number | null;
        estimated_duration: number | null;
        requested_runner_type: string | null;
        requested_runner_id: number | null;
        queued_at: Date;
        assigned_at: Date | null;
    })[]>;
    assignExecutionToRunner(executionId: string, runnerId: number): Promise<{
        id: number;
        status: string;
        priority: number;
        execution_id: string;
        metadata: string | null;
        test_suite: string;
        environment: string;
        started_at: Date | null;
        completed_at: Date | null;
        assigned_runner_id: number | null;
        estimated_duration: number | null;
        requested_runner_type: string | null;
        requested_runner_id: number | null;
        queued_at: Date;
        assigned_at: Date | null;
    }>;
    allocateResources(data: {
        execution_id: string;
        runner_id: number;
        cpu_allocated: number;
        memory_allocated: number;
    }): Promise<{
        id: number;
        status: string;
        execution_id: string;
        runner_id: number;
        cpu_allocated: number;
        memory_allocated: number;
        allocated_at: Date;
        released_at: Date | null;
        peak_cpu_usage: number | null;
        peak_memory_usage: number | null;
    }>;
    releaseResources(executionId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    recordExecutionMetric(data: {
        execution_id: string;
        runner_id: number;
        metric_name: string;
        metric_value: number;
    }): Promise<{
        id: number;
        execution_id: string;
        runner_id: number;
        metric_name: string;
        metric_value: number;
        recorded_at: Date;
    }>;
    createParallelExecution(data: {
        parent_execution_id: string;
        shard_index: number;
        total_shards: number;
        execution_id: string;
        runner_id?: number;
        shard_webhook_url?: string;
    }): Promise<{
        id: number;
        status: string;
        created_at: Date;
        execution_id: string;
        started_at: Date | null;
        completed_at: Date | null;
        runner_id: number | null;
        parent_execution_id: string;
        shard_index: number;
        total_shards: number;
        shard_webhook_url: string | null;
        results: string | null;
    }>;
    getParallelExecutions(parentExecutionId: string): Promise<({
        runner: {
            id: number;
            status: string;
            created_at: Date;
            updated_at: Date;
            name: string;
            priority: number;
            metadata: string | null;
            type: string;
            health_status: string;
            endpoint_url: string | null;
            webhook_url: string | null;
            capabilities: string | null;
            max_concurrent_jobs: number;
            health_check_url: string | null;
            last_health_check: Date | null;
        } | null;
    } & {
        id: number;
        status: string;
        created_at: Date;
        execution_id: string;
        started_at: Date | null;
        completed_at: Date | null;
        runner_id: number | null;
        parent_execution_id: string;
        shard_index: number;
        total_shards: number;
        shard_webhook_url: string | null;
        results: string | null;
    })[]>;
    getDashboardMetrics(): Promise<{
        totalRunners: number;
        activeRunners: number;
        healthyRunners: number;
        queuedExecutions: number;
        runningExecutions: number;
        executions24h: number;
    }>;
    createFlakyTest(data: {
        test_name: string;
        failure_count?: number;
        success_count?: number;
        flakiness_percentage?: number;
    }): Promise<{
        id: number;
        status: string;
        created_at: Date;
        updated_at: Date;
        test_name: string;
        failure_count: number;
        success_count: number;
        flakiness_percentage: number;
        last_failure_date: Date | null;
        last_success_date: Date | null;
    }>;
    getFlakyTests(limit?: number): Promise<{
        id: number;
        status: string;
        created_at: Date;
        updated_at: Date;
        test_name: string;
        failure_count: number;
        success_count: number;
        flakiness_percentage: number;
        last_failure_date: Date | null;
        last_success_date: Date | null;
    }[]>;
    cleanup(): Promise<void>;
}
export declare const prismaDb: PrismaDatabase;
//# sourceMappingURL=prisma-database.d.ts.map