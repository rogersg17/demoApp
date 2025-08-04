# Jenkins Integration for TMS

This directory contains Jenkins pipeline templates for integrating with the Test Management System (TMS) using the Observer/Orchestrator pattern.

## Files

- `Jenkinsfile` - Main pipeline script for running tests and reporting results back to TMS
- `jenkins-pipeline-library.groovy` - Reusable functions for Jenkins shared libraries (optional)

## Setup Instructions

### 1. Prerequisites

#### Required Jenkins Plugins
Install the following plugins in your Jenkins instance:

```
- Pipeline Plugin
- HTTP Request Plugin
- Credentials Plugin
- NodeJS Plugin (optional, for Node.js management)
- Build User Vars Plugin (for build user information)
- JSON Plugin (for JSON parsing)
```

#### System Requirements
- Node.js 18+ installed on Jenkins agents
- Playwright browsers installed or internet access for installation
- Git installed on Jenkins agents

### 2. Credentials Setup

Create the following credential in Jenkins (Manage Jenkins → Credentials):

```
ID: tms-webhook-token
Type: Secret text
Secret: Your TMS webhook authentication token
Description: TMS Webhook Token for test result integration
```

### 3. Pipeline Integration

#### Option A: Pipeline Job with Parameters

1. Create a new Pipeline job in Jenkins
2. Enable "This project is parameterized" and add:
   - Choice Parameter: `TEST_SUITE` (all, smoke, regression, api, ui)
   - String Parameter: `EXECUTION_ID` (TMS Execution ID)
   - String Parameter: `WEBHOOK_URL` (TMS webhook endpoint)
   - Choice Parameter: `TEST_ENVIRONMENT` (staging, production, dev)
3. Set Pipeline Definition to "Pipeline script from SCM"
4. Configure SCM to point to your repository with the Jenkinsfile

#### Option B: Multibranch Pipeline

1. Create a new Multibranch Pipeline job
2. Configure branch sources (Git, GitHub, etc.)
3. Set the Script Path to the location of your Jenkinsfile
4. The pipeline will automatically detect branches with Jenkinsfiles

#### Option C: Jenkins REST API Trigger (Automated)

The pipeline can be triggered programmatically via TMS using Jenkins REST API:

```bash
# Trigger with parameters
curl -X POST \
  "http://jenkins-server/job/test-pipeline/buildWithParameters" \
  -u "username:api-token" \
  -d "TEST_SUITE=smoke" \
  -d "EXECUTION_ID=exec-123" \
  -d "WEBHOOK_URL=https://your-tms.com/api/webhooks/jenkins" \
  -d "TEST_ENVIRONMENT=staging"
```

### 4. Agent Configuration

#### Single Agent Setup
For simple setups, ensure your Jenkins agent has:
- Node.js 18+
- NPM/Yarn
- Git
- Chrome/Chromium browsers (for Playwright)

#### Multi-Agent Setup
For better performance, configure multiple agents:

```groovy
pipeline {
    agent {
        label 'playwright-agents'  // Custom label for agents with Playwright
    }
    // ... rest of pipeline
}
```

## Pipeline Features

### Test Execution
- **Parallel Sharding**: Tests run across 4 parallel stages for faster execution
- **Test Suite Selection**: Support for different test suites (smoke, regression, api, ui)
- **Environment Configuration**: Configurable test environments
- **Cross-Platform**: Supports both Windows and Unix agents

### Result Reporting
- **Real-time Updates**: Webhook notifications at start, shard completion, and final results
- **Detailed Metrics**: Total, passed, failed, and skipped test counts
- **Failed Test Details**: Specific information about failed tests
- **Artifact Archiving**: Test results, reports, and logs preserved as Jenkins artifacts
- **Build Status Integration**: Pipeline success/failure based on test results

### Integration Points
- **TMS Webhook Integration**: Automatic result posting to TMS webhooks
- **Build Artifacts**: Playwright reports and test results archived
- **Console Logs**: Detailed execution logs for debugging
- **Email Notifications**: Optional email notifications on build completion

## Webhook Payload Format

The pipeline sends webhook payloads in this format:

### Test Started
```json
{
  "executionId": "exec-123",
  "status": "running",
  "provider": "jenkins",
  "runId": "1234",
  "runUrl": "http://jenkins-server/job/test-pipeline/1234/",
  "testSuite": "smoke",
  "environment": "staging",
  "startTime": "2025-08-04T10:00:00Z",
  "metadata": {
    "jobName": "test-pipeline",
    "buildNumber": "1234",
    "buildUser": "developer",
    "nodeName": "agent-01",
    "workspace": "/var/jenkins_home/workspace/test-pipeline"
  }
}
```

### Shard Complete
```json
{
  "executionId": "exec-123",
  "shardId": "1",
  "status": "shard-complete",
  "provider": "jenkins",
  "runId": "1234",
  "results": {
    "total": 25,
    "passed": 23,
    "failed": 2,
    "skipped": 0
  },
  "artifacts": {
    "resultsFile": "test-results-shard-1.json",
    "reportUrl": "http://jenkins-server/job/test-pipeline/1234/"
  },
  "timestamp": "2025-08-04T10:00:00Z"
}
```

### Final Results
```json
{
  "executionId": "exec-123",
  "status": "failed",
  "provider": "jenkins",
  "runId": "1234",
  "runUrl": "http://jenkins-server/job/test-pipeline/1234/",
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
  "duration": "300000ms",
  "endTime": "2025-08-04T10:05:30Z",
  "artifacts": {
    "reportUrl": "http://jenkins-server/job/test-pipeline/1234/",
    "logsUrl": "http://jenkins-server/job/test-pipeline/1234/console",
    "artifactsUrl": "http://jenkins-server/job/test-pipeline/1234/artifact/"
  },
  "metadata": {
    "jobName": "test-pipeline",
    "buildNumber": "1234",
    "buildUser": "developer",
    "nodeName": "agent-01",
    "workspace": "/var/jenkins_home/workspace/test-pipeline",
    "shards": 4
  }
}
```

## Customization

### Test Commands
Modify the `getTestCommand` function to match your test framework:

```groovy
def getTestCommand(testSuite) {
    switch (testSuite) {
        case 'smoke':
            return 'npm run test:smoke'
        case 'regression':
            return 'npm run test:regression'
        case 'unit':
            return 'npm run test:unit'
        default:
            return 'npm test'
    }
}
```

### Result Parsing
Adjust result parsing for different test output formats:

```groovy
// For Jest results
def results = readJSON file: "jest-results.json"
def total = results.numTotalTests
def passed = results.numPassedTests
def failed = results.numFailedTests
```

### Parallel Execution
Modify parallel stages for different sharding needs:

```groovy
stage('Execute Tests') {
    parallel {
        stage('Test Shard 1') { steps { runTestShard(1, 6) } }
        stage('Test Shard 2') { steps { runTestShard(2, 6) } }
        stage('Test Shard 3') { steps { runTestShard(3, 6) } }
        stage('Test Shard 4') { steps { runTestShard(4, 6) } }
        stage('Test Shard 5') { steps { runTestShard(5, 6) } }
        stage('Test Shard 6') { steps { runTestShard(6, 6) } }
    }
}
```

### Environment-Specific Configuration
Add environment-specific settings:

```groovy
environment {
    TEST_API_URL = "${params.TEST_ENVIRONMENT == 'production' ? 'https://api.prod.com' : 'https://api.staging.com'}"
    TEST_TIMEOUT = "${params.TEST_ENVIRONMENT == 'production' ? '60000' : '30000'}"
}
```

## Advanced Features

### Docker Agent Support
Run tests in Docker containers:

```groovy
pipeline {
    agent {
        docker {
            image 'mcr.microsoft.com/playwright:v1.40.0-focal'
            args '-u root:root'
        }
    }
    // ... rest of pipeline
}
```

### Matrix Builds
Run tests across multiple environments simultaneously:

```groovy
stage('Matrix Tests') {
    matrix {
        axes {
            axis {
                name 'ENVIRONMENT'
                values 'staging', 'production'
            }
            axis {
                name 'BROWSER'
                values 'chromium', 'firefox', 'webkit'
            }
        }
        stages {
            stage('Test') {
                steps {
                    runTestsWithMatrix()
                }
            }
        }
    }
}
```

### Conditional Execution
Run different tests based on branch or trigger:

```groovy
stage('Conditional Tests') {
    when {
        anyOf {
            branch 'main'
            changeRequest target: 'main'
        }
    }
    steps {
        runProductionTests()
    }
}
```

### Post-Build Actions
Add comprehensive post-build processing:

```groovy
post {
    always {
        // Archive artifacts
        archiveArtifacts artifacts: '**/test-results-*.json, playwright-report/**/*', 
                        allowEmptyArchive: true
        
        // Publish test results
        publishTestResults testResultsPattern: '**/test-results.xml'
        
        // Publish HTML reports
        publishHTML([
            allowMissing: false,
            alwaysLinkToLastBuild: true,
            keepAll: true,
            reportDir: 'playwright-report',
            reportFiles: 'index.html',
            reportName: 'Playwright Test Report'
        ])
    }
    
    failure {
        // Send notifications on failure
        emailext (
            subject: "Test Execution Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
            body: "Test execution failed. Check console output at ${env.BUILD_URL}",
            to: "${env.BUILD_USER_EMAIL}"
        )
    }
}
```

## Troubleshooting

### Common Issues

1. **Webhook Authentication Failures**
   - Verify `tms-webhook-token` credential is created correctly
   - Check TMS webhook endpoint authentication requirements
   - Ensure credential ID matches the one used in pipeline

2. **Node.js/NPM Issues**
   - Verify Node.js is installed on Jenkins agents
   - Check NODE_PATH and PATH environment variables
   - Consider using NodeJS plugin for version management

3. **Playwright Browser Issues**
   - Ensure browsers are installed: `npx playwright install --with-deps`
   - Check system dependencies for headless browsers
   - Consider using Docker agents with pre-installed browsers

4. **Parallel Execution Issues**
   - Verify sufficient agents are available for parallel execution
   - Check agent labels and availability
   - Monitor resource usage during parallel runs

5. **JSON Parsing Errors**
   - Verify test output format matches parsing logic
   - Check file permissions and paths
   - Ensure JSON files are valid format

### Debug Mode

Enable debug logging by adding:

```groovy
pipeline {
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 60, unit: 'MINUTES')
        parallelsAlwaysFailFast()
        skipDefaultCheckout(false)
        timestamps()
    }
    // ... rest of pipeline
}
```

### Custom Logging

Add custom logging for troubleshooting:

```groovy
echo "🔍 Debug: Environment variables:"
sh 'env | sort'

echo "📂 Debug: Workspace contents:"
sh 'find . -type f -name "*.json" | head -20'

echo "🧪 Debug: Test command: ${testCommand}"
```

## Integration with TMS

This pipeline integrates with the TMS Observer/Orchestrator architecture:

1. **TMS Request**: User initiates test run from TMS dashboard
2. **Jenkins Trigger**: TMS triggers pipeline via REST API or webhook
3. **Test Execution**: Jenkins runs tests in parallel shards across agents
4. **Result Collection**: Webhook notifications sent to TMS in real-time
5. **Dashboard Update**: TMS updates dashboard with live results

The pipeline supports the TMS webhook endpoints:
- `/api/webhooks/jenkins` - Jenkins specific webhook
- `/api/webhooks/test-results` - Generic test results webhook

## Performance Optimization

### Agent Pool Configuration
Configure dedicated agent pools for better performance:

```groovy
pipeline {
    agent {
        label 'playwright-pool && !master'
    }
    // ... rest of pipeline
}
```

### Workspace Management
Optimize workspace usage:

```groovy
options {
    skipDefaultCheckout(false)
    checkoutToSubdirectory('source')
    disableConcurrentBuilds()
}
```

### Resource Monitoring
Monitor resource usage:

```groovy
steps {
    script {
        sh '''
            echo "💻 System Resources:"
            free -h
            df -h
            ps aux --sort=-%cpu | head -10
        '''
    }
}
```