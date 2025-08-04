export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface ApiError {
    error: string;
    details?: string;
    statusCode?: number;
}
export interface User {
    id: number;
    username: string;
    email: string;
    created_at: string;
    last_login?: string;
    is_active: boolean;
}
export interface LoginRequest {
    username: string;
    password: string;
}
export interface LoginResponse {
    success: boolean;
    user?: User;
    message?: string;
    sessionId?: string;
}
export interface TestExecution {
    id: string;
    execution_id: string;
    test_suite: string;
    environment: string;
    status: 'queued' | 'assigned' | 'running' | 'completed' | 'failed' | 'cancelled';
    priority: number;
    created_at: string;
    started_at?: string;
    completed_at?: string;
    assigned_runner_id?: number;
    estimated_duration?: number;
    metadata?: Record<string, any>;
}
export interface TestResult {
    id: string;
    execution_id: string;
    test_name: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error_message?: string;
    stack_trace?: string;
    created_at: string;
}
export interface TestRunner {
    id: number;
    name: string;
    type: 'github-actions' | 'azure-devops' | 'jenkins' | 'gitlab' | 'docker' | 'custom';
    status: 'active' | 'inactive' | 'error' | 'maintenance';
    health_status: 'healthy' | 'unhealthy' | 'unknown';
    endpoint_url?: string;
    webhook_url?: string;
    capabilities: Record<string, any>;
    max_concurrent_jobs: number;
    current_jobs: number;
    priority: number;
    health_check_url?: string;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
    last_health_check?: string;
    utilization_percent?: number;
}
export interface ResourceAllocation {
    id: number;
    execution_id: string;
    runner_id: number;
    cpu_allocated: number;
    memory_allocated: number;
    status: 'allocated' | 'released' | 'exceeded';
    allocated_at: string;
    released_at?: string;
    peak_cpu_usage?: number;
    peak_memory_usage?: number;
}
export interface ExecutionQueueItem {
    id: number;
    execution_id: string;
    test_suite: string;
    environment: string;
    status: 'queued' | 'assigned' | 'running' | 'completed' | 'failed' | 'cancelled';
    priority: number;
    estimated_duration?: number;
    requested_runner_type?: string;
    requested_runner_id?: number;
    assigned_runner_id?: number;
    queued_at: string;
    assigned_at?: string;
    started_at?: string;
    completed_at?: string;
    metadata: Record<string, any>;
    queue_time_minutes?: number;
}
export interface ParallelExecution {
    id: number;
    parent_execution_id: string;
    shard_index: number;
    total_shards: number;
    execution_id: string;
    runner_id?: number;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    shard_webhook_url?: string;
    created_at: string;
    started_at?: string;
    completed_at?: string;
    results?: Record<string, any>;
}
export interface DashboardMetrics {
    activeRunners: number;
    totalRunners: number;
    healthyRunners: number;
    queuedExecutions: number;
    runningExecutions: number;
    activeJobs: number;
    totalCapacity: number;
    executions24h: number;
    avgExecutionTime: number;
}
export interface RunnerSummary {
    active: number;
    inactive: number;
    error: number;
    healthy: number;
    total_active_jobs: number;
    total_capacity: number;
}
export interface QueueSummary {
    total_queued: number;
    running: number;
    avg_queue_time_minutes: number;
}
export interface SystemMetrics {
    executions_24h: number;
    avg_execution_time: number;
    uptime: number;
    memory_usage: NodeJS.MemoryUsage;
    cpu_usage: NodeJS.CpuUsage;
}
export interface WebSocketMessage {
    type: string;
    data: any;
    timestamp: string;
}
export interface ExecutionUpdate {
    execution_id: string;
    status: string;
    progress?: number;
    message?: string;
    runner_id?: number;
    timestamp: string;
}
export interface RunnerHealthUpdate {
    runner_id: number;
    health_status: 'healthy' | 'unhealthy' | 'unknown';
    current_jobs: number;
    utilization_percent: number;
    timestamp: string;
}
export interface ServerConfig {
    port: number;
    sessionSecret: string;
    corsOrigins: string[];
    rateLimitWindow: number;
    rateLimitMax: number;
    webhookToken?: string;
}
export interface DatabaseConfig {
    filename: string;
    migrate: boolean;
    backup: boolean;
}
export interface WebhookPayload {
    executionId: string;
    runId?: string;
    status: 'completed' | 'failed' | 'cancelled';
    results?: TestResult[];
    duration?: number;
    error_message?: string;
    artifacts?: Array<{
        name: string;
        url: string;
        type: string;
    }>;
    metadata?: Record<string, any>;
}
export interface ParallelWebhookPayload extends WebhookPayload {
    shardIndex: number;
    totalShards: number;
    parentExecutionId: string;
}
export interface LoadBalancingRule {
    id: number;
    name: string;
    rule_type: 'round-robin' | 'priority-based' | 'resource-based' | 'custom';
    test_suite_pattern?: string;
    environment_pattern?: string;
    runner_type_filter?: string;
    priority: number;
    active: boolean;
    rule_config: Record<string, any>;
    created_at: string;
    updated_at: string;
}
export interface HealthCheckResponse {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    queue: {
        status: string;
        pending_executions: number;
        avg_queue_time: number;
    };
    runners: {
        status: string;
        total_runners: number;
        active_runners: number;
        healthy_runners: number;
    };
    resources: {
        status: string;
        active_allocations: number;
        exceeded_allocations: number;
    };
    metrics: SystemMetrics;
}
//# sourceMappingURL=api.d.ts.map