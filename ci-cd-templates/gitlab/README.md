# GitLab CI Integration for TMS

This directory contains GitLab CI pipeline templates for integrating with the Test Management System (TMS) using the Observer/Orchestrator pattern.

## Files

- `.gitlab-ci.yml` - Main pipeline configuration for running tests and reporting results back to TMS

## Setup Instructions

### 1. Pipeline Variables

Add the following variables to your GitLab project (Settings → CI/CD → Variables):

```
TMS_WEBHOOK_TOKEN - Authentication token for TMS webhook endpoints (mark as protected and masked)
```

### 2. Pipeline Integration

#### Option A: Manual Pipeline Run

1. Copy `.gitlab-ci.yml` to your repository root
2. Go to CI/CD → Pipelines → Run Pipeline
3. Add the following variables when running:
   - `TEST_SUITE`: all, smoke, regression, api, ui
   - `EXECUTION_ID`: TMS Execution ID (from TMS dashboard)
   - `WEBHOOK_URL`: Your TMS instance webhook endpoint
   - `TEST_ENVIRONMENT`: staging, production, dev

#### Option B: GitLab API Trigger (Automated)

The pipeline can be triggered programmatically via TMS using GitLab API:

```bash
curl -X POST \
  "https://gitlab.com/api/v4/projects/{project_id}/trigger/pipeline" \
  -F "token={trigger_token}" \
  -F "ref=main" \
  -F "variables[TEST_SUITE]=smoke" \
  -F "variables[EXECUTION_ID]=exec-123" \
  -F "variables[WEBHOOK_URL]=https://your-tms.com/api/webhooks/gitlab" \
  -F "variables[TEST_ENVIRONMENT]=staging"
```

#### Option C: Repository Dispatch

Use GitLab's repository events to trigger pipelines:

```bash
curl -X POST \
  "https://gitlab.com/api/v4/projects/{project_id}/repository/commits" \
  -H "PRIVATE-TOKEN: {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "branch": "trigger-tests",
    "commit_message": "Trigger tests from TMS",
    "actions": [{
      "action": "update",
      "file_path": ".gitlab-ci-trigger.yml",
      "content": "# Trigger file"
    }]
  }'
```

### 3. Runner Configuration

#### Shared Runners
The pipeline uses the official Playwright Docker image and should work with GitLab.com shared runners.

#### Custom Runners
For self-hosted runners, ensure:
- Docker is installed and configured
- Sufficient resources for parallel test execution
- Network access to TMS webhook endpoints

#### Docker in Docker (if needed)
If your tests require Docker:

```yaml
services:
  - docker:dind

variables:
  DOCKER_HOST: tcp://docker:2376
  DOCKER_TLS_CERTDIR: "/certs"
```

## Pipeline Features

### Test Execution
- **Parallel Jobs**: Tests run across 4 parallel jobs for faster execution
- **Test Suite Selection**: Support for different test suites (smoke, regression, api, ui)
- **Environment Configuration**: Configurable test environments
- **Docker-based**: Uses official Playwright Docker image for consistency

### Result Reporting
- **Real-time Updates**: Webhook notifications at start, job completion, and final results
- **Detailed Metrics**: Total, passed, failed, and skipped test counts
- **Failed Test Details**: Specific information about failed tests
- **Artifact Storage**: Test results, reports, and logs stored as GitLab artifacts
- **Pipeline Integration**: Native GitLab test result reporting

### Integration Points
- **TMS Webhook Integration**: Automatic result posting to TMS webhooks
- **Merge Request Comments**: Automatic test result comments on merge requests
- **Artifact Collection**: Playwright reports and test results preserved
- **Pipeline Status**: Pipeline success/failure based on test results

## Webhook Payload Format

The pipeline sends webhook payloads in this format:

### Test Started
```json
{
  "executionId": "exec-123",
  "status": "running",
  "provider": "gitlab",
  "runId": "12345",
  "runUrl": "https://gitlab.com/group/project/-/pipelines/12345",
  "testSuite": "smoke",
  "environment": "staging",
  "startTime": "2025-08-04T10:00:00Z",
  "metadata": {
    "jobName": "notify_test_start",
    "pipelineId": "12345",
    "projectPath": "group/project",
    "commitSha": "abc123",
    "commitRef": "main",
    "triggeredBy": "developer"
  }
}
```

### Shard Complete
```json
{
  "executionId": "exec-123",
  "shardId": "1",
  "status": "shard-complete",
  "provider": "gitlab",
  "runId": "12345",
  "results": {
    "total": 25,
    "passed": 23,
    "failed": 2,
    "skipped": 0
  },
  "artifacts": {
    "resultsFile": "test-results-shard-1.json",
    "reportUrl": "https://gitlab.com/group/project/-/pipelines/12345"
  },
  "timestamp": "2025-08-04T10:00:00Z"
}
```

### Final Results
```json
{
  "executionId": "exec-123",
  "status": "failed",
  "provider": "gitlab",
  "runId": "12345",
  "runUrl": "https://gitlab.com/group/project/-/pipelines/12345",
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
    "reportUrl": "https://gitlab.com/group/project/-/pipelines/12345",
    "logsUrl": "https://gitlab.com/group/project/-/pipelines/12345",
    "artifactsUrl": "https://gitlab.com/group/project/-/jobs/artifacts/main/browse"
  },
  "metadata": {
    "jobName": "notify_complete",
    "pipelineId": "12345",
    "projectPath": "group/project",
    "commitSha": "abc123",
    "commitRef": "main",
    "triggeredBy": "developer",
    "shards": 4
  }
}
```

## Customization

### Test Commands
Modify the test execution logic for different test frameworks:

```yaml
script:
  - |
    case "${TEST_SUITE:-all}" in
      "smoke")
        TEST_CMD="npm run test:smoke"
        ;;
      "regression")
        TEST_CMD="npm run test:regression"
        ;;
      "unit")
        TEST_CMD="npm run test:unit"
        ;;
      *)
        TEST_CMD="npm test"
        ;;
    esac
```

### Result Parsing
Adjust result parsing for different test output formats:

```yaml
script:
  - |
    # For Jest results
    TOTAL=$(jq '.numTotalTests' jest-results.json)
    PASSED=$(jq '.numPassedTests' jest-results.json)
    FAILED=$(jq '.numFailedTests' jest-results.json)
```

### Parallel Execution
Modify the number of parallel jobs:

```yaml
# Add more shard jobs
test_shard_5:
  stage: test
  extends: 
    - .manual_test_execution
    - .test_setup
  script:
    - export SHARD_INDEX=5
    - export TOTAL_SHARDS=6
    # ... rest of script
```

### Environment-Specific Configuration
Add environment-specific variables:

```yaml
variables:
  TEST_API_URL: 
    value: "https://api.staging.com"
    description: "API URL for testing"
  TEST_TIMEOUT:
    value: "30000"
    description: "Test timeout in milliseconds"

.production_config:
  variables:
    TEST_API_URL: "https://api.prod.com"
    TEST_TIMEOUT: "60000"
  rules:
    - if: $TEST_ENVIRONMENT == "production"
```

## Advanced Features

### Matrix Builds
Run tests across multiple configurations:

```yaml
test_matrix:
  stage: test
  extends: .test_setup
  parallel:
    matrix:
      - BROWSER: [chromium, firefox, webkit]
        ENVIRONMENT: [staging, production]
  script:
    - export PLAYWRIGHT_BROWSER=$BROWSER
    - export TEST_ENV=$ENVIRONMENT
    - npx playwright test --project=$BROWSER
```

### Conditional Execution
Run different tests based on changes or branch:

```yaml
.only_main_branch:
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

.only_merge_requests:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

production_tests:
  extends: 
    - .test_setup
    - .only_main_branch
  script:
    - npm run test:production
```

### Dynamic Configuration
Configure jobs based on pipeline variables:

```yaml
.dynamic_shards:
  script:
    - |
      SHARD_COUNT=${SHARD_COUNT:-4}
      CURRENT_SHARD=${CI_NODE_INDEX:-1}
      TOTAL_SHARDS=${CI_NODE_TOTAL:-$SHARD_COUNT}
      
      TEST_CMD="$TEST_CMD --shard=$CURRENT_SHARD/$TOTAL_SHARDS"
```

### Merge Request Integration
Add test results to merge request discussions:

```yaml
comment_on_mr:
  stage: notify-complete
  image: alpine:latest
  before_script:
    - apk add --no-cache curl jq
  script:
    - |
      if [ "$CI_PIPELINE_SOURCE" = "merge_request_event" ]; then
        # Create MR comment with test results
        COMMENT_BODY="## 🧪 Test Results
        
        **Status:** $OVERALL_STATUS
        **Test Suite:** ${TEST_SUITE:-all}
        **Environment:** ${TEST_ENVIRONMENT:-staging}
        
        | Metric | Count |
        |--------|-------|
        | Total | $AGGREGATED_TOTAL |
        | Passed | $AGGREGATED_PASSED |
        | Failed | $AGGREGATED_FAILED |
        | Skipped | $AGGREGATED_SKIPPED |
        
        [View Pipeline]($CI_PIPELINE_URL)"
        
        curl -X POST \
          "$CI_API_V4_URL/projects/$CI_PROJECT_ID/merge_requests/$CI_MERGE_REQUEST_IID/notes" \
          -H "PRIVATE-TOKEN: $GITLAB_ACCESS_TOKEN" \
          -H "Content-Type: application/json" \
          -d "{\"body\": \"$COMMENT_BODY\"}"
      fi
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

## Troubleshooting

### Common Issues

1. **Webhook Authentication Failures**
   - Verify `TMS_WEBHOOK_TOKEN` variable is set correctly and marked as masked
   - Check TMS webhook endpoint authentication requirements
   - Ensure variable is available in the job scope

2. **Docker Image Issues**
   - Verify internet access for downloading Playwright browsers
   - Check Docker registry access for pulling base images
   - Consider using custom Docker images with pre-installed browsers

3. **Parallel Job Issues**
   - Check GitLab CI minutes usage and limits
   - Verify runner capacity for parallel job execution
   - Ensure artifacts are properly passed between jobs

4. **JSON Parsing Errors**
   - Verify `jq` is available in the Docker image
   - Check test output format matches parsing logic
   - Ensure test results files are generated correctly

5. **Variable Scope Issues**
   - Ensure variables are defined at the correct level (global, job, etc.)
   - Check variable precedence rules in GitLab CI
   - Verify environment file loading between jobs

### Debug Mode

Enable debug logging by adding:

```yaml
variables:
  CI_DEBUG_TRACE: "true"
```

### Custom Logging

Add debug information to troubleshoot issues:

```yaml
script:
  - echo "🔍 Debug: Environment variables"
  - env | grep -E "(TEST_|CI_|GITLAB_)" | sort
  - echo "📂 Debug: File system"
  - find . -name "*.json" -type f | head -10
  - echo "🧪 Debug: Test command: $TEST_CMD"
```

## Integration with TMS

This pipeline integrates with the TMS Observer/Orchestrator architecture:

1. **TMS Request**: User initiates test run from TMS dashboard
2. **GitLab Trigger**: TMS triggers pipeline via API or webhook
3. **Test Execution**: GitLab CI runs tests in parallel jobs
4. **Result Collection**: Webhook notifications sent to TMS in real-time
5. **Dashboard Update**: TMS updates dashboard with live results

The pipeline supports the TMS webhook endpoints:
- `/api/webhooks/gitlab` - GitLab specific webhook
- `/api/webhooks/test-results` - Generic test results webhook

## Performance Optimization

### Runner Configuration
Use dedicated runners for better performance:

```yaml
test_shard_1:
  tags:
    - playwright
    - docker
    - high-memory
```

### Caching Strategy
Implement comprehensive caching:

```yaml
cache:
  key: 
    files:
      - package-lock.json
      - playwright.config.js
  paths:
    - node_modules/
    - playwright-cache/
    - ~/.npm/
  policy: pull-push
```

### Resource Optimization
Configure resource limits and requests:

```yaml
variables:
  KUBERNETES_CPU_REQUEST: "2"
  KUBERNETES_CPU_LIMIT: "4"
  KUBERNETES_MEMORY_REQUEST: "4Gi"
  KUBERNETES_MEMORY_LIMIT: "8Gi"
```

### Artifact Management
Optimize artifact storage:

```yaml
artifacts:
  when: always
  expire_in: 1 week
  paths:
    - test-results-shard-*.json
    - playwright-report/
  exclude:
    - node_modules/
    - playwright-cache/
```