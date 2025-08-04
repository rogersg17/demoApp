"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const { LoginPage } = require('../../page-objects/LoginPage.js');
test_1.test.describe('Login Form Validation Tests', () => {
    let loginPage;
    test_1.test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto();
    });
    test_1.test.describe('Input Validation', () => {
        (0, test_1.test)('TC031: Verify username field validation', async () => {
            await loginPage.usernameInput.focus();
            await loginPage.passwordInput.focus(); // Blur username field
            // Check for invalid state when empty
            const usernameGroup = loginPage.page.locator('.input-group:has(#username)');
            await (0, test_1.expect)(usernameGroup).toHaveClass(/invalid/);
        });
        (0, test_1.test)('TC032: Verify password field validation', async () => {
            await loginPage.passwordInput.focus();
            await loginPage.usernameInput.focus(); // Blur password field
            // Check for invalid state when empty
            const passwordGroup = loginPage.page.locator('.input-group:has(#password)');
            await (0, test_1.expect)(passwordGroup).toHaveClass(/invalid/);
        });
        (0, test_1.test)('TC033: Verify valid input styling', async () => {
            await loginPage.usernameInput.fill('testuser');
            await loginPage.passwordInput.fill('testpass');
            // Blur fields to trigger validation
            await loginPage.loginButton.focus();
            const usernameGroup = loginPage.page.locator('.input-group:has(#username)');
            const passwordGroup = loginPage.page.locator('.input-group:has(#password)');
            await (0, test_1.expect)(usernameGroup).toHaveClass(/valid/);
            await (0, test_1.expect)(passwordGroup).toHaveClass(/valid/);
        });
        (0, test_1.test)('TC034: Verify floating labels', async () => {
            // Test username field
            await loginPage.usernameInput.focus();
            const usernameGroup = loginPage.page.locator('.input-group:has(#username)');
            await (0, test_1.expect)(usernameGroup).toHaveClass(/focused/);
            await loginPage.usernameInput.fill('test');
            const usernameGroupWithValue = loginPage.page.locator('.input-group:has(#username)');
            await (0, test_1.expect)(usernameGroupWithValue).toHaveClass(/has-value/);
            // Test password field
            await loginPage.passwordInput.focus();
            const passwordGroup = loginPage.page.locator('.input-group:has(#password)');
            await (0, test_1.expect)(passwordGroup).toHaveClass(/focused/);
            await loginPage.passwordInput.fill('test');
            const passwordGroupWithValue = loginPage.page.locator('.input-group:has(#password)');
            await (0, test_1.expect)(passwordGroupWithValue).toHaveClass(/has-value/);
        });
        (0, test_1.test)('TC035: Verify input autocomplete', async () => {
            await (0, test_1.expect)(loginPage.usernameInput).toHaveAttribute('autocomplete', 'username');
            await (0, test_1.expect)(loginPage.passwordInput).toHaveAttribute('autocomplete', 'current-password');
        });
    });
});
//# sourceMappingURL=login-validation.spec.js.map