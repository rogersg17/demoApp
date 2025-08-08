import { test, expect } from '@playwright/test';

test.describe('Jira Integration Demo Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page - authentication state handled by storageState for other tests
    await page.goto('/login/');
  });

  test('TC_DEMO_001: Intentional failure for Jira demo', async ({ page }) => {
    // This test is designed to fail to demonstrate Jira integration
    
    // Add some test context
    await page.fill('#username', 'demo-user');
    await page.fill('#password', 'demo-password');
    
    // Take a screenshot before the failure
    await page.screenshot({ path: 'test-results/before-failure.png' });
    
    // This assertion will intentionally fail
    await expect(page.locator('#non-existent-element')).toBeVisible({
      timeout: 2000
    });
  });

  test('TC_DEMO_002: Timeout demonstration', async ({ page }) => {
    // This test will timeout to show timeout handling
    
    await page.fill('#username', 'timeout-user');
    await page.fill('#password', 'timeout-password');
    
    // Wait for an element that doesn't exist (will timeout)
    await page.waitForSelector('#element-that-never-appears', {
      timeout: 3000
    });
  });

  test('TC_DEMO_003: Success test (no Jira issue)', async ({ page }) => {
    // This test should pass and not create a Jira issue
    
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('TC_DEMO_004: Network error simulation', async ({ page }) => {
    // Simulate a network error
    await page.route('**/*', route => route.abort());
    
    // Try to navigate to main page (will fail due to route abort)
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*mainPage/);
  });
});
