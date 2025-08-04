"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('Debug: Check what is on the login page', async ({ page }) => {
    console.log('Navigating to http://localhost:5173/login');
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
//# sourceMappingURL=debug-login.spec.js.map