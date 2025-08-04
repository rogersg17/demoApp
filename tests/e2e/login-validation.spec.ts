import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/LoginPage';

test.describe('Login Form Validation Tests', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test.describe('Input Validation', () => {
    test('TC031: Verify username field validation', async () => {
      await loginPage.usernameInput.focus();
      await loginPage.passwordInput.focus(); // Blur username field
      
      // Check for invalid state when empty
      const usernameGroup = loginPage.page.locator('.input-group:has(#username)');
      await expect(usernameGroup).toHaveClass(/invalid/);
    });

    test('TC032: Verify password field validation', async () => {
      await loginPage.passwordInput.focus();
      await loginPage.usernameInput.focus(); // Blur password field
      
      // Check for invalid state when empty
      const passwordGroup = loginPage.page.locator('.input-group:has(#password)');
      await expect(passwordGroup).toHaveClass(/invalid/);
    });

    test('TC033: Verify valid input styling', async () => {
      await loginPage.usernameInput.fill('testuser');
      await loginPage.passwordInput.fill('testpass');
      
      // Blur fields to trigger validation
      await loginPage.loginButton.focus();
      
      const usernameGroup = loginPage.page.locator('.input-group:has(#username)');
      const passwordGroup = loginPage.page.locator('.input-group:has(#password)');
      
      await expect(usernameGroup).toHaveClass(/valid/);
      await expect(passwordGroup).toHaveClass(/valid/);
    });

    test('TC034: Verify floating labels', async () => {
      // Test username field
      await loginPage.usernameInput.focus();
      const usernameGroup = loginPage.page.locator('.input-group:has(#username)');
      await expect(usernameGroup).toHaveClass(/focused/);
      
      await loginPage.usernameInput.fill('test');
      const usernameGroupWithValue = loginPage.page.locator('.input-group:has(#username)');
      await expect(usernameGroupWithValue).toHaveClass(/has-value/);
      
      // Test password field
      await loginPage.passwordInput.focus();
      const passwordGroup = loginPage.page.locator('.input-group:has(#password)');
      await expect(passwordGroup).toHaveClass(/focused/);
      
      await loginPage.passwordInput.fill('test');
      const passwordGroupWithValue = loginPage.page.locator('.input-group:has(#password)');
      await expect(passwordGroupWithValue).toHaveClass(/has-value/);
    });

    test('TC035: Verify input autocomplete', async () => {
      await expect(loginPage.usernameInput).toHaveAttribute('autocomplete', 'username');
      await expect(loginPage.passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });
  });
});
