# Jira Integration for Test Failure Reporting

This project includes a custom Playwright reporter that automatically creates Jira issues when tests fail, providing detailed information about the failure and attachments for debugging.

## 🚀 Features

- **Automatic Issue Creation**: Creates Jira issues when tests fail or timeout
- **Detailed Failure Reports**: Includes test metadata, error messages, environment info, and reproduction steps
- **File Attachments**: Automatically attaches screenshots, traces, and videos to Jira issues
- **Retry Handling**: Updates existing issues when tests are retried
- **Duplicate Prevention**: Avoids creating multiple issues for the same test failure
- **Configurable Priority**: Sets issue priority based on failure patterns
- **Rich Formatting**: Uses Jira markup for clear, readable issue descriptions

## 📋 Prerequisites

1. **Jira Account**: Access to a Jira instance with permission to create issues
2. **API Token**: A Jira API token for authentication
3. **Project Access**: Permission to create issues in the target Jira project

## ⚙️ Setup

### 1. Generate Jira API Token

1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Give it a descriptive label (e.g., "Playwright Test Reporter")
4. Copy the generated token (you won't be able to see it again)

### 2. Configure Environment Variables

Create a `.env.jira` file in your project root:

```bash
# Copy the example file
cp .env.jira.example .env.jira
```

Edit `.env.jira` with your Jira details:

```bash
# Basic Jira Configuration
JIRA_URL=https://your-company.atlassian.net
JIRA_USERNAME=your-email@company.com
JIRA_API_TOKEN=your-api-token-here
JIRA_PROJECT_KEY=TEST

# Feature Toggles
JIRA_ENABLED=true

# Issue Configuration
JIRA_ISSUE_TYPE=Bug
JIRA_PRIORITY_HIGH_RETRY_THRESHOLD=2

# Reporter Configuration
JIRA_CREATE_ISSUE_ON_FAILURE=true
JIRA_CREATE_ISSUE_ON_TIMEOUT=true
JIRA_CREATE_ISSUE_ON_RETRY=false
JIRA_ATTACH_SCREENSHOTS=true
JIRA_ATTACH_TRACES=true
JIRA_ATTACH_VIDEOS=true
```

### 3. Install Dependencies

```bash
# Install dotenv for environment variable support
npm install dotenv --save-dev
```

### 4. Test the Integration

Run the integration test to verify your setup:

```bash
node scripts/test-jira-integration.js
```

This will:
- Validate your configuration
- Test the connection to Jira
- Create a sample test issue
- Provide troubleshooting guidance if needed

## 🎯 Usage

### Running Tests with Jira Reporting

Use the Jira-enabled Playwright configuration:

```bash
# Run tests with Jira reporting
npx playwright test --config=playwright.config.jira.ts

# Run specific test suite
npx playwright test tests/login-functional.spec.ts --config=playwright.config.jira.ts

# Run tests in headed mode
npx playwright test --headed --config=playwright.config.jira.ts
```

### Package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test:jira": "playwright test --config=playwright.config.jira.ts",
    "test:jira:headed": "playwright test --headed --config=playwright.config.jira.ts",
    "test:jira:ui": "playwright test --ui --config=playwright.config.jira.ts",
    "test-jira-setup": "node scripts/test-jira-integration.js"
  }
}
```

## 📊 What Gets Reported

When a test fails, the Jira issue includes:

### Test Information
- Test name and file location
- Browser/project information
- Test duration and retry count
- Execution timestamp

### Failure Details
- Error status (failed, timeout, etc.)
- Complete error messages and stack traces
- Test output (stdout/stderr)

### Environment Information
- Operating system
- Node.js and Playwright versions
- Browser details

### Attachments
- Screenshots (if configured)
- Playwright traces (if configured)
- Videos (if configured)

### Metadata
- Test tags and annotations
- Labels for easy filtering
- Priority based on failure patterns

## 🔧 Configuration Options

### Jira Integration Options

```javascript
{
  jira: {
    jiraUrl: 'https://company.atlassian.net',
    username: 'user@company.com',
    apiToken: 'your-api-token',
    projectKey: 'TEST',
    issueType: 'Bug',
    enabled: true,
    
    // Optional: Custom fields (only add if they exist in your Jira project)
    // Check with your Jira admin for available custom field IDs
    customFields: {
      // Example format: 'customfield_10001': { value: 'staging' }
      // 'customfield_10002': { value: 'automation' }
    },
    
    // Optional: Components (only add if your project uses components)
    // Leave this empty or remove if components are not configured
    components: [
      // { name: 'Web Frontend' },
      // { name: 'Authentication' }
    ]
  }
}
```

### Reporter Behavior Options

```javascript
{
  createIssueOnFailure: true,    // Create issues for failed tests
  createIssueOnTimeout: true,    // Create issues for timed out tests
  createIssueOnRetry: false,     // Update issues on retry (vs create new)
  attachScreenshots: true,       // Attach screenshot files
  attachTraces: true,           // Attach Playwright trace files
  attachVideos: true            // Attach video recordings
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Errors (401)**
   - Verify your username and API token
   - Ensure the API token hasn't expired
   - Check that you're using your email address as the username

2. **Permission Errors (403)**
   - Confirm you have "Create Issues" permission in the project
   - Verify the project key is correct
   - Check that your account has necessary Jira permissions

3. **Bad Request Errors (400)**
   - Ensure the issue type exists in your project
   - Verify all required fields are configured
   - Check that the project key format is correct
   - Remove optional fields (like components or custom fields) if they're not configured in your Jira project

4. **Field Configuration Errors**
   - If you get "Field cannot be set" errors, the field is not available in your project
   - Comment out or remove optional fields in `playwright.config.jira.ts`
   - Contact your Jira admin to verify available fields
   - Use the test script to validate your configuration

4. **Issues Not Created**
   - Verify `JIRA_ENABLED=true` in your environment
   - Check that tests are actually failing
   - Review console output for error messages

### Debug Mode

Enable verbose logging by setting:

```bash
DEBUG=jira-reporter npx playwright test --config=playwright.config.jira.ts
```

### Manual Testing

Test your configuration without running actual tests:

```bash
npm run test-jira-setup
```

## 📁 File Structure

```
├── reporters/
│   └── jira-reporter.js          # Custom Playwright reporter
├── utils/
│   └── jira-integration.js       # Jira API integration utility
├── scripts/
│   └── test-jira-integration.js  # Integration test script
├── .env.jira.example             # Environment variables template
├── .env.jira                     # Your Jira configuration (git-ignored)
├── playwright.config.jira.ts     # Playwright config with Jira reporter
└── jira-test-report.json         # Generated summary report
```

## 🔒 Security

- **Never commit your `.env.jira` file** - it contains sensitive API tokens
- **Use least-privilege access** - only grant necessary Jira permissions
- **Rotate API tokens regularly** - update tokens periodically for security
- **Monitor token usage** - review Jira audit logs for suspicious activity

## 📈 Best Practices

1. **Use in CI/CD**: Configure for continuous integration environments
2. **Filter Noise**: Set appropriate retry thresholds to avoid spam
3. **Tag Issues**: Use labels for easy filtering and management
4. **Review Regularly**: Periodically review and close resolved issues
5. **Customize Fields**: Add relevant custom fields for your workflow

## 🤝 Contributing

To extend or modify the Jira integration:

1. **Add Custom Fields**: Modify the `buildIssueData` method in `jira-integration.js`
2. **Change Issue Format**: Update the `buildDescription` method
3. **Add New Triggers**: Extend the `shouldCreateJiraIssue` logic
4. **Enhance Attachments**: Modify the `enhanceResultWithAttachments` method

## 📚 References

- [Playwright Test Reporters](https://playwright.dev/docs/test-reporters)
- [Jira REST API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v2/)
- [Atlassian API Tokens](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/)
- [Jira Issue Fields](https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-post)
