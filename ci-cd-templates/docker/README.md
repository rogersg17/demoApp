# Docker-based Test Runner for TMS

This directory contains Docker containers and orchestration tools for running tests with the Test Management System (TMS) using the Observer/Orchestrator pattern.

## Files

- `Dockerfile` - Main test runner container image
- `docker-compose.yml` - Container orchestration for single and sharded test execution
- `scripts/tms-test-runner.sh` - Test execution script with TMS integration
- `scripts/tms-result-aggregator.sh` - Result aggregation script for sharded execution

## Setup Instructions

### 1. Prerequisites

- Docker 20.10+ installed
- Docker Compose 2.0+ installed
- Project with `package.json` and test configuration

### 2. Environment Configuration

Create a `.env` file in your project root:

```env
# TMS Configuration
EXECUTION_ID=your-execution-id
WEBHOOK_URL=https://your-tms-instance.com/api/webhooks/test-results
TMS_WEBHOOK_TOKEN=your-webhook-token

# Test Configuration
TEST_SUITE=all
TEST_ENVIRONMENT=staging
TOTAL_SHARDS=4
PARALLEL_WORKERS=4

# Optional: Custom configuration
MAX_WAIT_TIME=1800
NODE_ENV=test
```

### 3. Usage Options

#### Option A: Single Container Execution

Run tests in a single container:

```bash
# Build the container
docker build -f docker/Dockerfile -t tms-test-runner .

# Run tests
docker run --rm \
  -e EXECUTION_ID="exec-123" \
  -e WEBHOOK_URL="https://your-tms.com/api/webhooks/test-results" \
  -e TMS_WEBHOOK_TOKEN="your-token" \
  -e TEST_SUITE="smoke" \
  -e TEST_ENVIRONMENT="staging" \
  -v $(pwd)/test-results:/app/test-results \
  -v $(pwd)/test-reports:/app/test-reports \
  tms-test-runner
```

#### Option B: Docker Compose (Recommended)

Run with Docker Compose for better orchestration:

```bash
# Single container execution
docker-compose up tms-test-runner

# Sharded execution (4 parallel containers)
docker-compose --profile sharded up

# With result aggregation
docker-compose --profile sharded up --abort-on-container-exit
```

#### Option C: Programmatic Execution

Trigger via TMS API or script:

```javascript
const { spawn } = require('child_process');

const dockerRun = spawn('docker-compose', [
  '--profile', 'sharded',
  'up', '--abort-on-container-exit'
], {
  env: {
    ...process.env,
    EXECUTION_ID: 'exec-123',
    WEBHOOK_URL: 'https://your-tms.com/api/webhooks/test-results',
    TMS_WEBHOOK_TOKEN: 'your-token',
    TEST_SUITE: 'regression',
    TEST_ENVIRONMENT: 'staging'
  }
});
```

## Container Features

### Test Execution
- **Parallel Sharding**: Automatic test distribution across multiple containers
- **Test Suite Selection**: Support for different test suites (smoke, regression, api, ui)
- **Environment Configuration**: Configurable test environments
- **Browser Support**: Pre-installed Playwright browsers (Chromium, Firefox, WebKit)

### Result Reporting
- **Real-time Updates**: Webhook notifications at start, shard completion, and final results
- **Detailed Metrics**: Total, passed, failed, and skipped test counts
- **Failed Test Details**: Specific information about failed tests
- **Artifact Collection**: Test results, reports, and logs preserved as volumes
- **Result Aggregation**: Automatic aggregation of results from multiple shards

### Integration Points
- **TMS Webhook Integration**: Automatic result posting to TMS webhooks
- **Volume Mounting**: Persistent storage for test results and reports
- **Network Isolation**: Containers run in isolated network for security
- **Health Checks**: Built-in container health monitoring

## Webhook Payload Format

The containers send webhook payloads in this format:

### Test Started
```json
{
  "executionId": "exec-123",
  "status": "running",
  "provider": "docker",
  "runId": "container-hostname",
  "runUrl": "docker://container-hostname",
  "testSuite": "smoke",
  "environment": "staging",
  "startTime": "2025-08-04T10:00:00Z",
  "metadata": {
    "shardId": "1",
    "totalShards": "4",
    "containerName": "tms-test-runner-shard-1",
    "nodeVersion": "v18.17.0",
    "playwrightVersion": "Version 1.40.0"
  }
}
```

### Shard Complete
```json
{
  "executionId": "exec-123",
  "shardId": "1",
  "status": "shard-complete",
  "provider": "docker",
  "runId": "container-hostname",
  "results": {
    "total": 25,
    "passed": 23,
    "failed": 2,
    "skipped": 0
  },
  "artifacts": {
    "resultsFile": "test-results-shard-1.json",
    "reportUrl": "docker://container-hostname/reports/shard-1"
  },
  "timestamp": "2025-08-04T10:00:00Z"
}
```

### Final Results
```json
{
  "executionId": "exec-123",
  "status": "failed",
  "provider": "docker",
  "runId": "container-hostname",
  "runUrl": "docker://container-hostname",
  "testSuite": "smoke",
  "environment": "staging",
  "results": {
    "total": 100,
    "passed": 92,
    "failed": 8,
    "skipped": 0
  },
  "failedTests": [
    {
      "title": "Login should work",
      "file": "tests/auth.spec.js",
      "error": "Expected element to be visible"
    }
  ],
  "endTime": "2025-08-04T10:05:30Z",
  "artifacts": {
    "reportUrl": "docker://container-hostname/reports",
    "resultsUrl": "docker://container-hostname/results",
    "logsUrl": "docker://container-hostname/logs"
  },
  "metadata": {
    "totalShards": 4,
    "containerName": "tms-test-runner",
    "aggregator": true,
    "nodeVersion": "v18.17.0",
    "playwrightVersion": "Version 1.40.0"
  }
}
```

## Customization

### Custom Test Commands

Modify `scripts/tms-test-runner.sh` to support additional test frameworks:

```bash
get_test_command() {
    local suite="$1"
    case "$suite" in
        "unit")
            echo "npm run test:unit"
            ;;
        "integration")
            echo "npm run test:integration"
            ;;
        "cypress")
            echo "npx cypress run"
            ;;
        *)
            echo "npx playwright test"
            ;;
    esac
}
```

### Custom Docker Image

Extend the base Dockerfile for project-specific requirements:

```dockerfile
FROM tms-test-runner:latest

# Install additional dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Python test dependencies
COPY requirements.txt .
RUN pip3 install -r requirements.txt

# Copy additional test utilities
COPY test-utils/ /app/test-utils/
```

### Environment-Specific Configuration

Create environment-specific compose files:

```yaml
# docker-compose.staging.yml
version: '3.8'
services:
  tms-test-runner:
    environment:
      - TEST_API_URL=https://api.staging.company.com
      - TEST_TIMEOUT=30000
      - BROWSER_HEADLESS=true

# docker-compose.production.yml
version: '3.8'
services:
  tms-test-runner:
    environment:
      - TEST_API_URL=https://api.company.com
      - TEST_TIMEOUT=60000
      - BROWSER_HEADLESS=true
```

### Scaling Configuration

Adjust container resources and parallelism:

```yaml
services:
  tms-test-runner-shard-1:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

## Advanced Features

### Multi-Browser Testing

Configure different browser containers:

```yaml
services:
  chrome-tests:
    extends: tms-test-runner
    environment:
      - BROWSER=chromium
      - TEST_SUITE=ui
  
  firefox-tests:
    extends: tms-test-runner
    environment:
      - BROWSER=firefox
      - TEST_SUITE=ui
  
  webkit-tests:
    extends: tms-test-runner
    environment:
      - BROWSER=webkit
      - TEST_SUITE=ui
```

### Selenium Grid Integration

Use with Selenium Grid for distributed browser testing:

```yaml
services:
  tms-test-runner:
    environment:
      - SELENIUM_HUB_URL=http://selenium-hub:4444/wd/hub
    depends_on:
      - selenium-hub
      - chrome-node
      - firefox-node
```

### Custom Result Processing

Add custom result processing scripts:

```bash
# In tms-test-runner.sh
if [ -f "/app/custom-result-processor.sh" ]; then
    echo "🔄 Running custom result processor..."
    /app/custom-result-processor.sh "$results_file" "$failed_tests_file"
fi
```

### Artifact Management

Configure advanced artifact handling:

```yaml
services:
  tms-test-runner:
    volumes:
      - ./test-results:/app/test-results
      - ./test-reports:/app/test-reports
      - ./screenshots:/app/screenshots
      - ./videos:/app/videos
      - artifacts-volume:/app/artifacts

volumes:
  artifacts-volume:
    driver: local
    driver_opts:
      type: nfs
      o: addr=nfs-server,rw
      device: ":/path/to/artifacts"
```

## Troubleshooting

### Common Issues

1. **Container Build Failures**
   - Verify Docker daemon is running
   - Check network connectivity for package downloads
   - Ensure sufficient disk space for image layers

2. **Test Execution Failures**
   - Check container logs: `docker-compose logs tms-test-runner`
   - Verify environment variables are set correctly
   - Ensure test files are accessible via volume mounts

3. **Webhook Communication Issues**
   - Verify webhook URL and token configuration
   - Check network connectivity from container to TMS
   - Review webhook logs for authentication errors

4. **Sharding Issues**
   - Ensure all shard containers start successfully
   - Check for resource constraints limiting parallel execution
   - Verify result aggregation timing and dependencies

5. **Volume Mount Issues**
   - Check file permissions for mounted volumes
   - Verify paths exist on host system
   - Ensure containers run with appropriate user permissions

### Debug Mode

Enable debug logging in containers:

```yaml
services:
  tms-test-runner:
    environment:
      - DEBUG=true
      - VERBOSE_LOGGING=true
    command: ["bash", "-x", "/usr/local/bin/tms-test-runner.sh"]
```

### Container Inspection

Debug running containers:

```bash
# View container logs
docker-compose logs -f tms-test-runner

# Execute commands in running container
docker-compose exec tms-test-runner bash

# Inspect container filesystem
docker-compose exec tms-test-runner find /app -name "*.json" -type f

# Check environment variables
docker-compose exec tms-test-runner env | grep -E "(TEST_|TMS_)"
```

### Resource Monitoring

Monitor container resource usage:

```bash
# View resource usage
docker stats

# Check container health
docker-compose ps

# View detailed container information
docker inspect $(docker-compose ps -q tms-test-runner)
```

## Integration with TMS

This Docker setup integrates with the TMS Observer/Orchestrator architecture:

1. **TMS Request**: User initiates test run from TMS dashboard
2. **Container Trigger**: TMS triggers Docker containers via API or orchestration
3. **Test Execution**: Docker containers run tests in parallel shards
4. **Result Collection**: Webhook notifications sent to TMS in real-time
5. **Dashboard Update**: TMS updates dashboard with live results from containers

The containers support the TMS webhook endpoints:
- `/api/webhooks/test-results` - Generic test results webhook
- `/api/webhooks/docker` - Docker-specific webhook (if available)

## Production Deployment

### Container Registry

Push to container registry for production use:

```bash
# Build and tag
docker build -f docker/Dockerfile -t your-registry.com/tms-test-runner:latest .

# Push to registry
docker push your-registry.com/tms-test-runner:latest

# Update compose file
# image: your-registry.com/tms-test-runner:latest
```

### Orchestration Platforms

Deploy on container orchestration platforms:

```yaml
# Kubernetes deployment example
apiVersion: apps/v1
kind: Job
metadata:
  name: tms-test-execution
spec:
  parallelism: 4
  template:
    spec:
      containers:
      - name: tms-test-runner
        image: your-registry.com/tms-test-runner:latest
        env:
        - name: EXECUTION_ID
          value: "exec-123"
        - name: SHARD_INDEX
          value: "1"
        - name: TOTAL_SHARDS
          value: "4"
      restartPolicy: Never
```

### Security Considerations

- Use non-root user in containers (already implemented)
- Secure webhook tokens and sensitive environment variables
- Implement network policies for container communication
- Regular security updates for base images and dependencies
- Monitor container resource usage and implement limits