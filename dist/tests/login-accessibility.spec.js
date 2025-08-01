"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const { LoginPage } = require('../page-objects/LoginPage.js');
test_1.test.describe('Login Accessibility Tests', () => {
    let loginPage;
    test_1.test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto();
    });
    test_1.test.describe('ARIA Attributes', () => {
        (0, test_1.test)('TC036: Verify form accessibility structure', async () => {
            await (0, test_1.expect)(loginPage.loginForm).toHaveAttribute('aria-describedby', 'login-instructions');
            await (0, test_1.expect)(loginPage.loginForm).toHaveAttribute('novalidate');
            const loginInstructions = loginPage.page.locator('#login-instructions');
            await (0, test_1.expect)(loginInstructions).toHaveClass(/sr-only/);
        });
        (0, test_1.test)('TC037: Verify input field ARIA attributes', async () => {
            await (0, test_1.expect)(loginPage.usernameInput).toHaveAttribute('aria-describedby', 'username-error');
            await (0, test_1.expect)(loginPage.usernameInput).toHaveAttribute('aria-invalid', 'false');
            await (0, test_1.expect)(loginPage.passwordInput).toHaveAttribute('aria-describedby', 'password-error');
            await (0, test_1.expect)(loginPage.passwordInput).toHaveAttribute('aria-invalid', 'false');
        });
        (0, test_1.test)('TC038: Verify button accessibility', async () => {
            await (0, test_1.expect)(loginPage.loginButton).toHaveAttribute('aria-describedby', 'login-status');
            await (0, test_1.expect)(loginPage.loginButton).toHaveAttribute('type', 'submit');
            const loadingSpan = loginPage.page.locator('#login-loading');
            await (0, test_1.expect)(loadingSpan).toHaveAttribute('aria-live', 'polite');
            await (0, test_1.expect)(loadingSpan).toHaveClass(/sr-only/);
        });
        (0, test_1.test)('TC039: Verify error message accessibility', async () => {
            await (0, test_1.expect)(loginPage.errorMessage).toHaveAttribute('role', 'alert');
            await (0, test_1.expect)(loginPage.errorMessage).toHaveAttribute('aria-live', 'assertive');
            await (0, test_1.expect)(loginPage.errorMessage).toHaveAttribute('aria-atomic', 'true');
        });
        (0, test_1.test)('TC040: Verify screen reader support', async () => {
            // Check that main content has proper role and labeling
            const main = loginPage.page.locator('main');
            await (0, test_1.expect)(main).toHaveAttribute('role', 'main');
            await (0, test_1.expect)(main).toHaveAttribute('aria-labelledby', 'login-heading');
            // Check that heading has proper ID
            await (0, test_1.expect)(loginPage.pageHeading).toHaveAttribute('id', 'login-heading');
        });
    });
    test_1.test.describe('Keyboard Navigation', () => {
        (0, test_1.test)('TC041: Verify tab navigation', async () => {
            // Start from username field
            await loginPage.usernameInput.focus();
            await (0, test_1.expect)(loginPage.usernameInput).toBeFocused();
            // Tab to password field
            await loginPage.page.keyboard.press('Tab');
            await (0, test_1.expect)(loginPage.passwordInput).toBeFocused();
            // Tab to login button
            await loginPage.page.keyboard.press('Tab');
            await (0, test_1.expect)(loginPage.loginButton).toBeFocused();
        });
        (0, test_1.test)('TC042: Verify Enter key submission', async () => {
            await loginPage.usernameInput.fill('admin');
            await loginPage.passwordInput.fill('admin123');
            // Press Enter in password field
            await loginPage.passwordInput.press('Enter');
            // Should redirect to main page
            await (0, test_1.expect)(loginPage.page).toHaveURL(/.*mainPage\/index\.html/, { timeout: 5000 });
        });
        (0, test_1.test)('TC043: Verify Ctrl+Enter submission', async () => {
            await loginPage.usernameInput.fill('admin');
            await loginPage.passwordInput.fill('admin123');
            // Press Ctrl+Enter
            await loginPage.page.keyboard.press('Control+Enter');
            // Should redirect to main page
            await (0, test_1.expect)(loginPage.page).toHaveURL(/.*mainPage\/index\.html/, { timeout: 5000 });
        });
        (0, test_1.test)('TC044: Verify keyboard accessibility', async () => {
            // Navigate through the entire form using only keyboard
            await loginPage.page.keyboard.press('Tab'); // Should focus first element
            // Fill username using keyboard
            await loginPage.page.keyboard.type('admin');
            // Tab to password
            await loginPage.page.keyboard.press('Tab');
            await loginPage.page.keyboard.type('admin123');
            // Tab to button and activate
            await loginPage.page.keyboard.press('Tab');
            await loginPage.page.keyboard.press('Enter');
            // Should redirect successfully
            await (0, test_1.expect)(loginPage.page).toHaveURL(/.*mainPage\/index\.html/, { timeout: 5000 });
        });
    });
});
