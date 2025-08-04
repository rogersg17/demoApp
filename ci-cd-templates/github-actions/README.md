# GitHub Actions Integration for TMS

This directory contains GitHub Actions workflow templates for integrating with the Test Management System (TMS) using the Observer/Orchestrator pattern.

## Files

- `test-execution.yml` - Main workflow template for running tests and reporting results back to TMS

## Setup Instructions

### 1. Repository Secrets

Add the following secrets to your GitHub repository:

```
TMS_WEBHOOK_TOKEN - Authentication token for TMS webhook endpoints
```

### 2. Workflow Integration

#### Option A: Manual Workflow Dispatch

1. Copy `test-execution.yml` to `.github/workflows/` in your repository
2. Go to Actions tab → Select "Test Execution for TMS" workflow
3. Click "Run workflow" and provide:
   - Test suite (all, smoke, regression, api, ui)
   - TMS Execution ID (from TMS dashboard)
   - Webhook URL (your TMS instance webhook endpoint)
   - Environment (staging, production, dev)

#### Option B: Repository Dispatch (Automated)

The workflow can be triggered programmatically via TMS:

```bash
curl -X POST \
  https://api.github.com/repos/YOUR_ORG/YOUR_REPO/dispatches \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -d '{
    "event_type": "run-tests",
    "client_payload": {
      "execution_id": "exec-123",
      "webhook_url": "https://your-tms.com/api/webhooks/github-actions",
      "test_suite": "smoke",
      "environment": "staging"
    }
  }'
```

## Workflow Features

### Test Execution
- **Parallel Sharding**: Tests run across 4 parallel shards for faster execution
- **Test Suite Selection**: Support for different test suites (smoke, regression, api, ui)
- **Environment Configuration**: Configurable test environments
- **Matrix Strategy**: Parallel execution with result aggregation

### Result Reporting
- **Real-time Updates**: Webhook notifications at start, shard completion, and final results
- **Detailed Metrics**: Total, passed, failed, and skipped test counts
- **Failed Test Details**: Specific information about failed tests
- **Artifact Storage**: Test results, reports, and logs stored as GitHub artifacts

### Integration Points
- **TMS Webhook Integration**: Automatic result posting to TMS webhooks
- **PR Comments**: Automatic test result comments on pull requests
- **Artifact Collection**: Playwright reports and test results preserved

## Webhook Payload Format

The workflow sends webhook payloads in this format:

### Test Started
```json
{
  "executionId": "exec-123",
  "status": "running",
  "provider": "github-actions",
  "runId": "1234567890",
  "runUrl": "https://github.com/org/repo/actions/runs/1234567890",
  "testSuite": "smoke",
  "environment": "staging",
  "startTime": "2025-08-04T10:00:00Z",
  "metadata": {
    "actor": "developer",
    "ref": "refs/heads/main",
    "sha": "abc123",
    "workflow": "Test Execution for TMS"
  }
}
```

### Shard Complete
```json
{
  "executionId": "exec-123",
  "shardId": "1",
  "status": "shard-complete",
  "provider": "github-actions",
  "runId": "1234567890",
  "results": {
    "total": 25,
    "passed": 23,
    "failed": 2,
    "skipped": 0
  },
  "artifacts": {
    "resultsFile": "test-results-shard-1.json",
    "reportUrl": "https://github.com/org/repo/actions/runs/1234567890"
  },
  "timestamp": "2025-08-04T10:00:00Z"
}
```

### Final Results
```json
{
  "executionId": "exec-123",
  "status": "failed",
  "provider": "github-actions",
  "runId": "1234567890",
  "runUrl": "https://github.com/org/repo/actions/runs/1234567890",
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
  "duration": "5m 30s",
  "endTime": "2025-08-04T10:05:30Z",
  "artifacts": {
    "reportUrl": "https://github.com/org/repo/actions/runs/1234567890",
    "logsUrl": "https://github.com/org/repo/actions/runs/1234567890"
  },
  "metadata": {
    "actor": "developer",
    "ref": "refs/heads/main",
    "sha": "abc123",
    "workflow": "Test Execution for TMS",
    "shards": 4
  }
}
```

## Customization

### Test Commands
Modify the test execution step to match your test framework:

```yaml
- name: Run tests
  run: |
    case "${{ env.TEST_SUITE }}" in
      "smoke")
        TEST_CMD="npm run test:smoke"
        ;;
      "regression")
        TEST_CMD="npm run test:regression"
        ;;
      *)
        TEST_CMD="npm test"
        ;;
    esac
```

### Result Parsing
Adjust result parsing based on your test output format:

```yaml
- name: Parse test results
  run: |
    # For Jest results
    TOTAL=$(jq '.numTotalTests' jest-results.json)
    PASSED=$(jq '.numPassedTests' jest-results.json)
    FAILED=$(jq '.numFailedTests' jest-results.json)
```

### Sharding
Modify the matrix strategy for different parallel execution needs:

```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4, 5, 6]  # Increase for more parallelism
```

## Troubleshooting

### Common Issues

1. **Webhook Authentication Failures**
   - Verify `TMS_WEBHOOK_TOKEN` secret is set correctly
   - Check TMS webhook endpoint authentication requirements

2. **Test Result Parsing Errors**
   - Ensure test output format matches parsing logic
   - Check that test results file is generated correctly

3. **Shard Aggregation Issues**
   - Verify all shards complete successfully
   - Check artifact upload/download steps

### Debug Mode

Enable debug logging by adding:

```yaml
env:
  ACTIONS_STEP_DEBUG: true
```

## Integration with TMS

This workflow integrates with the TMS Observer/Orchestrator architecture:

1. **TMS Request**: User initiates test run from TMS dashboard
2. **GitHub Trigger**: TMS triggers workflow via repository dispatch
3. **Test Execution**: GitHub Actions runs tests in parallel shards
4. **Result Collection**: Webhook notifications sent to TMS
5. **Dashboard Update**: TMS updates dashboard with real-time results

The workflow supports the TMS webhook endpoints:
- `/api/webhooks/github-actions` - GitHub Actions specific webhook
- `/api/webhooks/test-results` - Generic test results webhook