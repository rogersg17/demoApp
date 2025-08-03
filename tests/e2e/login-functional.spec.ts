import { test, expect } from '@playwright/test';
const { LoginPage } = require('../../page-objects/LoginPage.js');

test.describe.configure({ mode: 'serial' });

test.describe('Login Functional Tests', () => {
  let loginPage: any;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
    // Add a small delay to avoid rate limiting
    await page.waitForTimeout(1000);
  });

  test.describe('Successful Login Scenarios', () => {
    test('TC001: Login with admin credentials', async () => {
      await loginPage.login('admin', 'admin123');
      await expect(loginPage.page).toHaveURL(/.*\/dashboard/);
    });

    test('TC002: Login with regular user credentials', async () => {
      await loginPage.login('jdoe', 'password123');
      await expect(loginPage.page).toHaveURL(/.*\/dashboard/);
    });

    test('TC003: Login with moderator user credentials', async () => {
      await loginPage.login('jsmith', 'password123');
      await expect(loginPage.page).toHaveURL(/.*\/dashboard/);
    });

    test('TC004: Login with HR user credentials', async () => {
      await loginPage.login('swilson', 'password123');
      await expect(loginPage.page).toHaveURL(/.*\/dashboard/);
    });

    test('TC005: Login with case-sensitive username', async () => {
      await loginPage.login('admin', 'admin123'); // admin is lowercase in database
      await expect(loginPage.page).toHaveURL(/.*\/dashboard/);
    });
  });

  test.describe('Failed Login Scenarios', () => {
    test('TC006: Login with invalid username', async () => {
      await loginPage.login('invaliduser', 'password123');
      await loginPage.verifyErrorMessage('Invalid credentials');
      await expect(loginPage.page).not.toHaveURL(/.*\/dashboard/);
    });

    test('TC007: Login with valid username but wrong password', async () => {
      await loginPage.login('admin', 'wrongpassword');
      await loginPage.verifyErrorMessage('Invalid credentials');
      await expect(loginPage.page).not.toHaveURL(/.*\/dashboard/);
    });

    test('TC008: Login with empty username', async () => {
      await loginPage.login('', 'admin123');
      await loginPage.verifyErrorMessage('Please enter both username and password.');
      await expect(loginPage.page).not.toHaveURL(/.*\/dashboard/);
    });

    test('TC009: Login with empty password', async () => {
      await loginPage.login('admin', '');
      await loginPage.verifyErrorMessage('Please enter both username and password.');
      await expect(loginPage.page).not.toHaveURL(/.*\/dashboard/);
    });

    test('TC010: Login with both fields empty', async () => {
      await loginPage.login('', '');
      await loginPage.verifyErrorMessage('Please enter both username and password.');
      await expect(loginPage.page).not.toHaveURL(/.*\/dashboard/);
    });

    test('TC011: Login with case-sensitive password failure', async () => {
      await loginPage.login('admin', 'ADMIN123'); // Wrong case
      await loginPage.verifyErrorMessage('Invalid credentials');
      await expect(loginPage.page).not.toHaveURL(/.*\/dashboard/);
    });

    test('TC012: Login with whitespace-only credentials', async () => {
      await loginPage.login('   ', '   ');
      await loginPage.verifyErrorMessage('Please enter both username and password.');
      await expect(loginPage.page).not.toHaveURL(/.*\/dashboard/);
    });
  });
});
