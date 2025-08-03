import { test, expect } from '@playwright/test';

test('Debug: Check what is on the login page', async ({ page }) => {
  console.log('Navigating to root first');
  await page.goto('http://localhost:5173/');
  
  // Clear authentication state
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
  
  console.log('Navigating to http://localhost:5173/login after clearing storage');
  await page.goto('http://localhost:5173/login');
  
  // Wait for the page to load
  await page.waitForTimeout(3000);
  
  // Take a screenshot
  await page.screenshot({ path: 'debug-login-page.png', fullPage: true });
  
  // Log the page title and URL
  console.log('Page title:', await page.title());
  console.log('Page URL:', page.url());
  
  // Log the page content
  const bodyContent = await page.locator('body').textContent();
  console.log('Page content:', bodyContent);
  
  // Check what elements exist
  const headings = await page.locator('h1').allTextContents();
  console.log('H1 headings:', headings);
  
  // Check for login-related elements
  const loginHeadingExists = await page.locator('.login-heading').count();
  console.log('Login heading count:', loginHeadingExists);
  
  const usernameInput = await page.locator('#username').count();
  console.log('Username input count:', usernameInput);
  
  const passwordInput = await page.locator('#password').count();
  console.log('Password input count:', passwordInput);
});
