"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const LoginPage_1 = require("../../page-objects/LoginPage");
test_1.test.describe('Login Navigation Tests', () => {
    let loginPage;
    test_1.test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage_1.LoginPage(page);
        await loginPage.goto();
    });
    test_1.test.describe('Redirection', () => {
        (0, test_1.test)('TC027: Verify successful login redirect', async () => {
            await loginPage.loginAndWaitForRedirect('admin', 'admin123');
            await (0, test_1.expect)(loginPage.page).toHaveURL(/.*mainPage\/index\.html/);
        });
        (0, test_1.test)('TC028: Verify redirect timing', async () => {
            const startTime = Date.now();
            await loginPage.login('admin', 'admin123');
            // Wait for redirect
            await (0, test_1.expect)(loginPage.page).toHaveURL(/.*mainPage\/index\.html/, { timeout: 5000 });
            const endTime = Date.now();
            const redirectTime = endTime - startTime;
            // Should redirect after approximately 1.5 seconds (1000ms delay + 1500ms redirect)
            (0, test_1.expect)(redirectTime).toBeGreaterThan(2000);
            (0, test_1.expect)(redirectTime).toBeLessThan(4000);
        });
        (0, test_1.test)('TC029: Verify session storage', async () => {
            const username = 'admin';
            await loginPage.login(username, 'admin123');
            // Wait for redirect to complete
            await (0, test_1.expect)(loginPage.page).toHaveURL(/.*mainPage\/index\.html/);
            // Check sessionStorage - now stores full name instead of username
            const storedUser = await loginPage.page.evaluate(() => {
                return sessionStorage.getItem('loggedInUser');
            });
            (0, test_1.expect)(storedUser).toBe('Admin User'); // Full name, not username
        });
        (0, test_1.test)('TC030: Verify dashboard access', async () => {
            const username = 'admin';
            await loginPage.loginAndWaitForRedirect(username, 'admin123');
            // Verify we're on the dashboard
            await (0, test_1.expect)(loginPage.page).toHaveURL(/.*mainPage\/index\.html/);
            await (0, test_1.expect)(loginPage.page).toHaveTitle('Dashboard - Demo App');
            // Check that welcome message contains the full name
            const welcomeMessage = loginPage.page.locator('#welcomeMessage');
            await (0, test_1.expect)(welcomeMessage).toBeVisible();
            const welcomeText = await welcomeMessage.textContent();
            (0, test_1.expect)(welcomeText).toContain('Admin User'); // Expect full name
        });
    });
});
//# sourceMappingURL=login-navigation.spec.js.map