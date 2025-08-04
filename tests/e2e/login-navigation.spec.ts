import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/LoginPage';

test.describe('Login Navigation Tests', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test.describe('Redirection', () => {
    test('TC027: Verify successful login redirect', async () => {
      await loginPage.loginAndWaitForRedirect('admin', 'admin123');
      await expect(loginPage.page).toHaveURL(/.*mainPage\/index\.html/);
    });

    test('TC028: Verify redirect timing', async () => {
      const startTime = Date.now();
      await loginPage.login('admin', 'admin123');
      
      // Wait for redirect
      await expect(loginPage.page).toHaveURL(/.*mainPage\/index\.html/, { timeout: 5000 });
      const endTime = Date.now();
      const redirectTime = endTime - startTime;
      
      // Should redirect after approximately 1.5 seconds (1000ms delay + 1500ms redirect)
      expect(redirectTime).toBeGreaterThan(2000);
      expect(redirectTime).toBeLessThan(4000);
    });

    test('TC029: Verify session storage', async () => {
      const username = 'admin';
      await loginPage.login(username, 'admin123');
      
      // Wait for redirect to complete
      await expect(loginPage.page).toHaveURL(/.*mainPage\/index\.html/);
      
      // Check sessionStorage - now stores full name instead of username
      const storedUser = await loginPage.page.evaluate(() => {
        return sessionStorage.getItem('loggedInUser');
      });
      expect(storedUser).toBe('Admin User'); // Full name, not username
    });

    test('TC030: Verify dashboard access', async () => {
      const username = 'admin';
      await loginPage.loginAndWaitForRedirect(username, 'admin123');
      
      // Verify we're on the dashboard
      await expect(loginPage.page).toHaveURL(/.*mainPage\/index\.html/);
      await expect(loginPage.page).toHaveTitle('Dashboard - Demo App');
      
      // Check that welcome message contains the full name
      const welcomeMessage = loginPage.page.locator('#welcomeMessage');
      await expect(welcomeMessage).toBeVisible();
      const welcomeText = await welcomeMessage.textContent();
      expect(welcomeText).toContain('Admin User'); // Expect full name
    });
  });
});
