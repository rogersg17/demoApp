"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const LoginPage_1 = require("../../page-objects/LoginPage");
test_1.test.describe('Login UI Tests', () => {
    let loginPage;
    test_1.test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage_1.LoginPage(page);
        await loginPage.goto();
    });
    test_1.test.describe('Page Elements and Layout', () => {
        (0, test_1.test)('TC011: Verify login page loads correctly', async () => {
            await (0, test_1.expect)(loginPage.page).toHaveTitle('Demo App');
            await loginPage.verifyPageElements();
        });
        (0, test_1.test)('TC012: Verify form elements are present', async () => {
            await (0, test_1.expect)(loginPage.usernameInput).toBeVisible();
            await (0, test_1.expect)(loginPage.passwordInput).toBeVisible();
            await (0, test_1.expect)(loginPage.loginButton).toBeVisible();
        });
        (0, test_1.test)('TC013: Verify page heading', async () => {
            await (0, test_1.expect)(loginPage.pageHeading).toContainText('Welcome Back');
        });
        (0, test_1.test)('TC014: Verify input field labels', async () => {
            await (0, test_1.expect)(loginPage.page.locator('label[for="username"]')).toContainText('Username');
            await (0, test_1.expect)(loginPage.page.locator('label[for="password"]')).toContainText('Password');
        });
        (0, test_1.test)('TC015: Verify button text', async () => {
            await (0, test_1.expect)(loginPage.loginButton).toContainText('Sign In');
        });
    });
    test_1.test.describe('Form Behavior', () => {
        (0, test_1.test)('TC016: Verify loading state during login', async () => {
            await loginPage.usernameInput.fill('admin');
            await loginPage.passwordInput.fill('admin123');
            await loginPage.loginButton.click();
            // Check for loading state immediately after click
            await (0, test_1.expect)(loginPage.loginButton).toHaveClass(/loading/);
            const buttonText = await loginPage.loginButton.textContent();
            (0, test_1.expect)(buttonText).toContain('Signing in');
        });
        (0, test_1.test)('TC017: Verify success state animation', async () => {
            await loginPage.usernameInput.fill('admin');
            await loginPage.passwordInput.fill('admin123');
            await loginPage.loginButton.click();
            // Wait for success state
            await (0, test_1.expect)(loginPage.loginButton).toHaveClass(/success/, { timeout: 3000 });
            const buttonText = await loginPage.loginButton.textContent();
            (0, test_1.expect)(buttonText).toContain('Success');
        });
        (0, test_1.test)('TC018: Verify error state animation', async () => {
            // Use invalid credentials to trigger server-side error with shake animation
            await loginPage.usernameInput.fill('invaliduser');
            await loginPage.passwordInput.fill('wrongpassword');
            await loginPage.loginButton.click();
            // Check for error state and shake animation
            await (0, test_1.expect)(loginPage.loginButton).toHaveClass(/error/, { timeout: 3000 });
            await (0, test_1.expect)(loginPage.page.locator('.login-container')).toHaveClass(/shake/);
        });
        (0, test_1.test)('TC019: Verify form reset after error', async () => {
            await loginPage.loginButton.click();
            // Wait for error state
            await (0, test_1.expect)(loginPage.loginButton).toHaveClass(/error/, { timeout: 3000 });
            // Wait for reset (2 seconds)
            await loginPage.page.waitForTimeout(2500);
            // Check that button is reset
            const hasErrorClass = await loginPage.loginButton.getAttribute('class');
            (0, test_1.expect)(hasErrorClass).not.toContain('error');
            await (0, test_1.expect)(loginPage.loginButton).toContainText('Sign In');
        });
        (0, test_1.test)('TC020: Verify input focus effects', async () => {
            await loginPage.usernameInput.click();
            await (0, test_1.expect)(loginPage.usernameInput.locator('..')).toHaveClass(/focused/);
            await loginPage.passwordInput.click();
            await (0, test_1.expect)(loginPage.passwordInput.locator('..')).toHaveClass(/focused/);
        });
    });
});
//# sourceMappingURL=login-ui.spec.js.map