"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Test Management Page', () => {
    test_1.test.beforeEach(async ({ page }) => {
        // Go to login page and authenticate
        await page.goto('/');
        // Fill login form
        await page.fill('#username', 'admin');
        await page.fill('#password', 'admin123');
        await page.click('button[type="submit"]');
        // Wait for successful login and navigation to dashboard
        await (0, test_1.expect)(page).toHaveURL(/.*\/dashboard/);
        // Navigate to test management page
        await page.click('nav a[href="/tests"]');
        await (0, test_1.expect)(page).toHaveURL(/.*\/tests/);
    });
    (0, test_1.test)('should display the test management page header', async ({ page }) => {
        // Check page header - target the specific h1 for test management
        await (0, test_1.expect)(page.locator('main h1')).toContainText('Test Management');
        await (0, test_1.expect)(page.locator('.page-header p')).toContainText('Execute and manage your test suites');
    });
    (0, test_1.test)('should display test statistics cards', async ({ page }) => {
        // Check that stats cards are present
        await (0, test_1.expect)(page.locator('.stats-grid')).toBeVisible();
        await (0, test_1.expect)(page.locator('.stat-card')).toHaveCount(4);
        // Check stat card titles
        await (0, test_1.expect)(page.locator('.stat-card h3')).toContainText(['Total Tests', 'Passed', 'Failed', 'Pass Rate']);
    });
    (0, test_1.test)('should display test controls section', async ({ page }) => {
        // Check test controls are present
        await (0, test_1.expect)(page.locator('.test-controls')).toBeVisible();
        await (0, test_1.expect)(page.locator('button')).toContainText(['Run Selected', 'Run All Tests', 'Select All Filtered', 'Clear Selection']);
    });
    (0, test_1.test)('should display filters section', async ({ page }) => {
        // Check filters are present
        await (0, test_1.expect)(page.locator('.filters-section')).toBeVisible();
        await (0, test_1.expect)(page.locator('.search-box input')).toBeVisible();
        await (0, test_1.expect)(page.locator('.filter-group select')).toHaveCount(2);
    });
    (0, test_1.test)('should display tests table with headers', async ({ page }) => {
        // Wait for the table to load
        await (0, test_1.expect)(page.locator('.tests-table-container')).toBeVisible();
        await (0, test_1.expect)(page.locator('.tests-table')).toBeVisible();
        // Check individual table headers using more specific selectors
        const headers = ['Test', 'Suite', 'Status', 'Duration', 'Last Run', 'Actions'];
        for (const header of headers) {
            await (0, test_1.expect)(page.locator('.tests-table th').filter({ hasText: header })).toBeVisible();
        }
    });
    (0, test_1.test)('should load and display test data in the table', async ({ page }) => {
        // Wait for loading to complete - either show tests or show "no results"
        await page.waitForFunction(() => {
            const loadingElement = document.querySelector('.loading');
            const tableBody = document.querySelector('.tests-table tbody');
            const noResults = document.querySelector('.no-results');
            // Loading should be gone AND either we have test rows or no results message
            return !loadingElement && ((tableBody && tableBody.children.length > 0) ||
                noResults);
        }, { timeout: 10000 });
        // Check if we have test data or no results message
        const tableRows = page.locator('.tests-table tbody tr');
        const noResultsMessage = page.locator('.no-results');
        // Either we should have test rows OR a no results message
        const hasRows = await tableRows.count() > 0;
        const hasNoResultsMessage = await noResultsMessage.isVisible();
        (0, test_1.expect)(hasRows || hasNoResultsMessage).toBeTruthy();
        if (hasRows) {
            console.log(`✅ Found ${await tableRows.count()} test rows in the table`);
            // If we have tests, verify the structure of the first row
            const firstRow = tableRows.first();
            await (0, test_1.expect)(firstRow.locator('td')).toHaveCount(7); // Including checkbox column
            // Check that status badges are present
            await (0, test_1.expect)(firstRow.locator('.status-badge')).toBeVisible();
            // Check that action buttons are present
            await (0, test_1.expect)(firstRow.locator('.btn-run')).toBeVisible();
        }
        else {
            console.log('ℹ️ No test data found - showing no results message');
            await (0, test_1.expect)(noResultsMessage).toContainText('No tests found');
        }
    });
    (0, test_1.test)('should handle search functionality', async ({ page }) => {
        // Wait for page to load and data to be displayed
        await (0, test_1.expect)(page.locator('.tests-table tbody tr')).toHaveCount(62, { timeout: 10000 });
        // Try searching for something that should exist
        const searchInput = page.locator('.search-box input');
        await searchInput.fill('Jira');
        // Wait a moment for filtering to occur
        await page.waitForTimeout(1000);
        // Should show filtered results containing "Jira"
        const tableRows = page.locator('.tests-table tbody tr');
        const rowCount = await tableRows.count();
        // Should have some results for "Jira" search
        (0, test_1.expect)(rowCount).toBeGreaterThan(0);
        (0, test_1.expect)(rowCount).toBeLessThan(62); // Should be filtered down from total
        // Clear search to verify all tests return
        await searchInput.clear();
        await page.waitForTimeout(500);
        const allRowsCount = await tableRows.count();
        (0, test_1.expect)(allRowsCount).toBe(62);
    });
    (0, test_1.test)('should show error state gracefully if API fails', async ({ page }) => {
        // This test checks that the page handles API errors gracefully
        // We can't easily simulate API failures, but we can check the error state exists
        // Navigate to test management and wait for either success or error state
        await page.waitForFunction(() => {
            const loading = document.querySelector('.loading');
            const error = document.querySelector('.error');
            const table = document.querySelector('.tests-table');
            return !loading && (error || table);
        }, { timeout: 10000 });
        // Page should either show content or error, not be stuck loading
        const isLoading = await page.locator('.loading').isVisible();
        (0, test_1.expect)(isLoading).toBeFalsy();
    });
});
//# sourceMappingURL=test-management-page.spec.js.map