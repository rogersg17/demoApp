#!/bin/bash
# Test Management Platform - Production Health Monitor
# Continuous monitoring script for production deployment

set -e

# Configuration
HEALTH_URL="http://localhost:3000/api/health"
METRICS_URL="http://localhost:9090/metrics"
LOG_FILE="/app/logs/health-monitor.log"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=80
ALERT_THRESHOLD_RESPONSE_TIME=2000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Health check function
check_health() {
    local start_time=$(date +%s%3N)
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    if [ "$response" = "200" ]; then
        if [ "$response_time" -gt "$ALERT_THRESHOLD_RESPONSE_TIME" ]; then
            log "${YELLOW}WARNING: Health check slow - ${response_time}ms${NC}"
            return 1
        else
            log "${GREEN}HEALTHY: Response time ${response_time}ms${NC}"
            return 0
        fi
    else
        log "${RED}CRITICAL: Health check failed - HTTP $response${NC}"
        return 2
    fi
}

# Resource monitoring
check_resources() {
    local container_stats=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemPerc}}" | grep tms-mvp)
    
    if [ -n "$container_stats" ]; then
        local cpu_usage=$(echo "$container_stats" | awk '{print $2}' | sed 's/%//')
        local mem_usage=$(echo "$container_stats" | awk '{print $3}' | sed 's/%//')
        
        cpu_usage=${cpu_usage%.*}  # Remove decimal part
        mem_usage=${mem_usage%.*}  # Remove decimal part
        
        log "Resource Usage - CPU: ${cpu_usage}%, Memory: ${mem_usage}%"
        
        if [ "$cpu_usage" -gt "$ALERT_THRESHOLD_CPU" ]; then
            log "${YELLOW}WARNING: High CPU usage - ${cpu_usage}%${NC}"
        fi
        
        if [ "$mem_usage" -gt "$ALERT_THRESHOLD_MEMORY" ]; then
            log "${YELLOW}WARNING: High memory usage - ${mem_usage}%${NC}"
        fi
    else
        log "${RED}ERROR: Cannot get container stats${NC}"
    fi
}

# Database check
check_database() {
    local db_check=$(docker exec tms-mvp sqlite3 /app/data/app.db "PRAGMA integrity_check;" 2>/dev/null || echo "error")
    
    if [ "$db_check" = "ok" ]; then
        log "${GREEN}DATABASE: Integrity check passed${NC}"
        return 0
    else
        log "${RED}CRITICAL: Database integrity check failed${NC}"
        return 1
    fi
}

# Service availability check
check_services() {
    local services=("tms-app" "tms-nginx")
    local failed_services=()
    
    for service in "${services[@]}"; do
        local status=$(docker-compose ps -q "$service" 2>/dev/null)
        if [ -z "$status" ]; then
            failed_services+=("$service")
        fi
    done
    
    if [ ${#failed_services[@]} -eq 0 ]; then
        log "${GREEN}SERVICES: All services running${NC}"
        return 0
    else
        log "${RED}CRITICAL: Failed services: ${failed_services[*]}${NC}"
        return 1
    fi
}

# WebSocket check
check_websocket() {
    local ws_test=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/socket.io/?EIO=4&transport=polling" 2>/dev/null || echo "000")
    
    if [ "$ws_test" = "200" ]; then
        log "${GREEN}WEBSOCKET: Connection available${NC}"
        return 0
    else
        log "${YELLOW}WARNING: WebSocket connection issue${NC}"
        return 1
    fi
}

# Main monitoring loop
main() {
    log "Starting health monitoring..."
    
    local health_status=0
    local service_status=0
    local db_status=0
    local ws_status=0
    
    # Run checks
    check_health || health_status=$?
    check_services || service_status=$?
    check_database || db_status=$?
    check_websocket || ws_status=$?
    check_resources
    
    # Overall status
    local overall_status=$((health_status + service_status + db_status))
    
    if [ "$overall_status" -eq 0 ]; then
        log "${GREEN}OVERALL STATUS: HEALTHY${NC}"
        exit 0
    elif [ "$overall_status" -lt 4 ]; then
        log "${YELLOW}OVERALL STATUS: WARNING${NC}"
        exit 1
    else
        log "${RED}OVERALL STATUS: CRITICAL${NC}"
        exit 2
    fi
}

# Run monitoring
main "$@"
