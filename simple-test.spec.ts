// Simple TypeScript test to verify our page objects work
import { test, expect } from '@playwright/test';
import { LoginPage } from './page-objects/LoginPage';

// Configure to use the backend server directly
test.use({ baseURL: 'http://localhost:3000' });

test('Verify TypeScript Page Objects Work', async ({ page }) => {
  // Start from root and let React app redirect
  await page.goto('/');
  
  // Wait for redirect to login
  await page.waitForURL(/.*login.*/);
  
  // Create page object instance
  const loginPage = new LoginPage(page);
  
  // Wait for page to load
  await expect(loginPage.pageHeading).toBeVisible();
  await expect(loginPage.usernameInput).toBeVisible();
  await expect(loginPage.passwordInput).toBeVisible();
  await expect(loginPage.loginButton).toBeVisible();
  
  console.log('✅ TypeScript LoginPage object works correctly!');
  console.log('✅ All locators are accessible');
  console.log('✅ Page navigation works');
});
