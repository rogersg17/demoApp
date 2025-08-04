import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/LoginPage';

test.describe('Login Message Display Tests', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test.describe('Error Messages', () => {
    test('TC021: Verify error message display for empty fields', async () => {
      await loginPage.loginButton.click();
      await loginPage.verifyErrorMessage('Please enter both username and password.');
    });

    test('TC022: Verify error message styling', async () => {
      await loginPage.loginButton.click();
      await expect(loginPage.errorMessage).toBeVisible();
      await expect(loginPage.errorMessage).toHaveCSS('display', 'block');
    });

    test('TC023: Verify error message accessibility', async () => {
      await loginPage.loginButton.click();
      await expect(loginPage.errorMessage).toHaveAttribute('role', 'alert');
      await expect(loginPage.errorMessage).toHaveAttribute('aria-live', 'assertive');
      await expect(loginPage.errorMessage).toHaveAttribute('aria-atomic', 'true');
    });
  });

  test.describe('Success Messages', () => {
    test('TC024: Verify success message display', async () => {
      await loginPage.login('admin', 'admin123');
      await loginPage.verifySuccessMessage('Login successful! Redirecting...');
    });

    test('TC025: Verify success message timing', async () => {
      const startTime = Date.now();
      await loginPage.login('admin', 'admin123');
      
      // Wait for redirect
      await expect(loginPage.page).toHaveURL(/.*mainPage\/index\.html/, { timeout: 5000 });
      const endTime = Date.now();
      const redirectTime = endTime - startTime;
      
      // Should redirect within reasonable time (allowing for network delays)
      expect(redirectTime).toBeGreaterThan(1000);
      expect(redirectTime).toBeLessThan(5000);
    });

    test('TC026: Verify success message accessibility', async () => {
      await loginPage.login('admin', 'admin123');
      await expect(loginPage.successMessage).toBeVisible();
      await expect(loginPage.successMessage).toHaveAttribute('role', 'status');
      await expect(loginPage.successMessage).toHaveAttribute('aria-live', 'polite');
      await expect(loginPage.successMessage).toHaveAttribute('aria-atomic', 'true');
    });
  });
});
