const { test, expect } = require('@playwright/test');
const path = require('path');

const getFilePath = (relativePath) => {
  return 'file://' + path.resolve(__dirname, '..', relativePath).replace(/\\/g, '/');
};

test.describe('Demo App - End-to-End Application Flow', () => {
  test('user journey with different credentials', async ({ page }) => {
    // Test with different user credentials
    await page.goto(getFilePath('index.html'));
    await expect(page).toHaveURL(/.*login\/index\.html/);
    
    // Login with different user
    await page.fill('#username', 'johndoe');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    
    // Verify personalized welcome message
    await expect(page).toHaveURL(/.*mainPage\/index\.html/);
    await expect(page.locator('#welcomeMessage')).toContainText('Welcome, johndoe!');
    
    // Verify dashboard functionality
    await expect(page.locator('.dashboard-cards .card')).toHaveCount(4);
    
    // Test logout
    await page.click('#logoutBtn');
    await expect(page).toHaveURL(/.*login\/index\.html/);
  });

  test('session persistence across page reloads', async ({ page }) => {
    // Login
    await page.goto(getFilePath('login/index.html'));
    await page.fill('#username', 'sessionuser');
    await page.fill('#password', 'sessionpass');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*mainPage\/index\.html/);
    
    // Reload the page
    await page.reload();
    
    // Should still be on main page with correct user
    await expect(page).toHaveURL(/.*mainPage\/index\.html/);
    await expect(page.locator('#welcomeMessage')).toContainText('Welcome, sessionuser!');
    
    // Logout to clean up
    await page.click('#logoutBtn');
    await expect(page).toHaveURL(/.*login\/index\.html/);
  });

  test('protected route access without authentication', async ({ page }) => {
    // Try to access main page directly without logging in
    await page.goto(getFilePath('mainPage/index.html'));
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/.*login\/index\.html/);
    
    // Login and verify access
    await page.fill('#username', 'protecteduser');
    await page.fill('#password', 'protectedpass');
    await page.click('button[type="submit"]');
    
    // Now should have access to main page
    await expect(page).toHaveURL(/.*mainPage\/index\.html/);
    await expect(page.locator('#welcomeMessage')).toContainText('Welcome, protecteduser!');
  });
});
