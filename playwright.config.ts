import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Determine if we should use Express server or static files
const useServer = process.env.USE_SERVER !== 'false'; // Default to server unless explicitly disabled

/**
 * @see https://playwright.dev/docs/test-configuration
 */
// Allow overriding baseURL via environment variable to handle dynamic dev server ports
const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:5173';
const PW_TEST = process.env.PW_TEST === '1';

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
    storageState: 'tests/.auth/admin.json',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chromium'
      },
    },
  ],
  /* Auto-start dev servers for tests unless USE_SERVER=false is set */
  webServer: process.env.USE_SERVER === 'false' ? undefined : [
    {
      command: 'cross-env SESSION_SECRET=pw-test-secret npm run dev',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: 'cross-env VITE_API_BASE_URL=http://localhost:3000 npm run dev:frontend',
      url: BASE_URL,
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],

  /* Global setup to login and save storage state */
  globalSetup: path.resolve(__dirname, './tests/e2e/global-setup.ts'),
});
