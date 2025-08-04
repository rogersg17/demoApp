"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
// Determine if we should use Express server or static files
const useServer = process.env.USE_SERVER !== 'false'; // Default to server unless explicitly disabled
/**
 * @see https://playwright.dev/docs/test-configuration
 */
exports.default = (0, test_1.defineConfig)({
    testDir: './tests',
    /* Exclude demo tests from regular test runs */
    testIgnore: ['**/jira-demo.spec.ts'],
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [
        ['list'],
        ['json', { outputFile: 'tests/test-data/results/test-results.json' }]
    ],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: 'http://localhost:5173', // React app on Vite dev server
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
    },
    /* Configure projects for major browsers */
    projects: [
        {
            name: 'msedge',
            use: {
                ...test_1.devices['Desktop Edge'],
                channel: 'msedge'
            },
        },
    ],
    /* Use existing running servers */
    webServer: undefined,
});
//# sourceMappingURL=playwright.config.js.map