# TMS CI/CD Integration API Guide

This guide provides comprehensive documentation for integrating custom CI/CD systems with the Test Management System (TMS) using the Observer/Orchestrator pattern.

## Overview

The TMS Observer/Orchestrator architecture allows external CI/CD systems to execute tests while reporting results back to TMS via webhook APIs. This enables:

- **Scalable Test Execution**: Tests run on external CI/CD infrastructure
- **Real-time Monitoring**: Live updates sent to TMS during execution
- **Flexible Integration**: Works with any CI/CD system supporting HTTP webhooks
- **Centralized Reporting**: All test results aggregated in TMS dashboard

## Architecture Flow

```
1. TMS Dashboard → 2. Trigger CI/CD → 3. Execute Tests → 4. Send Results → 5. Update Dashboard
   [User Request]    [API/Webhook]     [External]       [Webhooks]       [Real-time UI]
```

## API Endpoints

### TMS Webhook Endpoints

TMS provides several webhook endpoints for receiving test results:

#### Generic Test Results Webhook
- **URL**: `POST /api/webhooks/test-results`
- **Description**: Generic endpoint for any CI/CD provider
- **Authentication**: Bearer token in Authorization header

#### Provider-Specific Webhooks
- **GitHub Actions**: `POST /api/webhooks/github-actions`
- **Azure DevOps**: `POST /api/webhooks/azure-devops`
- **Jenkins**: `POST /api/webhooks/jenkins`
- **GitLab**: `POST /api/webhooks/gitlab`
- **Docker**: `POST /api/webhooks/docker`

#### Health Check Endpoint
- **URL**: `GET /api/webhooks/health`
- **Description**: Verify webhook endpoint availability
- **Authentication**: Optional

### TMS Orchestration API

#### Trigger Test Execution
- **URL**: `POST /api/tests/run`
- **Description**: Request test execution (returns execution ID)
- **Authentication**: API key or session token

#### Get Execution Status
- **URL**: `GET /api/tests/results/:executionId`
- **Description**: Check status of test execution
- **Authentication**: API key or session token

#### Cancel Test Execution
- **URL**: `POST /api/tests/cancel/:executionId`
- **Description**: Cancel ongoing test execution
- **Authentication**: API key or session token

## Webhook Payload Specifications

### 1. Test Execution Start

Sent when test execution begins:

```json
{
  "executionId": "exec-12345",
  "status": "running",
  "provider": "your-ci-system",
  "runId": "build-67890",
  "runUrl": "https://your-ci-system.com/builds/67890",
  "testSuite": "smoke|regression|api|ui|all",
  "environment": "staging|production|dev",
  "startTime": "2025-08-04T10:00:00Z",
  "metadata": {
    "triggeredBy": "user@company.com",
    "branch": "main",
    "commit": "abc123def456",
    "buildNumber": "67890",
    "customField": "value"
  }
}
```

**Required Fields:**
- `executionId`: Unique identifier for this test execution
- `status`: Must be "running"
- `provider`: Name of your CI/CD system
- `runId`: Unique identifier for this CI/CD run
- `runUrl`: URL to view the CI/CD run

**Optional Fields:**
- `testSuite`: Type of tests being run
- `environment`: Target environment
- `startTime`: ISO 8601 timestamp
- `metadata`: Additional contextual information

### 2. Shard/Job Completion

Sent when individual shards or parallel jobs complete:

```json
{
  "executionId": "exec-12345",
  "shardId": "1",
  "status": "shard-complete",
  "provider": "your-ci-system",
  "runId": "build-67890",
  "results": {
    "total": 25,
    "passed": 23,
    "failed": 2,
    "skipped": 0
  },
  "failedTests": [
    {
      "title": "Login should work with valid credentials",
      "file": "tests/auth/login.spec.js",
      "error": "Expected element to be visible",
      "duration": 5000,
      "retry": 1
    }
  ],
  "artifacts": {
    "resultsFile": "test-results-shard-1.json",
    "reportUrl": "https://your-ci-system.com/builds/67890/artifacts",
    "screenshotsUrl": "https://your-ci-system.com/builds/67890/screenshots"
  },
  "timestamp": "2025-08-04T10:02:30Z"
}
```

**Required Fields:**
- `executionId`: Same as start notification
- `status`: Must be "shard-complete"
- `results`: Object with test count metrics

**Optional Fields:**
- `shardId`: Identifier for parallel execution shard
- `failedTests`: Array of failed test details
- `artifacts`: URLs to test artifacts

### 3. Final Results

Sent when all test execution is complete:

```json
{
  "executionId": "exec-12345",
  "status": "passed|failed|error|cancelled",
  "provider": "your-ci-system",
  "runId": "build-67890",
  "runUrl": "https://your-ci-system.com/builds/67890",
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
      "title": "Login should work with valid credentials",
      "file": "tests/auth/login.spec.js",
      "error": "Expected element to be visible",
      "duration": 5000,
      "retry": 1,
      "screenshot": "https://your-ci-system.com/screenshots/login-failure.png"
    }
  ],
  "duration": "5m 30s",
  "startTime": "2025-08-04T10:00:00Z",
  "endTime": "2025-08-04T10:05:30Z",
  "artifacts": {
    "reportUrl": "https://your-ci-system.com/builds/67890/report",
    "logsUrl": "https://your-ci-system.com/builds/67890/logs",
    "artifactsUrl": "https://your-ci-system.com/builds/67890/artifacts",
    "coverageUrl": "https://your-ci-system.com/builds/67890/coverage"
  },
  "metadata": {
    "triggeredBy": "user@company.com",
    "branch": "main",
    "commit": "abc123def456",
    "buildNumber": "67890",
    "totalShards": 4,
    "retryCount": 1,
    "customField": "value"
  }
}
```

**Required Fields:**
- `executionId`: Same as start notification
- `status`: Final execution status
- `results`: Aggregated test count metrics

**Status Values:**
- `passed`: All tests passed successfully
- `failed`: Some tests failed
- `error`: Execution encountered errors
- `cancelled`: Execution was cancelled

## Authentication

### Webhook Authentication

All webhook requests must include authentication:

```bash
curl -X POST "https://your-tms-instance.com/api/webhooks/test-results" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_WEBHOOK_TOKEN" \
  -d '{"executionId": "exec-123", "status": "running", ...}'
```

### API Key Authentication

For triggering executions from TMS:

```bash
curl -X POST "https://your-tms-instance.com/api/tests/run" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"testSuite": "smoke", "environment": "staging"}'
```

## Implementation Examples

### Basic Integration

#### 1. Trigger Handler

Handle execution requests from TMS:

```javascript
// Example: Express.js webhook handler
app.post('/webhook/tms-trigger', async (req, res) => {
  const { executionId, testSuite, environment, webhookUrl } = req.body;
  
  // Trigger your CI/CD system
  const buildId = await triggerCIBuild({
    testSuite,
    environment,
    executionId,
    webhookUrl,
    webhookToken: process.env.TMS_WEBHOOK_TOKEN
  });
  
  // Send start notification
  await sendWebhook(webhookUrl, {
    executionId,
    status: 'running',
    provider: 'custom-ci',
    runId: buildId,
    runUrl: `https://ci.company.com/builds/${buildId}`,
    testSuite,
    environment,
    startTime: new Date().toISOString()
  });
  
  res.json({ success: true, buildId });
});
```

#### 2. Result Reporter

Send results back to TMS:

```javascript
// Example: Test completion handler
async function reportTestResults(executionId, results, webhookUrl) {
  const payload = {
    executionId,
    status: results.failed > 0 ? 'failed' : 'passed',
    provider: 'custom-ci',
    runId: process.env.BUILD_ID,
    runUrl: process.env.BUILD_URL,
    results: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped
    },
    failedTests: results.failures.map(failure => ({
      title: failure.title,
      file: failure.file,
      error: failure.error
    })),
    endTime: new Date().toISOString()
  };
  
  await sendWebhook(webhookUrl, payload);
}

async function sendWebhook(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.TMS_WEBHOOK_TOKEN}`
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status}`);
  }
}
```

### Advanced Integration with Sharding

#### Parallel Execution with Result Aggregation

```javascript
// Example: Parallel test execution
async function executeTestsWithSharding(executionId, testSuite, totalShards) {
  const webhookUrl = process.env.TMS_WEBHOOK_URL;
  const promises = [];
  
  // Start parallel shards
  for (let shard = 1; shard <= totalShards; shard++) {
    promises.push(executeShard(executionId, testSuite, shard, totalShards, webhookUrl));
  }
  
  // Wait for all shards
  const shardResults = await Promise.all(promises);
  
  // Aggregate results
  const aggregated = shardResults.reduce((total, shard) => ({
    total: total.total + shard.total,
    passed: total.passed + shard.passed,
    failed: total.failed + shard.failed,
    skipped: total.skipped + shard.skipped,
    failures: [...total.failures, ...shard.failures]
  }), { total: 0, passed: 0, failed: 0, skipped: 0, failures: [] });
  
  // Send final results
  await reportTestResults(executionId, aggregated, webhookUrl);
}

async function executeShard(executionId, testSuite, shardIndex, totalShards, webhookUrl) {
  // Execute shard
  const results = await runTestShard(testSuite, shardIndex, totalShards);
  
  // Report shard completion
  await sendWebhook(webhookUrl, {
    executionId,
    shardId: shardIndex.toString(),
    status: 'shard-complete',
    provider: 'custom-ci',
    runId: process.env.BUILD_ID,
    results: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped
    },
    timestamp: new Date().toISOString()
  });
  
  return results;
}
```

## Best Practices

### 1. Error Handling

Implement robust error handling for webhook failures:

```javascript
async function sendWebhookWithRetry(url, payload, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sendWebhook(url, payload);
      return;
    } catch (error) {
      console.error(`Webhook attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        // Log to persistent storage for manual retry
        await logFailedWebhook(payload, error);
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }
}
```

### 2. Unique Execution IDs

Generate unique execution IDs to prevent conflicts:

```javascript
function generateExecutionId(provider, timestamp = Date.now()) {
  const random = Math.random().toString(36).substring(2);
  return `${provider}-${timestamp}-${random}`;
}
```

### 3. Payload Validation

Validate payloads before sending:

```javascript
function validatePayload(payload, type) {
  const requiredFields = {
    start: ['executionId', 'status', 'provider', 'runId'],
    complete: ['executionId', 'status', 'results'],
    shard: ['executionId', 'shardId', 'status', 'results']
  };
  
  const required = requiredFields[type] || [];
  const missing = required.filter(field => !payload[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}
```

### 4. Timeout Handling

Implement timeouts for long-running tests:

```javascript
async function executeWithTimeout(executionId, testFunction, timeoutMs = 1800000) { // 30 minutes
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Test execution timeout')), timeoutMs);
  });
  
  try {
    return await Promise.race([testFunction(), timeoutPromise]);
  } catch (error) {
    // Send timeout notification
    await sendWebhook(process.env.TMS_WEBHOOK_URL, {
      executionId,
      status: 'error',
      provider: 'custom-ci',
      runId: process.env.BUILD_ID,
      error: 'Test execution timeout',
      endTime: new Date().toISOString()
    });
    throw error;
  }
}
```

## Testing Your Integration

### 1. Webhook Testing

Test webhook endpoints with sample payloads:

```bash
# Test start notification
curl -X POST "https://your-tms-instance.com/api/webhooks/test-results" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "executionId": "test-123",
    "status": "running",
    "provider": "test-provider",
    "runId": "test-run-456",
    "runUrl": "https://example.com/test-run-456",
    "testSuite": "smoke",
    "environment": "staging",
    "startTime": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'

# Test completion notification
curl -X POST "https://your-tms-instance.com/api/webhooks/test-results" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "executionId": "test-123",
    "status": "passed",
    "provider": "test-provider",
    "runId": "test-run-456",
    "results": {
      "total": 10,
      "passed": 10,
      "failed": 0,
      "skipped": 0
    },
    "endTime": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'
```

### 2. Integration Testing

Create automated tests for your integration:

```javascript
// Example: Jest test for webhook integration
describe('TMS Integration', () => {
  test('should send start notification successfully', async () => {
    const mockPayload = {
      executionId: 'test-123',
      status: 'running',
      provider: 'test-ci',
      runId: 'run-456'
    };
    
    const response = await sendWebhook(TEST_WEBHOOK_URL, mockPayload);
    expect(response.ok).toBe(true);
  });
  
  test('should handle webhook failures gracefully', async () => {
    const mockPayload = { executionId: 'test-456', status: 'running' };
    
    // Mock network failure
    fetch.mockRejectedValueOnce(new Error('Network error'));
    
    await expect(sendWebhookWithRetry(TEST_WEBHOOK_URL, mockPayload, 1))
      .rejects.toThrow('Network error');
  });
});
```

## Monitoring and Observability

### 1. Logging

Implement structured logging:

```javascript
const logger = require('winston');

logger.info('TMS webhook sent', {
  executionId: payload.executionId,
  status: payload.status,
  provider: payload.provider,
  timestamp: new Date().toISOString()
});
```

### 2. Metrics

Track integration metrics:

```javascript
const prometheus = require('prom-client');

const webhookCounter = new prometheus.Counter({
  name: 'tms_webhooks_total',
  help: 'Total number of TMS webhooks sent',
  labelNames: ['status', 'provider']
});

const webhookDuration = new prometheus.Histogram({
  name: 'tms_webhook_duration_seconds',
  help: 'TMS webhook request duration'
});

// Usage
webhookCounter.inc({ status: 'success', provider: 'custom-ci' });
```

### 3. Health Checks

Monitor integration health:

```javascript
app.get('/health/tms-integration', async (req, res) => {
  try {
    // Test webhook endpoint
    const response = await fetch(`${TMS_BASE_URL}/api/webhooks/health`);
    
    if (response.ok) {
      res.json({ status: 'healthy', tms_webhook: 'accessible' });
    } else {
      res.status(503).json({ status: 'unhealthy', tms_webhook: 'inaccessible' });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      error: error.message,
      tms_webhook: 'error'
    });
  }
});
```

## Troubleshooting

### Common Issues

1. **Webhook Authentication Failures**
   - Verify webhook token is correct and not expired
   - Check Authorization header format: `Bearer TOKEN`
   - Ensure token has webhook permissions

2. **Missing Required Fields**
   - Validate payload structure against specifications
   - Check for typos in field names
   - Ensure all required fields are present

3. **Network Connectivity Issues**
   - Test webhook endpoint accessibility
   - Check firewall and proxy settings
   - Verify SSL/TLS certificate validity

4. **Payload Size Limits**
   - TMS has payload size limits (typically 10MB)
   - Large failed test arrays may exceed limits
   - Consider pagination for large result sets

### Debug Mode

Enable verbose logging for troubleshooting:

```javascript
const DEBUG = process.env.TMS_DEBUG === 'true';

function debugLog(message, data) {
  if (DEBUG) {
    console.log(`[TMS DEBUG] ${message}`, JSON.stringify(data, null, 2));
  }
}

// Usage
debugLog('Sending webhook payload', payload);
```

## Migration Guide

### From Direct Execution to Observer/Orchestrator

If migrating from direct test execution to the observer pattern:

1. **Remove Direct Execution Code**
   ```javascript
   // OLD: Direct execution
   const testResults = await runTests(testSuite);
   
   // NEW: Orchestrated execution
   const executionId = generateExecutionId();
   await triggerExternalExecution(executionId, testSuite);
   ```

2. **Implement Webhook Handlers**
   ```javascript
   // Add webhook endpoints to receive results
   app.post('/webhook/test-results', handleTestResults);
   ```

3. **Update Status Tracking**
   ```javascript
   // Track execution status via webhooks instead of direct monitoring
   const execution = await getExecutionStatus(executionId);
   ```

This comprehensive API guide provides everything needed to integrate custom CI/CD systems with TMS using the Observer/Orchestrator pattern. The provided examples, best practices, and troubleshooting information should enable successful implementation of robust integrations.