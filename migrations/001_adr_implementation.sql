-- ADR-001 Implementation Migration
-- Test Code and Metadata Separation Database Schema
-- Created: 2025-08-03
-- Version: 1.0

-- Backup existing data before migration
-- This script extends the existing database schema without dropping existing tables

-- ====================
-- GIT REPOSITORIES TABLE
-- ====================
CREATE TABLE IF NOT EXISTS git_repositories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    default_branch TEXT DEFAULT 'main',
    webhook_secret TEXT,
    last_sync DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ====================
-- TEST METADATA TABLE
-- ====================
CREATE TABLE IF NOT EXISTS test_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id TEXT UNIQUE NOT NULL,
    file_path TEXT NOT NULL,
    test_name TEXT NOT NULL,
    description TEXT,
    tags TEXT, -- JSON string for tags array
    priority TEXT DEFAULT 'medium',
    owner TEXT,
    repository_id INTEGER,
    line_number INTEGER,
    test_type TEXT DEFAULT 'functional',
    framework TEXT,
    created_from_execution BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repository_id) REFERENCES git_repositories(id) ON DELETE CASCADE
);

-- ====================
-- PLATFORM INTEGRATIONS TABLE
-- ====================
CREATE TABLE IF NOT EXISTS platform_integrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform_type TEXT NOT NULL, -- 'jira', 'ado', 'github', 'gitlab'
    configuration TEXT NOT NULL, -- JSON string for configuration
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ====================
-- TEST EXECUTIONS TABLE
-- ====================
CREATE TABLE IF NOT EXISTS test_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id TEXT NOT NULL,
    execution_id TEXT NOT NULL, -- Platform-specific execution ID
    platform_type TEXT NOT NULL,
    platform_execution_id TEXT,
    status TEXT NOT NULL,
    start_time DATETIME,
    end_time DATETIME,
    duration_ms INTEGER,
    error_message TEXT,
    metadata TEXT, -- JSON string for additional metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES test_metadata(test_id) ON DELETE CASCADE
);

-- ====================
-- TEST FILE CHANGES TABLE
-- ====================
CREATE TABLE IF NOT EXISTS test_file_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repository_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    change_type TEXT NOT NULL, -- 'added', 'modified', 'removed'
    commit_hash TEXT,
    commit_author TEXT,
    commit_message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT 0,
    FOREIGN KEY (repository_id) REFERENCES git_repositories(id) ON DELETE CASCADE
);

-- ====================
-- INDEXES FOR PERFORMANCE
-- ====================

-- Test metadata indexes
CREATE INDEX IF NOT EXISTS idx_test_metadata_test_id ON test_metadata(test_id);
CREATE INDEX IF NOT EXISTS idx_test_metadata_file_path ON test_metadata(file_path);
CREATE INDEX IF NOT EXISTS idx_test_metadata_repository_id ON test_metadata(repository_id);
CREATE INDEX IF NOT EXISTS idx_test_metadata_framework ON test_metadata(framework);
CREATE INDEX IF NOT EXISTS idx_test_metadata_test_type ON test_metadata(test_type);
CREATE INDEX IF NOT EXISTS idx_test_metadata_priority ON test_metadata(priority);

-- Test executions indexes
CREATE INDEX IF NOT EXISTS idx_test_executions_test_id ON test_executions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_executions_platform_type ON test_executions(platform_type);
CREATE INDEX IF NOT EXISTS idx_test_executions_status ON test_executions(status);
CREATE INDEX IF NOT EXISTS idx_test_executions_start_time ON test_executions(start_time);
CREATE INDEX IF NOT EXISTS idx_test_executions_created_at ON test_executions(created_at);

-- Test file changes indexes
CREATE INDEX IF NOT EXISTS idx_test_file_changes_repository_id ON test_file_changes(repository_id);
CREATE INDEX IF NOT EXISTS idx_test_file_changes_processed ON test_file_changes(processed);
CREATE INDEX IF NOT EXISTS idx_test_file_changes_change_type ON test_file_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_test_file_changes_timestamp ON test_file_changes(timestamp);

-- Git repositories indexes
CREATE INDEX IF NOT EXISTS idx_git_repositories_name ON git_repositories(name);
CREATE INDEX IF NOT EXISTS idx_git_repositories_url ON git_repositories(url);

-- Platform integrations indexes
CREATE INDEX IF NOT EXISTS idx_platform_integrations_type ON platform_integrations(platform_type);
CREATE INDEX IF NOT EXISTS idx_platform_integrations_active ON platform_integrations(is_active);

-- ====================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ====================

-- Update test_metadata.updated_at when record is modified
CREATE TRIGGER IF NOT EXISTS trigger_test_metadata_updated_at 
    AFTER UPDATE ON test_metadata
    FOR EACH ROW
BEGIN
    UPDATE test_metadata SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update git_repositories.updated_at when record is modified
CREATE TRIGGER IF NOT EXISTS trigger_git_repositories_updated_at 
    AFTER UPDATE ON git_repositories
    FOR EACH ROW
BEGIN
    UPDATE git_repositories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update platform_integrations.updated_at when record is modified
CREATE TRIGGER IF NOT EXISTS trigger_platform_integrations_updated_at 
    AFTER UPDATE ON platform_integrations
    FOR EACH ROW
BEGIN
    UPDATE platform_integrations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ====================
-- SAMPLE DATA INSERTION
-- ====================

-- Insert default platform integrations if they don't exist
INSERT OR IGNORE INTO platform_integrations (platform_type, configuration, is_active) VALUES 
('jira', '{"enabled": false, "url": "", "username": "", "token": ""}', 0),
('ado', '{"enabled": false, "organization": "", "token": ""}', 0),
('github', '{"enabled": false, "token": "", "owner": "", "repo": ""}', 0),
('gitlab', '{"enabled": false, "url": "", "token": "", "project_id": ""}', 0);

-- ====================
-- MIGRATION VALIDATION
-- ====================

-- Validate that all tables exist
SELECT 
    'git_repositories' as table_name, 
    COUNT(*) as record_count 
FROM git_repositories
UNION ALL
SELECT 
    'test_metadata' as table_name, 
    COUNT(*) as record_count 
FROM test_metadata
UNION ALL
SELECT 
    'platform_integrations' as table_name, 
    COUNT(*) as record_count 
FROM platform_integrations
UNION ALL
SELECT 
    'test_executions' as table_name, 
    COUNT(*) as record_count 
FROM test_executions
UNION ALL
SELECT 
    'test_file_changes' as table_name, 
    COUNT(*) as record_count 
FROM test_file_changes;

-- Check indexes
SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';

-- Check triggers
SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'trigger_%';

-- ====================
-- MIGRATION COMPLETE
-- ====================
-- The ADR-001 TMS schema has been successfully implemented
-- Next steps:
-- 1. Start the application to validate database initialization
-- 2. Register your first Git repository using the API
-- 3. Configure platform integrations
-- 4. Begin test discovery and correlation
