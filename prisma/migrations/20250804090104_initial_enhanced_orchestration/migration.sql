-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "test_executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "execution_id" TEXT NOT NULL,
    "test_suite" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "priority" INTEGER NOT NULL DEFAULT 50,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "assigned_runner_id" INTEGER,
    "estimated_duration" INTEGER,
    "metadata" TEXT,
    CONSTRAINT "test_executions_assigned_runner_id_fkey" FOREIGN KEY ("assigned_runner_id") REFERENCES "test_runners" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "test_results" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "execution_id" TEXT NOT NULL,
    "test_name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration" REAL NOT NULL,
    "error_message" TEXT,
    "stack_trace" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "test_results_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "test_executions" ("execution_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "test_runners" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "health_status" TEXT NOT NULL DEFAULT 'unknown',
    "endpoint_url" TEXT,
    "webhook_url" TEXT,
    "capabilities" TEXT,
    "max_concurrent_jobs" INTEGER NOT NULL DEFAULT 1,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "health_check_url" TEXT,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "last_health_check" DATETIME
);

-- CreateTable
CREATE TABLE "execution_queue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "execution_id" TEXT NOT NULL,
    "test_suite" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "priority" INTEGER NOT NULL DEFAULT 50,
    "estimated_duration" INTEGER,
    "requested_runner_type" TEXT,
    "requested_runner_id" INTEGER,
    "assigned_runner_id" INTEGER,
    "queued_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_at" DATETIME,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "metadata" TEXT,
    CONSTRAINT "execution_queue_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "test_executions" ("execution_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "execution_queue_assigned_runner_id_fkey" FOREIGN KEY ("assigned_runner_id") REFERENCES "test_runners" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "resource_allocations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "execution_id" TEXT NOT NULL,
    "runner_id" INTEGER NOT NULL,
    "cpu_allocated" REAL NOT NULL DEFAULT 0,
    "memory_allocated" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'allocated',
    "allocated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" DATETIME,
    "peak_cpu_usage" REAL,
    "peak_memory_usage" INTEGER,
    CONSTRAINT "resource_allocations_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "test_executions" ("execution_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "resource_allocations_runner_id_fkey" FOREIGN KEY ("runner_id") REFERENCES "test_runners" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "execution_metrics" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "execution_id" TEXT NOT NULL,
    "runner_id" INTEGER NOT NULL,
    "metric_name" TEXT NOT NULL,
    "metric_value" REAL NOT NULL,
    "recorded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "execution_metrics_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "test_executions" ("execution_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "runner_health_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "runner_id" INTEGER NOT NULL,
    "health_status" TEXT NOT NULL,
    "response_time" REAL,
    "error_message" TEXT,
    "checked_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "runner_health_history_runner_id_fkey" FOREIGN KEY ("runner_id") REFERENCES "test_runners" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "load_balancing_rules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "rule_type" TEXT NOT NULL,
    "test_suite_pattern" TEXT,
    "environment_pattern" TEXT,
    "runner_type_filter" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "rule_config" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "parallel_executions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "parent_execution_id" TEXT NOT NULL,
    "shard_index" INTEGER NOT NULL,
    "total_shards" INTEGER NOT NULL,
    "execution_id" TEXT NOT NULL,
    "runner_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "shard_webhook_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "results" TEXT,
    CONSTRAINT "parallel_executions_parent_execution_id_fkey" FOREIGN KEY ("parent_execution_id") REFERENCES "test_executions" ("execution_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "parallel_executions_runner_id_fkey" FOREIGN KEY ("runner_id") REFERENCES "test_runners" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ado_configurations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "organization_url" TEXT NOT NULL,
    "personal_access_token" TEXT NOT NULL,
    "project_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "pipeline_runs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pipeline_id" INTEGER NOT NULL,
    "run_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" DATETIME NOT NULL,
    "completed_at" DATETIME,
    "result" TEXT,
    "pipeline_name" TEXT NOT NULL,
    "project_name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "test_failures" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "test_name" TEXT NOT NULL,
    "failure_message" TEXT NOT NULL,
    "stack_trace" TEXT,
    "pipeline_run_id" INTEGER NOT NULL,
    "occurred_at" DATETIME NOT NULL,
    "is_flaky" BOOLEAN NOT NULL DEFAULT false,
    "jira_ticket_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "jira_tickets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticket_key" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "assignee" TEXT,
    "test_failure_ids" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "flaky_tests" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "test_name" TEXT NOT NULL,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "flakiness_percentage" REAL NOT NULL DEFAULT 0,
    "last_failure_date" DATETIME,
    "last_success_date" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'monitoring',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "git_repositories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "branch" TEXT NOT NULL DEFAULT 'main',
    "last_commit" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "test_executions_execution_id_key" ON "test_executions"("execution_id");

-- CreateIndex
CREATE UNIQUE INDEX "test_runners_name_key" ON "test_runners"("name");

-- CreateIndex
CREATE UNIQUE INDEX "execution_queue_execution_id_key" ON "execution_queue"("execution_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_allocations_execution_id_runner_id_key" ON "resource_allocations"("execution_id", "runner_id");

-- CreateIndex
CREATE UNIQUE INDEX "load_balancing_rules_name_key" ON "load_balancing_rules"("name");

-- CreateIndex
CREATE UNIQUE INDEX "parallel_executions_execution_id_key" ON "parallel_executions"("execution_id");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_runs_run_id_key" ON "pipeline_runs"("run_id");

-- CreateIndex
CREATE UNIQUE INDEX "jira_tickets_ticket_key_key" ON "jira_tickets"("ticket_key");

-- CreateIndex
CREATE UNIQUE INDEX "flaky_tests_test_name_key" ON "flaky_tests"("test_name");

-- CreateIndex
CREATE UNIQUE INDEX "git_repositories_name_key" ON "git_repositories"("name");
