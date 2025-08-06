"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const LoginPage_1 = require("../../page-objects/LoginPage");
test_1.test.describe('Login Message Display Tests', () => {
    let loginPage;
    test_1.test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage_1.LoginPage(page);
        await loginPage.goto();
    });
    test_1.test.describe('Error Messages', () => {
        (0, test_1.test)('TC021: Verify error message display for empty fields', async () => {
            await loginPage.loginButton.click();
            await loginPage.verifyErrorMessage('Please enter both username and password.');
        });
        (0, test_1.test)('TC022: Verify error message styling', async () => {
            await loginPage.loginButton.click();
            await (0, test_1.expect)(loginPage.errorMessage).toBeVisible();
            await (0, test_1.expect)(loginPage.errorMessage).toHaveCSS('display', 'block');
        });
        (0, test_1.test)('TC023: Verify error message accessibility', async () => {
            await loginPage.loginButton.click();
            await (0, test_1.expect)(loginPage.errorMessage).toHaveAttribute('role', 'alert');
            await (0, test_1.expect)(loginPage.errorMessage).toHaveAttribute('aria-live', 'assertive');
            await (0, test_1.expect)(loginPage.errorMessage).toHaveAttribute('aria-atomic', 'true');
        });
    });
    test_1.test.describe('Success Messages', () => {
        (0, test_1.test)('TC024: Verify success message display', async () => {
            await loginPage.login('admin', 'admin123');
            await loginPage.verifySuccessMessage('Login successful! Redirecting...');
        });
        (0, test_1.test)('TC025: Verify success message timing', async () => {
            const startTime = Date.now();
            await loginPage.login('admin', 'admin123');
            // Wait for redirect
            await (0, test_1.expect)(loginPage.page).toHaveURL(/.*mainPage\/index\.html/, { timeout: 5000 });
            const endTime = Date.now();
            const redirectTime = endTime - startTime;
            // Should redirect within reasonable time (allowing for network delays)
            (0, test_1.expect)(redirectTime).toBeGreaterThan(1000);
            (0, test_1.expect)(redirectTime).toBeLessThan(5000);
        });
        (0, test_1.test)('TC026: Verify success message accessibility', async () => {
            await loginPage.login('admin', 'admin123');
            await (0, test_1.expect)(loginPage.successMessage).toBeVisible();
            await (0, test_1.expect)(loginPage.successMessage).toHaveAttribute('role', 'status');
            await (0, test_1.expect)(loginPage.successMessage).toHaveAttribute('aria-live', 'polite');
            await (0, test_1.expect)(loginPage.successMessage).toHaveAttribute('aria-atomic', 'true');
        });
    });
});
//# sourceMappingURL=login-messages.spec.js.map