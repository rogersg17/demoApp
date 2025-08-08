import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Determine if we should use Express server or static files
const useServer = process.env.USE_SERVER !== 'false'; // Default to server unless explicitly disabled

/**
 * @see https://playwright.dev/docs/test-configuration
 */
// Allow overriding baseURL via environment variable to handle dynamic dev server ports
const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:5173';

export default defineConfig({
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
  baseURL: BASE_URL, // React app on Vite dev server; override with PW_BASE_URL if needed
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'msedge',
      use: { 
        ...devices['Desktop Edge'],
        channel: 'msedge'
      },
    },
  ],

  /* Use existing running servers */
  webServer: undefined,
});
