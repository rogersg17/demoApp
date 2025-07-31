/**
 * Custom Playwright Reporter with Jira Integration
 * 
 * This reporter extends the default Playwright reporting functionality
 * to automatically create Jira issues when tests fail.
 */

const { Reporter } = require('@playwright/test/reporter');
const { JiraIntegration } = require('../utils/jira-integration');
const fs = require('fs');
const path = require('path');

class JiraReporter {
  constructor(options = {}) {
    this.options = {
      // Default configuration
      createIssueOnFailure: true,
      createIssueOnTimeout: true,
      createIssueOnRetry: false,
      attachScreenshots: true,
      attachTraces: true,
      attachVideos: true,
      ...options
    };

    // Initialize Jira integration
    this.jiraIntegration = new JiraIntegration(this.options.jira || {});
    
    // Track created issues to avoid duplicates
    this.createdIssues = new Map();
    
    // Statistics
    this.stats = {
      totalTests: 0,
      failedTests: 0,
      jiraIssuesCreated: 0,
      jiraIssuesFailed: 0
    };

    console.log('🎭 Jira Reporter initialized');
    if (this.jiraIntegration.config.enabled) {
      console.log(`✅ Jira integration enabled for project: ${this.jiraIntegration.config.projectKey}`);
    } else {
      console.log('⚠️  Jira integration disabled');
    }
  }

  onBegin(config, suite) {
    this.config = config;
    this.suite = suite;
    this.startTime = Date.now();
    
    console.log(`🚀 Starting test run with ${this.getAllTests(suite).length} tests`);
  }

  onTestBegin(test, result) {
    this.stats.totalTests++;
  }

  async onTestEnd(test, result) {
    // Handle test failures
    if (this.shouldCreateJiraIssue(result)) {
      await this.handleTestFailure(test, result);
    }

    // Handle retries
    if (result.retry > 0 && this.options.createIssueOnRetry) {
      await this.handleTestRetry(test, result);
    }
  }

  onEnd(result) {
    const duration = Date.now() - this.startTime;
    
    console.log('\n📊 Test Run Summary:');
    console.log(`   Total Tests: ${this.stats.totalTests}`);
    console.log(`   Failed Tests: ${this.stats.failedTests}`);
    console.log(`   Duration: ${duration}ms`);
    
    if (this.jiraIntegration.config.enabled) {
      console.log('\n🎯 Jira Integration Summary:');
      console.log(`   Issues Created: ${this.stats.jiraIssuesCreated}`);
      console.log(`   Creation Failures: ${this.stats.jiraIssuesFailed}`);
    }

    // Generate summary report
    this.generateSummaryReport(result, duration);
  }

  onError(error) {
    console.error('❌ Reporter error:', error);
  }

  /**
   * Determines if a Jira issue should be created for this test result
   */
  shouldCreateJiraIssue(result) {
    if (!this.jiraIntegration.config.enabled) {
      return false;
    }

    if (result.status === 'failed' && this.options.createIssueOnFailure) {
      return true;
    }

    if (result.status === 'timedOut' && this.options.createIssueOnTimeout) {
      return true;
    }

    return false;
  }

  /**
   * Handles test failure by creating a Jira issue
   */
  async handleTestFailure(test, result) {
    this.stats.failedTests++;

    try {
      // Generate unique key for this test to avoid duplicates
      const testKey = this.generateTestKey(test);
      
      if (this.createdIssues.has(testKey)) {
        console.log(`⏭️  Skipping duplicate issue creation for: ${test.title}`);
        return;
      }

      console.log(`🔴 Test failed: ${test.title}`);
      console.log(`   Creating Jira issue...`);

      // Attach additional files if available
      const enhancedResult = await this.enhanceResultWithAttachments(result);

      // Create Jira issue
      const issue = await this.jiraIntegration.createIssueForFailure(enhancedResult, test);
      
      if (issue) {
        this.createdIssues.set(testKey, issue);
        this.stats.jiraIssuesCreated++;
        
        // Log issue details
        console.log(`   ✅ Jira issue created: ${issue.key}`);
        console.log(`   🔗 URL: ${this.jiraIntegration.config.jiraUrl}/browse/${issue.key}`);
      } else {
        this.stats.jiraIssuesFailed++;
      }

    } catch (error) {
      this.stats.jiraIssuesFailed++;
      console.error(`   ❌ Failed to create Jira issue for ${test.title}:`, error.message);
    }
  }

  /**
   * Handles test retry scenarios
   */
  async handleTestRetry(test, result) {
    try {
      const testKey = this.generateTestKey(test);
      const existingIssue = this.createdIssues.get(testKey);

      if (existingIssue) {
        console.log(`🔄 Updating existing Jira issue for retry: ${existingIssue.key}`);
        await this.jiraIntegration.updateIssueForRetry(existingIssue.key, result, result.retry);
      }
    } catch (error) {
      console.error(`❌ Failed to update Jira issue for retry:`, error.message);
    }
  }

  /**
   * Enhances test result with additional attachments
   */
  async enhanceResultWithAttachments(result) {
    const enhancedResult = { ...result };
    
    if (!enhancedResult.attachments) {
      enhancedResult.attachments = [];
    }

    // Add screenshots
    if (this.options.attachScreenshots) {
      const screenshots = result.attachments?.filter(a => 
        a.name === 'screenshot' || a.contentType?.startsWith('image/')
      ) || [];
      enhancedResult.attachments.push(...screenshots);
    }

    // Add traces
    if (this.options.attachTraces) {
      const traces = result.attachments?.filter(a => 
        a.name === 'trace' || a.contentType === 'application/zip'
      ) || [];
      enhancedResult.attachments.push(...traces);
    }

    // Add videos
    if (this.options.attachVideos) {
      const videos = result.attachments?.filter(a => 
        a.name === 'video' || a.contentType?.startsWith('video/')
      ) || [];
      enhancedResult.attachments.push(...videos);
    }

    return enhancedResult;
  }

  /**
   * Generates a unique key for a test
   */
  generateTestKey(test) {
    const file = test.location?.file || 'unknown';
    const line = test.location?.line || 0;
    const title = test.title;
    
    return `${path.basename(file)}:${line}:${title}`;
  }

  /**
   * Gets all tests from suite recursively
   */
  getAllTests(suite) {
    const tests = [];
    
    for (const child of suite.suites || []) {
      tests.push(...this.getAllTests(child));
    }
    
    for (const test of suite.tests || []) {
      tests.push(test);
    }
    
    return tests;
  }

  /**
   * Generates a summary report file
   */
  generateSummaryReport(result, duration) {
    try {
      const reportData = {
        timestamp: new Date().toISOString(),
        duration,
        status: result.status,
        stats: this.stats,
        jiraIntegration: {
          enabled: this.jiraIntegration.config.enabled,
          projectKey: this.jiraIntegration.config.projectKey,
          issuesCreated: Array.from(this.createdIssues.entries()).map(([testKey, issue]) => ({
            testKey,
            issueKey: issue.key,
            issueUrl: `${this.jiraIntegration.config.jiraUrl}/browse/${issue.key}`
          }))
        },
        configuration: {
          testDir: this.config.testDir,
          projects: this.config.projects?.map(p => p.name) || [],
          reporter: 'jira-reporter'
        }
      };

      const reportPath = path.join(process.cwd(), 'jira-test-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
      
      console.log(`\n📋 Summary report saved: ${reportPath}`);
    } catch (error) {
      console.error('❌ Failed to generate summary report:', error.message);
    }
  }

  /**
   * Static method to create reporter instance (required by Playwright)
   */
  static create(options) {
    return new JiraReporter(options);
  }
}

module.exports = JiraReporter;
