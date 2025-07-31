import { test, expect } from '@playwright/test';
const { LoginPage } = require('../page-objects/LoginPage.js');

test.describe('Login Functional Tests', () => {
  let loginPage: any;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test.describe('Successful Login Scenarios', () => {
    test('TC001: Login with valid username and password', async () => {
      await loginPage.login('testuser', 'testpass');
      await expect(loginPage.page).toHaveURL(/.*mainPage\/index\.html/);
    });

    test('TC002: Login with alphanumeric username', async () => {
      await loginPage.login('user123', 'password');
      await expect(loginPage.page).toHaveURL(/.*mainPage\/index\.html/);
    });

    test('TC003: Login with special characters in credentials', async () => {
      await loginPage.login('user@domain.com', 'Pass@123!');
      await expect(loginPage.page).toHaveURL(/.*mainPage\/index\.html/);
    });

    test('TC004: Login with single character credentials', async () => {
      await loginPage.login('a', 'b');
      await expect(loginPage.page).toHaveURL(/.*mainPage\/index\.html/);
    });

    test('TC005: Login with maximum length credentials', async () => {
      const longUsername = 'a'.repeat(300);
      const longPassword = 'b'.repeat(300);
      await loginPage.login(longUsername, longPassword);
      await expect(loginPage.page).toHaveURL(/.*mainPage\/index\.html/);
    });
  });

  test.describe('Failed Login Scenarios', () => {
    test('TC006: Login with empty username', async () => {
      await loginPage.login('', 'validpassword');
      await loginPage.verifyErrorMessage();
      await expect(loginPage.page).not.toHaveURL(/.*mainPage\/index\.html/);
    });

    test('TC007: Login with empty password', async () => {
      await loginPage.login('validuser', '');
      await loginPage.verifyErrorMessage();
      await expect(loginPage.page).not.toHaveURL(/.*mainPage\/index\.html/);
    });

    test('TC008: Login with both fields empty', async () => {
      await loginPage.login('', '');
      await loginPage.verifyErrorMessage();
      await expect(loginPage.page).not.toHaveURL(/.*mainPage\/index\.html/);
    });

    test('TC009: Login with whitespace-only username', async () => {
      await loginPage.login('   ', 'validpassword');
      await loginPage.verifyErrorMessage();
      await expect(loginPage.page).not.toHaveURL(/.*mainPage\/index\.html/);
    });

    test('TC010: Login with whitespace-only password', async () => {
      await loginPage.login('validuser', '   ');
      await loginPage.verifyErrorMessage();
      await expect(loginPage.page).not.toHaveURL(/.*mainPage\/index\.html/);
    });
  });
});
