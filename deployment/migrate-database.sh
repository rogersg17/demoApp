#!/bin/bash
# Test Management Platform - Database Migration Script
# Run this script to migrate database to production version

set -e

echo "🔄 Starting database migration for TMS MVP..."

# Configuration
BACKUP_DIR="/app/backups"
DATABASE_PATH="/app/data/app.db"
MIGRATION_DIR="/app/migrations"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup existing database if it exists
if [ -f "$DATABASE_PATH" ]; then
    echo "📦 Creating database backup..."
    cp "$DATABASE_PATH" "$BACKUP_DIR/app_backup_$TIMESTAMP.db"
    echo "✅ Database backed up to: $BACKUP_DIR/app_backup_$TIMESTAMP.db"
fi

# Apply migrations
echo "🔄 Applying database migrations..."

# Check if database exists, if not create it
if [ ! -f "$DATABASE_PATH" ]; then
    echo "📄 Creating new database..."
    touch "$DATABASE_PATH"
fi

# Apply MVP schema
echo "📊 Applying MVP schema..."
sqlite3 "$DATABASE_PATH" < "$MIGRATION_DIR/001_adr_implementation.sql" || true

# Apply MVP specific tables
echo "📊 Creating MVP tables..."
sqlite3 "$DATABASE_PATH" << 'EOF'
-- MVP Pipeline Configurations
CREATE TABLE IF NOT EXISTS mvp_pipeline_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ado_organization TEXT NOT NULL,
    ado_project TEXT NOT NULL,
    build_definition_id INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    jira_project_key TEXT,
    notification_settings TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- MVP Test Failures
CREATE TABLE IF NOT EXISTS mvp_test_failures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pipeline_config_id INTEGER,
    build_id TEXT NOT NULL,
    test_name TEXT NOT NULL,
    test_file TEXT,
    failure_message TEXT,
    stack_trace TEXT,
    build_url TEXT,
    failure_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'new',
    jira_issue_key TEXT,
    correlation_id TEXT,
    FOREIGN KEY (pipeline_config_id) REFERENCES mvp_pipeline_configs(id)
);

-- MVP JIRA-ADO Links
CREATE TABLE IF NOT EXISTS mvp_jira_ado_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jira_issue_key TEXT NOT NULL,
    ado_build_id TEXT NOT NULL,
    test_failure_id INTEGER,
    link_type TEXT DEFAULT 'automatic',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_failure_id) REFERENCES mvp_test_failures(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mvp_failures_pipeline ON mvp_test_failures(pipeline_config_id);
CREATE INDEX IF NOT EXISTS idx_mvp_failures_build ON mvp_test_failures(build_id);
CREATE INDEX IF NOT EXISTS idx_mvp_failures_status ON mvp_test_failures(status);
CREATE INDEX IF NOT EXISTS idx_mvp_links_jira ON mvp_jira_ado_links(jira_issue_key);
CREATE INDEX IF NOT EXISTS idx_mvp_links_build ON mvp_jira_ado_links(ado_build_id);

-- Insert initial system configuration
INSERT OR IGNORE INTO system_config (key, value, description) VALUES
('mvp_version', '1.0.0', 'MVP version identifier'),
('deployment_date', datetime('now'), 'Production deployment timestamp'),
('pipeline_monitor_interval', '300000', 'Pipeline monitoring interval in milliseconds'),
('max_pipelines', '100', 'Maximum number of pipelines to monitor'),
('cache_ttl', '300000', 'Cache time-to-live in milliseconds');

EOF

echo "✅ Database migration completed successfully!"

# Verify migration
echo "🔍 Verifying database integrity..."
sqlite3 "$DATABASE_PATH" "PRAGMA integrity_check;" > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ Database integrity check passed!"
else
    echo "❌ Database integrity check failed!"
    exit 1
fi

# Set proper permissions
chmod 664 "$DATABASE_PATH"

echo "🎉 Database migration completed successfully!"
echo "📊 Database location: $DATABASE_PATH"
echo "📦 Backup location: $BACKUP_DIR/app_backup_$TIMESTAMP.db"
