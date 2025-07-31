#!/usr/bin/env node

/**
 * Jira Integration Test Utility
 * 
 * This script helps test and validate the Jira integration setup
 */

const { JiraIntegration } = require('../utils/jira-integration');
require('dotenv').config({ path: '.env.jira' });

async function testJiraIntegration() {
  console.log('🧪 Testing Jira Integration...\n');

  // Initialize Jira integration
  const jira = new JiraIntegration({
    jiraUrl: process.env.JIRA_URL,
    username: process.env.JIRA_USERNAME,
    apiToken: process.env.JIRA_API_TOKEN,
    projectKey: process.env.JIRA_PROJECT_KEY,
    enabled: true
  });

  // Check configuration
  console.log('📋 Configuration Check:');
  console.log(`   JIRA URL: ${jira.config.jiraUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Username: ${jira.config.username ? '✅ Set' : '❌ Missing'}`);
  console.log(`   API Token: ${jira.config.apiToken ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Project Key: ${jira.config.projectKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Configuration Valid: ${jira.isConfigValid() ? '✅ Yes' : '❌ No'}\n`);

  if (!jira.isConfigValid()) {
    console.log('❌ Jira configuration is invalid. Please check your environment variables.');
    console.log('\n💡 Required environment variables:');
    console.log('   JIRA_URL - Your Jira instance URL (e.g., https://company.atlassian.net)');
    console.log('   JIRA_USERNAME - Your Jira username/email');
    console.log('   JIRA_API_TOKEN - Your Jira API token');
    console.log('   JIRA_PROJECT_KEY - Your Jira project key (e.g., TEST)');
    console.log('\n📚 How to get an API token:');
    console.log('   1. Go to https://id.atlassian.com/manage-profile/security/api-tokens');
    console.log('   2. Click "Create API token"');
    console.log('   3. Give it a label and copy the token');
    console.log('   4. Add it to your .env.jira file');
    return;
  }

  // Test connection by creating a test issue
  try {
    console.log('🧪 Creating test issue...');
    
    const mockTestCase = {
      title: 'Test Jira Integration - Sample Failure',
      location: {
        file: 'tests/sample.spec.ts',
        line: 42,
        column: 10
      },
      parent: {
        project: () => ({ name: 'chromium' })
      },
      tags: ['@integration-test'],
      annotations: [
        { type: 'description', description: 'This is a test issue created by the Jira integration test utility' }
      ]
    };

    const mockTestResult = {
      status: 'failed',
      duration: 5000,
      retry: 0,
      startTime: new Date(),
      errors: [
        { message: 'Expected element to be visible, but it was not found' },
        { message: 'Timeout waiting for page to load' }
      ],
      stdout: ['Test started', 'Navigating to login page', 'Attempting login'],
      stderr: ['Warning: deprecated API used'],
      attachments: []
    };

    const issue = await jira.createIssueForFailure(mockTestResult, mockTestCase);
    
    if (issue) {
      console.log('✅ Test issue created successfully!');
      console.log(`   Issue Key: ${issue.key}`);
      console.log(`   Issue URL: ${jira.config.jiraUrl}/browse/${issue.key}`);
      console.log('\n🗑️  Please manually delete this test issue from Jira');
    } else {
      console.log('❌ Failed to create test issue');
    }

  } catch (error) {
    console.log('❌ Error creating test issue:');
    console.log(`   ${error.message}`);
    
    if (error.message.includes('401')) {
      console.log('\n💡 Authentication failed. Please check:');
      console.log('   - Your username/email is correct');
      console.log('   - Your API token is valid and not expired');
      console.log('   - You have permission to create issues in the project');
    } else if (error.message.includes('400')) {
      console.log('\n💡 Bad request. Please check:');
      console.log('   - Your project key is correct');
      console.log('   - The issue type "Bug" exists in your project');
      console.log('   - You have the required fields configured');
      
      if (error.message.includes('components')) {
        console.log('   - Components field is not available in your project');
        console.log('   - This has been fixed in the latest version');
      }
      
      if (error.message.includes('Field errors:')) {
        console.log('\n🔍 Specific field errors detected. Consider:');
        console.log('   - Removing or commenting out optional fields in playwright.config.jira.ts');
        console.log('   - Checking your Jira project field configuration');
        console.log('   - Contacting your Jira administrator for field setup');
      }
    } else if (error.message.includes('403')) {
      console.log('\n💡 Permission denied. Please check:');
      console.log('   - You have permission to create issues in this project');
      console.log('   - Your account has the necessary Jira permissions');
    } else if (error.message.includes('404')) {
      console.log('\n💡 Not found. Please check:');
      console.log('   - Your Jira URL is correct');
      console.log('   - The project key exists');
      console.log('   - You have access to the project');
    }
  }

  console.log('\n🏁 Jira integration test completed');
}

// Handle command line execution
if (require.main === module) {
  testJiraIntegration().catch(console.error);
}

module.exports = { testJiraIntegration };
