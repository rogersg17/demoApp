"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const path_1 = __importDefault(require("path"));
// Load environment variables for Jira integration
require('dotenv').config({ path: '.env.jira' });
// Determine if we should use Express server or static files
const useServer = process.env.USE_SERVER !== 'false'; // Default to server unless explicitly disabled
/**
 * @see https://playwright.dev/docs/test-configuration
 */
exports.default = (0, test_1.defineConfig)({
    testDir: './tests',
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : undefined,
    /* Configure multiple reporters including our custom Jira reporter */
    reporter: [
        // Keep the default line reporter for console output
        ['line'],
        // Add HTML reporter for detailed test results
        ['html', {
                outputFolder: 'playwright-report',
                open: 'never'
            }],
        // Add our custom Jira reporter
        ['./reporters/jira-reporter.js', {
                // Jira configuration
                jira: {
                    jiraUrl: process.env.JIRA_URL,
                    username: process.env.JIRA_USERNAME,
                    apiToken: process.env.JIRA_API_TOKEN,
                    projectKey: process.env.JIRA_PROJECT_KEY || 'TEST',
                    issueType: process.env.JIRA_ISSUE_TYPE || 'Bug',
                    enabled: process.env.JIRA_ENABLED === 'true',
                    // Optional: Custom fields based on your Jira setup
                    // Only add these if your Jira project has these fields configured
                    customFields: {
                    // Example: Environment field (uncomment and adjust if needed)
                    // 'customfield_10001': { value: process.env.TEST_ENVIRONMENT || 'development' }
                    },
                    // Optional: Components (only add if your project uses components)
                    // components: [
                    //   { name: 'Web Frontend' },
                    //   { name: 'Authentication' }
                    // ]
                },
                // Reporter behavior configuration
                createIssueOnFailure: process.env.JIRA_CREATE_ISSUE_ON_FAILURE !== 'false',
                createIssueOnTimeout: process.env.JIRA_CREATE_ISSUE_ON_TIMEOUT !== 'false',
                createIssueOnRetry: process.env.JIRA_CREATE_ISSUE_ON_RETRY === 'true',
                attachScreenshots: process.env.JIRA_ATTACH_SCREENSHOTS !== 'false',
                attachTraces: process.env.JIRA_ATTACH_TRACES !== 'false',
                attachVideos: process.env.JIRA_ATTACH_VIDEOS !== 'false'
            }]
    ],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: useServer
            ? 'http://localhost:5173'
            : 'file://' + path_1.default.resolve(__dirname).replace(/\\/g, '/'),
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
        /* Take screenshot on failure */
        screenshot: 'only-on-failure',
        /* Record video on failure */
        video: 'retain-on-failure',
    },
    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: { ...test_1.devices['Desktop Chrome'] },
        },
        /*     {
              name: 'firefox',
              use: { ...devices['Desktop Firefox'] },
            }, */
        /*     {
              name: 'webkit',
              use: { ...devices['Desktop Safari'] },
            }, */
        /* Test against mobile viewports. */
        // {
        //   name: 'Mobile Chrome',
        //   use: { ...devices['Pixel 5'] },
        // },
        // {
        //   name: 'Mobile Safari',
        //   use: { ...devices['iPhone 12'] },
        // },
    ],
    /* Run your local dev server before starting the tests (only when using server mode) */
    webServer: useServer ? {
        command: 'npm start',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000, // 2 minutes timeout for server startup
    } : undefined,
});
//# sourceMappingURL=playwright.config.jira.js.map