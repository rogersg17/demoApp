import { test, expect } from '@playwright/test';
const { LoginPage } = require('../../page-objects/LoginPage.js');

test.describe('Login UI Tests', () => {
  let loginPage: any;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test.describe('Page Elements and Layout', () => {
    test('TC011: Verify login page loads correctly', async () => {
      await expect(loginPage.page).toHaveTitle('Demo App');
      await loginPage.verifyPageElements();
    });

    test('TC012: Verify form elements are present', async () => {
      await expect(loginPage.usernameInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.loginButton).toBeVisible();
    });

    test('TC013: Verify page heading', async () => {
      await expect(loginPage.pageHeading).toContainText('Welcome Back');
    });

    test('TC014: Verify input field labels', async () => {
      await expect(loginPage.page.locator('label[for="username"]')).toContainText('Username');
      await expect(loginPage.page.locator('label[for="password"]')).toContainText('Password');
    });

    test('TC015: Verify button text', async () => {
      await expect(loginPage.loginButton).toContainText('Sign In');
    });
  });

  test.describe('Form Behavior', () => {
    test('TC016: Verify loading state during login', async () => {
      await loginPage.usernameInput.fill('admin');
      await loginPage.passwordInput.fill('admin123');
      await loginPage.loginButton.click();
      
      // Check for loading state immediately after click
      await expect(loginPage.loginButton).toHaveClass(/loading/);
      const buttonText = await loginPage.loginButton.textContent();
      expect(buttonText).toContain('Signing in');
    });

    test('TC017: Verify success state animation', async () => {
      await loginPage.usernameInput.fill('admin');
      await loginPage.passwordInput.fill('admin123');
      await loginPage.loginButton.click();
      
      // Wait for success state
      await expect(loginPage.loginButton).toHaveClass(/success/, { timeout: 3000 });
      const buttonText = await loginPage.loginButton.textContent();
      expect(buttonText).toContain('Success');
    });

    test('TC018: Verify error state animation', async () => {
      // Use invalid credentials to trigger server-side error with shake animation
      await loginPage.usernameInput.fill('invaliduser');
      await loginPage.passwordInput.fill('wrongpassword');
      await loginPage.loginButton.click();
      
      // Check for error state and shake animation
      await expect(loginPage.loginButton).toHaveClass(/error/, { timeout: 3000 });
      await expect(loginPage.page.locator('.login-container')).toHaveClass(/shake/);
    });

    test('TC019: Verify form reset after error', async () => {
      await loginPage.loginButton.click();
      
      // Wait for error state
      await expect(loginPage.loginButton).toHaveClass(/error/, { timeout: 3000 });
      
      // Wait for reset (2 seconds)
      await loginPage.page.waitForTimeout(2500);
      
      // Check that button is reset
      const hasErrorClass = await loginPage.loginButton.getAttribute('class');
      expect(hasErrorClass).not.toContain('error');
      await expect(loginPage.loginButton).toContainText('Sign In');
    });

    test('TC020: Verify input focus effects', async () => {
      await loginPage.usernameInput.click();
      await expect(loginPage.usernameInput.locator('..')).toHaveClass(/focused/);
      
      await loginPage.passwordInput.click();
      await expect(loginPage.passwordInput.locator('..')).toHaveClass(/focused/);
    });
  });
});
