"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Settings Page Grid Layout', () => {
    test_1.test.beforeEach(async ({ page }) => {
        // Navigate to the login page first
        await page.goto('http://localhost:5174/login');
        // Login as admin
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');
        // Wait for navigation to dashboard
        await page.waitForURL('**/dashboard');
        // Navigate to settings page
        await page.goto('http://localhost:5174/settings');
    });
    (0, test_1.test)('should display settings in a grid layout', async ({ page }) => {
        // Wait for settings page to load
        await (0, test_1.expect)(page.locator('h1')).toContainText('Settings');
        // Check that the settings grid exists
        await (0, test_1.expect)(page.locator('.settings-grid')).toBeVisible();
        // Check that all 6 settings panels are visible
        const panels = page.locator('.settings-panel');
        await (0, test_1.expect)(panels).toHaveCount(6);
        // Check that each panel has the expected titles
        await (0, test_1.expect)(page.locator('.settings-panel h3').nth(0)).toContainText('Browser Configuration');
        await (0, test_1.expect)(page.locator('.settings-panel h3').nth(1)).toContainText('Test Execution');
        await (0, test_1.expect)(page.locator('.settings-panel h3').nth(2)).toContainText('Reporting & Output');
        await (0, test_1.expect)(page.locator('.settings-panel h3').nth(3)).toContainText('Environment Configuration');
        await (0, test_1.expect)(page.locator('.settings-panel h3').nth(4)).toContainText('JIRA Integration');
        await (0, test_1.expect)(page.locator('.settings-panel h3').nth(5)).toContainText('Advanced Settings');
    });
    (0, test_1.test)('should have functional form inputs in each panel', async ({ page }) => {
        // Test Browser Configuration panel
        const browserSelect = page.locator('.settings-panel').nth(0).locator('select');
        await (0, test_1.expect)(browserSelect).toHaveValue('chromium');
        await browserSelect.selectOption('firefox');
        await (0, test_1.expect)(browserSelect).toHaveValue('firefox');
        // Test Test Execution panel
        const maxRetriesInput = page.locator('.settings-panel').nth(1).locator('input[type="number"]').first();
        await (0, test_1.expect)(maxRetriesInput).toHaveValue('2');
        await maxRetriesInput.fill('3');
        await (0, test_1.expect)(maxRetriesInput).toHaveValue('3');
        // Test JIRA Integration panel
        const jiraCheckbox = page.locator('.settings-panel').nth(4).locator('input[type="checkbox"]');
        await (0, test_1.expect)(jiraCheckbox).not.toBeChecked();
        await jiraCheckbox.check();
        await (0, test_1.expect)(jiraCheckbox).toBeChecked();
        // Check that JIRA inputs become enabled when checkbox is checked
        const jiraUrlInput = page.locator('.settings-panel').nth(4).locator('input[type="url"]');
        await (0, test_1.expect)(jiraUrlInput).toBeEnabled();
    });
    (0, test_1.test)('should show all panels simultaneously without tabs', async ({ page }) => {
        // Verify no tab navigation exists
        await (0, test_1.expect)(page.locator('.settings-tabs')).not.toBeVisible();
        await (0, test_1.expect)(page.locator('.tab-btn')).toHaveCount(0);
        // Verify all panels are visible at the same time
        const panels = page.locator('.settings-panel');
        for (let i = 0; i < 6; i++) {
            await (0, test_1.expect)(panels.nth(i)).toBeVisible();
        }
    });
    (0, test_1.test)('should have working save and reset buttons', async ({ page }) => {
        // Check that action buttons exist
        await (0, test_1.expect)(page.locator('.settings-actions .btn-primary')).toContainText('Save Settings');
        await (0, test_1.expect)(page.locator('.settings-actions .btn-secondary')).toContainText('Reset to Defaults');
        // Make a change and save
        const browserSelect = page.locator('.settings-panel').nth(0).locator('select');
        await browserSelect.selectOption('webkit');
        await page.click('.settings-actions .btn-primary');
        // Check for success message (if implemented)
        // Note: This might show different behavior depending on if the backend is running
        await page.waitForTimeout(1000); // Give time for save operation
    });
});
//# sourceMappingURL=settings-grid-layout.spec.js.map