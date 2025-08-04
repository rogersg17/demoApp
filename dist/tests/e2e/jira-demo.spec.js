"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Jira Integration Demo Tests', () => {
    test_1.test.beforeEach(async ({ page }) => {
        await page.goto('/login/');
    });
    (0, test_1.test)('TC_DEMO_001: Intentional failure for Jira demo', async ({ page }) => {
        // This test is designed to fail to demonstrate Jira integration
        // Add some test context
        await page.fill('#username', 'demo-user');
        await page.fill('#password', 'demo-password');
        // Take a screenshot before the failure
        await page.screenshot({ path: 'test-results/before-failure.png' });
        // This assertion will intentionally fail
        await (0, test_1.expect)(page.locator('#non-existent-element')).toBeVisible({
            timeout: 2000
        });
    });
    (0, test_1.test)('TC_DEMO_002: Timeout demonstration', async ({ page }) => {
        // This test will timeout to show timeout handling
        await page.fill('#username', 'timeout-user');
        await page.fill('#password', 'timeout-password');
        // Wait for an element that doesn't exist (will timeout)
        await page.waitForSelector('#element-that-never-appears', {
            timeout: 3000
        });
    });
    (0, test_1.test)('TC_DEMO_003: Success test (no Jira issue)', async ({ page }) => {
        // This test should pass and not create a Jira issue
        await (0, test_1.expect)(page.locator('#username')).toBeVisible();
        await (0, test_1.expect)(page.locator('#password')).toBeVisible();
        await (0, test_1.expect)(page.locator('button[type="submit"]')).toBeVisible();
    });
    (0, test_1.test)('TC_DEMO_004: Network error simulation', async ({ page }) => {
        // Simulate a network error
        await page.route('**/*', route => route.abort());
        // Try to navigate to main page (will fail due to route abort)
        await page.click('button[type="submit"]');
        await (0, test_1.expect)(page).toHaveURL(/.*mainPage/);
    });
});
//# sourceMappingURL=jira-demo.spec.js.map