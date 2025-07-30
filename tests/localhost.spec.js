const { test, expect } = require('@playwright/test');

test.describe('Demo App - Application Flow (Localhost)', () => {
  test('complete application flow: login → main page → logout', async ({ page }) => {
    // Step 1: Start from root and verify we're on login page (could be redirect or direct)
    await page.goto('/');
    await expect(page.locator('h2')).toContainText('Login');

    // Step 2: Login with valid credentials
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'testpass');
    await page.click('button[type="submit"]');

    // Step 3: Verify successful login and main page access
    await expect(page).toHaveURL(/.*mainPage\/index\.html/);
    await expect(page.locator('#welcomeMessage')).toContainText('Welcome, testuser!');
    await expect(page.locator('h1')).toContainText('Welcome to the Main Dashboard');

    // Step 4: Verify main page elements are present
    await expect(page.locator('.dashboard-cards .card')).toHaveCount(4);
    await expect(page.locator('.sidebar-icon')).toHaveCount(5);
    await expect(page.locator('#logoutBtn')).toBeVisible();

    // Step 5: Logout and verify return to login
    await page.click('#logoutBtn');
    await expect(page.locator('h2')).toContainText('Login');

    // Step 6: Verify session is cleared - accessing main page should redirect
    await page.goto('/mainPage/index.html');
    await expect(page.locator('h2')).toContainText('Login');
  });

  test('login validation - empty credentials should show error', async ({ page }) => {
    await page.goto('/login/index.html');
    
    // Try to login with empty fields
    await page.click('button[type="submit"]');
    
    // Error message should be visible
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('Invalid username or password');
  });

  test('direct navigation to login page', async ({ page }) => {
    await page.goto('/login/index.html');
    
    // Should be on login page
    await expect(page.locator('h2')).toContainText('Login');
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('direct navigation to main page without auth redirects to login', async ({ page }) => {
    // Try to access main page directly without logging in
    await page.goto('/mainPage/index.html');
    
    // Should be redirected to login page (check content instead of URL for flexibility)
    await expect(page.locator('h2')).toContainText('Login');
  });
});
