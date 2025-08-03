#!/bin/bash
# Test Management Platform - Production Startup Script
# Week 8 Production Deployment

set -e

echo "🚀 Starting Test Management Platform MVP..."

# Configuration
DEPLOYMENT_DIR="/app"
DATABASE_PATH="/app/data/app.db"
LOG_FILE="/app/logs/startup.log"
PID_FILE="/app/tms.pid"

# Create necessary directories
mkdir -p /app/data /app/logs /app/backups

# Setup logging
exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log "=== TMS MVP Production Startup ==="

# Check if already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        log "ERROR: TMS is already running with PID $OLD_PID"
        exit 1
    else
        log "Removing stale PID file"
        rm -f "$PID_FILE"
    fi
fi

# Environment validation
log "Checking environment..."

# Check required environment variables
REQUIRED_VARS=("NODE_ENV" "PORT")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        log "ERROR: Required environment variable $var is not set"
        exit 1
    fi
done

log "Environment validated - NODE_ENV: $NODE_ENV, PORT: $PORT"

# Database initialization
log "Initializing database..."
if [ ! -f "$DATABASE_PATH" ]; then
    log "Creating new database..."
    touch "$DATABASE_PATH"
    
    # Run migration script if available
    if [ -f "/app/deployment/migrate-database.sh" ]; then
        log "Running database migration..."
        /app/deployment/migrate-database.sh
    fi
else
    log "Using existing database: $DATABASE_PATH"
fi

# Set proper permissions
chmod 664 "$DATABASE_PATH"
log "Database permissions set"

# Performance tuning
log "Applying performance settings..."

# Set Node.js memory limits for production
export NODE_OPTIONS="--max-old-space-size=1024 --optimize-for-size"

# Set UV_THREADPOOL_SIZE for better I/O performance
export UV_THREADPOOL_SIZE=16

log "Performance settings applied"

# Frontend build check
if [ -d "/app/frontend/dist" ] && [ "$(ls -A /app/frontend/dist)" ]; then
    log "Frontend build found"
else
    log "WARNING: Frontend build not found, building now..."
    cd /app/frontend
    npm run build
    cd /app
    log "Frontend build completed"
fi

# Health check setup
log "Setting up health monitoring..."
if [ -f "/app/deployment/monitor-health.sh" ]; then
    # Start health monitoring in background
    (
        while true; do
            sleep 60
            /app/deployment/monitor-health.sh > /dev/null 2>&1 || true
        done
    ) &
    MONITOR_PID=$!
    log "Health monitoring started with PID $MONITOR_PID"
fi

# Start the application
log "Starting TMS application..."
cd /app

# Start Node.js application
node server.js &
APP_PID=$!

# Store PID
echo "$APP_PID" > "$PID_FILE"

log "TMS MVP started successfully with PID $APP_PID"

# Wait for application to be ready
log "Waiting for application to be ready..."
for i in {1..30}; do
    if curl -f http://localhost:${PORT}/api/health >/dev/null 2>&1; then
        log "✅ Application is ready and healthy!"
        break
    fi
    
    if [ $i -eq 30 ]; then
        log "❌ Application failed to start within 30 seconds"
        kill $APP_PID 2>/dev/null || true
        rm -f "$PID_FILE"
        exit 1
    fi
    
    sleep 1
done

# Display startup summary
log "=== Startup Summary ==="
log "Application PID: $APP_PID"
log "Database: $DATABASE_PATH"
log "Logs: $LOG_FILE"
log "Health endpoint: http://localhost:${PORT}/api/health"
log "Dashboard: http://localhost:${PORT}/"

# Keep the script running to maintain the process
log "TMS MVP is running. Press Ctrl+C to stop."

# Trap signals for graceful shutdown
trap 'log "Received shutdown signal..."; kill $APP_PID 2>/dev/null || true; rm -f "$PID_FILE"; exit 0' SIGTERM SIGINT

# Wait for the application process
wait $APP_PID
