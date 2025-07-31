import { test, expect } from '@playwright/test';
const { LoginPage } = require('../page-objects/LoginPage.js');

test.describe('Login Accessibility Tests', () => {
  let loginPage: any;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test.describe('ARIA Attributes', () => {
    test('TC036: Verify form accessibility structure', async () => {
      await expect(loginPage.loginForm).toHaveAttribute('aria-describedby', 'login-instructions');
      await expect(loginPage.loginForm).toHaveAttribute('novalidate');
      
      const loginInstructions = loginPage.page.locator('#login-instructions');
      await expect(loginInstructions).toHaveClass(/sr-only/);
    });

    test('TC037: Verify input field ARIA attributes', async () => {
      await expect(loginPage.usernameInput).toHaveAttribute('aria-describedby', 'username-error');
      await expect(loginPage.usernameInput).toHaveAttribute('aria-invalid', 'false');
      
      await expect(loginPage.passwordInput).toHaveAttribute('aria-describedby', 'password-error');
      await expect(loginPage.passwordInput).toHaveAttribute('aria-invalid', 'false');
    });

    test('TC038: Verify button accessibility', async () => {
      await expect(loginPage.loginButton).toHaveAttribute('aria-describedby', 'login-status');
      await expect(loginPage.loginButton).toHaveAttribute('type', 'submit');
      
      const loadingSpan = loginPage.page.locator('#login-loading');
      await expect(loadingSpan).toHaveAttribute('aria-live', 'polite');
      await expect(loadingSpan).toHaveClass(/sr-only/);
    });

    test('TC039: Verify error message accessibility', async () => {
      await expect(loginPage.errorMessage).toHaveAttribute('role', 'alert');
      await expect(loginPage.errorMessage).toHaveAttribute('aria-live', 'assertive');
      await expect(loginPage.errorMessage).toHaveAttribute('aria-atomic', 'true');
    });

    test('TC040: Verify screen reader support', async () => {
      // Check that main content has proper role and labeling
      const main = loginPage.page.locator('main');
      await expect(main).toHaveAttribute('role', 'main');
      await expect(main).toHaveAttribute('aria-labelledby', 'login-heading');
      
      // Check that heading has proper ID
      await expect(loginPage.pageHeading).toHaveAttribute('id', 'login-heading');
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('TC041: Verify tab navigation', async () => {
      // Start from username field
      await loginPage.usernameInput.focus();
      await expect(loginPage.usernameInput).toBeFocused();
      
      // Tab to password field
      await loginPage.page.keyboard.press('Tab');
      await expect(loginPage.passwordInput).toBeFocused();
      
      // Tab to login button
      await loginPage.page.keyboard.press('Tab');
      await expect(loginPage.loginButton).toBeFocused();
    });

    test('TC042: Verify Enter key submission', async () => {
      await loginPage.usernameInput.fill('admin');
      await loginPage.passwordInput.fill('admin123');
      
      // Press Enter in password field
      await loginPage.passwordInput.press('Enter');
      
      // Should redirect to main page
      await expect(loginPage.page).toHaveURL(/.*mainPage\/index\.html/, { timeout: 5000 });
    });

    test('TC043: Verify Ctrl+Enter submission', async () => {
      await loginPage.usernameInput.fill('admin');
      await loginPage.passwordInput.fill('admin123');
      
      // Press Ctrl+Enter
      await loginPage.page.keyboard.press('Control+Enter');
      
      // Should redirect to main page
      await expect(loginPage.page).toHaveURL(/.*mainPage\/index\.html/, { timeout: 5000 });
    });

    test('TC044: Verify keyboard accessibility', async () => {
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
      await expect(loginPage.page).toHaveURL(/.*mainPage\/index\.html/, { timeout: 5000 });
    });
  });
});
