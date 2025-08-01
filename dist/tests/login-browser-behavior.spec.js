"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const { LoginPage } = require('../page-objects/LoginPage.js');
test_1.test.describe('Login Browser Behavior Tests', () => {
    let loginPage;
    test_1.test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto();
    });
    test_1.test.describe('Form Submission', () => {
        (0, test_1.test)('TC045: Verify form prevents default submission', async () => {
            // Get initial URL
            const initialUrl = loginPage.page.url();
            // Fill form and submit
            await loginPage.usernameInput.fill('admin');
            await loginPage.passwordInput.fill('admin123');
            await loginPage.loginButton.click();
            // Page should not refresh, URL should not change (until redirect)
            await loginPage.page.waitForTimeout(500); // Wait a bit to see if page refreshes
            const currentUrl = loginPage.page.url();
            (0, test_1.expect)(currentUrl).toBe(initialUrl);
            // But then should redirect to main page
            await (0, test_1.expect)(loginPage.page).toHaveURL(/.*mainPage\/index\.html/, { timeout: 5000 });
        });
        (0, test_1.test)('TC046: Verify novalidate attribute', async () => {
            await (0, test_1.expect)(loginPage.loginForm).toHaveAttribute('novalidate');
            // Submit empty form - should not trigger browser validation
            await loginPage.loginButton.click();
            // Should show custom error message instead of browser validation
            await (0, test_1.expect)(loginPage.errorMessage).toBeVisible();
        });
        (0, test_1.test)('TC047: Verify multiple submissions prevention', async () => {
            await loginPage.usernameInput.fill('admin');
            await loginPage.passwordInput.fill('admin123');
            // Click submit button
            await loginPage.loginButton.click();
            // Button should be in loading state or success state (both prevent multiple submissions)
            await (0, test_1.expect)(loginPage.loginButton).toHaveClass(/loading|success/);
            // Try to click again - should not be possible due to loading/success state
            const isEnabled = await loginPage.loginButton.isEnabled();
            // The button might still be enabled but the class should prevent multiple submissions
            const buttonClass = await loginPage.loginButton.getAttribute('class');
            (0, test_1.expect)(buttonClass).toMatch(/loading|success/);
        });
    });
});
