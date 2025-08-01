"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const path_1 = __importDefault(require("path"));
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
    reporter: 'line',
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: useServer
            ? 'http://localhost:3000'
            : 'file://' + path_1.default.resolve(__dirname).replace(/\\/g, '/'),
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
    },
    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: { ...test_1.devices['Desktop Chrome'] },
        },
    ],
    /* Run your local dev server before starting the tests (only when using server mode) */
    webServer: useServer ? {
        command: 'npm start',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000, // 2 minutes timeout for server startup
    } : undefined,
});
