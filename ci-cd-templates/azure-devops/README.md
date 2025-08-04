# Azure DevOps Integration for TMS

This directory contains Azure DevOps pipeline templates for integrating with the Test Management System (TMS) using the Observer/Orchestrator pattern.

## Files

- `azure-pipelines-test.yml` - Main pipeline template for running tests and reporting results back to TMS

## Setup Instructions

### 1. Pipeline Variables

Add the following variable to your Azure DevOps pipeline library or pipeline variables:

```
TMS_WEBHOOK_TOKEN - Authentication token for TMS webhook endpoints (mark as secret)
```

### 2. Pipeline Integration

#### Option A: Manual Pipeline Run

1. Copy `azure-pipelines-test.yml` to your repository root or in a `pipelines/` directory
2. Create a new pipeline in Azure DevOps pointing to this YAML file
3. Run the pipeline manually and provide:
   - Test Suite (all, smoke, regression, api, ui)
   - TMS Execution ID (from TMS dashboard)
   - Webhook URL (your TMS instance webhook endpoint)
   - Environment (staging, production, dev)

#### Option B: REST API Trigger (Automated)

The pipeline can be triggered programmatically via TMS using Azure DevOps REST API:

```bash
curl -X POST \
  "https://dev.azure.com/{organization}/{project}/_apis/pipelines/{pipelineId}/runs?api-version=7.0" \
  -H "Authorization: Basic {PAT_TOKEN_BASE64}" \
  -H "Content-Type: application/json" \
  -d '{
    "templateParameters": {
      "executionId": "exec-123",
      "webhookUrl": "https://your-tms.com/api/webhooks/azure-devops",
      "testSuite": "smoke",
      "environment": "staging"
    }
  }'
```

### 3. Service Connection (if needed)

If your tests require access to external services, create service connections in Azure DevOps:

1. Go to Project Settings → Service connections
2. Create connections for your test environments
3. Grant pipeline permissions to use the connections

## Pipeline Features

### Test Execution
- **Parallel Jobs**: Tests run across 4 parallel jobs for faster execution
- **Test Suite Selection**: Support for different test suites (smoke, regression, api, ui)
- **Environment Configuration**: Configurable test environments
- **Strategy Pattern**: Parallel execution with result aggregation

### Result Reporting
- **Real-time Updates**: Webhook notifications at start, job completion, and final results
- **Detailed Metrics**: Total, passed, failed, and skipped test counts
- **Failed Test Details**: Specific information about failed tests
- **Artifact Storage**: Test results, reports, and logs stored as Azure DevOps artifacts
- **Test Results Integration**: Native Azure DevOps test result publishing

### Integration Points
- **TMS Webhook Integration**: Automatic result posting to TMS webhooks
- **Build Status**: Pipeline success/failure based on test results
- **Artifact Collection**: Playwright reports and test results preserved
- **Build Tagging**: Automatic tagging based on test results

## Webhook Payload Format

The pipeline sends webhook payloads in this format:

### Test Started
```json
{
  "executionId": "exec-123",
  "status": "running",
  "provider": "azure-devops",
  "runId": "1234",
  "runUrl": "https://dev.azure.com/org/project/_build/results?buildId=1234",
  "testSuite": "smoke",
  "environment": "staging",
  "startTime": "2025-08-04T10:00:00Z",
  "metadata": {
    "requestedBy": "developer@company.com",
    "sourceBranch": "refs/heads/main",
    "sourceVersion": "abc123",
    "buildReason": "manual",
    "buildDefinitionName": "Test Execution Pipeline"
  }
}
```

### Job Complete
```json
{
  "executionId": "exec-123",
  "shardId": "1",
  "status": "shard-complete",
  "provider": "azure-devops",
  "runId": "1234",
  "results": {
    "total": 25,
    "passed": 23,
    "failed": 2,
    "skipped": 0
  },
  "artifacts": {
    "resultsFile": "test-results-shard-1.json",
    "reportUrl": "https://dev.azure.com/org/project/_build/results?buildId=1234"
  },
  "timestamp": "2025-08-04T10:00:00Z"
}
```

### Final Results
```json
{
  "executionId": "exec-123",
  "status": "failed",
  "provider": "azure-devops",
  "runId": "1234",
  "runUrl": "https://dev.azure.com/org/project/_build/results?buildId=1234",
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
  "startTime": "2025-08-04T10:00:00Z",
  "endTime": "2025-08-04T10:05:30Z",
  "artifacts": {
    "reportUrl": "https://dev.azure.com/org/project/_build/results?buildId=1234",
    "logsUrl": "https://dev.azure.com/org/project/_build/results?buildId=1234&view=logs"
  },
  "metadata": {
    "requestedBy": "developer@company.com",
    "sourceBranch": "refs/heads/main",
    "sourceVersion": "abc123",
    "buildReason": "manual",
    "buildDefinitionName": "Test Execution Pipeline",
    "shards": 4
  }
}
```

## Customization

### Test Commands
Modify the test execution step to match your test framework:

```powershell
$testCmd = switch ("$(testSuite)") {
  "smoke" { "npm run test:smoke" }
  "regression" { "npm run test:regression" }
  "unit" { "npm run test:unit" }
  default { "npm test" }
}
```

### Result Parsing
Adjust result parsing based on your test output format:

```powershell
# For Jest results
$results = Get-Content "jest-results.json" | ConvertFrom-Json
$total = $results.numTotalTests
$passed = $results.numPassedTests
$failed = $results.numFailedTests
```

### Parallel Execution
Modify the strategy for different parallel execution needs:

```yaml
strategy:
  parallel: 6  # Increase for more parallelism
```

### Environment Variables
Add environment-specific variables:

```yaml
variables:
- name: TEST_API_URL
  value: ${{ parameters.environment == 'production' && 'https://api.prod.com' || 'https://api.staging.com' }}
```

## Advanced Features

### Conditional Execution
Run different test suites based on branch or trigger:

```yaml
- ${{ if eq(variables['Build.SourceBranch'], 'refs/heads/main') }}:
  - template: production-tests.yml
- ${{ else }}:
  - template: development-tests.yml
```

### Matrix Strategy
Run tests across multiple environments simultaneously:

```yaml
strategy:
  matrix:
    staging:
      testEnvironment: 'staging'
    production:
      testEnvironment: 'production'
  parallel: 2
```

### Approval Gates
Add manual approvals for production test runs:

```yaml
- stage: ProductionTests
  condition: eq(variables['testEnvironment'], 'production')
  jobs:
  - deployment: RunProductionTests
    environment: 'production-testing'  # Configure with approvals
```

## Troubleshooting

### Common Issues

1. **Webhook Authentication Failures**
   - Verify `TMS_WEBHOOK_TOKEN` variable is set and marked as secret
   - Check TMS webhook endpoint authentication requirements
   - Ensure variable is accessible in the pipeline scope

2. **PowerShell Execution Errors**
   - Check PowerShell execution policy in hosted agents
   - Verify JSON formatting in webhook payloads
   - Use `Write-Host` for debugging output

3. **Test Result Parsing Errors**
   - Ensure test output format matches parsing logic
   - Check that test results file is generated correctly
   - Verify file paths and permissions

4. **Parallel Job Issues**
   - Check parallel job limits in your Azure DevOps organization
   - Verify artifact upload/download between stages
   - Ensure unique naming for parallel job outputs

### Debug Mode

Enable debug logging by adding:

```yaml
variables:
  system.debug: true
```

### Custom Logging

Add custom logging to troubleshoot issues:

```powershell
Write-Host "🔍 Debug: Variable value = $(variableName)"
Write-Host "📂 Debug: Files in directory:"
Get-ChildItem -Path "." -Recurse | Write-Host
```

## Integration with TMS

This pipeline integrates with the TMS Observer/Orchestrator architecture:

1. **TMS Request**: User initiates test run from TMS dashboard
2. **Azure DevOps Trigger**: TMS triggers pipeline via REST API
3. **Test Execution**: Azure DevOps runs tests in parallel jobs
4. **Result Collection**: Webhook notifications sent to TMS
5. **Dashboard Update**: TMS updates dashboard with real-time results

The pipeline supports the TMS webhook endpoints:
- `/api/webhooks/azure-devops` - Azure DevOps specific webhook
- `/api/webhooks/test-results` - Generic test results webhook

## Performance Optimization

### Agent Pool Selection
Choose appropriate agent pools for better performance:

```yaml
pool:
  name: 'Custom-Pool'  # Use dedicated agents
  demands:
  - npm
  - playwright
```

### Caching Strategy
Implement comprehensive caching:

```yaml
- task: Cache@2
  inputs:
    key: 'npm | "$(Agent.OS)" | package-lock.json'
    restoreKeys: |
      npm | "$(Agent.OS)"
      npm
    path: $(npm_config_cache)

- task: Cache@2
  inputs:
    key: 'playwright | "$(Agent.OS)" | package-lock.json'
    path: ~/.cache/ms-playwright
```

### Resource Management
Optimize resource usage:

```yaml
jobs:
- job: RunTests
  timeoutInMinutes: 60  # Set appropriate timeouts
  cancelTimeoutInMinutes: 5
  pool:
    vmImage: 'ubuntu-latest'
  variables:
    PLAYWRIGHT_BROWSERS_PATH: $(Pipeline.Workspace)/playwright-cache
```