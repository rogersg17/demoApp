# TMS Webhook Integration Examples

This document provides practical examples of webhook integrations for different platforms and scenarios when working with the Test Management System (TMS).

## Overview

TMS webhooks follow the Observer/Orchestrator pattern, sending real-time notifications about test execution progress. This enables CI/CD systems and external tools to stay synchronized with test execution status.

## Webhook Security

### Signature Verification

All webhooks include a signature header for verification:

```http
X-TMS-Signature: sha256=<signature>
X-TMS-Timestamp: 1625097600
```

#### Verification Example (Node.js)
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret, timestamp) {
  // Check timestamp to prevent replay attacks
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - timestamp) > 300) { // 5 minutes tolerance
    throw new Error('Webhook timestamp too old');
  }
  
  // Create expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  
  const expectedHeader = `sha256=${expectedSignature}`;
  
  // Compare signatures using constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedHeader)
  );
}

// Express middleware example
app.use('/webhooks/tms', express.raw({ type: 'application/json' }), (req, res, next) => {
  const signature = req.headers['x-tms-signature'];
  const timestamp = req.headers['x-tms-timestamp'];
  const secret = process.env.TMS_WEBHOOK_SECRET;
  
  try {
    if (verifyWebhookSignature(req.body, signature, secret, timestamp)) {
      req.body = JSON.parse(req.body);
      next();
    } else {
      res.status(401).send('Invalid signature');
    }
  } catch (error) {
    res.status(400).send('Webhook verification failed');
  }
});
```

#### Verification Example (Python)
```python
import hmac
import hashlib
import time
from flask import request, abort

def verify_webhook_signature(payload, signature, secret, timestamp):
    # Check timestamp
    current_time = int(time.time())
    if abs(current_time - int(timestamp)) > 300:  # 5 minutes tolerance
        raise ValueError('Webhook timestamp too old')
    
    # Create expected signature
    message = f"{timestamp}.{payload}"
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    expected_header = f"sha256={expected_signature}"
    
    # Compare signatures
    return hmac.compare_digest(signature, expected_header)

@app.route('/webhooks/tms', methods=['POST'])
def handle_tms_webhook():
    signature = request.headers.get('X-TMS-Signature')
    timestamp = request.headers.get('X-TMS-Timestamp')
    payload = request.get_data(as_text=True)
    secret = os.getenv('TMS_WEBHOOK_SECRET')
    
    try:
        if verify_webhook_signature(payload, signature, secret, timestamp):
            data = request.get_json()
            # Process webhook data
            return process_webhook_event(data)
        else:
            abort(401, 'Invalid signature')
    except ValueError as e:
        abort(400, str(e))
```

## Platform-Specific Examples

### 1. GitHub Actions Integration

#### Webhook Handler
```yaml
# .github/workflows/tms-webhook-handler.yml
name: TMS Webhook Handler

on:
  repository_dispatch:
    types: [tms-webhook]

jobs:
  handle-webhook:
    runs-on: ubuntu-latest
    steps:
      - name: Handle TMS Event
        run: |
          echo "Event: ${{ github.event.client_payload.event }}"
          echo "Execution ID: ${{ github.event.client_payload.executionId }}"
          
          case "${{ github.event.client_payload.event }}" in
            "execution.completed")
              echo "Test execution completed"
              # Update GitHub status, create issues for failures, etc.
              ;;
            "shard.completed")
              echo "Shard completed: ${{ github.event.client_payload.data.shardId }}"
              ;;
          esac

      - name: Update GitHub Status
        if: github.event.client_payload.event == 'execution.completed'
        uses: actions/github-script@v7
        with:
          script: |
            const status = ${{ github.event.client_payload.data.results.failed }} > 0 ? 'failure' : 'success';
            const description = `Tests: ${{ github.event.client_payload.data.results.total }}, Failed: ${{ github.event.client_payload.data.results.failed }}`;
            
            await github.rest.repos.createCommitStatus({
              owner: context.repo.owner,
              repo: context.repo.repo,
              sha: context.sha,
              state: status,
              description: description,
              context: 'TMS Test Results'
            });
```

#### Webhook Endpoint (Express.js)
```javascript
// webhook-server.js
const express = require('express');
const { Octokit } = require('@octokit/rest');

const app = express();
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

app.post('/webhooks/tms', (req, res) => {
  const event = req.body;
  
  switch (event.event) {
    case 'execution.started':
      handleExecutionStarted(event);
      break;
    case 'execution.completed':
      handleExecutionCompleted(event);
      break;
    case 'shard.completed':
      handleShardCompleted(event);
      break;
  }
  
  res.status(200).send('OK');
});

async function handleExecutionStarted(event) {
  // Trigger GitHub repository dispatch
  await octokit.rest.repos.createDispatchEvent({
    owner: 'your-org',
    repo: 'your-repo',
    event_type: 'tms-webhook',
    client_payload: event
  });
  
  console.log(`Test execution started: ${event.executionId}`);
}

async function handleExecutionCompleted(event) {
  const { data } = event;
  const status = data.results.failed > 0 ? 'failure' : 'success';
  
  // Update GitHub commit status
  await octokit.rest.repos.createCommitStatus({
    owner: 'your-org',
    repo: 'your-repo',
    sha: data.metadata.commit,
    state: status,
    description: `Tests: ${data.results.total}, Failed: ${data.results.failed}`,
    context: 'TMS Test Results',
    target_url: data.artifacts.reportUrl
  });
  
  // Create issues for failed tests
  if (data.results.failed > 0) {
    await createFailureIssues(data.failedTests);
  }
}

async function createFailureIssues(failedTests) {
  for (const test of failedTests.slice(0, 5)) { // Limit to 5 issues
    await octokit.rest.issues.create({
      owner: 'your-org',
      repo: 'your-repo',
      title: `Test Failure: ${test.title}`,
      body: `**File:** ${test.file}\n**Error:** ${test.error}\n\nThis issue was automatically created by TMS.`,
      labels: ['bug', 'test-failure', 'automated']
    });
  }
}
```

### 2. Jenkins Integration

#### Jenkins Pipeline Webhook Handler
```groovy
// Jenkinsfile
pipeline {
    agent any
    
    triggers {
        // Generic webhook trigger plugin
        GenericTrigger(
            genericVariables: [
                [key: 'event', value: '$.event'],
                [key: 'executionId', value: '$.executionId'],
                [key: 'status', value: '$.data.status'],
                [key: 'results', value: '$.data.results']
            ],
            causeString: 'Triggered by TMS webhook',
            token: 'tms-webhook-token',
            regexpFilterText: '$event',
            regexpFilterExpression: 'execution\\.(completed|failed)'
        )
    }
    
    stages {
        stage('Handle TMS Webhook') {
            steps {
                script {
                    echo "Received TMS event: ${env.event}"
                    echo "Execution ID: ${env.executionId}"
                    
                    def results = readJSON text: env.results
                    
                    if (env.event == 'execution.completed') {
                        if (results.failed > 0) {
                            currentBuild.result = 'UNSTABLE'
                            echo "Tests failed: ${results.failed} out of ${results.total}"
                            
                            // Send notifications
                            emailext (
                                subject: "TMS Test Failures - Execution ${env.executionId}",
                                body: "Test execution completed with ${results.failed} failures out of ${results.total} tests.",
                                recipientProviders: [developers()]
                            )
                        } else {
                            echo "All tests passed: ${results.total} tests"
                        }
                    }
                }
            }
        }
        
        stage('Update Dashboard') {
            when {
                expression { env.event == 'execution.completed' }
            }
            steps {
                script {
                    // Update internal dashboard or metrics
                    def results = readJSON text: env.results
                    
                    // Example: Update InfluxDB metrics
                    sh """
                        curl -XPOST 'http://influxdb:8086/write?db=tms' -d 'test_results,execution=${env.executionId} total=${results.total},passed=${results.passed},failed=${results.failed}'
                    """
                }
            }
        }
    }
}
```

#### Jenkins Shared Library
```groovy
// vars/handleTMSWebhook.groovy
def call(Map config) {
    pipeline {
        agent any
        stages {
            stage('Process TMS Webhook') {
                steps {
                    script {
                        def webhookData = params.WEBHOOK_DATA ? readJSON(text: params.WEBHOOK_DATA) : [:]
                        
                        switch(webhookData.event) {
                            case 'execution.started':
                                echo "🚀 Test execution started: ${webhookData.executionId}"
                                updateBuildDescription("TMS Execution: ${webhookData.executionId}")
                                break
                                
                            case 'shard.completed':
                                def shardData = webhookData.data
                                echo "📊 Shard ${shardData.shardId} completed: ${shardData.results.passed}/${shardData.results.total} passed"
                                break
                                
                            case 'execution.completed':
                                def results = webhookData.data.results
                                def status = results.failed > 0 ? '❌ FAILED' : '✅ PASSED'
                                echo "${status} Test execution completed: ${results.passed}/${results.total} passed"
                                
                                if (results.failed > 0) {
                                    currentBuild.result = 'UNSTABLE'
                                    def failedTests = webhookData.data.failedTests ?: []
                                    publishTestResults([
                                        total: results.total,
                                        passed: results.passed,
                                        failed: results.failed,
                                        failedTests: failedTests
                                    ])
                                }
                                break
                        }
                    }
                }
            }
        }
    }
}

def publishTestResults(results) {
    // Create JUnit XML for Jenkins test result publishing
    def xml = generateJUnitXML(results)
    writeFile file: 'tms-results.xml', text: xml
    
    publishTestResults testResultsPattern: 'tms-results.xml'
    
    // Send Slack notification
    if (results.failed > 0) {
        slackSend(
            channel: '#testing',
            color: 'danger',
            message: "🚨 TMS Test Failures: ${results.failed} out of ${results.total} tests failed"
        )
    }
}
```

### 3. GitLab CI Integration

#### GitLab CI Webhook Pipeline
```yaml
# .gitlab-ci.yml
stages:
  - webhook-handler

variables:
  WEBHOOK_SECRET: $TMS_WEBHOOK_SECRET

tms-webhook-handler:
  stage: webhook-handler
  image: node:18-alpine
  only:
    - webhooks
  script:
    - |
      echo "Processing TMS webhook event..."
      
      # Parse webhook payload (GitLab provides it as CI_PIPELINE_SOURCE)
      if [ "$CI_PIPELINE_SOURCE" = "webhook" ]; then
        echo "Webhook received from TMS"
        
        # Example webhook processing
        case "$TMS_EVENT" in
          "execution.completed")
            echo "✅ Test execution completed"
            echo "Results: $TMS_RESULTS"
            
            # Update GitLab commit status
            curl -X POST "$CI_API_V4_URL/projects/$CI_PROJECT_ID/statuses/$CI_COMMIT_SHA" \
              -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
              -d "state=success&description=TMS tests passed"
            ;;
          "execution.failed")
            echo "❌ Test execution failed"
            
            # Update GitLab commit status
            curl -X POST "$CI_API_V4_URL/projects/$CI_PROJECT_ID/statuses/$CI_COMMIT_SHA" \
              -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
              -d "state=failed&description=TMS tests failed"
            ;;
        esac
      fi

  # Create merge request comment with test results
  after_script:
    - |
      if [ "$TMS_EVENT" = "execution.completed" ] && [ -n "$CI_MERGE_REQUEST_IID" ]; then
        COMMENT="## 🧪 TMS Test Results\n\n"
        COMMENT="${COMMENT}**Status:** $TMS_STATUS\n"
        COMMENT="${COMMENT}**Total Tests:** $TMS_TOTAL\n"
        COMMENT="${COMMENT}**Passed:** $TMS_PASSED\n"
        COMMENT="${COMMENT}**Failed:** $TMS_FAILED\n\n"
        COMMENT="${COMMENT}[View Full Report]($TMS_REPORT_URL)"
        
        curl -X POST "$CI_API_V4_URL/projects/$CI_PROJECT_ID/merge_requests/$CI_MERGE_REQUEST_IID/notes" \
          -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
          -d "body=$COMMENT"
      fi
```

#### GitLab Webhook Handler (Ruby)
```ruby
# webhook_handler.rb
require 'sinatra'
require 'json'
require 'net/http'
require 'uri'

class TMSWebhookHandler < Sinatra::Base
  configure do
    set :logging, true
  end

  post '/webhooks/tms' do
    request.body.rewind
    payload = JSON.parse(request.body.read)
    
    # Verify webhook signature
    signature = request.env['HTTP_X_TMS_SIGNATURE']
    unless verify_signature(payload, signature)
      halt 401, 'Invalid signature'
    end
    
    handle_webhook_event(payload)
    
    status 200
    body 'OK'
  end

  private

  def handle_webhook_event(payload)
    case payload['event']
    when 'execution.started'
      handle_execution_started(payload)
    when 'execution.completed'
      handle_execution_completed(payload)
    when 'shard.completed'
      handle_shard_completed(payload)
    end
  end

  def handle_execution_started(payload)
    execution_id = payload['executionId']
    logger.info "Test execution started: #{execution_id}"
    
    # Trigger GitLab pipeline
    trigger_gitlab_pipeline(execution_id, payload['data'])
  end

  def handle_execution_completed(payload)
    data = payload['data']
    results = data['results']
    
    logger.info "Test execution completed: #{payload['executionId']}"
    logger.info "Results: #{results['passed']}/#{results['total']} passed"
    
    # Update GitLab commit status
    update_gitlab_status(data)
    
    # Send notifications if there are failures
    if results['failed'] > 0
      send_failure_notifications(data)
    end
  end

  def trigger_gitlab_pipeline(execution_id, data)
    uri = URI("#{ENV['GITLAB_URL']}/api/v4/projects/#{ENV['GITLAB_PROJECT_ID']}/trigger/pipeline")
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    
    request = Net::HTTP::Post.new(uri)
    request['Content-Type'] = 'application/json'
    request.body = {
      token: ENV['GITLAB_TRIGGER_TOKEN'],
      ref: 'main',
      variables: {
        TMS_EVENT: 'execution.started',
        TMS_EXECUTION_ID: execution_id,
        TMS_TEST_SUITE: data['testSuite'],
        TMS_ENVIRONMENT: data['environment']
      }
    }.to_json
    
    response = http.request(request)
    logger.info "GitLab pipeline trigger response: #{response.code}"
  end

  def update_gitlab_status(data)
    state = data['results']['failed'] > 0 ? 'failed' : 'success'
    description = "TMS: #{data['results']['passed']}/#{data['results']['total']} tests passed"
    
    uri = URI("#{ENV['GITLAB_URL']}/api/v4/projects/#{ENV['GITLAB_PROJECT_ID']}/statuses/#{data['metadata']['commit']}")
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    
    request = Net::HTTP::Post.new(uri)
    request['PRIVATE-TOKEN'] = ENV['GITLAB_TOKEN']
    request['Content-Type'] = 'application/json'
    request.body = {
      state: state,
      description: description,
      context: 'TMS Test Results',
      target_url: data['artifacts']['reportUrl']
    }.to_json
    
    response = http.request(request)
    logger.info "GitLab status update response: #{response.code}"
  end

  def verify_signature(payload, signature)
    return false unless signature
    
    expected_signature = "sha256=#{OpenSSL::HMAC.hexdigest('sha256', ENV['TMS_WEBHOOK_SECRET'], payload.to_json)}"
    Rack::Utils.secure_compare(signature, expected_signature)
  end
end
```

### 4. Azure DevOps Integration

#### Azure DevOps Extension
```typescript
// azure-devops-tms-webhook.ts
import * as tl from 'azure-pipelines-task-lib/task';
import * as azdev from 'azure-devops-node-api';

export async function handleTMSWebhook(webhookData: any) {
  const organizationUrl = tl.getVariable('System.TeamFoundationCollectionUri');
  const project = tl.getVariable('System.TeamProject');
  const accessToken = tl.getVariable('System.AccessToken');
  
  const authHandler = azdev.getPersonalAccessTokenHandler(accessToken!);
  const connection = new azdev.WebApi(organizationUrl!, authHandler);
  
  switch (webhookData.event) {
    case 'execution.started':
      await handleExecutionStarted(connection, project!, webhookData);
      break;
    case 'execution.completed':
      await handleExecutionCompleted(connection, project!, webhookData);
      break;
    case 'shard.completed':
      await handleShardCompleted(connection, project!, webhookData);
      break;
  }
}

async function handleExecutionStarted(connection: azdev.WebApi, project: string, data: any) {
  console.log(`🚀 TMS test execution started: ${data.executionId}`);
  
  // Update build status
  const buildApi = await connection.getBuildApi();
  const buildId = parseInt(tl.getVariable('Build.BuildId')!);
  
  await buildApi.addBuildTag(project, buildId, `tms-execution-${data.executionId}`);
}

async function handleExecutionCompleted(connection: azdev.WebApi, project: string, data: any) {
  const results = data.data.results;
  const status = results.failed > 0 ? 'failed' : 'succeeded';
  
  console.log(`✅ TMS test execution completed: ${results.passed}/${results.total} passed`);
  
  // Update build result
  if (results.failed > 0) {
    tl.setResult(tl.TaskResult.Failed, `${results.failed} tests failed`);
  }
  
  // Create work items for failed tests
  if (results.failed > 0 && data.data.failedTests) {
    await createWorkItemsForFailures(connection, project, data.data.failedTests);
  }
  
  // Publish test results
  await publishTestResults(results, data.data.failedTests || []);
}

async function createWorkItemsForFailures(connection: azdev.WebApi, project: string, failedTests: any[]) {
  const workItemApi = await connection.getWorkItemTrackingApi();
  
  for (const test of failedTests.slice(0, 10)) { // Limit to 10 work items
    const workItem = [
      {
        op: 'add',
        path: '/fields/System.Title',
        value: `Test Failure: ${test.title}`
      },
      {
        op: 'add',
        path: '/fields/System.Description',
        value: `<div><strong>File:</strong> ${test.file}</div><div><strong>Error:</strong> ${test.error}</div>`
      },
      {
        op: 'add',
        path: '/fields/System.Tags',
        value: 'TMS; Test-Failure; Automated'
      }
    ];
    
    try {
      await workItemApi.createWorkItem(workItem, project, 'Bug');
      console.log(`Created work item for failed test: ${test.title}`);
    } catch (error) {
      console.warn(`Failed to create work item for test: ${test.title}`, error);
    }
  }
}

async function publishTestResults(results: any, failedTests: any[]) {
  // Generate JUnit XML for Azure DevOps test publishing
  const junitXml = generateJUnitXML(results, failedTests);
  
  // Write XML file
  const fs = require('fs');
  fs.writeFileSync('tms-test-results.xml', junitXml);
  
  // Publish test results
  tl.command('results.publish', {
    type: 'JUnit',
    files: 'tms-test-results.xml',
    runTitle: 'TMS Test Results'
  }, '');
}

function generateJUnitXML(results: any, failedTests: any[]): string {
  const testcases = failedTests.map(test => `
    <testcase name="${escapeXml(test.title)}" classname="${escapeXml(test.file)}">
      <failure message="${escapeXml(test.error)}">${escapeXml(test.error)}</failure>
    </testcase>
  `).join('');
  
  const passedTests = Array(results.passed).fill(0).map((_, i) => `
    <testcase name="Passed Test ${i + 1}" classname="PassedTests" />
  `).join('');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="TMS Test Results" tests="${results.total}" failures="${results.failed}" skipped="${results.skipped}">
  ${testcases}
  ${passedTests}
</testsuite>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
```

### 5. Slack Integration

#### Slack Webhook Handler
```javascript
// slack-tms-integration.js
const { WebClient } = require('@slack/web-api');
const { createEventAdapter } = require('@slack/events-api');

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

class SlackTMSIntegration {
  constructor() {
    this.channels = {
      general: '#testing',
      failures: '#test-failures',
      alerts: '#alerts'
    };
  }

  async handleWebhook(event) {
    switch (event.event) {
      case 'execution.started':
        await this.notifyExecutionStarted(event);
        break;
      case 'execution.completed':
        await this.notifyExecutionCompleted(event);
        break;
      case 'shard.completed':
        await this.notifyShardCompleted(event);
        break;
    }
  }

  async notifyExecutionStarted(event) {
    const { executionId, data } = event;
    
    await slack.chat.postMessage({
      channel: this.channels.general,
      text: `🚀 TMS test execution started`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Test Execution Started* 🚀\n*Execution ID:* ${executionId}\n*Test Suite:* ${data.testSuite}\n*Environment:* ${data.environment}`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Provider: ${data.provider} | Branch: ${data.metadata?.branch || 'unknown'}`
            }
          ]
        }
      ]
    });
  }

  async notifyExecutionCompleted(event) {
    const { executionId, data } = event;
    const { results } = data;
    const success = results.failed === 0;
    
    const emoji = success ? '✅' : '❌';
    const color = success ? 'good' : 'danger';
    const channel = success ? this.channels.general : this.channels.failures;
    
    const message = await slack.chat.postMessage({
      channel,
      text: `${emoji} TMS test execution ${success ? 'completed successfully' : 'failed'}`,
      attachments: [
        {
          color,
          fields: [
            {
              title: 'Execution ID',
              value: executionId,
              short: true
            },
            {
              title: 'Status',
              value: success ? 'Success' : 'Failed',
              short: true
            },
            {
              title: 'Total Tests',
              value: results.total.toString(),
              short: true
            },
            {
              title: 'Passed',
              value: results.passed.toString(),
              short: true
            },
            {
              title: 'Failed',
              value: results.failed.toString(),
              short: true
            },
            {
              title: 'Skipped',
              value: results.skipped.toString(),
              short: true
            }
          ],
          actions: [
            {
              type: 'button',
              text: 'View Report',
              url: data.artifacts.reportUrl,
              style: 'primary'
            }
          ]
        }
      ]
    });

    // Create thread with failed test details if there are failures
    if (!success && data.failedTests && data.failedTests.length > 0) {
      const failedTestsText = data.failedTests
        .slice(0, 10) // Limit to 10 failed tests
        .map(test => `• *${test.title}*\n  File: \`${test.file}\`\n  Error: ${test.error}`)
        .join('\n\n');

      await slack.chat.postMessage({
        channel,
        thread_ts: message.ts,
        text: `Failed Tests (showing first ${Math.min(data.failedTests.length, 10)}):\n\n${failedTestsText}`
      });
    }
  }

  async notifyShardCompleted(event) {
    const { executionId, data } = event;
    const { shardId, results } = data;
    
    // Only post shard updates to a thread or specific channel for high-visibility executions
    if (results.failed > 0) {
      await slack.chat.postMessage({
        channel: this.channels.failures,
        text: `⚠️ Shard ${shardId} completed with ${results.failed} failures`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Shard ${shardId} Completed*\n*Execution:* ${executionId}\n*Results:* ${results.passed}/${results.total} passed`
            }
          }
        ]
      });
    }
  }

  // Interactive commands
  async handleSlashCommand(command, response_url) {
    switch (command.command) {
      case '/tms-status':
        await this.handleStatusCommand(command, response_url);
        break;
      case '/tms-retry':
        await this.handleRetryCommand(command, response_url);
        break;
    }
  }

  async handleStatusCommand(command, response_url) {
    const executionId = command.text.trim();
    
    if (!executionId) {
      return {
        response_type: 'ephemeral',
        text: 'Please provide an execution ID: `/tms-status exec_123456`'
      };
    }
    
    try {
      // Fetch status from TMS API
      const status = await this.getTMSExecutionStatus(executionId);
      
      return {
        response_type: 'in_channel',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*TMS Execution Status*\n*ID:* ${executionId}\n*Status:* ${status.status}\n*Progress:* ${status.progress.shardsCompleted}/${status.progress.totalShards} shards`
            }
          }
        ]
      };
    } catch (error) {
      return {
        response_type: 'ephemeral',
        text: `Error fetching status for execution ${executionId}: ${error.message}`
      };
    }
  }

  async getTMSExecutionStatus(executionId) {
    // Implementation to fetch from TMS API
    const response = await fetch(`${process.env.TMS_API_URL}/executions/${executionId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.TMS_API_TOKEN}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`TMS API error: ${response.statusText}`);
    }
    
    return response.json();
  }
}

// Express app setup
const express = require('express');
const app = express();

app.use(express.json());

const slackIntegration = new SlackTMSIntegration();

app.post('/webhooks/tms', async (req, res) => {
  try {
    await slackIntegration.handleWebhook(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling TMS webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

app.post('/slack/commands', async (req, res) => {
  try {
    const result = await slackIntegration.handleSlashCommand(req.body, req.body.response_url);
    res.json(result);
  } catch (error) {
    console.error('Error handling Slack command:', error);
    res.status(500).json({
      response_type: 'ephemeral',
      text: 'Error processing command'
    });
  }
});

module.exports = { SlackTMSIntegration };
```

## Error Handling and Retry Logic

### Robust Webhook Processing
```javascript
class WebhookProcessor {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.timeout = options.timeout || 30000;
  }

  async processWebhook(webhookData) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.handleWebhookWithTimeout(webhookData);
        return; // Success
      } catch (error) {
        console.error(`Webhook processing attempt ${attempt} failed:`, error.message);
        
        if (attempt === this.maxRetries) {
          throw new Error(`Webhook processing failed after ${this.maxRetries} attempts: ${error.message}`);
        }
        
        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }
  }

  async handleWebhookWithTimeout(webhookData) {
    return Promise.race([
      this.handleWebhook(webhookData),
      this.timeoutPromise()
    ]);
  }

  timeoutPromise() {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Webhook processing timeout')), this.timeout);
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async handleWebhook(webhookData) {
    // Validate webhook data
    this.validateWebhookData(webhookData);
    
    // Process based on event type
    switch (webhookData.event) {
      case 'execution.started':
        await this.handleExecutionStarted(webhookData);
        break;
      case 'execution.completed':
        await this.handleExecutionCompleted(webhookData);
        break;
      case 'shard.completed':
        await this.handleShardCompleted(webhookData);
        break;
      default:
        console.warn(`Unknown webhook event: ${webhookData.event}`);
    }
  }

  validateWebhookData(data) {
    if (!data.event) throw new Error('Missing event field');
    if (!data.executionId) throw new Error('Missing executionId field');
    if (!data.timestamp) throw new Error('Missing timestamp field');
    
    // Validate timestamp is recent (within 5 minutes)
    const webhookTime = new Date(data.timestamp);
    const now = new Date();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    if (now - webhookTime > maxAge) {
      throw new Error('Webhook timestamp too old');
    }
  }
}
```

This comprehensive webhook integration guide provides practical examples for integrating TMS webhooks with major CI/CD platforms and communication tools, ensuring reliable and secure webhook processing across different environments.