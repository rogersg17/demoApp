# TMS Integration API Documentation

## Overview

The Test Management System (TMS) provides comprehensive APIs for integrating with custom CI/CD platforms and testing tools using the Observer/Orchestrator pattern. This documentation covers all available endpoints, webhook formats, and integration examples.

## Base Configuration

### Base URL
```
https://your-tms-instance.com/api
```

### Authentication
All API requests require Bearer token authentication:
```http
Authorization: Bearer YOUR_API_TOKEN
```

### Content Type
All requests should use JSON content type:
```http
Content-Type: application/json
```

---

## Core API Endpoints

### 1. Test Execution Management

#### Create Test Execution

**Endpoint:** `POST /executions`

Creates a new test execution and returns an execution ID for tracking.

**Request Body:**
```json
{
  "testSuite": "smoke|regression|api|ui|all",
  "environment": "dev|staging|production",
  "provider": "custom-ci",
  "triggerSource": "api|manual|scheduled",
  "configuration": {
    "browsers": ["chromium", "firefox", "webkit"],
    "parallel": true,
    "shards": 4,
    "timeout": 1800000,
    "retries": 2
  },
  "metadata": {
    "branch": "feature/new-feature",
    "commit": "abc123",
    "buildNumber": "456",
    "triggeredBy": "developer@company.com"
  }
}
```

**Response:**
```json
{
  "executionId": "exec_2025080412345",
  "status": "created",
  "createdAt": "2025-08-04T12:34:56.789Z",
  "configuration": {
    "testSuite": "smoke",
    "environment": "staging",
    "shards": 4,
    "timeout": 1800000
  },
  "webhookUrl": "https://your-tms-instance.com/api/webhooks/executions/exec_2025080412345",
  "webhookToken": "wh_token_abc123def456"
}
```

#### Get Execution Status

**Endpoint:** `GET /executions/{executionId}`

Retrieves current status and results of a test execution.

**Response:**
```json
{
  "executionId": "exec_2025080412345",
  "status": "running|completed|failed|cancelled",
  "progress": {
    "startedAt": "2025-08-04T12:35:00.000Z",
    "completedAt": "2025-08-04T12:45:30.000Z",
    "duration": 630000,
    "shardsCompleted": 3,
    "totalShards": 4
  },
  "results": {
    "total": 150,
    "passed": 140,
    "failed": 8,
    "skipped": 2,
    "flaky": 1
  },
  "shardResults": [
    {
      "shardId": "1",
      "status": "completed",
      "results": {"total": 38, "passed": 35, "failed": 2, "skipped": 1}
    }
  ],
  "artifacts": {
    "reportUrl": "https://your-tms-instance.com/reports/exec_2025080412345",
    "logsUrl": "https://your-tms-instance.com/logs/exec_2025080412345"
  }
}
```

#### Cancel Execution

**Endpoint:** `DELETE /executions/{executionId}`

Cancels a running test execution.

**Response:**
```json
{
  "executionId": "exec_2025080412345",
  "status": "cancelled",
  "cancelledAt": "2025-08-04T12:40:15.000Z",
  "reason": "User requested cancellation"
}
```

### 2. Webhook Management

#### Register Webhook

**Endpoint:** `POST /webhooks`

Registers a webhook endpoint for receiving test execution updates.

**Request Body:**
```json
{
  "url": "https://your-ci-system.com/webhooks/tms",
  "events": ["execution.started", "shard.completed", "execution.completed"],
  "secret": "webhook_secret_key",
  "retryPolicy": {
    "maxRetries": 3,
    "retryDelay": 5000,
    "exponentialBackoff": true
  },
  "filters": {
    "testSuites": ["smoke", "regression"],
    "environments": ["staging", "production"]
  }
}
```

**Response:**
```json
{
  "webhookId": "wh_abc123def456",
  "url": "https://your-ci-system.com/webhooks/tms",
  "events": ["execution.started", "shard.completed", "execution.completed"],
  "status": "active",
  "createdAt": "2025-08-04T12:34:56.789Z"
}
```

#### Validate Webhook

**Endpoint:** `POST /webhooks/{webhookId}/validate`

Sends a test payload to validate webhook configuration.

**Response:**
```json
{
  "webhookId": "wh_abc123def456",
  "status": "valid|invalid",
  "responseCode": 200,
  "responseTime": 150,
  "lastValidatedAt": "2025-08-04T12:34:56.789Z"
}
```

### 3. Test Result Submission

#### Submit Test Results

**Endpoint:** `POST /results`

Submits test results from external test runners.

**Request Body:**
```json
{
  "executionId": "exec_2025080412345",
  "shardId": "1",
  "provider": "custom-runner",
  "status": "completed|failed|error",
  "results": {
    "total": 50,
    "passed": 45,
    "failed": 3,
    "skipped": 2,
    "flaky": 1
  },
  "tests": [
    {
      "title": "User login should work correctly",
      "file": "tests/auth/login.spec.js",
      "status": "passed|failed|skipped",
      "duration": 2500,
      "error": "Expected element to be visible",
      "retries": 1,
      "tags": ["@smoke", "@critical"]
    }
  ],
  "artifacts": {
    "screenshots": ["screenshot1.png", "screenshot2.png"],
    "videos": ["test-execution.mp4"],
    "traces": ["trace.zip"],
    "logs": ["test.log"]
  },
  "metadata": {
    "browser": "chromium",
    "viewport": "1920x1080",
    "userAgent": "Mozilla/5.0...",
    "startTime": "2025-08-04T12:35:00.000Z",
    "endTime": "2025-08-04T12:40:30.000Z"
  }
}
```

**Response:**
```json
{
  "submissionId": "sub_abc123def456",
  "executionId": "exec_2025080412345",
  "shardId": "1",
  "status": "accepted",
  "processedAt": "2025-08-04T12:41:00.000Z",
  "summary": {
    "testsProcessed": 50,
    "artifactsUploaded": 4,
    "webhooksTriggered": 2
  }
}
```

---

## Webhook Events

### Event Types

| Event | Description | Trigger |
|-------|-------------|---------|
| `execution.started` | Test execution has started | Execution begins |
| `execution.progress` | Periodic progress updates | Every 30 seconds during execution |
| `shard.started` | Shard execution started | Individual shard begins |
| `shard.completed` | Shard execution completed | Individual shard finishes |
| `execution.completed` | Test execution completed | All shards finished |
| `execution.failed` | Test execution failed | Critical failure occurred |
| `execution.cancelled` | Test execution cancelled | User or system cancellation |

### Webhook Payload Format

#### Execution Started
```json
{
  "event": "execution.started",
  "timestamp": "2025-08-04T12:35:00.000Z",
  "executionId": "exec_2025080412345",
  "data": {
    "testSuite": "smoke",
    "environment": "staging",
    "provider": "github-actions",
    "configuration": {
      "shards": 4,
      "browsers": ["chromium", "firefox"],
      "parallel": true
    },
    "metadata": {
      "branch": "main",
      "commit": "abc123",
      "triggeredBy": "developer@company.com"
    }
  }
}
```

#### Shard Completed
```json
{
  "event": "shard.completed",
  "timestamp": "2025-08-04T12:38:30.000Z",
  "executionId": "exec_2025080412345",
  "data": {
    "shardId": "1",
    "status": "completed",
    "results": {
      "total": 38,
      "passed": 35,
      "failed": 2,
      "skipped": 1,
      "flaky": 0
    },
    "duration": 210000,
    "artifacts": {
      "reportUrl": "https://your-tms-instance.com/reports/exec_2025080412345/shard-1"
    }
  }
}
```

#### Execution Completed
```json
{
  "event": "execution.completed",
  "timestamp": "2025-08-04T12:45:30.000Z",
  "executionId": "exec_2025080412345",
  "data": {
    "status": "completed",
    "results": {
      "total": 150,
      "passed": 140,
      "failed": 8,
      "skipped": 2,
      "flaky": 1
    },
    "duration": 630000,
    "shardResults": [
      {
        "shardId": "1",
        "status": "completed",
        "results": {"total": 38, "passed": 35, "failed": 2, "skipped": 1}
      }
    ],
    "artifacts": {
      "reportUrl": "https://your-tms-instance.com/reports/exec_2025080412345",
      "logsUrl": "https://your-tms-instance.com/logs/exec_2025080412345",
      "artifactsUrl": "https://your-tms-instance.com/artifacts/exec_2025080412345"
    },
    "failedTests": [
      {
        "title": "Login should work",
        "file": "tests/auth.spec.js",
        "error": "Expected element to be visible",
        "shard": "1"
      }
    ]
  }
}
```

---

## Integration Examples

### 1. Custom CI/CD Platform Integration

#### Step 1: Create Execution
```bash
curl -X POST "https://your-tms-instance.com/api/executions" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testSuite": "smoke",
    "environment": "staging",
    "provider": "custom-ci",
    "configuration": {
      "shards": 4,
      "timeout": 1800000
    },
    "metadata": {
      "branch": "main",
      "commit": "abc123"
    }
  }'
```

#### Step 2: Execute Tests with Webhook Updates
```bash
# Run test with webhook notifications
export EXECUTION_ID="exec_2025080412345"
export WEBHOOK_URL="https://your-tms-instance.com/api/webhooks/executions/$EXECUTION_ID"
export WEBHOOK_TOKEN="wh_token_abc123def456"

# Start notification
curl -X POST "$WEBHOOK_URL" \
  -H "Authorization: Bearer $WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "execution.started",
    "executionId": "'$EXECUTION_ID'",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
    "data": {
      "status": "running",
      "provider": "custom-ci"
    }
  }'

# Execute your tests here...

# Completion notification
curl -X POST "$WEBHOOK_URL" \
  -H "Authorization: Bearer $WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "execution.completed",
    "executionId": "'$EXECUTION_ID'",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
    "data": {
      "status": "completed",
      "results": {
        "total": 100,
        "passed": 95,
        "failed": 5,
        "skipped": 0
      }
    }
  }'
```

### 2. Custom Test Runner Integration

```javascript
// custom-test-runner.js
const axios = require('axios');

class TMSIntegration {
  constructor(apiToken, baseUrl) {
    this.apiToken = apiToken;
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async createExecution(config) {
    const response = await this.client.post('/executions', config);
    return response.data;
  }

  async submitResults(executionId, shardId, results) {
    const payload = {
      executionId,
      shardId,
      provider: 'custom-runner',
      status: results.failed > 0 ? 'failed' : 'completed',
      results: {
        total: results.total,
        passed: results.passed,
        failed: results.failed,
        skipped: results.skipped
      },
      tests: results.tests,
      metadata: {
        startTime: results.startTime,
        endTime: results.endTime,
        duration: results.duration
      }
    };

    const response = await this.client.post('/results', payload);
    return response.data;
  }

  async sendWebhook(webhookUrl, webhookToken, event, data) {
    await axios.post(webhookUrl, {
      event,
      timestamp: new Date().toISOString(),
      executionId: data.executionId,
      data
    }, {
      headers: {
        'Authorization': `Bearer ${webhookToken}`,
        'Content-Type': 'application/json'
      }
    });
  }
}

// Usage example
async function runTests() {
  const tms = new TMSIntegration('YOUR_API_TOKEN', 'https://your-tms-instance.com/api');
  
  // Create execution
  const execution = await tms.createExecution({
    testSuite: 'regression',
    environment: 'staging',
    provider: 'custom-runner',
    configuration: {
      shards: 2,
      timeout: 1800000
    }
  });

  console.log(`Created execution: ${execution.executionId}`);

  // Send start notification
  await tms.sendWebhook(execution.webhookUrl, execution.webhookToken, 'execution.started', {
    executionId: execution.executionId,
    status: 'running',
    provider: 'custom-runner'
  });

  // Run tests for each shard
  for (let shardId = 1; shardId <= 2; shardId++) {
    console.log(`Running shard ${shardId}`);
    
    // Execute your tests here and collect results
    const testResults = await runTestShard(shardId);
    
    // Submit results to TMS
    await tms.submitResults(execution.executionId, shardId.toString(), testResults);
    
    // Send shard completion webhook
    await tms.sendWebhook(execution.webhookUrl, execution.webhookToken, 'shard.completed', {
      executionId: execution.executionId,
      shardId: shardId.toString(),
      status: 'completed',
      results: testResults.summary
    });
  }

  // Send completion notification
  await tms.sendWebhook(execution.webhookUrl, execution.webhookToken, 'execution.completed', {
    executionId: execution.executionId,
    status: 'completed'
  });

  console.log('Test execution completed');
}
```

### 3. Python Integration Example

```python
# tms_integration.py
import requests
import json
from datetime import datetime
from typing import Dict, List, Optional

class TMSClient:
    def __init__(self, api_token: str, base_url: str):
        self.api_token = api_token
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_token}',
            'Content-Type': 'application/json'
        })

    def create_execution(self, config: Dict) -> Dict:
        """Create a new test execution"""
        response = self.session.post(f'{self.base_url}/executions', json=config)
        response.raise_for_status()
        return response.json()

    def submit_results(self, execution_id: str, shard_id: str, results: Dict) -> Dict:
        """Submit test results for a shard"""
        payload = {
            'executionId': execution_id,
            'shardId': shard_id,
            'provider': 'python-runner',
            'status': 'failed' if results.get('failed', 0) > 0 else 'completed',
            'results': results.get('summary', {}),
            'tests': results.get('tests', []),
            'metadata': {
                'startTime': results.get('startTime'),
                'endTime': results.get('endTime'),
                'duration': results.get('duration')
            }
        }
        
        response = self.session.post(f'{self.base_url}/results', json=payload)
        response.raise_for_status()
        return response.json()

    def send_webhook(self, webhook_url: str, webhook_token: str, event: str, data: Dict):
        """Send webhook notification"""
        payload = {
            'event': event,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'executionId': data.get('executionId'),
            'data': data
        }
        
        headers = {
            'Authorization': f'Bearer {webhook_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(webhook_url, json=payload, headers=headers)
        response.raise_for_status()

# Usage example
def run_tests_with_tms():
    tms = TMSClient('YOUR_API_TOKEN', 'https://your-tms-instance.com/api')
    
    # Create execution
    execution = tms.create_execution({
        'testSuite': 'api',
        'environment': 'staging',
        'provider': 'python-runner',
        'configuration': {
            'shards': 3,
            'timeout': 1800000
        },
        'metadata': {
            'branch': 'main',
            'commit': 'abc123'
        }
    })
    
    print(f"Created execution: {execution['executionId']}")
    
    # Send start notification
    tms.send_webhook(
        execution['webhookUrl'],
        execution['webhookToken'],
        'execution.started',
        {
            'executionId': execution['executionId'],
            'status': 'running',
            'provider': 'python-runner'
        }
    )
    
    # Run tests and submit results
    for shard_id in range(1, 4):
        print(f"Running shard {shard_id}")
        
        # Your test execution logic here
        test_results = run_test_shard(shard_id)
        
        # Submit to TMS
        tms.submit_results(execution['executionId'], str(shard_id), test_results)
        
        # Send shard completion webhook
        tms.send_webhook(
            execution['webhookUrl'],
            execution['webhookToken'],
            'shard.completed',
            {
                'executionId': execution['executionId'],
                'shardId': str(shard_id),
                'status': 'completed',
                'results': test_results['summary']
            }
        )
    
    # Send completion notification
    tms.send_webhook(
        execution['webhookUrl'],
        execution['webhookToken'],
        'execution.completed',
        {
            'executionId': execution['executionId'],
            'status': 'completed'
        }
    )
    
    print("Test execution completed")
```

---

## Error Handling

### HTTP Status Codes

| Code | Description | Action |
|------|-------------|--------|
| 200 | Success | Continue processing |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Check request format and parameters |
| 401 | Unauthorized | Verify API token |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Verify resource exists |
| 409 | Conflict | Resource already exists or conflict |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Rate Limited | Implement retry with backoff |
| 500 | Internal Server Error | Contact support |
| 503 | Service Unavailable | Retry later |

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "testSuite",
        "message": "Must be one of: smoke, regression, api, ui, all"
      }
    ],
    "requestId": "req_abc123def456",
    "timestamp": "2025-08-04T12:34:56.789Z"
  }
}
```

### Retry Logic

```javascript
async function retryRequest(requestFn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

function isRetryableError(error) {
  return error.response && [429, 500, 502, 503, 504].includes(error.response.status);
}
```

---

## Rate Limits

### Default Limits

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| `/executions` | 100 requests | per hour |
| `/results` | 1000 requests | per hour |
| `/webhooks` | 50 requests | per hour |
| Webhook deliveries | 10 requests | per second |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1625097600
X-RateLimit-Window: 3600
```

---

## Security Considerations

### API Token Security
- Store API tokens securely (environment variables, secret managers)
- Rotate tokens regularly
- Use different tokens for different environments
- Monitor token usage and revoke compromised tokens

### Webhook Security
- Use HTTPS endpoints only
- Validate webhook signatures
- Implement idempotency to handle duplicate deliveries
- Rate limit webhook endpoints

### Data Protection
- Never log sensitive data (tokens, credentials)
- Encrypt data in transit and at rest
- Implement proper access controls
- Regular security audits

---

## SDKs and Libraries

### Official SDKs

| Language | Package | Documentation |
|----------|---------|---------------|
| JavaScript/Node.js | `@tms/sdk-js` | [npm](https://www.npmjs.com/package/@tms/sdk-js) |
| Python | `tms-sdk` | [PyPI](https://pypi.org/project/tms-sdk/) |
| Java | `com.tms:tms-sdk` | [Maven Central](https://search.maven.org/artifact/com.tms/tms-sdk) |
| .NET | `TMS.SDK` | [NuGet](https://www.nuget.org/packages/TMS.SDK/) |

### Community SDKs

| Language | Repository | Maintainer |
|----------|------------|------------|
| Go | [tms-go-sdk](https://github.com/community/tms-go-sdk) | Community |
| Ruby | [tms-ruby](https://github.com/community/tms-ruby) | Community |
| PHP | [tms-php-client](https://github.com/community/tms-php-client) | Community |

---

## Support and Resources

### Documentation
- [API Reference](https://docs.tms.com/api)
- [Integration Guides](https://docs.tms.com/integrations)
- [Best Practices](https://docs.tms.com/best-practices)

### Support Channels
- [GitHub Issues](https://github.com/tms/issues)
- [Community Forum](https://community.tms.com)
- [Support Portal](https://support.tms.com)

### Example Repositories
- [TMS Integrations](https://github.com/tms/integrations)
- [CI/CD Templates](https://github.com/tms/ci-cd-templates)
- [Sample Projects](https://github.com/tms/examples)