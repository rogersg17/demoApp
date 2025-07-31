/**
 * Jira Integration Utility for Test Failure Reporting
 * 
 * This utility handles the creation of Jira issues when tests fail,
 * including detailed information about the failure, screenshots, and test metadata.
 */

const fs = require('fs');
const path = require('path');

class JiraIntegration {
  constructor(config) {
    this.config = {
      jiraUrl: config.jiraUrl || process.env.JIRA_URL,
      username: config.username || process.env.JIRA_USERNAME,
      apiToken: config.apiToken || process.env.JIRA_API_TOKEN,
      projectKey: config.projectKey || process.env.JIRA_PROJECT_KEY || 'TEST',
      issueType: config.issueType || 'Bug',
      enabled: config.enabled !== false && process.env.JIRA_ENABLED !== 'false',
      ...config
    };

    if (this.config.enabled && !this.isConfigValid()) {
      console.warn('Jira integration is enabled but configuration is incomplete. Disabling Jira reporting.');
      this.config.enabled = false;
    }
  }

  isConfigValid() {
    return !!(this.config.jiraUrl && this.config.username && this.config.apiToken && this.config.projectKey);
  }

  /**
   * Creates a Jira issue for a test failure
   * @param {Object} testResult - Playwright test result object
   * @param {Object} testCase - Playwright test case object
   * @returns {Promise<Object|null>} Created issue details or null if disabled/failed
   */
  async createIssueForFailure(testResult, testCase) {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const issueData = await this.buildIssueData(testResult, testCase);
      const issue = await this.createJiraIssue(issueData);
      
      // Attach screenshots if available
      if (testResult.attachments && testResult.attachments.length > 0) {
        await this.attachFilesToIssue(issue.key, testResult.attachments);
      }

      console.log(`✅ Jira issue created: ${issue.key} - ${this.config.jiraUrl}/browse/${issue.key}`);
      return issue;
    } catch (error) {
      console.error('❌ Failed to create Jira issue:', error.message);
      return null;
    }
  }

  /**
   * Builds the issue data structure for Jira
   */
  async buildIssueData(testResult, testCase) {
    const failureDetails = this.extractFailureDetails(testResult);
    const testMetadata = this.extractTestMetadata(testCase);
    
    const summary = `🔴 Test Failure: ${testCase.title}`;
    
    const description = this.buildDescription({
      testCase,
      testResult,
      failureDetails,
      testMetadata
    });

    const labels = this.generateLabels(testCase, testResult);

    // Build base fields that are standard across most Jira installations
    const baseFields = {
      project: {
        key: this.config.projectKey
      },
      summary,
      description,
      issuetype: {
        name: this.config.issueType
      },
      labels,
      priority: {
        name: this.determinePriority(testResult)
      }
    };

    // Add optional fields only if they are configured and enabled
    const optionalFields = {};
    
    // Only add components if explicitly configured
    if (this.config.components && Array.isArray(this.config.components) && this.config.components.length > 0) {
      optionalFields.components = this.config.components;
    }

    // Add custom fields if configured
    if (this.config.customFields && typeof this.config.customFields === 'object') {
      Object.assign(optionalFields, this.config.customFields);
    }

    return {
      fields: {
        ...baseFields,
        ...optionalFields
      }
    };
  }

  /**
   * Extracts failure details from test result
   */
  extractFailureDetails(testResult) {
    const errors = testResult.errors || [];
    const failureMessages = errors.map(error => error.message || error.toString());
    
    return {
      status: testResult.status,
      duration: testResult.duration,
      errors: failureMessages,
      retry: testResult.retry || 0,
      startTime: testResult.startTime,
      stdout: testResult.stdout || [],
      stderr: testResult.stderr || []
    };
  }

  /**
   * Extracts test metadata
   */
  extractTestMetadata(testCase) {
    return {
      title: testCase.title,
      file: testCase.location?.file || 'unknown',
      line: testCase.location?.line || 0,
      column: testCase.location?.column || 0,
      projectName: testCase.parent?.project()?.name || 'unknown',
      tags: testCase.tags || [],
      annotations: testCase.annotations || []
    };
  }

  /**
   * Builds the detailed description for the Jira issue
   */
  buildDescription({ testCase, testResult, failureDetails, testMetadata }) {
    const sections = [];

    // Test Information
    sections.push('h2. Test Information');
    sections.push(`*Test Name:* ${testCase.title}`);
    sections.push(`*Test File:* ${testMetadata.file}`);
    sections.push(`*Line:* ${testMetadata.line}`);
    sections.push(`*Project:* ${testMetadata.projectName}`);
    sections.push(`*Duration:* ${failureDetails.duration}ms`);
    sections.push(`*Retry Attempt:* ${failureDetails.retry}`);
    sections.push(`*Timestamp:* ${new Date(failureDetails.startTime).toISOString()}`);
    sections.push('');

    // Failure Details
    sections.push('h2. Failure Details');
    sections.push(`*Status:* ${failureDetails.status}`);
    
    if (failureDetails.errors.length > 0) {
      sections.push('*Error Messages:*');
      failureDetails.errors.forEach((error, index) => {
        sections.push(`{code:javascript}`);
        sections.push(`Error ${index + 1}: ${error}`);
        sections.push(`{code}`);
      });
    }
    sections.push('');

    // Test Output
    if (failureDetails.stdout.length > 0) {
      sections.push('h2. Test Output (stdout)');
      sections.push('{code}');
      sections.push(failureDetails.stdout.join('\n'));
      sections.push('{code}');
      sections.push('');
    }

    if (failureDetails.stderr.length > 0) {
      sections.push('h2. Error Output (stderr)');
      sections.push('{code}');
      sections.push(failureDetails.stderr.join('\n'));
      sections.push('{code}');
      sections.push('');
    }

    // Environment Information
    sections.push('h2. Environment Information');
    sections.push(`*OS:* ${process.platform}`);
    sections.push(`*Node Version:* ${process.version}`);
    sections.push(`*Playwright Version:* ${this.getPlaywrightVersion()}`);
    sections.push(`*Browser:* ${testMetadata.projectName}`);
    sections.push('');

    // Test Tags and Annotations
    if (testMetadata.tags.length > 0) {
      sections.push('h2. Test Tags');
      sections.push(testMetadata.tags.map(tag => `* ${tag}`).join('\n'));
      sections.push('');
    }

    if (testMetadata.annotations.length > 0) {
      sections.push('h2. Test Annotations');
      testMetadata.annotations.forEach(annotation => {
        sections.push(`* *${annotation.type}:* ${annotation.description || 'N/A'}`);
      });
      sections.push('');
    }

    // Reproduction Steps
    sections.push('h2. Reproduction Steps');
    sections.push('1. Run the test suite');
    sections.push(`2. Execute test: "${testCase.title}"`);
    sections.push(`3. File location: ${testMetadata.file}:${testMetadata.line}`);
    sections.push('');

    // Additional Information
    sections.push('h2. Additional Information');
    sections.push('* Screenshots and traces are attached to this issue');
    sections.push('* This issue was automatically created by the test automation system');
    sections.push(`* Report generated at: ${new Date().toISOString()}`);

    return sections.join('\n');
  }

  /**
   * Generates labels for the Jira issue
   */
  generateLabels(testCase, testResult) {
    const labels = ['automated-test', 'test-failure'];
    
    // Add project-specific label
    if (testCase.parent?.project()?.name) {
      labels.push(`browser-${testCase.parent.project().name.toLowerCase()}`);
    }

    // Add file-based label
    const fileName = path.basename(testCase.location?.file || '', '.spec.ts');
    if (fileName) {
      labels.push(`test-${fileName}`);
    }

    // Add status-based label
    labels.push(`status-${testResult.status}`);

    // Add retry label if applicable
    if (testResult.retry > 0) {
      labels.push('retry-failure');
    }

    return labels;
  }

  /**
   * Determines priority based on test result
   */
  determinePriority(testResult) {
    // High priority for tests that failed multiple times
    if (testResult.retry > 1) {
      return 'High';
    }
    
    // Medium priority for first-time failures
    if (testResult.status === 'failed') {
      return 'Medium';
    }

    return 'Low';
  }

  /**
   * Gets Playwright version
   */
  getPlaywrightVersion() {
    try {
      const packageJson = require('@playwright/test/package.json');
      return packageJson.version;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Creates a Jira issue via REST API
   */
  async createJiraIssue(issueData) {
    const url = `${this.config.jiraUrl}/rest/api/2/issue`;
    const auth = Buffer.from(`${this.config.username}:${this.config.apiToken}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(issueData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetails = '';
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.errors) {
          const fieldErrors = Object.entries(errorJson.errors)
            .map(([field, error]) => `  - ${field}: ${error}`)
            .join('\n');
          errorDetails = `\nField errors:\n${fieldErrors}`;
        }
        if (errorJson.errorMessages && errorJson.errorMessages.length > 0) {
          errorDetails += `\nGeneral errors:\n${errorJson.errorMessages.map(msg => `  - ${msg}`).join('\n')}`;
        }
      } catch (parseError) {
        errorDetails = `\nRaw error: ${errorText}`;
      }

      throw new Error(`Failed to create Jira issue: ${response.status} ${response.statusText}${errorDetails}`);
    }

    return await response.json();
  }

  /**
   * Attaches files to a Jira issue
   */
  async attachFilesToIssue(issueKey, attachments) {
    if (!attachments || attachments.length === 0) {
      return;
    }

    for (const attachment of attachments) {
      try {
        if (attachment.path && fs.existsSync(attachment.path)) {
          await this.attachFileToIssue(issueKey, attachment.path, attachment.name);
        }
      } catch (error) {
        console.warn(`Failed to attach file ${attachment.name}:`, error.message);
      }
    }
  }

  /**
   * Attaches a single file to a Jira issue
   */
  async attachFileToIssue(issueKey, filePath, fileName) {
    const url = `${this.config.jiraUrl}/rest/api/2/issue/${issueKey}/attachments`;
    const auth = Buffer.from(`${this.config.username}:${this.config.apiToken}`).toString('base64');

    const formData = new FormData();
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer]);
    
    formData.append('file', blob, fileName || path.basename(filePath));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'X-Atlassian-Token': 'no-check'
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to attach file: ${response.status} ${response.statusText}`);
    }

    console.log(`📎 Attached ${fileName || path.basename(filePath)} to ${issueKey}`);
  }

  /**
   * Updates an existing Jira issue (useful for retry scenarios)
   */
  async updateIssueForRetry(issueKey, testResult, retryCount) {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const updateData = {
        update: {
          description: [
            {
              add: `\n\nh3. Retry Attempt ${retryCount}\n` +
                   `*Timestamp:* ${new Date().toISOString()}\n` +
                   `*Status:* ${testResult.status}\n` +
                   `*Duration:* ${testResult.duration}ms\n`
            }
          ],
          labels: [
            {
              add: `retry-${retryCount}`
            }
          ]
        }
      };

      await this.updateJiraIssue(issueKey, updateData);
      console.log(`🔄 Updated Jira issue ${issueKey} with retry information`);
    } catch (error) {
      console.error('❌ Failed to update Jira issue:', error.message);
    }
  }

  /**
   * Updates a Jira issue via REST API
   */
  async updateJiraIssue(issueKey, updateData) {
    const url = `${this.config.jiraUrl}/rest/api/2/issue/${issueKey}`;
    const auth = Buffer.from(`${this.config.username}:${this.config.apiToken}`).toString('base64');

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update Jira issue: ${response.status} ${response.statusText}\n${errorText}`);
    }
  }
}

module.exports = { JiraIntegration };
