import { Reporter, FullConfig, Suite, TestCase, TestResult, TestError, FullResult } from '@playwright/test/reporter';
import { JiraIntegration } from '../utils/jira-integration'; // Assuming this will be a TS file or has declarations
import * as fs from 'fs';
import * as path from 'path';

interface JiraReporterOptions {
  createIssueOnFailure?: boolean;
  createIssueOnTimeout?: boolean;
  createIssueOnRetry?: boolean;
  attachScreenshots?: boolean;
  attachTraces?: boolean;
  attachVideos?: boolean;
  jira?: any; // Consider defining a type for Jira options
}

class JiraReporter implements Reporter {
  private options: Required<JiraReporterOptions>;
  private jiraIntegration: JiraIntegration;
  private createdIssues = new Map<string, any>(); // Consider a type for the Jira issue
  private config!: FullConfig;
  private suite!: Suite;
  private startTime!: number;

  private stats = {
    totalTests: 0,
    failedTests: 0,
    jiraIssuesCreated: 0,
    jiraIssuesFailed: 0
  };

  constructor(options: JiraReporterOptions = {}) {
    this.options = {
      createIssueOnFailure: true,
      createIssueOnTimeout: true,
      createIssueOnRetry: false,
      attachScreenshots: true,
      attachTraces: true,
      attachVideos: true,
      jira: {},
      ...options
    };

    this.jiraIntegration = new JiraIntegration(this.options.jira);

    console.log('🎭 Jira Reporter initialized');
    if (this.jiraIntegration.enabled) {
      console.log(`✅ Jira integration enabled for project: ${this.jiraIntegration.projectKey}`);
    } else {
      console.log('⚠️  Jira integration disabled');
    }
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.suite = suite;
    this.startTime = Date.now();
    
    console.log(`🚀 Starting test run with ${this.getAllTests(suite).length} tests`);
  }

  onTestBegin(_test: TestCase): void {
    this.stats.totalTests++;
  }

  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    if (this.shouldCreateJiraIssue(result)) {
      await this.handleTestFailure(test, result);
    }

    if (result.retry > 0 && this.options.createIssueOnRetry) {
      await this.handleTestRetry(test, result);
    }
  }

  onEnd(result: FullResult): void {
    const duration = Date.now() - this.startTime;
    
    console.log('\n📊 Test Run Summary:');
    console.log(`   Total Tests: ${this.stats.totalTests}`);
    console.log(`   Failed Tests: ${this.stats.failedTests}`);
    console.log(`   Duration: ${duration}ms`);
    
    if (this.jiraIntegration.enabled) {
      console.log('\n🎯 Jira Integration Summary:');
      console.log(`   Issues Created: ${this.stats.jiraIssuesCreated}`);
      console.log(`   Creation Failures: ${this.stats.jiraIssuesFailed}`);
    }

    this.generateSummaryReport(result, duration);
  }

  onError(error: TestError): void {
    console.error('❌ Reporter error:', error);
  }

  private shouldCreateJiraIssue(result: TestResult): boolean {
    if (!this.jiraIntegration.enabled) {
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

  private async handleTestFailure(test: TestCase, result: TestResult): Promise<void> {
    this.stats.failedTests++;

    try {
      const testKey = this.generateTestKey(test);
      
      if (this.createdIssues.has(testKey)) {
        console.log(`⏭️  Skipping duplicate issue creation for: ${test.title}`);
        return;
      }

      console.log(`🔴 Test failed: ${test.title}`);
      console.log(`   Creating Jira issue...`);

      const enhancedResult = this.enhanceResultWithAttachments(result);

      const issue = await this.jiraIntegration.createIssueForFailure(enhancedResult, test);
      
      if (issue) {
        this.createdIssues.set(testKey, issue);
        this.stats.jiraIssuesCreated++;
        
        console.log(`   ✅ Jira issue created: ${issue.key}`);
        console.log(`   🔗 URL: ${this.jiraIntegration.jiraUrl}/browse/${issue.key}`);
      } else {
        this.stats.jiraIssuesFailed++;
      }

    } catch (error: any) {
      this.stats.jiraIssuesFailed++;
      console.error(`   ❌ Failed to create Jira issue for ${test.title}:`, error.message);
    }
  }

  private async handleTestRetry(test: TestCase, result: TestResult): Promise<void> {
    try {
      const testKey = this.generateTestKey(test);
      const existingIssue = this.createdIssues.get(testKey);

      if (existingIssue) {
        console.log(`🔄 Updating existing Jira issue for retry: ${existingIssue.key}`);
        await this.jiraIntegration.updateIssueForRetry(existingIssue.key, result, result.retry);
      }
    } catch (error: any) {
      console.error(`❌ Failed to update Jira issue for retry:`, error.message);
    }
  }

  private enhanceResultWithAttachments(result: TestResult): TestResult {
    const enhancedResult = { ...result };
    
    if (!enhancedResult.attachments) {
      enhancedResult.attachments = [];
    }

    if (this.options.attachScreenshots) {
      const screenshots = result.attachments?.filter(a => 
        a.name === 'screenshot' || a.contentType?.startsWith('image/')
      ) || [];
      enhancedResult.attachments.push(...screenshots);
    }

    if (this.options.attachTraces) {
      const traces = result.attachments?.filter(a => 
        a.name === 'trace' || a.contentType === 'application/zip'
      ) || [];
      enhancedResult.attachments.push(...traces);
    }

    if (this.options.attachVideos) {
      const videos = result.attachments?.filter(a => 
        a.name === 'video' || a.contentType?.startsWith('video/')
      ) || [];
      enhancedResult.attachments.push(...videos);
    }

    return enhancedResult;
  }

  private generateTestKey(test: TestCase): string {
    const file = test.location?.file || 'unknown';
    const line = test.location?.line || 0;
    const title = test.title;
    
    return `${path.basename(file)}:${line}:${title}`;
  }

  private getAllTests(suite: Suite): TestCase[] {
    const tests: TestCase[] = [];
    
    for (const child of suite.suites || []) {
      tests.push(...this.getAllTests(child));
    }
    
    for (const test of suite.tests || []) {
      tests.push(test);
    }
    
    return tests;
  }

  private generateSummaryReport(result: FullResult, duration: number): void {
    try {
      const reportData = {
        timestamp: new Date().toISOString(),
        duration,
        status: result.status,
        stats: this.stats,
        jiraIntegration: {
          enabled: this.jiraIntegration.enabled,
          projectKey: this.jiraIntegration.projectKey,
          issuesCreated: Array.from(this.createdIssues.entries()).map(([testKey, issue]) => ({
            testKey,
            issueKey: issue.key,
            issueUrl: `${this.jiraIntegration.jiraUrl}/browse/${issue.key}`
          }))
        },
        configuration: {
          testDir: this.config.rootDir,
          projects: this.config.projects?.map(p => p.name) || [],
          reporter: 'jira-reporter'
        }
      };

      const reportPath = path.join(process.cwd(), 'jira-test-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
      
      console.log(`\n📋 Summary report saved: ${reportPath}`);
    } catch (error: any) {
      console.error('❌ Failed to generate summary report:', error.message);
    }
  }
}

export = JiraReporter;
