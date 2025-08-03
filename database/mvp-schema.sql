-- MVP Database Schema for Azure DevOps Integration
-- Week 3: Core ADO integration tables

-- Table: mvp_pipeline_configs
-- Stores configuration for monitored ADO pipelines
CREATE TABLE IF NOT EXISTS mvp_pipeline_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Basic identification
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT 1,
    
    -- ADO connection details
    ado_organization_url TEXT NOT NULL,
    ado_project_id TEXT NOT NULL,
    ado_project_name TEXT NOT NULL,
    
    -- Build definition details
    build_definition_id INTEGER NOT NULL,
    build_definition_name TEXT NOT NULL,
    build_definition_path TEXT,
    
    -- Monitoring configuration
    polling_interval_minutes INTEGER DEFAULT 5,
    monitor_enabled BOOLEAN DEFAULT 1,
    failure_threshold INTEGER DEFAULT 1,
    
    -- JIRA integration settings
    jira_project_key TEXT,
    jira_issue_type TEXT DEFAULT 'Bug',
    auto_create_issues BOOLEAN DEFAULT 1,
    
    -- Notification settings
    webhook_url TEXT,
    notification_enabled BOOLEAN DEFAULT 1,
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    last_monitored_at DATETIME,
    
    -- Constraints
    UNIQUE(ado_organization_url, ado_project_id, build_definition_id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Table: mvp_test_failures
-- Stores test failure information from ADO builds
CREATE TABLE IF NOT EXISTS mvp_test_failures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Pipeline reference
    pipeline_config_id INTEGER NOT NULL,
    
    -- ADO build information
    ado_build_id INTEGER NOT NULL,
    ado_build_number TEXT NOT NULL,
    ado_build_status TEXT NOT NULL,
    ado_build_result TEXT,
    ado_build_url TEXT,
    ado_build_started_at DATETIME,
    ado_build_finished_at DATETIME,
    
    -- Test failure details
    test_run_id INTEGER,
    test_case_id INTEGER,
    test_name TEXT NOT NULL,
    test_class_name TEXT,
    test_method_name TEXT,
    test_file_path TEXT,
    
    -- Failure information
    failure_type TEXT, -- 'failed', 'error', 'timeout', etc.
    failure_message TEXT,
    failure_stack_trace TEXT,
    failure_category TEXT, -- 'assertion', 'timeout', 'network', etc.
    
    -- Context information
    branch_name TEXT,
    commit_sha TEXT,
    commit_message TEXT,
    environment TEXT,
    
    -- Correlation with existing data
    test_metadata_id INTEGER, -- Link to existing test metadata
    correlation_confidence REAL DEFAULT 0.0,
    
    -- Processing status
    processed BOOLEAN DEFAULT 0,
    jira_issue_created BOOLEAN DEFAULT 0,
    duplicate_of INTEGER, -- References another failure record
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (pipeline_config_id) REFERENCES mvp_pipeline_configs(id) ON DELETE CASCADE,
    FOREIGN KEY (test_metadata_id) REFERENCES test_metadata(id),
    FOREIGN KEY (duplicate_of) REFERENCES mvp_test_failures(id)
);

-- Table: mvp_jira_ado_links
-- Links JIRA issues with ADO test failures
CREATE TABLE IF NOT EXISTS mvp_jira_ado_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- JIRA information
    jira_issue_key TEXT NOT NULL,
    jira_issue_id TEXT,
    jira_project_key TEXT NOT NULL,
    jira_issue_type TEXT,
    jira_issue_status TEXT,
    jira_issue_url TEXT,
    
    -- ADO failure reference
    test_failure_id INTEGER NOT NULL,
    pipeline_config_id INTEGER NOT NULL,
    
    -- Link metadata
    link_type TEXT DEFAULT 'auto_created', -- 'auto_created', 'manual_linked', 'duplicate_merged'
    created_by_automation BOOLEAN DEFAULT 1,
    
    -- Issue context
    issue_title TEXT,
    issue_description TEXT,
    issue_priority TEXT,
    issue_assignee TEXT,
    
    -- Resolution tracking
    resolved BOOLEAN DEFAULT 0,
    resolved_at DATETIME,
    resolution_type TEXT, -- 'fixed', 'duplicate', 'wont_fix', etc.
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (test_failure_id) REFERENCES mvp_test_failures(id) ON DELETE CASCADE,
    FOREIGN KEY (pipeline_config_id) REFERENCES mvp_pipeline_configs(id) ON DELETE CASCADE,
    UNIQUE(jira_issue_key, test_failure_id)
);

-- Table: mvp_build_monitoring_log
-- Logs build monitoring activities and status
CREATE TABLE IF NOT EXISTS mvp_build_monitoring_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Pipeline reference
    pipeline_config_id INTEGER NOT NULL,
    
    -- Monitoring event
    event_type TEXT NOT NULL, -- 'poll_started', 'build_detected', 'build_processed', 'error'
    event_status TEXT NOT NULL, -- 'success', 'warning', 'error'
    event_message TEXT,
    event_details TEXT, -- JSON string with additional details
    
    -- Build context (if applicable)
    ado_build_id INTEGER,
    ado_build_number TEXT,
    
    -- Performance metrics
    processing_duration_ms INTEGER,
    api_calls_made INTEGER,
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (pipeline_config_id) REFERENCES mvp_pipeline_configs(id) ON DELETE CASCADE
);

-- Indexes for performance optimization

-- Pipeline configs indexes
CREATE INDEX IF NOT EXISTS idx_mvp_pipeline_configs_active ON mvp_pipeline_configs(active);
CREATE INDEX IF NOT EXISTS idx_mvp_pipeline_configs_monitor_enabled ON mvp_pipeline_configs(monitor_enabled);
CREATE INDEX IF NOT EXISTS idx_mvp_pipeline_configs_ado_org_project ON mvp_pipeline_configs(ado_organization_url, ado_project_id);
CREATE INDEX IF NOT EXISTS idx_mvp_pipeline_configs_build_def ON mvp_pipeline_configs(build_definition_id);

-- Test failures indexes
CREATE INDEX IF NOT EXISTS idx_mvp_test_failures_pipeline_config ON mvp_test_failures(pipeline_config_id);
CREATE INDEX IF NOT EXISTS idx_mvp_test_failures_ado_build ON mvp_test_failures(ado_build_id);
CREATE INDEX IF NOT EXISTS idx_mvp_test_failures_processed ON mvp_test_failures(processed);
CREATE INDEX IF NOT EXISTS idx_mvp_test_failures_jira_created ON mvp_test_failures(jira_issue_created);
CREATE INDEX IF NOT EXISTS idx_mvp_test_failures_test_name ON mvp_test_failures(test_name);
CREATE INDEX IF NOT EXISTS idx_mvp_test_failures_created_at ON mvp_test_failures(created_at);
CREATE INDEX IF NOT EXISTS idx_mvp_test_failures_duplicate ON mvp_test_failures(duplicate_of);

-- JIRA-ADO links indexes
CREATE INDEX IF NOT EXISTS idx_mvp_jira_ado_links_jira_key ON mvp_jira_ado_links(jira_issue_key);
CREATE INDEX IF NOT EXISTS idx_mvp_jira_ado_links_test_failure ON mvp_jira_ado_links(test_failure_id);
CREATE INDEX IF NOT EXISTS idx_mvp_jira_ado_links_pipeline_config ON mvp_jira_ado_links(pipeline_config_id);
CREATE INDEX IF NOT EXISTS idx_mvp_jira_ado_links_resolved ON mvp_jira_ado_links(resolved);

-- Monitoring log indexes
CREATE INDEX IF NOT EXISTS idx_mvp_monitoring_log_pipeline_config ON mvp_build_monitoring_log(pipeline_config_id);
CREATE INDEX IF NOT EXISTS idx_mvp_monitoring_log_event_type ON mvp_build_monitoring_log(event_type);
CREATE INDEX IF NOT EXISTS idx_mvp_monitoring_log_created_at ON mvp_build_monitoring_log(created_at);
CREATE INDEX IF NOT EXISTS idx_mvp_monitoring_log_ado_build ON mvp_build_monitoring_log(ado_build_id);

-- Views for common queries

-- View: Pipeline health summary
CREATE VIEW IF NOT EXISTS mvp_pipeline_health_summary AS
SELECT 
    pc.id as pipeline_config_id,
    pc.name as pipeline_name,
    pc.ado_project_name,
    pc.build_definition_name,
    pc.active,
    pc.monitor_enabled,
    pc.last_monitored_at,
    COUNT(tf.id) as total_failures,
    COUNT(CASE WHEN tf.created_at > datetime('now', '-24 hours') THEN 1 END) as failures_24h,
    COUNT(CASE WHEN tf.created_at > datetime('now', '-7 days') THEN 1 END) as failures_7d,
    COUNT(CASE WHEN tf.jira_issue_created = 1 THEN 1 END) as jira_issues_created,
    MAX(tf.created_at) as last_failure_at
FROM mvp_pipeline_configs pc
LEFT JOIN mvp_test_failures tf ON pc.id = tf.pipeline_config_id
GROUP BY pc.id, pc.name, pc.ado_project_name, pc.build_definition_name, pc.active, pc.monitor_enabled, pc.last_monitored_at;

-- View: Recent test failures with JIRA status
CREATE VIEW IF NOT EXISTS mvp_recent_failures_with_jira AS
SELECT 
    tf.id,
    tf.test_name,
    tf.failure_type,
    tf.failure_message,
    tf.ado_build_number,
    tf.ado_build_url,
    tf.branch_name,
    tf.created_at as failure_time,
    pc.name as pipeline_name,
    pc.ado_project_name,
    jal.jira_issue_key,
    jal.jira_issue_status,
    jal.jira_issue_url,
    CASE 
        WHEN jal.id IS NOT NULL THEN 'JIRA Issue Created'
        WHEN tf.duplicate_of IS NOT NULL THEN 'Duplicate Failure'
        WHEN tf.processed = 1 THEN 'Processed - No Issue Created'
        ELSE 'Pending Processing'
    END as jira_status
FROM mvp_test_failures tf
JOIN mvp_pipeline_configs pc ON tf.pipeline_config_id = pc.id
LEFT JOIN mvp_jira_ado_links jal ON tf.id = jal.test_failure_id
WHERE tf.created_at > datetime('now', '-30 days')
ORDER BY tf.created_at DESC;
